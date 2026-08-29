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

이벤트성 게시판에서 순간 트래픽이 증가했을 때 HikariCP 커넥션 풀이 소진됐다. 성공한 SQL의 실행 시간은 짧았지만, 요청 하나가 JPA 리포지토리를 여러 번 호출하면서 트랜잭션 설정 왕복과 풀 대기를 반복하는 구조가 대기열을 만들었다.

이 글의 코드와 이름은 실제 서비스와 무관한 일반화된 예제다. 핵심은 SQL 자체가 빠르더라도 트랜잭션 경계, N+1, 캐시, 인덱스가 겹치면 풀 고갈로 이어질 수 있다는 점이다.

## 1. SQL 시간보다 커넥션 획득 횟수를 먼저 센다

풀 고갈은 느린 SQL만으로 발생하지 않는다. 검증 조회와 메타데이터 조회가 각각 독립 트랜잭션으로 실행되면 요청 하나가 커넥션을 여러 번 빌린다. 풀이 비었을 때는 획득마다 `connectionTimeout`만큼 대기한다.

저장 요청이 검증, 상태 확인, 저장, 카운트 갱신을 차례로 실행되는 구조라고 하자. 두 단계만 풀 대기에 걸려도 응답 시간은 수십 초가 된다. 늦어진 응답은 사용자 재시도를 부르고, 재시도는 대기열을 더 길게 만든다.

JPA 성능 점검은 다음 순서로 시작했다.

1. API 한 건이 리포지토리를 몇 번 호출하는지 센다.
2. 각 호출이 같은 트랜잭션에 참여하는지 확인한다.
3. 캐시 히트와 미스에서 DB 쿼리 수를 따로 센다.
4. 그 다음에 실행 계획과 인덱스를 본다.

## 2. 조회 흐름을 하나의 읽기 트랜잭션으로 묶는다

회차 목록 화면은 이벤트 상태 조회, 회차 목록 조회, 사용자별 신청 여부 조회를 차례로 실행한다. 아래처럼 트랜잭션 경계가 없고 루프 안에서 리포지토리를 호출하면, 회차 수만큼 트랜잭션과 쿼리가 늘어난다.

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

정상 상태에서 HikariCP의 커넥션 획득 자체는 비용이 거의 없다. 이 변경의 근거는 획득 횟수가 아니다. `readOnly` 또는 `isolation`을 지정한 JPA 트랜잭션은 물리 커넥션을 즉시 얻고, SQL Server 드라이버는 격리 수준 설정을 서버에 전송한다.

리포지토리별로 트랜잭션을 열면 설정과 복구를 매번 왕복한다. 조회 흐름 전체를 하나의 읽기 트랜잭션으로 묶으면 이 왕복은 한 번으로 줄고, 풀이 소진된 상태에서도 커넥션 대기는 요청당 한 번만 발생한다.

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

트레이드오프도 있다. 트랜잭션을 먼저 열면 그 안의 Redis 조회 시간에도 커넥션을 점유한다. Redis처럼 수 ms인 작업은 대개 감당할 수 있지만, HTTP·파일·S3 같은 느린 외부 I/O를 경계 안에 넣으면 풀을 더 빨리 고갈시킨다. 풀 크기가 작은 서비스도 같은 계산을 다시 해야 한다.

`readOnly = true`는 실제 쓰기가 없는 조회에만 붙인다. 조회수 증가나 방어용 INSERT가 같은 흐름에 있으면 적용 전에 flush 동작을 확인해야 한다.

### READ_UNCOMMITTED는 바깥 트랜잭션에 둔다

SQL Server에서 `READ_UNCOMMITTED`가 허용되는 읽기라면 바깥 서비스 메서드에 격리 수준을 선언한다. 안쪽 리포지토리 메서드에만 선언하면 기존 쓰기 트랜잭션에 참여할 때 격리 수준이 바뀌지 않는다.

```java
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
public void cancelRegistration(Long registrationId) {
    Registration registration = registrationRepository.findById(registrationId)
        .orElseThrow(RegistrationNotFoundException::new);

    if (registration.isCancellationClosed()) {
        throw new CancellationClosedException();
    }

    registrationRepository.delete(registration);
}
```

### 쓰기 트랜잭션의 READ_UNCOMMITTED는 읽기 범위 전체에 적용된다

쓰기 메서드에 RU를 선언하면 검증 조회의 공유 락 대기를 줄일 수 있다. 다른 요청의 미커밋 INSERT가 넓은 범위를 스캔하는 SELECT를 막는 상황에서 효과가 있다. 하지만 INSERT·UPDATE·DELETE의 배타 락과 트랜잭션의 원자성은 그대로다. 이 설정은 쓰기를 잠금 없이 실행하는 방법이 아니다.

