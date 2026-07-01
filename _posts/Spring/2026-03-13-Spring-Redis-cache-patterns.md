---
layout: post
title: Redis 캐시 전략 패턴 정리
date: 2026-03-13
Author: Geon Son
categories: Spring
tags: [Redis, Cache, Spring Boot, Cache-Aside, Cache Stampede]
comments: true
toc: true
---

Redis 캐싱을 적용할 때 직렬화 설정만큼 중요한 것이 어떤 캐시 전략을 쓸지 정하는 일이다. 대부분의 조회 API는
Spring Cache의 `@Cacheable`로 충분하지만, 쓰기 일관성이나 폭주 트래픽 대응이 필요해지면 Cache-Aside 외의
패턴도 검토해야 한다.

## 1. Cache-Aside (Lazy Loading)

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
- 필요한 데이터만 캐싱하므로 메모리 효율적
- 캐시 장애 시에도 DB 조회로 fallback 가능

**단점**
- 첫 요청은 항상 느림
- 캐시 만료 시점에 Cache Stampede가 생길 수 있음

**적합한 경우**
- 읽기가 많고 쓰기가 적은 데이터
- 모든 데이터를 미리 캐싱할 필요가 없는 경우

## 2. Write-Through

데이터를 쓸 때 DB와 캐시를 함께 갱신하는 패턴이다.

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
- 쓴 데이터를 곧바로 다시 읽는 흐름에서 유리함

**단점**
- 쓰기 지연 시간이 증가함
- 사용하지 않는 데이터도 캐싱될 수 있음

**적합한 경우**
- 데이터 일관성이 중요한 경우
- 저장 직후 조회가 자주 발생하는 경우

## 3. Write-Behind (Write-Back)

데이터를 캐시에 먼저 쓰고, 나중에 비동기로 DB에 저장하는 패턴이다.

**동작 방식**

1. 애플리케이션이 캐시에 데이터 저장
2. 즉시 응답 반환
3. 백그라운드에서 일정 주기로 DB에 저장

**구현 예시**

```java
@Service
public class ViewCountService {

    private final RedisTemplate<String, Long> redisTemplate;

    public void incrementViewCount(String articleId) {
        String key = "viewCount:" + articleId;
        redisTemplate.opsForValue().increment(key);
    }

    @Scheduled(fixedDelay = 60000)
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
- 쓰기 성능이 빠름
- DB 부하를 배치 처리로 줄일 수 있음

**단점**
- 캐시 장애 시 데이터 손실 가능성이 있음
- 강한 일관성을 보장하기 어려움

**적합한 경우**
- 조회수, 좋아요, 통계처럼 쓰기가 매우 빈번한 데이터
- 일부 지연 반영이나 손실을 허용할 수 있는 데이터

## 4. Refresh-Ahead

캐시 만료 전에 미리 갱신하는 패턴이다.

**동작 방식**

1. 캐시 TTL이 임박하면 백그라운드에서 데이터 갱신
2. 사용자는 캐시된 데이터 조회
3. Cache Miss 발생을 줄임

**구현 예시**

```java
@Service
public class PopularArticleService {

    @Cacheable(value = "popularArticles", key = "'top10'")
    public List<ArticleDto> getPopularArticles() {
        return articleRepository.findTop10ByOrderByViewCountDesc()
            .stream()
            .map(ArticleDto::from)
            .collect(Collectors.toList());
    }

