---
layout: post
title: Redis 캐싱 적용 가이드
date: 2026-03-12
Author: Geon Son
categories: Spring
tags: [Redis, Cache, Serialization, Spring Boot]
comments: true
toc: true
---

운영하던 게시판 서비스에 Redis 캐싱을 적용하면서 직렬화 실패와 캐싱 대상 선정 문제로 적지 않게 시간을 썼다.
처음에는 단순히 `@Cacheable`만 붙이면 될 줄 알았는데, 캐싱 대상으로 어떤 객체를 넣느냐에 따라 직렬화가 깨지거나
역직렬화가 실패하는 경우가 많았다. 그래서 적용 과정에서 부딪힌 이슈와 정리한 설계 기준을 한곳에 모아 두었다.

## 프로젝트 설계 원칙

Redis 캐싱을 적용할 프로젝트라면 처음부터 다음 기준을 잡고 설계하는 편이 낫다.

### 1. ObjectMapper 설정

Redis 직렬화에 쓸 ObjectMapper는 API 응답용과 분리해서 별도로 설정한다.

```java
@Configuration
public class RedisConfig {
    @Bean("redisObjectMapper")
    public ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule()); // 날짜/시간 타입 지원
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        mapper.enable(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY);
        mapper.enable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT);
        BasicPolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
            .allowIfSubType("com.example.")
            .allowIfSubType("java.util.")
            .build();
        mapper.activateDefaultTyping(
            ptv,
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        return mapper;
    }

    @Bean
    RedisCacheConfiguration defaultRedisCacheConfiguration(
            @Qualifier("redisObjectMapper") ObjectMapper redisObjectMapper) {
        return RedisCacheConfiguration.defaultCacheConfig()
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer(redisObjectMapper)))
            .disableCachingNullValues()
            .entryTtl(Duration.ofMinutes(1));
    }
}
```

각 설정의 역할은 이렇다.
- `JavaTimeModule`: `LocalDateTime` 등 날짜/시간 타입 직렬화
- `activateDefaultTyping`: 타입 정보 포함 (다형성 지원)
- `disableCachingNullValues`: null 값 캐싱 방지

`activateDefaultTyping`을 쓸 때 `allowIfBaseType(Object.class)`처럼 너무 넓게 열어두면, 신뢰할 수 없는
타입 정보까지 역직렬화 대상이 될 수 있다. Redis가 내부망에 있더라도 가능하면 캐싱 DTO가 있는 패키지와
필요한 JDK 컬렉션 정도만 allowlist로 제한한다.

Redis 전용 ObjectMapper를 굳이 별도로 만든 이유는 Redis 직렬화와 REST API 응답이 요구사항이 다르기 때문이다.

| 구분 | Redis ObjectMapper | API ObjectMapper |
| :--- | :--- | :--- |
| 타입 정보 포함 | 필요 (역직렬화를 위해) | 불필요 (클라이언트에 노출 안 함) |
| null 처리 | 캐싱 안 함 | 응답에 포함 가능 |
| 날짜 형식 | 타임스탬프 가능 | ISO-8601 형식 선호 |

전역 ObjectMapper를 그대로 Redis에 쓰면 `activateDefaultTyping`이 API 응답에도 적용되어
응답 JSON에 불필요한 타입 정보(`@class`)가 같이 나가게 된다.

```java
// 잘못된 예시: 전역 ObjectMapper 사용
@Bean
public ObjectMapper objectMapper() {
    ObjectMapper mapper = new ObjectMapper();
    mapper.activateDefaultTyping(...); // API 응답에도 타입 정보 포함됨
    return mapper;
}

// API 응답 예시 (타입 정보 노출)
{
  "@class": "com.example.UserDto",  // 불필요한 정보
  "id": 1,
  "name": "홍길동"
}

// 올바른 예시: Redis 전용 ObjectMapper
@Bean("redisObjectMapper")
public ObjectMapper redisObjectMapper() {
    // Redis 직렬화에만 사용
}

@Bean
public ObjectMapper objectMapper() {
    // API 응답에만 사용
}

// API 응답 예시 (깔끔함)
{
  "id": 1,
  "name": "홍길동"
}
```

그래서 `@Qualifier("redisObjectMapper")`로 Redis 설정에만 이 매퍼를 주입한다.

### 2. Redis 연결과 Spring Cache 설정

`ObjectMapper`만 만들어서는 Spring Cache가 Redis를 쓰지 않는다. 실제 프로젝트에서는 Redis 연결,
`RedisTemplate`, `RedisCacheManager`까지 명시적으로 묶었다.

Spring Boot 자동설정을 쓰면 `spring.data.redis.*`, `spring.cache.redis.*` 프로퍼티만으로도 기본
`RedisConnectionFactory`와 `RedisCacheManager`를 만들 수 있다. 단순히 모든 캐시에 같은 TTL을 적용하고,
기본 직렬화와 기본 prefix 정책을 써도 되는 서비스라면 자동설정이 더 낫다.

