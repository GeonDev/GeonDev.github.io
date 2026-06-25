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

운영하던 게시판 서비스에 Redis 캐싱을 적용하면서 직렬화 실패와 레이어 구조 문제로 적지 않게 시간을 썼다.
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

### 2. 레이어별 객체 분리

Controller 계층
- HTTP 요청/응답 처리 전담
- `ResponseEntity`, `HttpHeaders` 등 HTTP 관련 객체만 사용
- Service로부터 받은 DTO를 ResponseEntity로 감싸서 반환

```java
// 올바른 예시
@GetMapping("/api/data")
public ResponseEntity<DataDto> getData() {
    DataDto data = service.getData();
    return ResponseEntity.ok(data);
}

// 잘못된 예시
@GetMapping("/api/data")
public ResponseEntity<DataDto> getData() {
    return service.getData(); // Service가 ResponseEntity 반환 - 잘못됨
}
```

Service 계층
- 순수 비즈니스 로직만 처리
- DTO 또는 도메인 객체만 반환
- HTTP 관련 객체(ResponseEntity, HttpStatus 등) 사용 금지
- 캐싱 어노테이션 적용 위치

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

Repository 계층
- 데이터 접근만 담당
- Entity 반환
- 비즈니스 로직 포함 금지

### 3. Entity를 직접 반환하지 않기

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

### 4. 직렬화 가능한 DTO 설계

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

**Serializable은 언제 필요한가**

`GenericJackson2JsonRedisSerializer`처럼 Jackson JSON 기반 직렬화기를 쓰는 경우 `Serializable` 구현은
필수가 아니다. Jackson은 기본 생성자/`@JsonCreator`, getter/setter 또는 생성자 파라미터 정보를 보고
JSON으로 직렬화·역직렬화한다.

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

### 5. Wrapper 클래스 사용 시 주의사항

**문제 상황**

```java
// 잘못된 예시
public class CustomResponseEntity<T> extends ResponseEntity {
    // 제네릭 타입 정보 손실
}

// 사용 시 타입 에러 발생
ResponseEntity<DataDto> response = new CustomResponseEntity<>(data, HttpStatus.OK);
// 경고: unchecked assignment
```

**해결 방법**

```java
// 방법 1: 제네릭 타입 제대로 상속
public class CustomResponseEntity<T> extends ResponseEntity<T> {
    public CustomResponseEntity(T body, HttpStatusCode status) {
        super(body, status);
    }
}

// 방법 2: Wrapper 대신 정적 팩토리 메서드 사용
public class ResponseFactory {
    public static <T> ResponseEntity<T> success(T data) {
        return ResponseEntity.ok(data);
    }
    
    public static <T> ResponseEntity<T> created(T data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(data);
    }
}
```

### 6. 컬렉션 타입 처리

**문제 상황**

```java
// 잘못된 예시
@Cacheable("listCache")
public List getData() { // Raw type 사용
    return repository.findAll();
}
```

**해결 방법**

```java
// 올바른 예시 1: 제네릭 명시
@Cacheable("listCache")
public List<DataDto> getData() {
    return repository.findAll().stream()
        .map(DataDto::from)
        .collect(Collectors.toList());
}

// 올바른 예시 2: Wrapper 클래스 사용
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

### 8. 예외 처리

**캐싱 대상에서 제외해야 할 경우**

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

### 2. 레이어 분리 문제

**문제 상황**

Service 레이어에서 `ResponseEntity`를 반환하는 구조:

```java
// 문제가 있는 구조
public ResponseEntity<OnairCommentArticleListDto> getCacheableOnairCommentArticle(...) {
    OnairCommentArticleListDto result = new OnairCommentArticleListDto();
    // 비즈니스 로직
    return new CustomResponseEntity<>(result, HttpStatus.OK);
}
```

**문제점**

- Service 레이어가 HTTP 프로토콜 계층(ResponseEntity)에 의존
- 비즈니스 로직과 HTTP 응답 처리가 혼재
- HTTP 관련 객체를 캐싱하면서 직렬화 이슈 발생 가능성 증가
- 테스트 시 HTTP 객체를 다뤄야 하는 불편함
- 다른 인터페이스(gRPC, 메시지 큐 등)에서 재사용 불가

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
| 핫키 동시 미스 | 인기 게시판 한 키에 수천 요청 → 만료 순간 전부 DB로 | `sync = true` |
| 동시 대량 만료 | 여러 키가 같은 순간 생성 → 동시에 만료 | TTL 지터 |

#### 해결 1: 핫키는 `sync = true`

핫키 하나에 요청이 몰리는 경우는 지터로는 분산이 안 된다(키가 하나라서). 동시 미스를 막아주는
`sync = true`를 고트래픽 read 메서드에 붙였다.

```java
@Cacheable(value = "generalArticleList",
        key = "#bbsId + '_' + #mgtAuth.isBbsMgtMode() + '_' + #pageable.pageNumber + '_' + #pageable.pageSize",
        condition = "...",
        sync = true)