    @Scheduled(fixedDelay = 50000) // TTL 60초 가정
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
- 사용자가 Cache Miss를 만날 가능성을 줄임
- 인기 데이터의 응답 시간을 안정적으로 유지하기 좋음

**단점**
- 구현 복잡도가 증가함
- 실제로 요청이 없는데도 불필요하게 갱신할 수 있음

**적합한 경우**
- 인기 게시글, 랭킹처럼 접근 패턴을 예측할 수 있는 데이터
- 항상 빠른 응답이 필요한 조회 API

## 5. Cache Stampede 방지 전략

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

### 5.1 `@Cacheable(sync = true)`

```java
@Cacheable(value = "data", key = "#id", sync = true)
public DataDto getData(Long id) {
    // 같은 인스턴스 안에서는 첫 번째 요청만 실행되고 나머지는 대기
    return repository.findById(id)
        .map(DataDto::from)
        .orElseThrow();
}
```

`sync = true`는 같은 애플리케이션 인스턴스 안에서 같은 키에 대한 동시 miss를 줄이는 옵션이다. 서버가 2대 이상인
이중화 환경에서는 인스턴스 A와 B가 서로의 메서드 실행 상태를 알지 못하므로, 같은 Redis 키가 동시에 만료되면
A에서도 한 번, B에서도 한 번 DB를 조회할 수 있다.

Redis에서도 writer 설정에 따라 동기화 범위와 효과가 달라진다. `lockingRedisCacheWriter`는 Redis lock key를
쓰지만 캐시 이름 단위로 잠그기 때문에 같은 캐시의 다른 키까지 대기할 수 있다. 클러스터 전체를 더 엄격하게
제어하려면 분산 락을, 만료 시점만 분산하려면 TTL 지터를 함께 검토한다.

### 5.2 분산 락 사용

아래 예시는 Redisson의 `RLock`을 사용하는 방식이다. 이 방식을 쓰려면 프로젝트에 Redisson 의존성을 추가하고,
`RedissonClient` 빈을 설정해야 한다.

```gradle
implementation "org.redisson:redisson-spring-boot-starter:3.x.x"
```

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.x.x</version>
</dependency>
```

```java
@Configuration
public class RedissonConfig {

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        config.useSingleServer()
            .setAddress("redis://localhost:6379");
        return Redisson.create(config);
    }
}
```

```java
@Service
public class DataService {

    private final RedissonClient redissonClient;
    private final CacheManager cacheManager;
    private final DataRepository repository;

    public DataDto getData(Long id) {
        String cacheKey = "data:" + id;
        DataDto cached = getFromCache(cacheKey);

        if (cached != null) {
            return cached;
        }

        RLock lock = redissonClient.getLock("lock:" + cacheKey);
        boolean locked = false;

        try {
            // 최대 5초 동안 락 획득을 기다리고, 락을 잡으면 10초 뒤 자동 해제된다.
            locked = lock.tryLock(5, 10, TimeUnit.SECONDS);
            if (locked) {
                // 락을 기다리는 동안 다른 인스턴스가 캐시를 채웠을 수 있으므로 다시 확인
                cached = getFromCache(cacheKey);
                if (cached != null) {
                    return cached;
                }

                DataDto data = repository.findById(id)
                    .map(DataDto::from)
                    .orElseThrow();

                saveToCache(cacheKey, data);
                return data;
            }
        } catch (InterruptedException e) {
            // 락 대기 중 인터럽트가 발생하면 인터럽트 상태를 복구하고 실패로 처리한다.
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while acquiring cache rebuild lock: " + cacheKey, e);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                // 현재 스레드가 잡은 락일 때만 해제한다.
                lock.unlock();
            }
        }

        throw new IllegalStateException("Failed to acquire cache rebuild lock: " + cacheKey);
    }

    private DataDto getFromCache(String cacheKey) {
        // 분산 락을 직접 다루기 때문에 @Cacheable 대신 CacheManager로 명시적으로 조회한다.
        Cache cache = cacheManager.getCache("data");
        return cache != null ? cache.get(cacheKey, DataDto.class) : null;
    }

    private void saveToCache(String cacheKey, DataDto data) {
        // TTL은 RedisCacheConfiguration의 "data" 캐시 설정을 따른다.
        Cache cache = cacheManager.getCache("data");
        if (cache != null) {
            cache.put(cacheKey, data);
        }
    }
}
```

`getFromCache()`와 `saveToCache()`는 예시를 단순하게 보이도록 분리한 캐시 조회/저장 메서드다. 분산 락으로
cache rebuild 구간을 직접 제어해야 하므로 `@Cacheable`에 전부 맡기기보다 `CacheManager`로 캐시를 명시적으로
읽고 쓴다.
`tryLock(5, 10, TimeUnit.SECONDS)`는 최대 5초 동안 락 획득을 기다리고, 락을 잡으면 10초 뒤 자동으로
해제되도록 lease time을 거는 호출이다.

분산 락은 멀티 인스턴스 환경에서 같은 키의 cache rebuild를 한 번으로 줄이고 싶을 때 쓴다. 다만 락 획득 실패,
대기 시간, 락 만료 시간, 장애 시 처리 정책을 함께 정해야 한다. 위 예시처럼 락 획득 후 캐시를 한 번 더 확인하는
double-check도 필요하다.

Redisson을 사용할 때 락 해제는 보통 `finally`에서 처리한다. 현재 스레드가 잡은 락인지 확인한 뒤 `unlock()`을
호출하면, Redisson이 내부적으로 소유자 확인과 해제 처리를 수행한다.

```java
RLock lock = redissonClient.getLock("lock:" + cacheKey);
boolean locked = false;