이 프로젝트에서 수동 설정을 선택한 이유는 요구사항이 기본값을 넘어섰기 때문이다.

- Redis 전용 `ObjectMapper`로 값 직렬화 방식을 통제해야 했다.
- 캐시 이름별로 5초, 1분, 10분처럼 TTL을 다르게 가져가야 했다.
- 운영 프로파일을 포함한 Redis key prefix가 필요했다.
- 운영에서는 Redis Cluster를 사용하지만, 개발기에는 클러스터 구성이 없어 standalone Redis로 실행해야 했다.
- Lettuce의 replica read, cluster topology refresh 옵션을 직접 설정해야 했다.
- Cache Stampede를 줄이기 위해 TTL jitter를 적용해야 했다.
- `Page` 같은 캐싱하기 까다로운 타입을 `RestPage` 형태로 보정하는 커스텀 캐시 계층이 필요했다.


핵심 구성은 다음과 같다.

- `@EnableCaching`: `@Cacheable`, `@CacheEvict`, `@CachePut` 활성화
- `RedisConnectionFactory`: 운영은 Redis Cluster, 개발기는 standalone Redis로 연결 생성
- `RedisTemplate`: 수동 Redis 접근 시 사용할 key/value/hash 직렬화 방식 지정
- `RedisCacheWriter`: Spring Cache가 Redis에 값을 쓰는 방식 지정
- `RedisCacheManager`: 캐시 이름별 TTL과 직렬화 설정 적용

아래 코드는 실제 설정에서 핵심만 추린 예시다. 운영 환경은 Redis Cluster로 구성되어 있지만,
개발기에는 클러스터 구성이 없어서 `redis.clusterMode=false`일 때 standalone Redis로 붙도록 분기했다.
운영 코드에서는 cluster node를 `host1`부터 `host6`까지 순회하며 추가했다. 아래 예시는 길이를 줄이기 위해
`host3`까지만 표시했고, 실제 코드에서는 캐시 그룹 배열이 비어 있는 경우도 방어했다.

