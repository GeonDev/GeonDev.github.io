---
layout: post
title: Redis 캐싱 적용 가이드
date: 2026-03-12
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

# Redis 캐싱 적용 가이드

## 개요

본 문서는 Spring Boot 프로젝트에 Redis 캐싱을 적용하면서 발생한 이슈와 해결 방법을 정리한 가이드입니다.
향후 프로젝트에서 Redis를 도입할 때 참고하여 동일한 문제를 사전에 방지할 수 있습니다.

## 프로젝트 설계 원칙

Redis 캐싱을 고려한 프로젝트는 처음부터 다음 원칙을 따라 설계해야 합니다.

### 1. 레이어별 객체 분리

**Controller 계층**
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

**Service 계층**
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

**Repository 계층**
- 데이터 접근만 담당
- Entity 반환
- 비즈니스 로직 포함 금지

### 2. Entity를 직접 반환하지 않기

**문제점**

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
public class UserDto implements Serializable {
    private static final long serialVersionUID = 1L;
    
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

### 3. 직렬화 가능한 DTO 설계

**필수 요구사항**

모든 캐싱 대상 DTO는 다음을 만족해야 합니다:

```java
// 방법 1: 기본 생성자 + Getter/Setter (가장 안전)
public class DataDto implements Serializable {
    private static final long serialVersionUID = 1L;
    
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
public class DataDto implements Serializable {
    private static final long serialVersionUID = 1L;
    
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

**Serializable 인터페이스 구현 이유**

- Java 표준 직렬화 메커니즘 지원
- Redis 직렬화 방식에 따라 필요할 수 있음
- `serialVersionUID`를 명시하여 버전 관리
- 클래스 구조 변경 시 역직렬화 호환성 보장

**피해야 할 패턴**

```java
// 잘못된 예시 1: 기본 생성자 없음
public class DataDto implements Serializable {
    private final String field;
    
    public DataDto(String field) { // @JsonCreator 없음
        this.field = field;
    }
}

// 잘못된 예시 2: Getter 없음
public class DataDto implements Serializable {
    private String field;
    
    public DataDto() {}
    // getter가 없으면 직렬화 불가
}

// 잘못된 예시 3: 복잡한 객체 포함
public class DataDto implements Serializable {
    private InputStream stream; // 직렬화 불가능한 타입
    private Connection connection; // 리소스 객체
}

// 잘못된 예시 4: serialVersionUID 누락
public class DataDto implements Serializable {
    // serialVersionUID 없음 - 클래스 변경 시 역직렬화 실패 가능
    private String field;
}
```

### 4. Wrapper 클래스 사용 시 주의사항

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

### 5. 컬렉션 타입 처리

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
public class DataListResponse implements Serializable {
    private static final long serialVersionUID = 1L;
    
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

### 6. 페이징 처리

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
public class PageResponse<T> implements Serializable {
    private static final long serialVersionUID = 1L;
    
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

### 7. 예외 처리

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

### 8. 날짜/시간 타입 처리

**문제 상황**

```java
// LocalDateTime, ZonedDateTime 등의 직렬화 이슈
public class DataDto {
    private LocalDateTime createdAt; // 직렬화 형식 주의
}
```

**해결 방법**

```java
// 방법 1: Jackson 설정 추가
@Configuration
public class JacksonConfig {
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}

// 방법 2: 문자열로 변환
public class DataDto implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String createdAt; // ISO-8601 형식 문자열
    
    public static DataDto from(Entity entity) {
        DataDto dto = new DataDto();
        dto.createdAt = entity.getCreatedAt().toString();
        return dto;
    }
}

// 방법 3: 어노테이션 사용
public class DataDto implements Serializable {
    private static final long serialVersionUID = 1L;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
```

## 발생한 주요 이슈

### 1. CustomResponseEntity 역직렬화 실패

**문제 상황**

```
org.springframework.data.redis.serializer.SerializationException: 
Could not read JSON: Cannot construct instance of `com.jtbc.bbs.common.CustomResponseEntity` 
(although at least one Creator exists): cannot deserialize from Object value 
(no delegate- or property-based Creator)
```

**원인**

- `CustomResponseEntity` 클래스가 Jackson 역직렬화를 위한 적절한 생성자가 없음
- Redis에서 캐시된 데이터를 읽을 때 `GenericJackson2JsonRedisSerializer`가 객체를 생성할 수 없음

**해결 방법**

`@JsonCreator` 어노테이션을 사용한 생성자 추가:

```java
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

public class CustomResponseEntity<T> extends ResponseEntity {

    @JsonCreator
    public CustomResponseEntity(@JsonProperty("body") Object body, 
                                @JsonProperty("headers") MultiValueMap headers, 
                                @JsonProperty("statusCode") HttpStatusCode status) {
        super(body, headers, status);
    }
    