try {
    locked = lock.tryLock(5, 10, TimeUnit.SECONDS);
    if (!locked) {
        throw new IllegalStateException("Failed to acquire lock: " + cacheKey);
    }

    // DB 조회 후 캐시 재생성
} finally {
    if (locked && lock.isHeldByCurrentThread()) {
        lock.unlock();
    }
}
```

Spring Cache는 캐시 추상화이지 분산 락 라이브러리가 아니므로 락 획득과 해제를 대신 처리해주지는 않는다.
직접 Redis 명령으로 락을 구현할 수도 있지만 토큰 비교 해제, TTL, 장애 상황을 모두 직접 다뤄야 하므로
보통은 Redisson 같은 검증된 라이브러리를 사용하는 편이 낫다.

### 5.3 Fencing Token으로 늦은 쓰기 방어

분산 락을 잡았더라도 락 TTL이 먼저 만료될 수 있다. 예를 들어 A 인스턴스가 락을 잡고 DB 조회를 오래 수행하는
동안 lease time이 만료되면, B 인스턴스가 같은 락을 새로 잡고 더 최신 작업을 수행할 수 있다. 이때 A가 뒤늦게
결과를 저장하면 B의 결과를 덮어쓰는 문제가 생긴다. 이런 상황을 stale writer 문제라고 볼 수 있다.

이 문제를 줄이는 방법 중 하나가 fencing token이다. 락을 획득할 때마다 단조 증가하는 토큰을 발급하고, 실제
쓰기 대상은 자신이 받은 토큰이 현재 저장된 토큰보다 크거나 같을 때만 쓰기를 허용한다. 늦게 도착한 이전 작업자는
더 작은 토큰을 가지고 있으므로 쓰기가 거부된다.

Redis에서는 `RAtomicLong`으로 fencing token을 만들 수 있다.

```java
@Service
public class FencedDataService {

    private final RedissonClient redissonClient;
    private final CacheManager cacheManager;
    private final DataRepository repository;