```java
@Slf4j
@EnableCaching
@Configuration
public class RedisConfig {

    @Value("${redis.cache.second}")
    private String[] redisCacheSecond;

    @Value("${redis.cache.minutes.1}")
    private String[] redisCacheMinutes1;

    @Value("${redis.cache.minutes.10}")
    private String[] redisCacheMinutes10;

    @Value("${redis.clusterMode}")
    private Boolean clusterMode;

    @Value("${redis.host1}")
    private String host1;

    @Value("${redis.port1}")
    private String port1;

    @Value("${redis.host2:}")
    private String host2;

    @Value("${redis.port2:}")
    private String port2;

    @Value("${redis.host3:}")
    private String host3;

    @Value("${redis.port3:}")
    private String port3;

    @Value("${redis.username}")
    private String username;

    @Value("${redis.password}")
    private String password;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Bean
    RedisConnectionFactory connectionFactory() {
        if (!clusterMode) {
            // 개발기: Redis Cluster 구성이 없으므로 standalone Redis로 연결한다.
            RedisStandaloneConfiguration config =
                new RedisStandaloneConfiguration(host1, Integer.parseInt(port1));
            config.setUsername(username);
            config.setPassword(password);

            return new LettuceConnectionFactory(config);
        }

        // 운영: Redis Cluster node들을 등록하고 topology refresh를 활성화한다.
        RedisClusterConfiguration config = new RedisClusterConfiguration();
        addClusterNodeIfPresent(config, host1, port1);
        addClusterNodeIfPresent(config, host2, port2);
        addClusterNodeIfPresent(config, host3, port3);
        config.setMaxRedirects(30);
        config.setUsername(username);
        config.setPassword(password);

        ClusterTopologyRefreshOptions refreshOptions = ClusterTopologyRefreshOptions.builder()
            .enablePeriodicRefresh(true)
            .enableAdaptiveRefreshTrigger(
                RefreshTrigger.MOVED_REDIRECT,
                RefreshTrigger.PERSISTENT_RECONNECTS
            )
            .build();

        ClusterClientOptions clientOptions = ClusterClientOptions.builder()
            .topologyRefreshOptions(refreshOptions)
            .build();

        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder()
            .clientOptions(clientOptions)
            .readFrom(ReadFrom.REPLICA_PREFERRED)
            .build();

        return new LettuceConnectionFactory(config, lettuceConfig);
    }

    // 수동 Redis 작업에서도 Spring Cache와 같은 직렬화 정책을 사용한다.
    @Bean
    RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory connectionFactory,
            @Qualifier("redisObjectMapper") ObjectMapper redisObjectMapper) {

        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer(redisObjectMapper);

        RedisTemplate<String, Object> template = new RedisTemplate<>();

        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(jsonSerializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jsonSerializer);
        template.setDefaultSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    // 기본 non-locking writer보다 느릴 수 있지만,
    // putIfAbsent/clear 같은 복합 캐시 작업의 동시성 경쟁을 줄이기 위해 사용한다.
    @Bean
    RedisCacheWriter redisCacheWriter(RedisConnectionFactory connectionFactory) {
        return RedisCacheWriter.lockingRedisCacheWriter(connectionFactory);
    }

    @Bean
    RedisCacheConfiguration defaultRedisCacheConfiguration(
            @Qualifier("redisObjectMapper") ObjectMapper redisObjectMapper) {
        return jitterRedisCacheConfiguration(redisObjectMapper, Duration.ofSeconds(60), 10);
    }

    // @Cacheable에서 사용할 캐시 이름별 TTL, jitter, 직렬화 정책을 정의한다.
    @Bean
    CacheManager cacheManager(
            RedisCacheWriter redisCacheWriter,
            @Qualifier("redisObjectMapper") ObjectMapper redisObjectMapper) {

        Map<String, RedisCacheConfiguration> cacheConfigMap = new HashMap<>();

        for (String cacheName : redisCacheSecond) {
            cacheConfigMap.put(cacheName,
                jitterRedisCacheConfiguration(redisObjectMapper, Duration.ofSeconds(5), 2));
        }

        for (String cacheName : redisCacheMinutes1) {
            cacheConfigMap.put(cacheName,
                jitterRedisCacheConfiguration(redisObjectMapper, Duration.ofMinutes(1), 10));
        }

        for (String cacheName : redisCacheMinutes10) {
            cacheConfigMap.put(cacheName,
                jitterRedisCacheConfiguration(redisObjectMapper, Duration.ofMinutes(10), 60));
        }

        return new CustomCacheManager(RedisCacheManager.builder()
            .cacheWriter(redisCacheWriter)
            .cacheDefaults(defaultRedisCacheConfiguration(redisObjectMapper))
            .withInitialCacheConfigurations(cacheConfigMap)
            .build());
    }

    // 캐시 설정시 jitter를 적용한 RedisCacheConfiguration을 생성한다.
    private RedisCacheConfiguration jitterRedisCacheConfiguration(
            ObjectMapper redisObjectMapper,
            Duration ttl,
            long jitterSeconds) {

        return RedisCacheConfiguration.defaultCacheConfig()
            .computePrefixWith(cacheName -> activeProfile + "::" + cacheName + "::")
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                new GenericJackson2JsonRedisSerializer(redisObjectMapper)
            ))
            .disableCachingNullValues()
            .entryTtl(ttl.plusSeconds(ThreadLocalRandom.current().nextLong(jitterSeconds + 1)));
    }

    private void addClusterNodeIfPresent(
            RedisClusterConfiguration config,
            String host,
            String port) {

        if (StringUtils.hasText(host) && StringUtils.hasText(port)) {
            config.addClusterNode(new RedisNode(host, Integer.parseInt(port)));
        }
    }
}
```

여기서 `clusterMode`는 운영 Redis가 cluster로 구성되어 있고, 개발 Redis는 단일 인스턴스라서 같은
애플리케이션 코드를 두 환경에서 모두 실행하기 위한 분기다.

`RedisTemplate`은 `@Cacheable` 동작에 필수는 아니다. Spring Cache 어노테이션은 `RedisCacheManager`를
통해 Redis를 사용한다. 여기서 `RedisTemplate`을 따로 둔 이유는 캐시 warm-up, 수동 key 삭제, hash/set/zset
조작처럼 어노테이션으로 표현하기 어려운 Redis 작업에서도 같은 직렬화 정책을 쓰기 위해서다.

운영 cluster 설정에서 특히 신경 쓴 부분은 topology refresh다.

```java
ClusterTopologyRefreshOptions refreshOptions = ClusterTopologyRefreshOptions.builder()
    .enablePeriodicRefresh(true)
    .enableAdaptiveRefreshTrigger(
        RefreshTrigger.MOVED_REDIRECT,
        RefreshTrigger.PERSISTENT_RECONNECTS
    )
    .build();
```

Redis Cluster에서는 slot 이동이나 node 장애/복구가 발생할 수 있다. 이때 Lettuce가 오래된 topology를
계속 들고 있으면 `MOVED` redirect가 반복되거나 재연결 이후에도 잘못된 node로 요청을 보낼 수 있다.
그래서 주기적 refresh와 `MOVED_REDIRECT`, `PERSISTENT_RECONNECTS` 기반 adaptive refresh를 함께 켰다.

운영 cluster 쪽의 `ReadFrom.REPLICA_PREFERRED`는 읽기 요청을 가능하면 replica로 보내 읽기 부하를
분산하려는 설정이다.
단, replica lag가 허용되지 않는 강한 정합성 데이터라면 master에서 읽는 전략을 별도로 검토해야 한다.