대신 트랜잭션 안의 모든 읽기가 미커밋 데이터를 볼 수 있다. 위 예제의 취소 가능 여부처럼 어드민 변경이 드물고, 잘못된 판정이 한 번의 재시도나 일시적 거절로 끝나는 데이터만 대상이다. 잔액, 재고, 권한, 정원처럼 잘못된 읽기가 확정 결과를 바꾸는 검증에는 적용하지 않는다.

중복 검사는 특히 분리해서 본다. `SELECT → INSERT`는 `READ_COMMITTED`에서도 두 요청이 동시에 없음을 읽을 수 있으므로 중복을 보장하지 못한다. RU는 미커밋 행을 읽어 일시적인 `DUPLICATE` 오탐을 만들 수 있을 뿐, 중복 방지 수단이 아니다. 복합 인덱스로 스캔과 락 대기를 줄이고, 최종 정합성은 유니크 제약으로 보장한다.

```sql
create unique index UX_REGISTRATION_MEMBER_ROUND
    on dbo.REGISTRATION (MEMBER_ID, ROUND_ID);
```

RU를 쓰기 메서드에 둘 때는 다음을 먼저 확인한다.

1. RU가 필요한 읽기와 그 뒤의 쓰기가 하나의 바깥 트랜잭션에 있는지 확인한다.
2. 트랜잭션 안의 다른 읽기까지 dirty read를 허용하는지 확인한다.
3. 전체 스캔이면 먼저 인덱스로 조회 범위를 줄인다.
4. 중복·수량·권한 같은 불변식은 DB 제약이나 원자적 갱신으로 보장한다.

## 3. 엔티티 연관 조회와 Repository 조회를 바꾸는 기준

엔티티 필드에서 연관 엔티티를 꺼내는 lazy loading과 Repository를 직접 호출하는 방식은 서로 반대가 아니다. 전자는 영속성 컨텍스트가 열려 있을 때 필드 접근 시점에 Hibernate가 SQL을 만든다. 후자는 애플리케이션 코드가 조회 조건과 실행 메서드를 명시한다.

첨부파일 목록처럼 연관 컬렉션을 접근해 실행한 lazy SQL에 `READ_UNCOMMITTED`를 적용해야 하는 경우가 있다. **lazy 필드에 접근하는 서비스 메서드의 바깥 트랜잭션**에 격리 수준을 선언하면 해당 SQL도 같은 커넥션에서 실행되므로 NOLOCK 효과를 받는다.

Repository 메서드에만 격리 수준을 선언해도 lazy SQL까지 자동으로 전파되지는 않는다. Repository 호출이 끝난 뒤 엔티티 필드에 접근하면 그 SQL은 호출 시점에 활성화된 트랜잭션을 따른다. 이미 바깥 트랜잭션이 `READ_COMMITTED`라면 안쪽 Repository의 `READ_UNCOMMITTED`는 기본 전파 정책에서 적용되지 않는다.

따라서 단순히 연관 데이터를 읽는 경로는 바깥 읽기 트랜잭션을 두고 lazy loading을 유지한다. 필요한 정렬·조건·projection을 명시하거나 연관 컬렉션의 SQL을 별도로 제어해야 할 때만 Repository 메서드로 옮긴다.

```java
@Transactional(readOnly = true, isolation = Isolation.READ_UNCOMMITTED)
public List<ArticleFile> getFiles(Long articleId) {
    return articleFileRepository.findAllByArticleIdOrderByOrderNo(articleId);
}
```

반대로 서비스 메서드 바깥에 이미 `READ_UNCOMMITTED` 읽기 트랜잭션이 있고, 그 안에서 연관 컬렉션을 읽는다면 lazy loading도 같은 커넥션과 격리 수준을 사용한다. 이 경우 Repository 호출로 바꿔도 NOLOCK 효과는 늘지 않는다. 관리 컬렉션을 수정하는 쓰기 경로라면 엔티티 연관 관계를 유지해야 변경 감지와 cascade 의미도 보존된다.

`EAGER`를 `LAZY`로 바꾸는 판단도 별개다. `EAGER`는 부모를 조회하는 순간 연관 엔티티까지 항상 가져온다. 대부분의 호출이 그 연관 데이터를 쓰지 않을 때만 `LAZY`가 DB 작업을 줄인다. 다만 컨트롤러 직렬화나 OSIV가 꺼진 배치가 트랜잭션 밖에서 필드에 접근하면 `LazyInitializationException`이 발생한다. 호출처가 모두 트랜잭션 안에서 접근하는지 확인하지 않았다면 `EAGER → LAZY` 전환은 하지 않는다.