    public void rebuildCacheWithFence(Long id) {
        String cacheKey = "data:" + id;
        RLock lock = redissonClient.getLock("lock:" + cacheKey);
        boolean locked = false;

        try {
            locked = lock.tryLock(5, 10, TimeUnit.SECONDS);
            if (!locked) {
                throw new IllegalStateException("Failed to acquire lock: " + cacheKey);
            }

            // 락을 획득한 순서대로 증가하는 fencing token을 발급한다.
            long fencingToken = redissonClient
                .getAtomicLong("fence:" + cacheKey)
                .incrementAndGet();

            DataDto data = repository.findById(id)
                .map(DataDto::from)
                .orElseThrow();

            // 실제 저장 시점에 token을 비교해서 늦게 도착한 이전 작업자의 쓰기를 막는다.
            saveIfCurrent(cacheKey, data, fencingToken);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while acquiring lock: " + cacheKey, e);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

캐시에 저장할 때는 데이터와 token을 함께 저장한다. 아래 예시는 개념을 보여주기 위한 단순한 형태다.

```java
public record FencedCacheValue<T>(T data, long fencingToken) {
}
```

```java
private void saveIfCurrent(String cacheKey, DataDto data, long fencingToken) {
    Cache cache = cacheManager.getCache("data");
    if (cache == null) {
        return;
    }

    FencedCacheValue<DataDto> current = cache.get(cacheKey, FencedCacheValue.class);
    if (current != null && current.fencingToken() > fencingToken) {
        // 더 최신 token으로 저장된 값이 있으므로 늦게 끝난 이전 작업자의 결과는 버린다.
        return;
    }

    cache.put(cacheKey, new FencedCacheValue<>(data, fencingToken));
}
```

캐시가 아니라 DB row를 갱신하는 경우에는 DB 테이블에 `fencing_token` 컬럼을 두고 조건부 update를 걸 수 있다.
DB의 조건부 update는 비교와 쓰기가 한 문장으로 처리되므로 더 강한 방어가 된다.

```sql
UPDATE payment_result
   SET status = ?,
       fencing_token = ?
 WHERE payment_id = ?
   AND fencing_token < ?;
```

위 쿼리에서는 새로 발급받은 fencing token을 `SET fencing_token = ?`와 `AND fencing_token < ?` 양쪽에 같은
값으로 전달한다. update count가 0이면 더 최신 token이 이미 반영된 상태이므로 현재 작업 결과는 버린다.

fencing token은 락 자체를 대체하는 기능이 아니다. 락은 동시에 같은 작업이 몰리는 것을 줄이고, fencing token은
락 TTL 만료나 지연 실행 때문에 늦게 도착한 작업자가 최신 결과를 덮어쓰는 것을 막는다. 중요한 쓰기 작업이라면
두 가지를 함께 고려하는 편이 안전하다.

### 5.4 확률적 조기 만료

```java
public DataDto getData(Long id) {
    String cacheKey = "data:" + id;
    CachedData cached = getFromCacheWithTTL(cacheKey);

    if (cached != null) {
        long remainingTTL = cached.getRemainingTTL();
        long totalTTL = 600; // 10분

        double refreshProbability = 1.0 - ((double) remainingTTL / totalTTL);

        if (Math.random() < refreshProbability * 0.1) {
            CompletableFuture.runAsync(() -> refreshCache(id));
        }

        return cached.getData();
    }

    return loadAndCache(id);
}
```

TTL이 임박할수록 일부 요청이 미리 캐시를 갱신하게 하는 방식이다. 모든 요청이 만료 시점에 동시에 DB로 몰리는
상황을 줄일 수 있지만, 구현 복잡도가 올라가고 비동기 갱신 실패 처리가 필요하다.

### 5.5 음수 지터(TTL Jitter)

여러 키가 같은 순간에 생성되어 동시에 만료되는 경우는 `sync = true`로 막기 어렵다. TTL에 약간의 무작위성을 줘서
만료 시점을 흩으면 된다. 이때 수명을 늘리는 가산 지터 대신 줄이는 음수 지터를 쓰면 "TTL은 최대한 짧게"라는
기조를 깨지 않는다.

```java
RedisCacheConfiguration.defaultCacheConfig()
    .entryTtl((key, value) -> {
        Duration baseTtl = Duration.ofSeconds(5);
        double ratio = 0.2;
        long maxJitter = (long) (baseTtl.toMillis() * ratio);
        long jitter = ThreadLocalRandom.current().nextLong(maxJitter + 1);
        return Duration.ofMillis(baseTtl.toMillis() - jitter);
    });
```

Spring Data Redis 3.2부터는 `RedisCacheConfiguration.entryTtl(TtlFunction)`으로 캐시 쓰기 시점마다 TTL을
계산할 수 있다. ratio 0.2 기준으로 5초 TTL은 `[4.0s, 5.0s]`, 1분 TTL은 `[48s, 60s]` 범위에서 정해진다.

## 6. 패턴 선택 가이드

| 패턴 | 읽기 성능 | 쓰기 성능 | 일관성 | 구현 난이도 | 적합한 사용 사례 |
|------|----------|----------|--------|------------|----------------|
| Cache-Aside | 높음 | 중간 | 중간 | 낮음 | 일반적인 조회 API |
| Write-Through | 높음 | 낮음 | 높음 | 중간 | 쓴 직후 바로 읽히는 데이터 |
| Write-Behind | 높음 | 매우 높음 | 낮음 | 높음 | 조회수, 좋아요, 통계 |
| Refresh-Ahead | 매우 높음 | 중간 | 중간 | 높음 | 인기 게시글, 랭킹 |

**선택 기준**

1. **데이터 특성**
    - 정적 데이터: Cache-Aside + 긴 TTL
    - 동적 데이터: Cache-Aside + 짧은 TTL 또는 Write-Through
    - 실시간 데이터: 캐싱 제외 또는 매우 짧은 TTL

2. **트래픽 패턴**
    - 읽기 위주: Cache-Aside
    - 쓰기 위주: Write-Behind
    - 예측 가능한 트래픽: Refresh-Ahead

3. **일관성 요구사항**
    - 강한 일관성 필요: Write-Through 또는 캐시 무효화 중심 설계
    - 최종 일관성 허용: Cache-Aside, Write-Behind
    - 일부 손실 허용: Write-Behind

4. **성능 요구사항**
    - 읽기 지연 최소화: Refresh-Ahead
    - 쓰기 지연 최소화: Write-Behind
    - 균형: Cache-Aside