위 설정에서 중요한 부분은 `RedisCacheManager`다. `@Cacheable(value = "cacheName")`으로 지정한
캐시 이름이 `redis.cache.second`, `redis.cache.minutes.1`, `redis.cache.minutes.10` 중 어디에
들어 있느냐에 따라 TTL이 달라진다. 목록성 API처럼 짧게 가져갈 캐시는 5초, 변경 빈도가 낮은 캐시는
1분이나 10분으로 분리했다.

`jitterRedisCacheConfiguration`은 같은 시점에 만들어진 캐시들이 한 번에 만료되는 상황을 줄이기 위한
설정이다. 참고 프로젝트에서는 `TTL = base + random(0..jitterSeconds)` 방식으로 적용했다.

| 캐시 그룹 | base TTL | jitter | 실제 TTL 범위 |
| :--- | :--- | :--- | :--- |
| 기본값 | 60초 | 0~10초 | 60~70초 |
| `redis.cache.second` | 5초 | 0~2초 | 5~7초 |
| `redis.cache.minutes.1` | 1분 | 0~10초 | 60~70초 |
| `redis.cache.minutes.10` | 10분 | 0~60초 | 600~660초 |

이 방식은 구현이 단순하고 만료 시점을 흩는 데 효과가 있다. 단, 최대 TTL이 base보다 길어진다.
최대 수명을 넘기면 안 되는 데이터라면 뒤의 Cache Stampede 섹션처럼 `base - random` 방식의 음수 지터를
쓰는 편이 더 적합하다.

개발기 설정 예시는 다음과 같다.

```yaml
redis:
  clusterMode: false
  host1: localhost
  port1: 6379
  username:
  password:
```

운영 설정에서는 `clusterMode=true`로 두고 cluster node들을 등록한다.

```yaml
redis:
  clusterMode: true
  host1: redis-cluster-1.example.com
  port1: 6379
  host2: redis-cluster-2.example.com
  port2: 6379
  host3: redis-cluster-3.example.com
  port3: 6379
  username:
  password:
  cache:
    second:
      - getCacheableOnairCommentArticle
      - getCacheableBoardList
    minutes:
      1:
        - getCacheableArticle
      10:
        - getCacheableCodeList
```

`computePrefixWith`는 운영과 개발기의 키 분리를 통하여 캐시가 섞이는 것을 방지한다.

```java
.computePrefixWith(cacheName -> activeProfile + "::" + cacheName + "::")
```

이렇게 prefix를 두면 같은 Redis를 여러 프로파일이 함께 쓰더라도 키 충돌을 줄일 수 있다.
예를 들어 `prod::getCacheableBoardList::`와 `stage::getCacheableBoardList::`가 분리된다.

`RedisCacheWriter.lockingRedisCacheWriter`는 캐시 쓰기 시 lock key를 사용해 같은 캐시에 대한 동시 쓰기를
조금 더 보수적으로 처리한다. 다만 이것만으로 모든 Cache Stampede가 해결되는 것은 아니다. 특히 여러 서버가
동시에 같은 hot key를 조회하는 문제는 별도 분산 락이나 stale-while-revalidate 전략을 검토해야 한다.

참고 프로젝트에서는 `CustomCacheManager`로 `RedisCacheManager`를 한 번 감싸서, 캐시에 `Page` 객체가
들어오면 `RestPage` 같은 직렬화 가능한 응답 DTO로 변환했다. 다만 캐시 계층에서 보정하기보다 처음부터
`PageResponse` 같은 DTO를 반환하게 만드는 편이 더 명확하다. 아래 페이징 처리 섹션도 이 기준으로 정리했다.

### 3. 캐싱 메서드는 데이터 DTO를 반환하기

Redis에 저장되는 값은 가능한 한 순수 데이터 DTO로 제한한다. `ResponseEntity`, `HttpHeaders`,
`HttpStatus` 같은 HTTP 응답 객체는 Redis 직렬화 대상에 넣지 않는 편이 낫다.

```java
// 올바른 예시
@Cacheable("dataCache")
public DataDto getData() {
    return repository.findData()
        .map(this::toDto)
        .orElseThrow();
}

// 잘못된 예시
public ResponseEntity<DataDto> getData() {
    DataDto data = repository.findData().map(this::toDto).orElseThrow();
    return new ResponseEntity<>(data, HttpStatus.OK); // HTTP 객체 사용 - 잘못됨
}
```

### 4. Entity를 직접 반환하지 않기

```java
// 잘못된 예시
@Cacheable("userCache")
public User getUser(Long id) {
    return userRepository.findById(id).orElseThrow(); // Entity 직접 반환
}
```

Entity를 직접 캐싱하면 발생하는 문제:
- JPA 프록시 객체 직렬화 실패
- Lazy Loading 관계 직렬화 실패
- 양방향 연관관계로 인한 순환 참조
- 불필요한 데이터까지 캐싱되어 메모리 낭비
- Entity 변경 시 캐시 데이터 구조도 변경됨