    // 기타 생성자들...
}
```

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

## Redis 캐싱 적용 시 주의사항

### 1. 직렬화 가능한 객체 설계

**필수 요구사항**

캐싱 대상 클래스는 다음 중 하나를 만족해야 합니다:

- 기본 생성자(no-args constructor) 제공
- `@JsonCreator`가 붙은 생성자 제공
- 모든 필드에 대한 setter 메서드 제공

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
- 도메인 객체 (직렬화 가능한 경우)
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
- 키 길이 제한 확인 (Redis 권장: 512MB 이하)

### 6. 캐시 만료 시간 설정

**설정 예시**

```yaml
spring:
  cache:
    redis:
      time-to-live: 600000  # 10분 (밀리초)
```

**고려사항**

- 데이터 변경 빈도에 따라 TTL 조정
- 실시간성이 중요한 데이터는 짧은 TTL 또는 캐싱 제외
- 메모리 사용량과 성능 간 트레이드오프 고려

**최소 TTL 권장 사항**

캐시 만료 시간은 최소 5~10초 이상으로 설정하는 것을 권장합니다.

너무 짧은 TTL의 문제점:

1. **Cache Stampede (캐시 스탬피드)**
    - 캐시가 만료되는 순간 동시에 여러 요청이 DB로 몰림
    - DB에 순간적으로 높은 부하 발생
    - 캐시의 효과가 거의 없음

2. **네트워크 오버헤드**
    - Redis와의 빈번한 통신으로 네트워크 비용 증가
    - 직렬화/역직렬화 작업 반복으로 CPU 사용량 증가

3. **캐싱 효율 저하**
    - 1~2초 TTL은 캐시 히트율이 매우 낮음
    - 캐싱을 하지 않는 것과 큰 차이 없음

**TTL 설정 가이드**

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

**캐시 워밍업 전략**

짧은 TTL을 사용해야 하는 경우:

```java
// 스케줄러로 주기적으로 캐시 갱신
@Scheduled(fixedDelay = 8000) // 8초마다 실행
public void warmUpCache() {
    // TTL이 만료되기 전에 미리 캐시 갱신
    cacheManager.getCache("dataCache").clear();
    getData(); // 캐시 재생성
}
```

## 테스트 가이드

### 1. 직렬화/역직렬화 테스트

```java
@Test
void testRedisSerialization() {
    ObjectMapper mapper = new ObjectMapper();
    YourDto original = new YourDto(...);
    
    // 직렬화
    String json = mapper.writeValueAsString(original);
    
    // 역직렬화
    YourDto deserialized = mapper.readValue(json, YourDto.class);
    
    assertEquals(original, deserialized);
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
    
    // 동일한 객체 반환 확인
    assertSame(result1, result2);
    
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

가장 일반적인 캐싱 패턴으로, Spring의 `@Cacheable`이 이 패턴을 구현합니다.

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

데이터를 쓸 때 캐시와 DB에 동시에 저장하는 패턴입니다.

**동작 방식**

1. 애플리케이션이 데이터 저장 요청
2. 캐시에 먼저 저장
3. 캐시가 DB에 저장
4. 완료 응답

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
- 캐시와 DB 데이터 일관성 보장
- 읽기 성능 향상 (항상 최신 데이터가 캐시에 존재)

**단점**
- 쓰기 지연 시간 증가
- 사용하지 않는 데이터도 캐싱될 수 있음

**적합한 경우**
- 데이터 일관성이 중요한 경우
- 쓴 데이터를 곧바로 읽는 패턴

### 3. Write-Behind (Write-Back)

데이터를 캐시에만 먼저 쓰고, 나중에 비동기로 DB에 저장하는 패턴입니다.

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
        Set<String> keys = redisTemplate.keys("viewCount:*");
        
        for (String key : keys) {
            Long count = redisTemplate.opsForValue().get(key);
            String articleId = key.replace("viewCount:", "");
            
            articleRepository.updateViewCount(articleId, count);
            redisTemplate.delete(key);
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

캐시 만료 전에 미리 갱신하는 패턴입니다.

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
    @CacheEvict(value = "popularArticles", key = "'top10'")
    public void refreshPopularArticles() {
        // 캐시 삭제 후 재조회로 갱신
        getPopularArticles();
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

여러 요청이 동시에 Cache Miss를 만나 DB에 몰리는 현상을 방지합니다.

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
        
        try {
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
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
        } finally {
            lock.unlock();
        }
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
        
        // TTL의 10% 남았을 때 10% 확률로 갱신
        double refreshProbability = 1.0 - (remainingTTL / totalTTL);
        
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
