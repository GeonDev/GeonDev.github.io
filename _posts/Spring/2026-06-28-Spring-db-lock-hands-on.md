---
layout: post
title: 동시성 제어를 위한 DB 락 (JPA 낙관적·비관적 락)
date: 2026-06-28
Author: Geon Son
categories: Spring
tags: [Database, Lock, JPA, Redis, MySQL, Concurrency]
comments: true
toc: true
---

재고 차감, 포인트 적립, 쿠폰 발급처럼 **여러 요청이 같은 데이터를 동시에 갱신하는 로직**은 한 번쯤 동시성 문제로 사고가 난다.
재고가 1개 남았는데 두 요청이 동시에 들어와 둘 다 차감에 성공해 버리는 식이다.
단일 인스턴스라면 `synchronized`로 막을 수 있을 것 같지만, 서버를 두 대만 띄워도 JVM 락은 의미가 없어진다.
결국 **DB나 외부 저장소 수준의 락**이 필요하다.

본론에 들어가기 전에 락의 기본 개념만 짧게 짚고 간다.

- **공유 락(Shared Lock, S Lock)** : 여러 트랜잭션이 동시에 읽을 수는 있지만 쓰기는 막는 읽기 락. 공유 락끼리는 호환된다.
- **배타 락(Exclusive Lock, X Lock)** : 한 트랜잭션이 독점하며 다른 트랜잭션의 읽기·쓰기를 모두 막는 쓰기 락.
- **비관적 락(Pessimistic Lock)** : 충돌이 자주 난다고 가정하고, 데이터를 읽는 시점에 미리 DB 락을 건다. 안전하지만 동시성이 떨어지고 데드락 위험이 있다.
- **낙관적 락(Optimistic Lock)** : 충돌이 드물다고 가정해 락을 걸지 않고, **버전(version) 컬럼**으로 갱신 시점에 충돌을 검사한다. 동시성은 좋지만 충돌이 잦으면 재시도 비용이 크다.

이 글에서는 이 개념들을 **실제 코드로 어떻게 적용하는지**에 집중한다.
JPA의 낙관적·비관적 락, MySQL의 Named Lock, Redis 분산 락을 예제 중심으로 다룬다.

예제는 아래 재고 엔티티를 기준으로 한다.

~~~java
@Entity
public class Stock {

    @Id @GeneratedValue
    private Long id;

    private Long productId;

    private Long quantity;

    public void decrease(Long count) {
        if (this.quantity - count < 0) {
            throw new IllegalArgumentException("재고는 0개 미만이 될 수 없습니다.");
        }
        this.quantity -= count;
    }
}
~~~

# 1. JPA 낙관적 락 (Optimistic Lock)

낙관적 락은 **"충돌은 거의 안 일어난다"** 고 가정하고 DB 락을 걸지 않는다.
대신 엔티티에 **버전(version) 컬럼**을 두고, 갱신 시점에 "내가 읽었던 버전이 그대로인가"를 검사한다.
중간에 다른 트랜잭션이 값을 바꿔 버전이 올라갔다면 `OptimisticLockException`을 던진다.

## @Version

`@Version` 필드만 추가하면 Hibernate가 자동으로 버전 검사 UPDATE를 만든다.

~~~java
@Entity
public class Stock {

    @Id @GeneratedValue
    private Long id;

    private Long productId;
    private Long quantity;

    @Version
    private Long version;   // Long/Integer 권장 (Instant도 가능, Timestamp는 비권장)

    public void decrease(Long count) {
        if (this.quantity - count < 0) {
            throw new IllegalArgumentException("재고는 0개 미만이 될 수 없습니다.");
        }
        this.quantity -= count;
    }
}
~~~

실제로 실행되는 UPDATE는 다음과 같다. `WHERE` 절에 버전이 포함되는 것이 핵심이다.

~~~sql
UPDATE stock
   SET quantity = ?, version = version + 1
 WHERE id = ? AND version = ?;   -- 읽었던 version과 다르면 0 rows → 예외
~~~

영향받은 row가 0개면 누군가 먼저 갱신했다는 뜻이므로 Hibernate가 `OptimisticLockException`을 던진다.

명시적으로 잠금 모드를 지정하고 싶다면 Repository에 `@Lock`을 붙인다.

~~~java
public interface StockRepository extends JpaRepository<Stock, Long> {