**해결 방법**

```java
// 올바른 예시
@Cacheable("userCache")
public UserDto getUser(Long id) {
    User user = userRepository.findById(id).orElseThrow();
    return UserDto.from(user); // DTO로 변환 후 반환
}

// DTO 정의
public class UserDto {
    private Long id;
    private String name;
    private String email;
    
    public static UserDto from(User user) {
        UserDto dto = new UserDto();
        dto.id = user.getId();
        dto.name = user.getName();
        dto.email = user.getEmail();
        return dto;
    }
    
    // getter/setter
}
```

### 5. 직렬화 가능한 DTO 설계

**Jackson JSON 직렬화 기준 요구사항**

`GenericJackson2JsonRedisSerializer`를 쓴다면 캐싱 대상 DTO는 다음 중 하나를 만족해야 한다.

```java
// 방법 1: 기본 생성자 + Getter/Setter (가장 안전)
public class DataDto {
    private String field1;
    private int field2;
    
    // 기본 생성자 필수
    public DataDto() {}
    
    // 모든 필드에 대한 getter/setter
    public String getField1() { return field1; }
    public void setField1(String field1) { this.field1 = field1; }
    // ...
}

// 방법 2: @JsonCreator 사용 (불변 객체)
public class DataDto {
    private final String field1;
    private final int field2;
    
    @JsonCreator
    public DataDto(@JsonProperty("field1") String field1,
                   @JsonProperty("field2") int field2) {
        this.field1 = field1;
        this.field2 = field2;
    }
    
    // getter만 있어도 됨
    public String getField1() { return field1; }
    public int getField2() { return field2; }
}
```

**`Serializable`을 구현해야 할까?**

Redis에 저장한다고 해서 DTO가 항상 `Serializable`을 구현해야 하는 것은 아니다. 이 설정처럼
`GenericJackson2JsonRedisSerializer`를 쓰는 경우에는 Jackson이 기본 생성자/`@JsonCreator`, getter/setter
또는 생성자 파라미터 정보를 보고 JSON으로 직렬화·역직렬화한다.

`Serializable`과 `serialVersionUID`가 의미 있는 경우는 JDK 직렬화 기반의 `JdkSerializationRedisSerializer`를
쓸 때다. JSON 직렬화에서는 `serialVersionUID`가 역직렬화 호환성을 보장하지 않으므로, DTO 필드 변경 시에는
기존 캐시 무효화나 버전이 다른 캐시 키를 사용하는 식으로 대응해야 한다.

**피해야 할 패턴**

```java
// 잘못된 예시 1: 기본 생성자 없음
public class DataDto {
    private final String field;
    
    public DataDto(String field) { // @JsonCreator 없음
        this.field = field;
    }
}

// 잘못된 예시 2: Getter 없음
public class DataDto {
    private String field;
    
    public DataDto() {}
    // 기본 설정에서는 Jackson이 속성으로 인식하지 못할 수 있음
}

// 잘못된 예시 3: 복잡한 객체 포함
public class DataDto {
    private InputStream stream; // 직렬화 불가능한 타입
    private Connection connection; // 리소스 객체
}

// 주의 예시 4: JDK 직렬화기를 쓰는데 serialVersionUID 누락
public class DataDto implements Serializable {
    // JdkSerializationRedisSerializer 사용 시 클래스 변경 후 호환성 문제가 생길 수 있음
    private String field;
}
```

### 6. 컬렉션 타입 처리

목록 응답도 Entity 컬렉션을 그대로 캐싱하지 말고, DTO 컬렉션이나 목록 응답 DTO로 변환해서 저장한다.
캐시에서 꺼낸 뒤에도 타입을 예측할 수 있도록 반환 타입은 구체적으로 둔다.

```java
@Cacheable("listCache")
public List<DataDto> getData() {
    return repository.findAll().stream()
        .map(DataDto::from)
        .collect(Collectors.toList());
}

public class DataListResponse {
    private List<DataDto> items;
    private int totalCount;
    
    public DataListResponse() {} // 기본 생성자
    
    // getter/setter
}

@Cacheable("listCache")
public DataListResponse getData() {
    List<DataDto> items = repository.findAll().stream()
        .map(DataDto::from)
        .collect(Collectors.toList());
    
    DataListResponse response = new DataListResponse();
    response.setItems(items);
    response.setTotalCount(items.size());
    return response;
}
```

### 7. 페이징 처리

**문제 상황**

```java
// 잘못된 예시
@Cacheable("pageCache")
public Page<Entity> getPage(Pageable pageable) {
    return repository.findAll(pageable); // Page 객체 직렬화 문제
}
```

**해결 방법**