public GeneralArticleListDto getArticleList(...) { ... }
```

단, `sync = true`는 Spring이 `Cache.get(key, valueLoader)` 경로를 쓰도록 하는 옵션이고, 실제 동기화
범위는 캐시 구현체와 writer 설정에 따라 달라진다. Redis를 쓰더라도 클러스터 전체에서 항상 한 번만
DB를 친다고 가정하면 안 된다. `lockingRedisCacheWriter`를 쓰면 Redis lock key로 중복 로드를 줄일 수
있지만 락 범위가 캐시 이름 단위라 같은 캐시의 다른 키까지 대기할 수 있다(키별 락이 아니다). 이걸로도
부족하면 별도 분산 락이나 stale-while-revalidate로 넘어가면 된다.

#### 해결 2: 대량 만료는 음수 지터 — 단, TTL을 늘리지 않는 방향으로

지터를 흔히 `TTL = base + random`으로 떠올리는데, 이러면 수명이 늘어 "짧게" 기조와 충돌한다.
그래서 **빼는 방향(음수)으로만** 적용했다. 실제 TTL을 `[base × (1 - ratio), base]` 범위로
무작위화하면, 최대 수명은 base를 절대 넘지 않으면서 만료 시점만 흩어진다. 기조와 충돌하지 않는다.

Spring Data Redis 3.1에서는 `entryTtl`이 정적 `Duration`만 받기 때문에(per-entry TTL 함수는 3.2+
부터 지원) `RedisCacheWriter`를 데코레이터로 감싸 put 시점에 지터를 줬다.

```java
public class JitterRedisCacheWriter implements RedisCacheWriter {
    private final RedisCacheWriter delegate;
    private final double jitterRatio; // 예: 0.2

    private Duration applyJitter(Duration ttl) {
        if (ttl == null || ttl.isZero() || ttl.isNegative() || jitterRatio <= 0) return ttl;
        long ttlMillis = ttl.toMillis();
        long maxJitter = (long) (ttlMillis * jitterRatio);
        if (maxJitter <= 0) return ttl;
        long jitter = ThreadLocalRandom.current().nextLong(maxJitter + 1);
        return Duration.ofMillis(ttlMillis - jitter); // 항상 줄이는 방향
    }

    @Override
    public void put(String name, byte[] key, byte[] value, Duration ttl) {
        delegate.put(name, key, value, applyJitter(ttl));
    }

    @Override
    public byte[] putIfAbsent(String name, byte[] key, byte[] value, Duration ttl) {
        return delegate.putIfAbsent(name, key, value, applyJitter(ttl));
    }