    @Lock(LockModeType.OPTIMISTIC)
    @Query("select s from Stock s where s.id = :id")
    Stock findByIdWithOptimisticLock(@Param("id") Long id);
}
~~~

여기서 `@Query`를 직접 작성한 것은 낙관적 락의 필수 조건이 아니다.
실제 UPDATE SQL에는 `WHERE id = ? AND version = ?`처럼 version 조건이 들어가지만, 이 조건을 JPQL에 직접 써야 하는 것은 아니다.
`@Version` 필드가 있으면 Hibernate가 갱신 시점에 version 조건을 자동으로 붙인다.
위 예제의 `@Query`는 기존 `findById`와 구분되는 메서드 이름(`findByIdWithOptimisticLock`)을 명시하기 위한 것이고, 파생 쿼리 메서드에도 `@Lock`을 붙일 수 있다.

## 낙관적 락의 LockModeType 종류

`@Version`만 두면 **수정한 엔티티**는 알아서 버전 검사가 되지만, JPA는 그보다 세밀한 모드를 제공한다.
핵심 구분은 **"읽기만 한 데이터도 보호하느냐"** 다.

| LockModeType | 동작 | 버전 증가 |
|---|---|---|
| `NONE` (기본) | 락 없음. `@Version`이 있으면 **수정한** 엔티티만 커밋 시 자동 검사 | 수정 시 |
| `OPTIMISTIC` | 위에 더해 **읽기만 한** 엔티티도 "내가 읽은 뒤 누가 안 바꿨나"를 트랜잭션 끝에 검사 | 안 함 |
| `OPTIMISTIC_FORCE_INCREMENT` | `OPTIMISTIC` + 내 트랜잭션이 끝날 때 **버전을 강제로 +1** | 함 |

## OPTIMISTIC

내가 읽은 뒤 다른 트랜잭션이 먼저 수정해서 버전이 바뀌면, 내 트랜잭션은 커밋 시점에 `OptimisticLockException`으로 실패하고 롤백된다.
"내가 수정한 걸 되돌린다"기보다, **내 변경 자체가 반영되기 전에 충돌을 감지해 전체 트랜잭션이 실패한다**고 이해하면 된다.

이 모드는 조회한 값을 트랜잭션 끝까지 일관되게 보고 싶을 때 쓴다. 예를 들어 주문 금액 계산에 필요한 상품 가격이 중간에 바뀌면 안 되는 경우다.
동시에, 실제로 엔티티를 수정할 때는 `@Version`이 붙은 상태에서 버전 조건이 자동으로 검사된다.

> 참고로 `OPTIMISTIC`은 예전 이름이 `READ`였다. 지금은 deprecated 별칭이다.

## OPTIMISTIC_FORCE_INCREMENT

연관 엔티티만 바뀌고 정작 루트 엔티티 컬럼은 그대로일 때, 버전이 올라가지 않아 충돌을 놓치는 경우가 있다.
예를 들어 게시글(Board)은 그대로 두고 댓글(Comment)만 추가하는데, "댓글 추가 = 게시글의 논리적 변경"으로 취급하고 싶을 때다.
이때 `OPTIMISTIC_FORCE_INCREMENT`를 쓰면 **컬럼 변경이 없어도 버전을 강제로 올려** 충돌을 검출한다.

읽기만 했는데도 다른 트랜잭션의 수정까지 막고 싶다면 이 모드를 쓴다. 내 트랜잭션이 끝날 때 버전을 +1 하므로, 뒤이어 같은 엔티티를 수정하려는 트랜잭션은 버전 불일치로 실패한다.

> 참고로 `OPTIMISTIC_FORCE_INCREMENT`는 예전 이름이 `WRITE`였다. 지금은 deprecated 별칭이다.

~~~java
@Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
@Query("select b from Board b where b.id = :id")
Board findByIdForUpdate(@Param("id") Long id);
~~~


## 재시도(Retry)는 호출하는 쪽의 책임

낙관적 락은 충돌 시 예외만 던질 뿐, **재시도는 직접 처리해야 한다.**
주의할 점은 재시도가 트랜잭션 **경계 밖**에서 일어나야 한다는 것이다.
같은 트랜잭션 안에서 다시 조회해 봐야 이미 롤백 대상이라 의미가 없다.

~~~java
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockRepository stockRepository;

    @Transactional
    public void decrease(Long id, Long count) {
        Stock stock = stockRepository.findByIdWithOptimisticLock(id);
        stock.decrease(count);
        stockRepository.saveAndFlush(stock);   // 커밋 전에 충돌을 앞당겨 확인
    }
}
~~~