```java
// 페이징 응답 DTO 정의
public class PageResponse<T> {
    private List<T> content;
    private int pageNumber;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    
    public PageResponse() {} // 기본 생성자
    
    public static <T> PageResponse<T> from(Page<T> page) {
        PageResponse<T> response = new PageResponse<>();
        response.setContent(page.getContent());
        response.setPageNumber(page.getNumber());
        response.setPageSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        return response;
    }
    
    // getter/setter
}

// 올바른 사용
@Cacheable("pageCache")
public PageResponse<DataDto> getPage(int page, int size) {
    Page<Entity> entityPage = repository.findAll(PageRequest.of(page, size));
    Page<DataDto> dtoPage = entityPage.map(DataDto::from);
    return PageResponse.from(dtoPage);
}
```

### 8. 캐싱 조건 처리

**결과나 파라미터에 따라 캐싱에서 제외해야 할 경우**

```java
// 예외 발생 시 캐싱하지 않기
@Cacheable(value = "dataCache", unless = "#result == null")
public DataDto getData(Long id) {
    return repository.findById(id)
        .map(DataDto::from)
        .orElse(null);
}

// 특정 조건에서만 캐싱
@Cacheable(value = "dataCache", condition = "#id > 0")
public DataDto getData(Long id) {
    return repository.findById(id)
        .map(DataDto::from)
        .orElseThrow();
}
```

### 9. 날짜/시간 타입 처리

**문제 상황**

```java
// LocalDateTime, ZonedDateTime 등의 직렬화 이슈
public class DataDto {
    private LocalDateTime createdAt; // 직렬화 형식 주의
}
```

**해결 방법**

```java
// 방법 1: Redis 전용 ObjectMapper에 JavaTimeModule 추가
// 위 RedisConfig의 redisObjectMapper()처럼 registerModule(new JavaTimeModule())을 적용한다.

// 방법 2: 문자열로 변환
public class DataDto {
    private String createdAt; // ISO-8601 형식 문자열
    
    public static DataDto from(Entity entity) {
        DataDto dto = new DataDto();
        dto.createdAt = entity.getCreatedAt().toString();
        return dto;
    }
}

// 방법 3: 어노테이션 사용
public class DataDto {
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
```


## 발생한 주요 이슈

### 1. CustomResponseEntity 역직렬화 실패

**문제 상황**

```
org.springframework.data.redis.serializer.SerializationException: 
Could not read JSON: Cannot construct instance of `com.example.bbs.common.CustomResponseEntity` 
(although at least one Creator exists): cannot deserialize from Object value 
(no delegate- or property-based Creator)
```

**원인**

- `CustomResponseEntity` 클래스가 Jackson 역직렬화를 위한 적절한 생성자가 없음
- Redis에서 캐시된 데이터를 읽을 때 `GenericJackson2JsonRedisSerializer`가 객체를 생성할 수 없음

**단기 조치**

당장 구조를 바꾸기 어렵다면 `@JsonCreator` 생성자를 추가해 역직렬화 실패를 막을 수 있다. 다만 이 방법은
HTTP 응답 객체를 계속 캐싱한다는 한계가 있으므로 최종 해결책으로 두지는 않는다.

```java
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

public class CustomResponseEntity<T> extends ResponseEntity<T> {

    @JsonCreator
    public CustomResponseEntity(@JsonProperty("body") T body,
                                @JsonProperty("headers") MultiValueMap<String, String> headers,
                                @JsonProperty("statusCode") HttpStatusCode status) {
        super(body, headers, status);
    }
    
    // 기타 생성자들...
}
```

**최종 해결**

캐싱 대상에서 `ResponseEntity`와 커스텀 HTTP 래퍼를 제거하고, Service는 DTO만 반환하게 바꾼다. HTTP 상태
코드와 헤더는 Controller에서만 만든다.

### 2. HTTP 응답 객체가 캐싱 대상에 섞인 문제

**문제 상황**

`@Cacheable`이 붙은 메서드가 `ResponseEntity`를 반환하는 구조:

```java
// 문제가 있는 구조
public ResponseEntity<OnairCommentArticleListDto> getCacheableOnairCommentArticle(...) {
    OnairCommentArticleListDto result = new OnairCommentArticleListDto();
    // 비즈니스 로직
    return new CustomResponseEntity<>(result, HttpStatus.OK);
}
```

**Redis 캐싱 관점의 문제점**

- `ResponseEntity`, `HttpStatus`, `HttpHeaders`까지 Redis 직렬화 대상에 포함됨
- 응답 래퍼 생성자나 내부 필드 구조에 따라 역직렬화 실패 가능성이 커짐
- 캐시 값의 스키마가 API 응답 포맷에 묶여, 응답 포맷 변경이 캐시 호환성 문제로 이어질 수 있음

**해결 방법**

Service는 DTO만 반환하고, Controller에서 ResponseEntity 생성:

```java
// Service
@Cacheable(value = "getCacheableOnairCommentArticle", 
           key = "'getCacheableOnairCommentArticle_' + #commentId + #prevSeq + #size")
public OnairCommentArticleListDto getCacheableOnairCommentArticle(...) {
    OnairCommentArticleListDto result = new OnairCommentArticleListDto();
    // 비즈니스 로직
    return result;
}

// Controller
private ResponseEntity<OnairCommentArticleListDto> getOnairComment(...) {
    OnairCommentArticleListDto result;
    if (user != null)
        result = commentService.getOnairCommentArticle(user, prevSeq, commentId, size);
    else
        result = commentService.getCacheableOnairCommentArticle(user, prevSeq, commentId, size);
    
    return new CustomResponseEntity<>(result, HttpStatus.OK);
}
```

### 3. 폭주 트래픽과 Cache Stampede — "짧은 TTL" 기조와 지터 사이의 고민

게시판 목록이나 실시간 댓글처럼 순간적으로 트래픽이 몰리는 API가 있었다. 여기에 캐시를 적용하면서
"캐시는 최대한 짧게(최소 5초) 가져간다"는 기조를 세웠는데, 짧은 TTL이 오히려 Cache Stampede를 자주
유발한다는 게 문제였다. 처음엔 지터를 주고 싶어도 "수명을 늘리는" 방향이라 기조와 충돌한다고 생각했다.

정리하다 보니 Stampede를 두 종류로 나눠서 봐야 했다. 둘은 원인도 해법도 다르다.

| 유형 | 상황 | 대응 |
| :--- | :--- | :--- |
| 핫키 동시 미스 | 인기 게시판 한 키에 수천 요청 → 만료 순간 전부 DB로 | 분산 락, stale-while-revalidate 등 |
| 동시 대량 만료 | 여러 키가 같은 순간 생성 → 동시에 만료 | TTL 지터 |

`@Cacheable(sync = true)`도 단일 인스턴스 안에서는 같은 키의 동시 miss를 줄일 수 있지만, 서버가 2대 이상이면
인스턴스마다 DB 조회가 발생할 수 있다. 실제 프로젝트도 이중화된 환경이었기 때문에, 전체 클러스터 기준의
해결책으로 보기는 어려웠다.

#### 개선: 대량 만료는 음수 지터 — 단, TTL을 늘리지 않는 방향으로

지터를 흔히 `TTL = base + random`으로 떠올리는데, 이러면 수명이 늘어 "짧게" 기조와 충돌한다.
앞의 `RedisConfig` 예시도 실제 프로젝트 기준으로는 `base + random` 방식이었다. 운영상 큰 문제는 없었지만,
최대 TTL을 넘기지 않는다는 기준까지 지키려면 **빼는 방향(음수)으로만** 적용하는 편이 더 낫다.
실제 TTL을 `[base × (1 - ratio), base]` 범위로
무작위화하면, 최대 수명은 base를 절대 넘지 않으면서 만료 시점만 흩어진다. 기조와 충돌하지 않는다.

Spring Data Redis 3.2부터는 `RedisCacheConfiguration.entryTtl(TtlFunction)`으로 캐시 쓰기 시점마다
TTL을 계산할 수 있다. 별도 `RedisCacheWriter` 데코레이터를 만들 필요 없이 설정에서 바로 지터를 줄 수 있다.

```java
@Bean
RedisCacheConfiguration defaultRedisCacheConfiguration() {
    Duration baseTtl = Duration.ofSeconds(5);
    double jitterRatio = 0.2;

    return RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl((key, value) -> {
            long ttlMillis = baseTtl.toMillis();
            long maxJitter = (long) (ttlMillis * jitterRatio);
            long jitter = ThreadLocalRandom.current().nextLong(maxJitter + 1);
            return Duration.ofMillis(ttlMillis - jitter);
        });
}
```

ratio 0.2 기준으로 5초 → `[4.0s, 5.0s]`, 1분 → `[48s, 60s]`가 된다. 캐시별로 base TTL이 다르다면
캐시 이름별 `RedisCacheConfiguration`을 나눠서 같은 방식으로 적용하면 된다. 비율은
`redis.cache.jitter-ratio` 같은 프로퍼티로 빼두면 프로파일별 튜닝도 쉽다.

정리하면 **"짧게 유지"와 stampede 방지는 지터의 방향(음수)만 잡으면 상충하지 않는다.** 음수 지터로
대량 만료를 흩고, 핫키 동시 미스까지 더 줄여야 하면 분산 락이나 stale-while-revalidate로 넘어가는
단계별 설계가 가능하다.

## 운영 기준

앞에서 다룬 직렬화, 캐싱 DTO 분리 원칙을 지켰다면 운영 단계에서는 캐시 키, TTL, 무효화 전략을
명확히 정하는 것이 중요하다.

### 1. 캐시 키 설계

**권장 패턴**

```java
@Cacheable(value = "cacheName", 
           key = "'prefix_' + #param1 + '_' + #param2")
public DataDto getData(String param1, String param2) {
    // ...
}
```

**주의사항**

