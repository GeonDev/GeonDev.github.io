---
layout: post
title: JPA 성능 튜닝 - 빠른 쿼리인데 커넥션 풀 고갈
date: 2026-08-26
Author: Geon Son
categories: Spring
tags: [JPA, Spring Boot, HikariCP, MSSQL, Transaction, Redis, Cache, N+1]
comments: true
toc: true
---

이벤트성 게시판에서 순간 트래픽이 증가했을 때 HikariCP 커넥션 풀이 소진됐다. 성공한 SQL의 실행 시간은 짧았지만, 요청 하나가 JPA 리포지토리를 여러 번 호출하면서 커넥션을 순차로 얻는 구조가 대기열을 만들었다.

이 글의 코드와 이름은 실제 서비스와 무관한 일반화된 예제다. 핵심은 SQL 자체가 빠르더라도 트랜잭션 경계, N+1, 캐시, 인덱스가 겹치면 풀 고갈로 이어질 수 있다는 점이다.

## 1. SQL 시간보다 커넥션 획득 횟수를 먼저 센다

풀 고갈은 느린 SQL만으로 발생하지 않는다. 검증 조회와 메타데이터 조회가 각각 독립 트랜잭션으로 실행되면 요청 하나가 커넥션을 여러 번 빌린다. 풀이 비었을 때는 획득마다 `connectionTimeout`만큼 대기한다.

저장 요청이 검증, 상태 확인, 저장, 카운트 갱신을 차례로 실행한다고 가정해 보자. 두 단계만 풀 대기에 걸려도 응답 시간은 수십 초가 된다. 늦어진 응답은 사용자 재시도를 부르고, 재시도는 대기열을 더 길게 만든다.

JPA 성능 점검은 다음 순서로 시작했다.

1. API 한 건이 리포지토리를 몇 번 호출하는지 센다.
2. 각 호출이 같은 트랜잭션에 참여하는지 확인한다.
3. 캐시 히트와 미스에서 DB 쿼리 수를 따로 센다.
4. 그 다음에 실행 계획과 인덱스를 본다.

## 2. 조회 흐름을 하나의 읽기 트랜잭션으로 묶는다

회차 목록 화면은 이벤트 상태 조회, 회차 목록 조회, 사용자별 신청 여부 조회를 차례로 실행한다. 아래처럼 트랜잭션 경계가 없고 루프 안에서 리포지토리를 호출하면, 회차 수만큼 커넥션 획득과 쿼리가 늘어난다.

```java
public List<EventRoundResponse> getRounds(Long eventId, Long memberId) {
    List<EventRound> rounds = eventRoundRepository.findOpenByEventId(eventId);

    return rounds.stream()
        .map(round -> new EventRoundResponse(
            round.getId(),
            round.getName(),
            registrationRepository.existsByMemberIdAndRoundId(memberId, round.getId())
        ))
        .toList();
}
```

리포지토리 호출을 줄이는 것이 먼저지만, 그 전에도 조회 흐름 전체를 하나의 읽기 트랜잭션으로 묶어야 한다. 풀 소진 상태에서 요청이 대기를 여러 번 겪는 것을 막는다.

```java
@Transactional(readOnly = true, isolation = Isolation.READ_UNCOMMITTED)
public List<EventRoundResponse> getRounds(Long eventId, Long memberId) {
    List<EventRound> rounds = eventRoundRepository.findOpenByEventId(eventId);
    if (memberId == null || rounds.isEmpty()) {
        return rounds.stream()
            .map(round -> new EventRoundResponse(round.getId(), round.getName(), false))
            .toList();
    }

    Map<Long, Boolean> registeredByRoundId = registrationRepository
        .findRoundIdsByMemberIdAndRoundIdIn(
            memberId,
            rounds.stream().map(EventRound::getId).toList()
        )
        .stream()
        .collect(Collectors.toMap(Function.identity(), ignored -> true));

    return rounds.stream()
        .map(round -> new EventRoundResponse(
            round.getId(),
            round.getName(),
            registeredByRoundId.containsKey(round.getId())
        ))
        .toList();
}
```

`readOnly = true`는 실제 쓰기가 없는 조회에만 붙인다. 조회수 증가나 방어용 INSERT가 같은 흐름에 있으면 적용 전에 flush 동작을 확인해야 한다.

### READ_UNCOMMITTED는 바깥 트랜잭션에 둔다

SQL Server에서 `READ_UNCOMMITTED`가 허용되는 읽기라면 바깥 서비스 메서드에 격리 수준을 선언한다. 안쪽 리포지토리 메서드에만 선언하면 기존 쓰기 트랜잭션에 참여할 때 격리 수준이 바뀌지 않는다.

```java
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
public void register(RegisterCommand command) {
    if (registrationRepository.existsByMemberIdAndRoundId(
            command.memberId(), command.roundId())) {
        throw new DuplicateRegistrationException();
    }

    registrationRepository.save(
        new Registration(command.memberId(), command.roundId())
    );
}
```