~~~java
@Component
@RequiredArgsConstructor
public class OptimisticLockStockFacade {

    private final StockService stockService;

    // 트랜잭션 밖에서 재시도 루프를 돈다
    public void decrease(Long id, Long count) throws InterruptedException {
        while (true) {
            try {
                stockService.decrease(id, count);
                break;
            } catch (ObjectOptimisticLockingFailureException e) {
                Thread.sleep(50);   // 잠깐 대기 후 재시도
            }
        }
    }
}
~~~

매번 수동 재시도 루프가 있는 바깥 래퍼를 만들기 번거롭다면 Spring Retry의 `@Retryable`로 대체할 수 있다.
@Retryable은 트랜잭션 바깥에서 예외를 받아야 재시도할 수 있다.  
수동 파사드와 마찬가지로, @Transactional 메서드가 예외를 밖으로 던져야 롤백되고, 그 예외를 바깥 래퍼가 잡아 재시도한다.

같은 메서드에 `@Transactional`과 함께 붙이면 어드바이스 순서에 따라 재시도가 트랜잭션 안에서 돌 수 있고,
그러면 첫 충돌에서 이미 rollback-only로 마킹돼 재시도해도 `UnexpectedRollbackException`으로 계속 실패한다.
그래서 `@Retryable` 예제도 구조상 **Facade(바깥)**, `@Transactional`은 **Service(안쪽)** 로 나눈 것과 같다.

~~~java
// 바깥: 재시도만 담당 (트랜잭션 없음). 위의 수동 래퍼 구현을 이걸로 대체한다
@Component
@RequiredArgsConstructor
public class OptimisticLockStockRetryFacade {

    private final StockService stockService;

    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 50, multiplier = 2)  // 50 → 100 → 200ms 지수 백오프
    )
    public void decrease(Long id, Long count) {
        stockService.decrease(id, count);   // 매 재시도마다 새 트랜잭션
    }

    // 재시도를 다 써도 실패하면 호출됨 (로그/알림 등)
    @Recover
    public void recover(ObjectOptimisticLockingFailureException e, Long id, Long count) {
        throw new IllegalStateException("재고 차감 재시도 초과: id=" + id, e);
    }
}
~~~

`delay`만 두면 매번 같은 시간만 쉬고 다시 시도하는 **고정 간격 재시도**가 된다.
예를 들어 50ms마다 계속 다시 시도하면, 동시에 실패한 요청들이 또 동시에 재시도해서 같은 충돌을 반복하기 쉽다.  
`multiplier`를 주면 실패할수록 대기 시간을 늘리는 **지수 백오프**가 된다. 여기서는 50ms → 100ms → 200ms처럼 간격을 벌려서, 재시도 타이밍이 겹치는 것을 줄인다.

실무에서는 보통 재시도를 **3회 안팎**으로 두고, 고정 간격보다는 **지수 백오프에 약간의 jitter**를 섞어 같은 타이밍에 다시 부딪히는 걸 줄인다.

# 2. JPA 비관적 락 (Pessimistic Lock)

비관적 락은 반대로 **"충돌이 자주 난다"** 고 가정하고, 조회 시점에 아예 DB 락을 건다.
`SELECT ... FOR UPDATE`로 행에 배타 락을 걸어, 락이 풀릴 때까지 다른 트랜잭션을 대기시킨다.  
그래서 충돌이 잦고 반드시 한 번에 하나씩 처리해야 하는 결제·재고 차감 같은 로직에 잘 맞는다. 재시도 로직이 필요 없는 대신, 락 대기와 데드락을 신경 써야 하므로 트랜잭션 범위는 짧게 가져간다.

## @Lock(PESSIMISTIC_WRITE)

~~~java
public interface StockRepository extends JpaRepository<Stock, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Stock s where s.id = :id")
    Stock findByIdWithPessimisticLock(@Param("id") Long id);
}
~~~

여기서도 `@Query`는 비관적 락을 걸기 위해 반드시 필요한 코드는 아니다.
실제 SQL에는 `FOR UPDATE`가 붙지만, JPQL에 `for update`를 직접 작성해야 하는 것은 아니다.  
조회 메서드에 `@Lock(LockModeType.PESSIMISTIC_WRITE)`를 붙이면 JPA/Hibernate가 DB 방언에 맞는 잠금 SQL을 생성한다.  
위 예제의 `@Query`는 기존 JPA 기본 메서드와 다른 이름의 예제용 메서드를 보여 주기 위해 명시한 것이다.