- 캐시 키는 고유해야 함
- 사용자별로 다른 데이터인 경우 userId를 키에 포함
- null 파라미터 처리 고려
- 키는 짧게 유지 (Redis 키는 최대 512MB까지 가능하지만, 성능을 위해 가능한 짧게 — 보통 수백 byte 이내로 권장)

### 2. 캐시 만료 시간 설정

이 프로젝트처럼 `RedisCacheManager`를 직접 구성한다면 `spring.cache.redis.time-to-live` 하나로
전체 TTL을 잡기보다, 캐시 이름을 그룹으로 나눠 TTL을 다르게 가져가는 편이 운영하기 쉽다.

```yaml
redis:
  cache:
    second:
      - getCacheableOnairCommentArticle
      - getCacheableBoardList
    minutes:
      1:
        - getCacheableArticle
      10:
        - getCacheableCodeList
```

위 설정은 `RedisConfig.cacheManager()`에서 캐시 이름별 `RedisCacheConfiguration`으로 변환된다.
`@Cacheable(value = "getCacheableBoardList")`처럼 사용한 캐시 이름이 `redis.cache.second`에 있으면
5초 TTL 그룹으로 들어가고, `redis.cache.minutes.10`에 있으면 10분 TTL 그룹으로 들어간다.

TTL은 데이터 변경 빈도에 맞춰 정하면 된다. 실시간성이 중요한 데이터는 짧게 가져가거나 캐싱에서 빼고,
메모리 사용량과 성능 사이에서 타협한다.

최소 TTL 권장

TTL을 1~2초처럼 너무 짧게 잡으면 캐시 히트율이 낮아 캐싱을 안 한 것과 큰 차이가 없고,
만료 순간에 요청이 DB로 몰리는 Cache Stampede가 생기기 쉽다. Redis와의 통신과 직렬화/역직렬화도
계속 반복되어 오히려 손해다. 실시간성이 필요한 데이터라도 최소 5~10초 정도는 두는 편이 낫다고 본다.

TTL 분류 예시

| 데이터 성격 | 권장 TTL | 비고 |
| :--- | :--- | :--- |
| 정적 데이터 | 10분 이상 | 코드, 카테고리처럼 변경 빈도가 낮은 데이터 |
| 준정적 데이터 | 1~10분 | 게시판 설정, 공통 메타 정보 |
| 동적 목록 데이터 | 5초~1분 | 목록, 댓글, 인기 글처럼 조회가 많고 변경도 있는 데이터 |
| 강한 실시간 데이터 | 캐싱 제외 또는 수동 관리 | 정확도가 더 중요하면 Cache-Aside나 직접 무효화 사용 |

짧은 TTL을 써야 한다면 스케줄러로 미리 캐시를 갱신해 두는 방법도 있다.

```java
// 스케줄러로 주기적으로 캐시 갱신
@Scheduled(fixedDelay = 8000) // 8초마다 실행
public void warmUpCache() {
    DataDto data = repository.findData();
    cacheManager.getCache("dataCache").put("fixedKey", data);
}
```

`@CacheEvict` 후 같은 클래스 내부에서 `@Cacheable` 메서드를 직접 호출하는 방식은 피해야 한다.
Spring Cache는 프록시 기반이라 self-invocation에서는 캐시 어노테이션이 적용되지 않는다. 스케줄러에서는
위처럼 `CacheManager`로 직접 넣거나, 캐시 메서드를 다른 빈으로 분리해 프록시를 통해 호출한다.

## 테스트 가이드

### 1. 직렬화/역직렬화 테스트

```java
@Autowired
@Qualifier("redisObjectMapper")
ObjectMapper redisObjectMapper;

@Test
void testRedisSerialization() {
    YourDto original = new YourDto(...);
    
    // 직렬화
    String json = redisObjectMapper.writeValueAsString(original);
    
    // 역직렬화
    YourDto deserialized = redisObjectMapper.readValue(json, YourDto.class);
    
    assertThat(deserialized).usingRecursiveComparison().isEqualTo(original);
}
```

### 2. 캐시 동작 테스트

```java
@Test
void testCaching() {
    // 첫 번째 호출 - DB 조회
    DataDto result1 = service.getCachedData("key");
    
    // 두 번째 호출 - 캐시에서 조회
    DataDto result2 = service.getCachedData("key");
    
    // Redis를 거치면 역직렬화된 새 인스턴스가 반환될 수 있으므로 값 동등성을 확인
    assertThat(result2).usingRecursiveComparison().isEqualTo(result1);
    
    // DB 호출이 1번만 발생했는지 검증
    verify(repository, times(1)).findData("key");
}
```

---

## 부록: Redis 캐시 전략 패턴

Cache-Aside, Write-Through, Write-Behind, Refresh-Ahead, Cache Stampede 방지 전략은 내용이 길어져
별도 글로 분리했다.

- [Redis 캐시 전략 패턴 정리]({% post_url 2026-03-13-Spring-Redis-cache-patterns %})