`READ_UNCOMMITTED`는 미커밋 데이터를 읽는다. 중복 판정처럼 정합성이 중요한 경로에 적용할 때는 dirty read가 허용되는지 먼저 판단해야 한다. 가능하면 커밋된 데이터만 읽는 방식과 유니크 제약을 우선 검토한다.

## 3. N+1은 지연 로딩만의 문제가 아니다

위 코드의 N+1은 lazy loading이 아니라 서비스 루프 안의 명시적 리포지토리 호출이다. 회차가 열 개면 `exists` 쿼리도 열 번 실행된다.

사용자가 신청한 회차 ID를 한 번에 가져오면 된다.

```java
public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    @Query("""
        select r.roundId
        from Registration r
        where r.memberId = :memberId
          and r.roundId in :roundIds
        """)
    List<Long> findRoundIdsByMemberIdAndRoundIdIn(
        @Param("memberId") Long memberId,
        @Param("roundIds") List<Long> roundIds
    );
}
```

이 조회는 회차 수와 관계없이 한 번 실행된다. Hibernate SQL 로그에서 select 횟수만 보지 말고 서비스 반복문 안에 리포지토리 호출이 있는지도 확인해야 한다.

## 4. 캐시는 응답 전체가 아니라 공통 설정만 저장한다

목록이나 상세 응답에는 사용자별 신청 여부와 입력값이 섞일 수 있다. 응답 전체를 캐시하면 사용자별 키로 분산돼 히트율이 낮고, 개인 데이터가 공유 캐시에 남을 위험이 있다.

모든 사용자에게 같은 회차 목록처럼 설정성 데이터만 캐시한다. 캐시 값은 엔티티가 아닌 값 DTO로 둔다.

```java
@Service
@RequiredArgsConstructor
public class EventRoundCacheService {

    private final EventRoundRepository eventRoundRepository;

    @Cacheable(cacheNames = "eventRoundList", key = "#eventId")
    public List<EventRoundCacheDto> getOpenRounds(Long eventId) {
        return eventRoundRepository.findOpenByEventId(eventId).stream()
            .map(round -> new EventRoundCacheDto(round.getId(), round.getName()))
            .toList();
    }
}

public record EventRoundCacheDto(Long id, String name) {
}
```

쓰기 경로의 마감 판정, 중복 신청 검사, 사용자별 입력값은 캐시하지 않는다. 캐시 TTL은 데이터 변경 후 허용 가능한 지연 시간에서 결정한다. 짧은 TTL을 새로 만들기 전에 기존 캐시 정책과 직렬화 방식을 재사용할 수 있는지 확인하는 편이 낫다.

## 5. 인덱스 없는 중복 검사는 락 대기로 바뀐다

중복 신청 검사가 회원과 회차를 조건으로 조회하는데 해당 복합 인덱스가 없으면, 트래픽이 몰릴 때 넓은 범위를 스캔한다. 동시에 들어온 INSERT와 공유 락 대기가 생기는 구조다.

```sql
create unique index UX_REGISTRATION_MEMBER_ROUND
    on dbo.REGISTRATION (MEMBER_ID, ROUND_ID);
```

유니크 인덱스는 조회 범위를 좁히고 중복 저장도 DB에서 막는다. 애플리케이션의 `SELECT → INSERT` 검사는 사용자에게 빠른 오류를 돌려주기 위한 보조 수단이다. 두 요청이 동시에 `exists = false`를 읽는 경쟁 조건은 애플리케이션 코드만으로 없앨 수 없다.

기존 데이터에 중복이 있거나 유니크 제약을 당장 넣을 수 없으면, 먼저 비유니크 복합 인덱스로 스캔 범위부터 줄인다. 유니크 제약은 데이터 정리와 배포 계획을 별도로 잡아 적용한다.

## 6. 풀 크기보다 빠른 회복을 설계한다

풀 크기를 무작정 키우면 대기 중인 요청과 DB 락 경합도 함께 늘어난다. 풀 소진 때는 빨리 실패시키고 커넥션을 반환해야 대기열이 줄어든다.

```yaml
spring:
  datasource:
    hikari:
      connection-timeout: 10000

logging:
  level:
    com.zaxxer.hikari.pool.HikariPool: debug
```

`connection-timeout`만으로는 부족하다. 트랜잭션 전체, 단일 쿼리, JDBC 소켓 읽기에도 각각 상한이 필요하다. 커넥션 대기 예외는 일반 500 대신 503과 `Retry-After`로 변환해야 재시도 폭풍을 줄일 수 있다.

읽기 부하 테스트가 통과해도 쓰기와 도착률 초과 상태는 별도로 재현해야 한다. 고정 스레드의 읽기 테스트는 DB 처리량만 보여줄 뿐, 처리율을 넘은 요청이 쌓인 뒤 얼마나 빨리 회복하는지는 보여주지 않는다.

JPA 성능 튜닝에서 SQL 실행 시간만 보면 이 문제를 놓친다. 요청 단위의 트랜잭션 경계, 커넥션 획득 횟수, 캐시 키의 수렴도, 검증 조회의 인덱스를 함께 봐야 풀 고갈 이후에도 회복하는 구조가 된다.