~~~java
@Service
@RequiredArgsConstructor
public class PessimisticLockStockService {

    private final StockRepository stockRepository;

    @Transactional
    public void decrease(Long id, Long count) {
        // 이 시점에 SELECT ... FOR UPDATE 가 나가고, 락을 잡는다
        Stock stock = stockRepository.findByIdWithPessimisticLock(id);
        stock.decrease(count);
    }
}
~~~

실행되는 SQL (MySQL InnoDB 기준):

~~~sql
SELECT * FROM stock WHERE id = ? FOR UPDATE;
~~~

락은 **트랜잭션이 끝나는 시점(커밋/롤백)** 에 풀린다. 따라서 락을 잡은 트랜잭션은 가능한 짧게 유지해야 한다.

## 잠금 모드와 타임아웃

| LockModeType | 동작 | SQL |
|---|---|---|
| `PESSIMISTIC_READ` | 공유 락(다른 트랜잭션의 읽기는 허용, 쓰기는 차단) | `... FOR SHARE` |
| `PESSIMISTIC_WRITE` | 배타 락(읽기·쓰기 모두 차단) | `... FOR UPDATE` |
| `PESSIMISTIC_FORCE_INCREMENT` | 배타 락 + version 증가 | `FOR UPDATE` + version++ |

- **`PESSIMISTIC_READ`** : "읽는 동안 이 값이 안 바뀌면 된다, 남이 같이 읽는 건 괜찮다"일 때. 공유 락이라 여러 트랜잭션이 동시에 잡을 수 있지만 쓰려는 트랜잭션은 막힌다. (MySQL InnoDB는 `FOR SHARE`로 구현되며 DBMS마다 차이가 있다.)
- **`PESSIMISTIC_WRITE`** : 재고 차감·결제처럼 **읽고 바로 쓸** 데이터를 독점한다. 실무에서 비관적 락 하면 대부분 이거다.
- **`PESSIMISTIC_FORCE_INCREMENT`** : DB 락으로 한 번에 하나의 트랜잭션만 처리되게 하면서 **버전까지 올려**, 락을 안 거는 다른 낙관적 락 트랜잭션에도 변경 사실을 알린다. (비관적·낙관적 혼용 환경)

> `FORCE_INCREMENT`는 낙관적·비관적 양쪽에 다 있는데 의미는 같다 — **"실제로 바꾼 컬럼이 없어도 버전을 올려라"**.
> 낙관적 쪽은 충돌 검출용, 비관적 쪽은 DB 락 + 버전 동기화용이다.

무한정 대기하면 위험하므로 **락 타임아웃**을 거는 것이 안전하다.

~~~java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@QueryHints({
    // 락 획득을 3초만 기다리고, 못 잡으면 예외
    @QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")
})
@Query("select s from Stock s where s.id = :id")
Stock findByIdWithPessimisticLock(@Param("id") Long id);
~~~

> 타임아웃 동작은 DBMS마다 다르다. MySQL InnoDB는 `innodb_lock_wait_timeout`(기본 50초)의 영향을 받고,
> `SKIP LOCKED` / `NOWAIT`(MySQL 8.0+) 같은 옵션은 JPA 표준 힌트로는 직접 표현하기 어려워 네이티브 쿼리가 필요할 수 있다.

실무에서는 보통 `PESSIMISTIC_WRITE`를 쓰고, 락 타임아웃은 **3초 안팎**처럼 짧게 둔다.
그리고 `FOR UPDATE`를 거는 조회 컬럼에는 **인덱스**가 있어야 한다. 없으면 락이 불필요하게 넓어지거나 풀스캔으로 번져 다른 행까지 묶을 수 있다.

## 데드락(Deadlock) — 락을 잡는 순서가 다를 때

비관적 락에서 가장 흔히 만나는 사고가 데드락이다.
**두 트랜잭션이 서로가 잡은 락을 기다리며 둘 다 영원히 멈추는** 상황이다.
원인은 대부분 단순하다 — 여러 행에 락을 거는데 **트랜잭션마다 거는 순서가 다른 것**이다.

계좌 이체처럼 두 행(1번, 2번 계좌)에 모두 락이 필요한 경우를 보자.

~~~java
@Service
@RequiredArgsConstructor
public class TransferService {