    // get / remove / clean / 통계 메서드는 모두 delegate 로 위임
    // Spring Data Redis 버전에 따라 retrieve, withStatisticsCollector 등 추가 메서드도 위임
}
```

```java
@Bean
RedisCacheWriter redisCacheWriter(RedisConnectionFactory cf) {
    return new JitterRedisCacheWriter(
        RedisCacheWriter.lockingRedisCacheWriter(cf), 0.2);
}
```

ratio 0.2 기준으로 5초 → `[4.0s, 5.0s]`, 1분 → `[48s, 60s]`가 된다. 캐시별 정적 TTL 매핑
(5초/1분/10분)은 그대로 두고 writer 한 곳만 바꿔서 전 캐시에 일괄 적용된다. 비율은
`redis.cache.jitterRatio` 같은 프로퍼티로 빼두면 프로파일별 튜닝도 쉽다.

#### 함정: `sync = true`를 켜자 커스텀 캐시의 변환이 우회됐다

Page 직렬화 문제 때문에 `CustomCache.put()`에서 `Page → RestPage`로 바꿔 저장하고 있었는데,
`sync = true`로 바꾸자 목록 캐시 역직렬화가 깨졌다. 원인은 sync 여부에 따라 호출 흐름이 다르기 때문이었다.

- **sync=false**: Spring이 `cache.get(key)` → miss면 메서드 실행 → `cache.put(key, value)` → 여기서 변환됨
- **sync=true**: Spring이 `cache.get(key, valueLoader)` 호출 → 내부 `RedisCache`가 valueLoader 결과를 **자기 자신의 put**으로 저장 → 우리 래퍼의 `put()`을 안 탐 → 변환 누락

그래서 `get(key, valueLoader)` 경로에서도 동일 변환을 하도록 valueLoader를 감쌌다.

```java
@Override
public <T> T get(Object key, Callable<T> valueLoader) {
    // sync=true 경로에서도 Page -> RestPage 변환을 보장
    return delegate.get(key, () -> {
        T value = valueLoader.call();
        if (value instanceof Page) {
            return (T) new RestPage((Page) value);
        }
        return value;
    });
}
```

정리하면 **"짧게 유지"와 stampede 방지는 지터의 방향(음수)만 잡으면 상충하지 않는다.** 핫키는
sync로 동시 미스를 막고, 음수 지터로 대량 만료를 흩고, 더 줄여야 하면 분산 락이나
stale-while-revalidate로 넘어가는 단계별 설계가 가능하다. 커스텀 캐시 래퍼를 쓰고 있다면 sync로
바꿀 때 get/put 양쪽 경로의 변환 일치를 꼭 확인해야 한다.

## Redis 캐싱 적용 시 주의사항

### 1. 직렬화 가능한 객체 설계

**Jackson JSON 직렬화 기준 요구사항**

`GenericJackson2JsonRedisSerializer` 기준으로 캐싱 대상 클래스는 다음 중 하나를 만족해야 한다.

- 기본 생성자(no-args constructor) 제공
- `@JsonCreator`가 붙은 생성자 제공
- 기본 생성자를 쓴다면 역직렬화에 필요한 setter 또는 필드 접근 설정 제공

**권장 사항**

```java
// 방법 1: 기본 생성자 + Getter/Setter
public class CacheableDto {
    private String field1;
    private int field2;
    
    public CacheableDto() {} // 기본 생성자 필수
    
    // getter, setter
}

// 방법 2: @JsonCreator 사용
public class CacheableDto {
    private final String field1;
    private final int field2;
    
    @JsonCreator
    public CacheableDto(@JsonProperty("field1") String field1,
                       @JsonProperty("field2") int field2) {
        this.field1 = field1;
        this.field2 = field2;
    }
    