| 상황 | 맞는 선택 |
|---|---|
| lazy SQL 자체에 별도 힌트·정렬·projection이 필요 | Repository 명시 호출 |
| 바깥 읽기 트랜잭션에서 `READ_UNCOMMITTED`만 적용하면 됨 | 엔티티 lazy loading 유지 |
| 대부분의 호출이 연관 데이터를 쓰지 않고 모든 접근이 트랜잭션 안 | `EAGER → LAZY` 검토 |
| 관리 컬렉션을 수정하거나 트랜잭션 밖 접근처가 남아 있음 | 연관 관계 유지, 전환 전 호출처 정리 |

## 4. N+1은 지연 로딩만의 문제가 아니다

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

## 5. 분리된 조회수 테이블은 원자적 UPDATE로 증가시킨다

장애 당시 게시물 행과 조회수 집계 행이 분리돼 있었고, 두 값이 일치하지 않거나 일부 증가 요청이 사라졌다. 상세 조회가 `SELECT`로 현재 조회수를 읽고 애플리케이션에서 1을 더한 뒤 저장하면, 같은 값을 읽은 두 요청이 같은 다음 값을 저장한다. 예를 들어 두 요청이 모두 `100`을 읽으면 둘 다 `101`을 저장하므로 실제 조회는 두 번이지만 최종 값은 한 번만 증가한다.