    private final AccountRepository accountRepository;

    // 데드락이 나는 코드 — 파라미터로 받은 순서 그대로 락을 잡는다
    @Transactional
    public void transfer(Long fromId, Long toId, Long amount) {
        Account from = accountRepository.findByIdWithPessimisticLock(fromId); // 락 1
        Account to   = accountRepository.findByIdWithPessimisticLock(toId);   // 락 2
        from.withdraw(amount);
        to.deposit(amount);
    }
}
~~~

예를 들어 두 트랜잭션이 동시에 실행된다고 하자.

- T1은 1번 계좌를 먼저 잠그고 2번 계좌를 나중에 잠근다.
- T2는 2번 계좌를 먼저 잠그고 1번 계좌를 나중에 잠근다.

~~~
시간 →
T1: 1번 락 획득 ──── 2번 락 요청 ⏳ (T2가 잡고 있어 대기)
T2: 2번 락 획득 ──── 1번 락 요청 ⏳ (T1이 잡고 있어 대기)
                              └─ 서로 상대를 기다림 → 데드락
~~~

MySQL InnoDB는 이 교착을 **자동으로 감지**해서 한쪽 트랜잭션을 강제 롤백시킨다. 이때 던져지는 예외다.

~~~
com.mysql.cj.jdbc.exceptions.MySQLTransactionRollbackException:
  Deadlock found when trying to get lock; try restarting transaction
~~~

**해결은 락을 잡는 순서를 항상 똑같이 맞추는 것**이다.
같은 테이블 안에서는 ID가 작은 쪽부터 잠그도록 정렬하면, 두 트랜잭션 모두 `1번 → 2번` 순으로 잡으므로 교착이 생기지 않는다.
테이블이 여러 개면 ID 숫자만으로는 순서를 정할 수 없으니, 먼저 **테이블 순서**를 고정하고 그다음 각 테이블 안에서 **ID 순서**를 맞춘다.

~~~java
@Transactional
public void transfer(Long fromId, Long toId, Long amount) {
    // 같은 테이블 안에서는 항상 작은 ID부터 락을 건다
    Long firstId  = Math.min(fromId, toId);
    Long secondId = Math.max(fromId, toId);
    accountRepository.findByIdWithPessimisticLock(firstId);
    accountRepository.findByIdWithPessimisticLock(secondId);

    Account from = accountRepository.getReferenceById(fromId);
    Account to   = accountRepository.getReferenceById(toId);
    from.withdraw(amount);
    to.deposit(amount);
}
~~~

> 데드락을 완전히 0으로 만들기는 어렵다. 락 순서를 맞춰 **빈도를 줄이되**, 감지된 데드락 예외
> (`CannotAcquireLockException`)는 **짧은 재시도**로 흡수하는 것이 현실적인 대응이다.

# 3. MySQL Named Lock (사용자 레벨 락)

비관적 락은 **특정 행(row)** 에 락을 건다. 그런데 "아직 존재하지 않는 데이터"에 락을 걸어야 할 때가 있다.
예를 들어 회원가입 시 같은 이메일로 동시에 두 번 요청이 들어오면, 아직 INSERT 전이라 잠글 row가 없다.
이럴 때 MySQL의 **Named Lock(`GET_LOCK`)** 이 유용하다. 임의의 **문자열 이름**에 락을 거는 방식이다.

~~~sql
SELECT GET_LOCK('user:email:test@example.com', 3);  -- 3초 대기, 성공 시 1
-- ... 작업 ...
SELECT RELEASE_LOCK('user:email:test@example.com');
~~~

## 구현 시 주의: 반드시 별도 커넥션을 쓴다

Named Lock은 **세션(커넥션) 단위**로 걸린다.
비즈니스 로직이 쓰는 커넥션에서 락을 잡으면, 락을 잡은 채로 트랜잭션이 얽혀 풀이 꼬이기 쉽다.
**별도의 DataSource(커넥션 풀)** 를 두고, 락 획득 → 비즈니스 트랜잭션 → 락 해제 순서로 분리하는 것이 정석이다.

~~~java
// 락 전용 Repository (네이티브 쿼리)
public interface LockRepository extends JpaRepository<Stock, Long> {

    @Query(value = "SELECT GET_LOCK(:key, 3)", nativeQuery = true)
    Integer getLock(@Param("key") String key);

    @Query(value = "SELECT RELEASE_LOCK(:key)", nativeQuery = true)
    Integer releaseLock(@Param("key") String key);
}
~~~