    // getter만 있어도 됨
}
```

### 2. 캐싱 대상 선정

**캐싱하면 안 되는 것**

- HTTP 관련 객체 (ResponseEntity, HttpHeaders 등)
- 세션 정보
- 인증/인가 관련 객체
- 파일 스트림, 데이터베이스 연결 등 리소스 객체

**캐싱해야 하는 것**

- 순수 데이터 DTO
- 조회 결과 리스트
- 계산 결과값

### 3. 레이어별 책임 분리

**Controller 계층**

- HTTP 요청/응답 처리
- ResponseEntity 생성
- 상태 코드, 헤더 설정

**Service 계층**

- 비즈니스 로직 처리
- DTO 반환
- 캐싱 적용 (`@Cacheable`, `@CacheEvict` 등)

**Repository 계층**

- 데이터 접근
- 엔티티 반환

### 4. 제네릭 타입 처리

**문제 상황**

제네릭 타입을 사용하는 클래스를 캐싱할 때 타입 정보 손실 가능:

```java
public class GenericResponse<T> {
    private T data;
    // ...
}
```

**해결 방법**

- 가능하면 구체적인 타입의 DTO 사용
- 제네릭이 필요한 경우 `@JsonTypeInfo` 사용 고려
- 또는 타입 정보를 별도 필드로 관리

### 5. 캐시 키 설계

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

### 6. 캐시 만료 시간 설정

기본 TTL은 다음처럼 설정한다.

```yaml
spring:
  cache:
    redis:
      time-to-live: 600000  # 10분 (밀리초)
```

TTL은 데이터 변경 빈도에 맞춰 정하면 된다. 실시간성이 중요한 데이터는 짧게 가져가거나 캐싱에서 빼고,
메모리 사용량과 성능 사이에서 적당히 타협한다.

최소 TTL 권장

TTL을 1~2초처럼 너무 짧게 잡으면 캐시 히트율이 낮아 캐싱을 안 한 것과 큰 차이가 없고,
만료 순간에 요청이 DB로 몰리는 Cache Stampede가 생기기 쉽다. Redis와의 통신과 직렬화/역직렬화도
계속 반복되어 오히려 손해다. 실시간성이 필요한 데이터라도 최소 5~10초 정도는 두는 편이 낫다고 본다.

TTL 설정 예시

```yaml
# 정적 데이터 (거의 변경되지 않음)
spring.cache.redis.time-to-live: 3600000  # 1시간

# 준정적 데이터 (하루 1~2회 변경)
spring.cache.redis.time-to-live: 600000   # 10분

# 동적 데이터 (자주 변경되지만 실시간성 불필요)
spring.cache.redis.time-to-live: 60000    # 1분

# 실시간성 필요 데이터 (최소 권장)
spring.cache.redis.time-to-live: 10000    # 10초

# 실시간 데이터
# 캐싱하지 않거나 Cache-Aside 패턴으로 수동 관리
```

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

## 체크리스트

프로젝트에 Redis 캐싱을 적용하기 전 다음 사항을 확인하세요:

- [ ] 캐싱 대상 클래스가 직렬화 가능한가?
- [ ] 기본 생성자 또는 `@JsonCreator` 생성자가 있는가?
- [ ] Service 레이어에서 HTTP 객체를 반환하지 않는가?
- [ ] 캐시 키가 고유하게 설계되었는가?
- [ ] 적절한 TTL이 설정되었는가?
- [ ] Cache Stampede(폭주 트래픽) 대비책이 있는가? (핫키 `sync`, 음수 지터 등)
- [ ] 민감한 정보가 캐싱되지 않는가?
- [ ] 직렬화/역직렬화 테스트를 작성했는가?
- [ ] 캐시 무효화 전략이 수립되었는가?

## 참고 자료

- Spring Cache Abstraction: https://docs.spring.io/spring-framework/reference/integration/cache.html
- Spring Data Redis: https://docs.spring.io/spring-data/redis/reference/
- Jackson Annotations: https://github.com/FasterXML/jackson-annotations

---

## 부록: Redis 캐시 전략 패턴

### 1. Cache-Aside (Lazy Loading)

가장 일반적인 캐싱 패턴으로, Spring의 `@Cacheable`이 이 패턴을 구현한다.

**동작 방식**

1. 애플리케이션이 캐시에서 데이터 조회
2. 캐시에 데이터가 있으면 반환 (Cache Hit)
3. 캐시에 데이터가 없으면 DB 조회 (Cache Miss)
4. DB에서 조회한 데이터를 캐시에 저장 후 반환

**구현 예시**

```java
@Service
public class UserService {
    