조회수처럼 현재 값에 일정 값을 더하는 작업은 엔티티를 읽지 않고 DB에서 한 문장으로 실행한다. QueryDSL의 [`JPAUpdateClause`](https://javadoc.io/doc/com.querydsl/querydsl-jpa/latest/com/querydsl/jpa/impl/JPAUpdateClause.html)는 JPQL bulk update를 만드는 클래스다. `set`의 오른쪽에 컬럼 식을 둘 수 있으므로 `VIEW_COUNT = VIEW_COUNT + 1`을 만든다. `execute()`의 반환값은 갱신된 행 수다.

```java
import com.querydsl.jpa.impl.JPAUpdateClause;

@Repository
@RequiredArgsConstructor
public class ArticleViewCountQueryRepository {

    private final EntityManager entityManager;

    public long increment(Long articleId) {
        QArticleViewCount articleViewCount = QArticleViewCount.articleViewCount;

        return new JPAUpdateClause(entityManager, articleViewCount)
            .set(articleViewCount.viewCount, articleViewCount.viewCount.add(1L))
            .where(articleViewCount.articleId.eq(articleId))
            .execute();
    }
}
```

SQL은 DB에서 행 잠금을 잡고 현재 값을 기준으로 계산한다. 같은 `ARTICLE_ID`를 여러 요청이 동시에 갱신해도 각 `UPDATE`가 순서대로 적용되므로 증가분이 덮어써지지 않는다. 이 장애의 조회수 메서드는 `REQUIRES_NEW`였으므로, 호출부도 새 트랜잭션에서 영향을 받은 행 수를 확인한다.

```java
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void increaseViewCount(Long articleId) {
    long updated = articleViewCountQueryRepository.increment(articleId);
    if (updated != 1) {
        throw new ArticleViewCountNotFoundException(articleId);
    }
}
```

`REQUIRES_NEW`는 바깥 트랜잭션을 잠시 중단하고 조회수 증가를 독립적으로 커밋한다. 상세 응답 생성이 나중에 실패해도 조회수 증가를 남겨야 하는 정책이라면 맞는다. 반대로 상세 조회의 성공과 조회수 증가가 함께 성공해야 한다면 기본 전파 정책으로 같은 트랜잭션에 참여시킨다.

이 전파 정책은 lost update를 해결하지 않는다. `SELECT → 값 증가 → save`를 새 트랜잭션에서 실행해도 동시에 시작한 두 새 트랜잭션은 같은 값을 읽을 수 있다. 원자적 `UPDATE`가 증가분 유실을 막고, `REQUIRES_NEW`는 커밋 경계를 분리한다.

커넥션 풀 관점에서는 비용이 있다. 바깥 상세 조회 트랜잭션이 이미 커넥션을 잡은 상태에서 이 메서드를 호출하면, 중단된 바깥 트랜잭션의 커넥션은 반환되지 않고 조회수 트랜잭션용 커넥션을 하나 더 빌린다. 상세 요청이 몰리면 요청 하나가 동시에 두 커넥션을 점유할 수 있다. 조회수 증가를 `REQUIRES_NEW`로 유지한다면 메서드 안에는 원자적 `UPDATE` 한 번만 두고, Redis·HTTP·파일 처리 같은 작업을 넣지 않는다.

`REQUIRES_NEW`는 Spring 프록시를 거쳐 호출돼야 적용된다. 같은 클래스의 메서드를 `this.increaseViewCount(...)`로 호출하면 새 트랜잭션이 열리지 않는다. 조회수 서비스를 별도 빈으로 분리하거나 프록시 호출 구조를 사용한다.

`updated == 0`은 조회수 행이 없다는 뜻이다. 게시물 생성 시 집계 행을 함께 만들거나, 별도 생성 경로가 있다면 `ARTICLE_ID` 유니크 제약과 INSERT 경쟁 조건 처리를 둬야 한다. 게시물 테이블에도 조회수를 중복 저장하면 다시 두 값의 동기화 문제가 생긴다. 표시용 조회수의 기준 테이블을 하나로 정하고, 다른 값은 조회 시 조인하거나 비동기 복제본으로 명확히 구분한다.

bulk update는 영속성 컨텍스트를 거치지 않는다. 같은 트랜잭션에서 `ArticleViewCount` 엔티티를 이미 조회했다면 메모리의 `viewCount`는 이전 값으로 남는다. 증가 직후 엔티티 값을 사용해야 하면 update 전에 조회하지 않거나, 변경 내용을 `flush()`한 뒤 `entityManager.clear()`하고 다시 조회한다.

### CaseBuilder는 조건을 UPDATE 식 안으로 넣는다

[`CaseBuilder`](https://javadoc.io/doc/com.querydsl/querydsl-core/latest/com/querydsl/core/types/dsl/CaseBuilder.html)는 QueryDSL에서 SQL `CASE WHEN ... THEN ... ELSE ... END` 식을 만드는 클래스다. 조회수 상한처럼 현재 컬럼 값에 따라 다음 값을 달리 정할 때 `JPAUpdateClause.set`과 함께 쓴다. 이 예제는 `MAX_VIEW_COUNT`에 도달한 행을 더 이상 증가시키지 않는다.

```java
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAUpdateClause;

public long incrementUntilLimit(Long articleId) {
    QArticleViewCount articleViewCount = QArticleViewCount.articleViewCount;
    long maxViewCount = 1_000_000L;

    NumberExpression<Long> nextViewCount = new CaseBuilder()
        .when(articleViewCount.viewCount.lt(maxViewCount))
        .then(articleViewCount.viewCount.add(1L))
        .otherwise(articleViewCount.viewCount);

    return new JPAUpdateClause(entityManager, articleViewCount)
        .set(articleViewCount.viewCount, nextViewCount)
        .where(articleViewCount.articleId.eq(articleId))
        .execute();
}
```

생성되는 식은 다음과 같다.

```sql
update ARTICLE_VIEW_COUNT
set VIEW_COUNT = case
    when VIEW_COUNT < 1000000 then VIEW_COUNT + 1
    else VIEW_COUNT
end
where ARTICLE_ID = :articleId;
```

이 조건도 한 SQL 문장에서 평가되므로 `SELECT`로 상한 여부를 확인한 뒤 증가하는 방식의 경쟁 조건을 만들지 않는다. 다만 `execute()`가 1을 반환해도 상한에 도달해 값이 실제로 증가했는지는 알 수 없다. 상한 초과 요청을 구분해야 하면 `where(articleViewCount.viewCount.lt(maxViewCount))` 조건으로 옮기고, 반환값 `0`을 처리한다.

`CaseBuilder`는 중복 조회 방지 기능이 아니다. 회원별·세션별로 한 번만 조회수를 올려야 한다면 `(ARTICLE_ID, VIEWER_ID)` 같은 방문 기록 테이블에 유니크 제약을 두고, INSERT 성공 시에만 위 원자적 증가를 실행해야 한다. 두 작업의 원자성이 필요하면 같은 트랜잭션으로 묶는다.

## 6. 캐시는 응답 전체가 아니라 공통 설정만 저장한다

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

## 7. 인덱스 없는 중복 검사는 락 대기로 바뀐다

중복 신청 검사가 회원과 회차를 조건으로 조회하는데 해당 복합 인덱스가 없으면, 트래픽이 몰릴 때 넓은 범위를 스캔한다. 동시에 들어온 INSERT와 공유 락 대기가 생기는 구조다.

```sql
create unique index UX_REGISTRATION_MEMBER_ROUND
    on dbo.REGISTRATION (MEMBER_ID, ROUND_ID);
```

유니크 인덱스는 조회 범위를 좁히고 중복 저장도 DB에서 막는다. 애플리케이션의 `SELECT → INSERT` 검사는 사용자에게 빠른 오류를 돌려주기 위한 보조 수단이다. 두 요청이 동시에 `exists = false`를 읽는 경쟁 조건은 애플리케이션 코드만으로 없앨 수 없다.

기존 데이터에 중복이 있거나 유니크 제약을 당장 넣을 수 없으면, 먼저 비유니크 복합 인덱스로 스캔 범위부터 줄인다. 유니크 제약은 데이터 정리와 배포 계획을 별도로 잡아 적용한다.

## 8. 풀 크기보다 빠른 회복을 설계한다

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