~~~java
@Component
@RequiredArgsConstructor
public class NamedLockStockFacade {

    private final LockRepository lockRepository;
    private final PessimisticLockStockService stockService;  // 실제 차감은 REQUIRES_NEW로

    public void decrease(Long id, Long count) {
        String key = "stock:" + id;
        try {
            Integer result = lockRepository.getLock(key);
            if (result == null || result != 1) {
                throw new IllegalStateException("락 획득 실패: " + key);
            }
            // 락을 잡은 상태에서 별도 트랜잭션으로 비즈니스 로직 실행
            stockService.decrease(id, count);
        } finally {
            lockRepository.releaseLock(key);   // 예외가 나도 반드시 해제
        }
    }
}
~~~

비즈니스 로직은 `@Transactional(propagation = REQUIRES_NEW)` 로 분리해, 락 획득/해제와 트랜잭션 경계가 겹치지 않게 한다.

> **Named Lock은 이럴 때** : 행이 아닌 **임의의 키**에 락을 걸어야 할 때(중복 가입, 선착순 처리 등).
> 주의 — `getLock`이 락 전용 풀의 커넥션을 점유하므로, 락 풀 크기와 타임아웃을 별도로 관리해야 한다. 해제를 빼먹으면 세션이 끝날 때까지 락이 남는다.

# 4. Redis 분산 락 (Distributed Lock)

DB 락은 결국 **DB에 부하를 집중**시킨다. 락 경합이 심하면 DB 커넥션이 락 대기로 묶여 다른 쿼리까지 느려진다.
트래픽이 크고 인스턴스가 여러 대인 환경에서는 **Redis로 락을 분리**하면 DB 부하를 덜 수 있다.

## 4-1. Redisson (권장)

직접 `SETNX`로 구현할 수도 있지만, 락 만료·스핀락·재시도·**watchdog(자동 연장)** 까지 다뤄야 해서 손이 많이 간다.
실무에서는 이런 것들을 다 처리해 주는 **Redisson**을 권장한다.

~~~groovy
// build.gradle
implementation 'org.redisson:redisson-spring-boot-starter:3.27.0'
~~~

~~~java
@Component
@RequiredArgsConstructor
public class RedissonLockStockFacade {

    private final RedissonClient redissonClient;
    private final PessimisticLockStockService stockService;

    public void decrease(Long id, Long count) {
        RLock lock = redissonClient.getLock("stock:" + id);
        try {
            // 최대 10초 대기, 획득하면 3초간 점유(3초 뒤 자동 해제)
            // leaseTime을 생략하면(tryLock(10, SECONDS)) watchdog이 자동 연장한다
            boolean available = lock.tryLock(10, 3, TimeUnit.SECONDS);
            if (!available) {
                throw new IllegalStateException("락 획득 실패");
            }
            stockService.decrease(id, count);   // REQUIRES_NEW 권장
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        } finally {
            if (lock.isHeldByCurrentThread()) {  // 내가 잡은 락만 해제
                lock.unlock();
            }
        }
    }
}
~~~

`tryLock(waitTime, leaseTime, unit)` 의 앞 두 인자가 핵심이다.
- **waitTime** : 락을 얻으려고 기다리는 최대 시간 (Redisson은 pub/sub 기반이라 무의미한 스핀이 적다)
- **leaseTime** : 락 점유 시간. 이 시간이 지나면 자동 해제되어 **데드락을 방지**한다.

실무에서는 `waitTime`을 **3~5초처럼 짧게** 두고, `leaseTime`은 **watchdog(-1)** 을 쓰거나 작업 최대 시간보다 조금 길게 잡는다.
작업 시간이 예측되면 명시 값을 주는 편이 단순하고, 길이가 들쭉날쭉하면 watchdog이 더 안전하다.

## 4-2. 직접 구현한다면 (SETNX + Lua)

Redisson 없이 원리를 이해하려면 직접 구현해 볼 수 있다. 두 가지가 핵심이다.

1. **락 획득** : `SET key value NX PX ttl` — 키가 없을 때만(NX) 만료시간(PX)과 함께 설정. 만료시간이 없으면 프로세스가 죽었을 때 락이 영원히 남는다.
2. **락 해제** : 반드시 **내가 건 락인지 확인 후 삭제**. 단순 `DEL`은 위험하다 — 내 락이 만료된 뒤 남이 잡은 락을 내가 지워 버릴 수 있다. 검사와 삭제를 **원자적으로** 하려고 Lua 스크립트를 쓴다.