    @Cacheable(value = "users", key = "#userId")
    public UserDto getUser(Long userId) {
        // Cache Miss 시에만 실행됨
        return userRepository.findById(userId)
            .map(UserDto::from)
            .orElseThrow();
    }
    
    @CacheEvict(value = "users", key = "#userId")
    public void updateUser(Long userId, UserDto dto) {
        User user = userRepository.findById(userId).orElseThrow();
        user.update(dto);
        userRepository.save(user);
    }
}
```

**장점**
- 구현이 간단함
- 필요한 데이터만 캐싱 (메모리 효율적)
- 캐시 장애 시에도 애플리케이션 동작 가능

**단점**
- 첫 요청은 항상 느림 (Cache Miss)
- Cache Stampede 가능성

**적합한 경우**
- 읽기가 많고 쓰기가 적은 데이터
- 모든 데이터를 캐싱할 필요가 없는 경우

### 2. Write-Through

데이터를 쓸 때 캐시와 DB에 동시에 저장하는 패턴이다.

**동작 방식**

1. 애플리케이션이 데이터 저장 요청
2. DB 저장
3. 메서드 반환값으로 캐시 갱신
4. 완료 응답

Spring의 `@CachePut`은 메서드를 실행한 뒤 반환값을 캐시에 넣는다. 트랜잭션 롤백까지 고려한 강한 일관성이
필요하면 transaction-aware `CacheManager`를 쓰거나 커밋 이후 캐시를 갱신하도록 별도 처리가 필요하다.

**구현 예시**

```java
@Service
public class UserService {
    
    @CachePut(value = "users", key = "#result.id")
    public UserDto createUser(UserCreateDto dto) {
        User user = User.create(dto);
        User saved = userRepository.save(user);
        return UserDto.from(saved);
    }
    
    @CachePut(value = "users", key = "#userId")
    public UserDto updateUser(Long userId, UserDto dto) {
        User user = userRepository.findById(userId).orElseThrow();
        user.update(dto);
        User saved = userRepository.save(user);
        return UserDto.from(saved);
    }
}
```

**장점**
- 캐시와 DB 데이터 일관성을 유지하기 쉬움
- 읽기 성능 향상 (항상 최신 데이터가 캐시에 존재)

**단점**
- 쓰기 지연 시간 증가
- 사용하지 않는 데이터도 캐싱될 수 있음

**적합한 경우**
- 데이터 일관성이 중요한 경우
- 쓴 데이터를 곧바로 읽는 패턴

### 3. Write-Behind (Write-Back)

데이터를 캐시에만 먼저 쓰고, 나중에 비동기로 DB에 저장하는 패턴이다.

**동작 방식**

1. 애플리케이션이 캐시에 데이터 저장
2. 즉시 응답 반환
3. 백그라운드에서 일정 주기로 DB에 저장

**구현 예시**

```java
@Service
public class ViewCountService {
    
    private final RedisTemplate<String, Long> redisTemplate;
    
    // 조회수 증가 (캐시에만 저장)
    public void incrementViewCount(String articleId) {
        String key = "viewCount:" + articleId;
        redisTemplate.opsForValue().increment(key);
    }
    
    // 스케줄러로 주기적으로 DB 동기화
    @Scheduled(fixedDelay = 60000) // 1분마다
    public void syncViewCountToDB() {
        ScanOptions options = ScanOptions.scanOptions()
            .match("viewCount:*")
            .count(1000)
            .build();

        try (Cursor<String> keys = redisTemplate.scan(options)) {
            while (keys.hasNext()) {
                String key = keys.next();
                Long count = redisTemplate.opsForValue().get(key);
                String articleId = key.replace("viewCount:", "");

                articleRepository.updateViewCount(articleId, count);
                redisTemplate.delete(key);
            }
        }
    }
}
```

**장점**
- 쓰기 성능이 매우 빠름
- DB 부하 감소 (배치 처리 가능)

**단점**
- 캐시 장애 시 데이터 손실 가능
- 데이터 일관성 보장 어려움

**적합한 경우**
- 쓰기가 매우 빈번한 경우 (조회수, 좋아요 등)
- 일부 데이터 손실이 허용되는 경우

### 4. Refresh-Ahead

캐시 만료 전에 미리 갱신하는 패턴이다.

**동작 방식**

1. 캐시 TTL이 임박하면 백그라운드에서 데이터 갱신
2. 사용자는 항상 캐시된 데이터 조회
3. Cache Miss 발생 최소화

**구현 예시**

```java
@Service
public class PopularArticleService {
    
    // 인기 게시글 조회 (캐시 사용)
    @Cacheable(value = "popularArticles", key = "'top10'")
    public List<ArticleDto> getPopularArticles() {
        return articleRepository.findTop10ByOrderByViewCountDesc()
            .stream()
            .map(ArticleDto::from)
            .collect(Collectors.toList());
    }
    
    // 스케줄러로 주기적으로 캐시 갱신
    @Scheduled(fixedDelay = 50000) // 50초마다 (TTL 60초 가정)
    public void refreshPopularArticles() {
        List<ArticleDto> articles = articleRepository.findTop10ByOrderByViewCountDesc()
            .stream()
            .map(ArticleDto::from)
            .collect(Collectors.toList());
        cacheManager.getCache("popularArticles").put("top10", articles);
    }
}
```

**장점**
- 사용자는 항상 빠른 응답 경험
- Cache Miss 최소화

**단점**
- 구현 복잡도 증가
- 불필요한 갱신 발생 가능

**적합한 경우**
- 예측 가능한 트래픽 패턴
- 항상 빠른 응답이 필요한 경우

### 5. Cache Stampede 방지 전략

여러 요청이 동시에 Cache Miss를 만나 DB에 몰리는 현상을 막는 방법이다.

**문제 상황**

```java
// 캐시 만료 시점에 100개 요청이 동시에 들어오면
// 100개 모두 DB 조회 발생
@Cacheable("data")
public DataDto getData() {
    return repository.findData(); // 100번 실행됨
}
```

**해결 방법 1: @Cacheable의 sync 옵션**

```java
@Cacheable(value = "data", key = "#id", sync = true)
public DataDto getData(Long id) {
    // 동시 요청 중 첫 번째만 실행, 나머지는 대기
    return repository.findById(id)
        .map(DataDto::from)
        .orElseThrow();
}
```

단, `sync = true`는 캐시 구현체가 `Cache.get(key, valueLoader)`를 어떻게 구현했는지에 영향을 받는다.
Redis에서도 writer 설정에 따라 동기화 범위와 효과가 달라지므로, 멀티 인스턴스 환경에서 DB 호출이
무조건 1건으로 줄어든다고 보면 안 된다. `lockingRedisCacheWriter`는 Redis lock key를 쓰지만 캐시 이름
단위로 잠그기 때문에 같은 캐시의 다른 키까지 대기할 수 있다. 클러스터 전체를 더 엄격하게 제어하려면
분산 락(방법 2)을, 만료 시점만 분산하려면 지터(방법 4)를 함께 쓴다.

**해결 방법 2: 분산 락 사용**

```java
@Service
public class DataService {
    
    private final RedissonClient redissonClient;
    