~~~java
@Component
@RequiredArgsConstructor
public class SimpleRedisLock {

    private final StringRedisTemplate redisTemplate;

    // 내 토큰일 때만 삭제 (검사 + 삭제를 원자적으로)
    private static final String UNLOCK_SCRIPT =
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('del', KEYS[1]) " +
        "else return 0 end";

    public boolean tryLock(String key, String token, Duration ttl) {
        Boolean success = redisTemplate.opsForValue()
            .setIfAbsent(key, token, ttl);   // SET key token NX PX ttl
        return Boolean.TRUE.equals(success);
    }

    public void unlock(String key, String token) {
        redisTemplate.execute(
            new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class),
            List.of(key),
            token   // 락 획득 시 발급한 고유 토큰 (예: UUID)
        );
    }
}
~~~

~~~java
public void decrease(Long id, Long count) {
    String key = "stock:" + id;
    String token = UUID.randomUUID().toString();   // 락 소유자 식별
    if (!redisLock.tryLock(key, token, Duration.ofSeconds(3))) {
        throw new IllegalStateException("락 획득 실패");
    }
    try {
        stockService.decrease(id, count);
    } finally {
        redisLock.unlock(key, token);   // 내 토큰일 때만 풀린다
    }
}
~~~

> **분산 락의 한계** : Redis 단일 노드 락은 **마스터 장애 + 복제 지연** 시 두 클라이언트가 동시에 락을 잡을 수 있다.
> 이를 줄이려는 Redlock 알고리즘이 있지만 논쟁이 있다. **강한 정합성이 절대적으로 필요하면 DB 락(비관적 락)을 우선 검토**하고,
> Redis 분산 락은 처리량이 중요하고 짧은 중복을 비즈니스적으로 감내할 수 있을 때 쓴다.

# 6. 실전 사례: 중복 결제 막기

지금까지의 기법을 한데 모아 볼 좋은 예가 **중복 결제 방지**다.
결론부터 말하면, 중복 결제는 "락"보다 한 단계 위 개념인 **멱등성(idempotency)** 으로 접근하고,
그 멱등성을 보장하는 수단으로 DB 제약·락을 쓰는 것이 정석이다.

## 단순 락만으론 부족하다

중복 결제는 보통 **버튼 더블클릭, 타임아웃 후 재시도, 네트워크 재전송**으로 발생한다.
가장 흔한 잘못된 코드가 "조회해서 없으면 INSERT"(check-then-act)다.

~~~java
// 동시에 들어오면 둘 다 통과하는 경쟁 조건
if (paymentRepository.findByOrderId(orderId) == null) {  // ① 둘 다 null 확인
    paymentRepository.save(new Payment(orderId, ...));    // ② 둘 다 INSERT → 중복!
}
~~~

두 요청이 ①을 동시에 통과하면 ②가 둘 다 실행된다.
비관적 락(`FOR UPDATE`)으로 막으려 해도 **아직 결제 row가 없어 잠글 대상이 없다.**
행 락으로는 "존재하지 않는 것"을 막지 못한다.

## 1순위 — 멱등키 + UNIQUE 제약

결제 요청마다 클라이언트가 **고유 키**(또는 orderId)를 보내고, DB에 **UNIQUE 제약**을 건다.

~~~sql
ALTER TABLE payment ADD CONSTRAINT uk_idempotency UNIQUE (idempotency_key);
~~~

~~~java
// 안쪽: INSERT만. 중복이면 예외를 던지고 트랜잭션 롤백
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Transactional
    public Payment create(String idempotencyKey, Long orderId, ...) {
        return paymentRepository.save(new Payment(idempotencyKey, orderId, ...));
    }

    @Transactional(readOnly = true)
    public Payment findByKey(String idempotencyKey) {
        return paymentRepository.findByIdempotencyKey(idempotencyKey);
    }
}
~~~

~~~java
// 바깥: 제약 위반은 트랜잭션 밖에서 잡아, 새 트랜잭션으로 기존 결과를 조회
@Component
@RequiredArgsConstructor
public class PaymentFacade {

    private final PaymentService paymentService;