    public DataDto getData(Long id) {
        String cacheKey = "data:" + id;
        DataDto cached = getFromCache(cacheKey);
        
        if (cached != null) {
            return cached;
        }
        
        // 분산 락 획득
        RLock lock = redissonClient.getLock("lock:" + cacheKey);
        boolean locked = false;
        
        try {
            locked = lock.tryLock(5, 10, TimeUnit.SECONDS);
            if (locked) {
                // 락 획득 후 다시 캐시 확인 (Double-Check)
                cached = getFromCache(cacheKey);
                if (cached != null) {
                    return cached;
                }
                
                // DB 조회 및 캐싱
                DataDto data = repository.findById(id)
                    .map(DataDto::from)
                    .orElseThrow();
                
                saveToCache(cacheKey, data);
                return data;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while acquiring cache rebuild lock: " + cacheKey, e);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }

        throw new IllegalStateException("Failed to acquire cache rebuild lock: " + cacheKey);
    }
}
```

**해결 방법 3: 확률적 조기 만료**

```java
public DataDto getData(Long id) {
    String cacheKey = "data:" + id;
    CachedData cached = getFromCacheWithTTL(cacheKey);
    
    if (cached != null) {
        long remainingTTL = cached.getRemainingTTL();
        long totalTTL = 600; // 10분
        
        // TTL이 임박할수록 갱신 확률이 커진다 (long 나눗셈이 0이 되지 않도록 double 캐스팅)
        double refreshProbability = 1.0 - ((double) remainingTTL / totalTTL);
        
        if (Math.random() < refreshProbability * 0.1) {
            // 백그라운드에서 비동기 갱신
            CompletableFuture.runAsync(() -> refreshCache(id));
        }
        
        return cached.getData();
    }
    
    // Cache Miss 처리
    return loadAndCache(id);
}
```

**해결 방법 4: 음수 지터(TTL Jitter)**

여러 키가 같은 순간에 만료되어 한꺼번에 DB로 몰리는(동시 대량 만료) 경우는 sync로 못 막는다.
TTL에 약간의 무작위성을 줘서 만료 시점을 흩으면 된다. 이때 **수명을 늘리는 가산 지터 대신
줄이는 음수 지터**를 쓰면 "TTL은 최대한 짧게"라는 기조를 깨지 않는다. 실제 TTL이
`[base × (1 - ratio), base]` 범위에서 정해지므로 최대 수명은 base를 넘지 않는다.

```java
// RedisCacheWriter 데코레이터로 put 시점의 TTL을 줄이는 방향으로 무작위화
private Duration applyJitter(Duration ttl, double ratio) {
    if (ttl == null || ttl.isZero() || ttl.isNegative() || ratio <= 0) return ttl;
    long maxJitter = (long) (ttl.toMillis() * ratio);
    long jitter = ThreadLocalRandom.current().nextLong(maxJitter + 1);
    return Duration.ofMillis(ttl.toMillis() - jitter);
}
```

Spring Data Redis 3.2+ 라면 `RedisCacheConfiguration.entryTtl(TtlFunction)`으로 같은 효과를 더
간단히 줄 수 있다. (구현 상세는 위 "발생한 주요 이슈 > 폭주 트래픽과 Cache Stampede" 참고)

### 6. 패턴 선택 가이드

| 패턴 | 읽기 성능 | 쓰기 성능 | 일관성 | 구현 난이도 | 적합한 사용 사례 |
|------|----------|----------|--------|------------|----------------|
| Cache-Aside | 높음 | 중간 | 중간 | 낮음 | 일반적인 조회 API |
| Write-Through | 높음 | 낮음 | 높음 | 중간 | 금융 거래, 주문 정보 |
| Write-Behind | 높음 | 매우 높음 | 낮음 | 높음 | 조회수, 좋아요, 통계 |
| Refresh-Ahead | 매우 높음 | 중간 | 중간 | 높음 | 인기 게시글, 랭킹 |

**선택 기준**

1. **데이터 특성**
    - 정적 데이터 (거의 변경 없음): Cache-Aside + 긴 TTL
    - 동적 데이터 (자주 변경): Write-Through 또는 짧은 TTL
    - 실시간 데이터: 캐싱 제외 또는 매우 짧은 TTL

2. **트래픽 패턴**
    - 읽기 위주: Cache-Aside
    - 쓰기 위주: Write-Behind
    - 예측 가능한 트래픽: Refresh-Ahead

3. **일관성 요구사항**
    - 강한 일관성 필요: Write-Through
    - 최종 일관성 허용: Cache-Aside, Write-Behind
    - 일부 손실 허용: Write-Behind

4. **성능 요구사항**
    - 읽기 지연 최소화: Refresh-Ahead
    - 쓰기 지연 최소화: Write-Behind
    - 균형: Cache-Aside