    public Payment pay(String idempotencyKey, Long orderId, ...) {
        try {
            return paymentService.create(idempotencyKey, orderId, ...);
        } catch (DataIntegrityViolationException e) {
            // 이미 같은 키로 결제됨 → 기존 결과를 반환 (재시도도 같은 응답)
            return paymentService.findByKey(idempotencyKey);
        }
    }
}
~~~

UNIQUE 제약 자체가 **DB가 보장하는 배타 락**이라, check-then-act 경쟁 조건이 아예 사라진다.
두 번째 INSERT는 무조건 실패하므로 락을 직접 잡을 필요도 없다.
단, 제약 위반이 나면 그 트랜잭션은 롤백되므로 **재조회는 위처럼 트랜잭션 밖(새 트랜잭션)에서** 해야 한다.
같은 트랜잭션 안에서 이어 조회하면 `UnexpectedRollbackException`으로 실패한다.

## 2순위 — 상태 전이엔 비관적 락

이미 **존재하는 결제 건의 상태를 바꿀 때**(예: `READY → PAID`)는 비관적 락이 잘 맞는다.

~~~java
Payment p = paymentRepository.findByIdWithPessimisticLock(paymentId); // FOR UPDATE
if (p.getStatus() != READY) {
    throw new AlreadyPaidException();   // 중복 승인 차단
}
p.markPaid();
~~~

> 결제 row를 만들기 전 단계에서 같은 주문을 한 번에 하나씩 처리하고 싶다면, 행이 없으므로 앞서 본 **Named Lock**(키: `payment:order:{orderId}`)이 맞다.

## ⚠️ 락을 잡은 채 PG API를 호출하지 말 것

결제는 외부 PG사 호출이 섞인다. **락을 잡은 채 PG API를 부르면**, 응답이 느릴 때 락이 수 초간 잡혀 다른 요청을 모두 막는다.
비관적 락 절에서 강조한 "락 구간에서 외부 API 금지"가 결제에서 특히 중요하다.
**PG사에도 멱등키를 함께 넘겨**(대부분 `Idempotency-Key` 헤더 지원) PG 레벨에서도 중복을 거르게 하는 것이 표준이다.

> **요약** — 신규 결제 생성은 **멱등키 + UNIQUE 제약**(1순위), 상태 전이는 **비관적 락**, 키 단위 순차 처리는 **Named Lock**, 그리고 외부 PG에도 **멱등키**를 넘긴다.

# 7. 정리 — 어떤 락을 선택할까

| 기법 | 락 위치 | 적합한 상황 | 핵심 주의점 |
|---|---|---|---|
| **JPA 낙관적 락** | 애플리케이션(version) | 충돌이 드물고 읽기 위주 | 충돌 시 **재시도 로직** 필수, 트랜잭션 밖에서 재시도 |
| **JPA 비관적 락** | DB 행(`FOR UPDATE`) | 충돌이 잦고 순차 처리 필수 | 락 대기·데드락, 트랜잭션 짧게 유지 |
| **MySQL Named Lock** | DB 세션(이름) | 행이 없는 대상(중복 가입 등) | **별도 커넥션 풀** 필수, 해제 누락 주의 |
| **Redis 분산 락** | Redis | 다중 인스턴스, DB 부하 분산 | 락 만료·소유자 검증, 강한 정합성엔 부적합 |

판단 순서는 단순하다.

1. **충돌이 드물다** → 낙관적 락. 가장 가볍다.
2. **충돌이 잦고 단일 DB로 충분하다** → 비관적 락. 재시도 없이 한 번에 하나씩 처리된다.
3. **잠글 행이 없거나 임의 키 단위로 막아야 한다** → Named Lock.
4. **인스턴스가 여러 대고 DB 락으로는 부하를 못 견딘다** → Redis 분산 락. 단, 정합성 한계를 감안한다.

가장 흔한 실수는 **분산 환경에서 `synchronized`로 막으려는 것**과, **낙관적 락을 걸어 놓고 재시도를 빼먹는 것**이다.
락은 "걸었다"가 끝이 아니라 "**언제 풀리고, 실패하면 어떻게 되는가**"까지 설계해야 비로소 동작한다.

> 이 글은 **여러 요청이 같은 데이터(행)를 동시에 갱신**하는 문제를 다뤘다.
> 반면 **이중화된 배치·스케줄러가 같은 잡을 두 번 실행하는 문제**(ShedLock·`SKIP LOCKED`)는
> 결이 달라 별도로 정리했다 — [이중화된 배치·스케줄러 중복 실행 막기](/Spring-batch-ha-dedup/)
