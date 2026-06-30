---
layout: post
title: 이중화된 배치·스케줄러 중복 실행 막기 (ShedLock / Quartz / SKIP LOCKED)
date: 2026-06-30
Author: Geon Son
categories: Spring
tags: [Batch, Scheduler, ShedLock, Concurrency, HA]
comments: true
toc: true
---

서비스를 이중화(HA)하면 가용성은 올라가지만, **스케줄러가 붙은 배치**는 골치가 생긴다.
같은 `@Scheduled` 잡이 두 인스턴스에서 동시에 깨어나 **같은 일을 두 번** 해버리는 것이다.
정산이 두 번 돌거나, 같은 푸시가 두 번 나가거나, 집계가 중복으로 쌓인다.

[동시성 제어를 위한 DB 락 실전](/Spring-db-lock-hands-on/)에서 다룬 낙관/비관/Named Lock/Redis 분산 락은
**여러 요청이 같은 데이터(행)를 동시에 갱신**하는 문제를 풀었다.  

배치 중복 실행은 결이 다르다 — 보호 대상이 "행"이 아니라 **"잡 실행 그 자체"** 이고,
"한 클러스터에서 한 번만 돌게 한다"는 leader election에 가까운 문제다.
그래서 행 락(`FOR UPDATE`)이 아니라 다른 도구가 필요하다.

# 1. 무엇이 문제인가

인스턴스 A, B가 똑같은 코드를 들고 떠 있다고 하자.

~~~java
@Scheduled(cron = "0 0 2 * * *")   // 매일 새벽 2시
public void runSettlement() {
    // A도 B도 새벽 2시에 동시에 이 코드를 실행한다
    settlementService.settleYesterday();
}
~~~

`@Scheduled`는 **각 인스턴스의 로컬 스케줄러**가 돌리는 것이라, 클러스터를 인식하지 못한다.
A와 B가 같은 시각에 깨어나 둘 다 정산을 돌리면 중복이 난다.
**JVM 락(`synchronized`)으로는 못 막는다** — 서로 다른 프로세스이기 때문이다.

# 2. ShedLock — 클러스터에서 한 번만 실행

가장 흔한 해법은 **ShedLock**이다. "이 잡은 클러스터 전체에서 한 번만"을 보장한다.
먼저 락을 잡은 인스턴스만 실행하고, 나머지는 그냥 **조용히 스킵**한다.

## 설정

~~~groovy
// build.gradle
implementation 'net.javacrumbs.shedlock:shedlock-spring:5.10.0'
implementation 'net.javacrumbs.shedlock:shedlock-provider-jdbc-template:5.10.0'
~~~

~~~java
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")   // 안전장치 기본값
public class SchedulerConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
            JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()   // DB 시간 기준(인스턴스 간 시계 오차 회피) — 권장
                .build()
        );
    }
}
~~~

락 상태를 저장할 테이블 하나가 필요하다.

~~~sql
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP(3) NOT NULL,
    locked_at  TIMESTAMP(3) NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
~~~

## 사용

~~~java
@Scheduled(cron = "0 0 2 * * *")
@SchedulerLock(
    name = "settlementBatch",      // 락 이름 (= shedlock 테이블의 PK)
    lockAtMostFor = "30m",         // 최대 점유: 인스턴스가 죽어도 30분 뒤 락 해제
    lockAtLeastFor = "1m"          // 최소 점유: 너무 빨리 끝나도 1분은 유지
)
public void runSettlement() {
    settlementService.settleYesterday();
}
~~~

두 옵션이 핵심이다.

- **`lockAtMostFor`** : 락을 잡은 인스턴스가 다운돼 `unlock`을 못 해도, 이 시간이 지나면 **자동으로 풀려** 다음 실행이 가능하다. 데드락 방지용 안전장치다. **실제 작업 시간보다 넉넉히** 잡아야 한다(작업이 더 길면 락이 먼저 풀려 중복 실행될 수 있다). Redis 분산 락의 `leaseTime`과 같은 개념이다.
- **`lockAtLeastFor`** : 작업이 순식간에 끝나도 최소 이 시간은 락을 유지한다. 인스턴스 간 **시계 오차**로 거의 동시에 두 번 트리거되는 것을 막는다.

## 동작 원리 — Named Lock이 아니다

ShedLock을 처음 보면 "MySQL Named Lock(`GET_LOCK`)이랑 같은 거 아냐?"라는 생각이 든다.
**이름(key)에 락을 건다는 발상은 같지만 메커니즘이 다르다.**

JDBC 방식 ShedLock은 `GET_LOCK`을 쓰지 않고, `shedlock` **테이블의 row 하나**로 락을 표현한다.

~~~sql
-- 락 획득 시도: 먼저 INSERT, 이미 있으면 만료된 경우에만 UPDATE
INSERT INTO shedlock(name, lock_until, locked_at, locked_by)
VALUES ('settlementBatch', now() + interval 30 minute, now(), 'instance-A');

-- (row가 이미 있을 때) 만료됐으면 내가 가져온다
UPDATE shedlock
   SET lock_until = now() + interval 30 minute, locked_at = now(), locked_by = 'instance-A'
 WHERE name = 'settlementBatch' AND lock_until <= now();
~~~

| | MySQL Named Lock(`GET_LOCK`) | ShedLock(JDBC) |
|---|---|---|
| 락 저장 위치 | MySQL 세션 메모리 | DB 테이블 row |
| 해제 시점 | **세션(커넥션) 종료 시** | `lock_until` 만료 / 작업 완료 |
| TTL(만료) | 없음 | 있음 (`lockAtMostFor`) |
| 적합 | 짧은 임계구역 | **장시간·HA 배치** |

이 차이가 배치에서 결정적이다. Named Lock은 세션에 묶여 있어 **커넥션을 작업 내내 붙들고 있어야** 하고, "죽으면 30분 뒤 자동 해제" 같은 TTL을 표현할 수 없다. ShedLock은 row + 만료시간이라 그게 자연스럽다.

> ShedLock은 JDBC 외에 Redis, MongoDB, ZooKeeper 등 다른 백엔드 provider도 지원한다. 이미 Redis를 쓰고 있다면 `shedlock-provider-redis-spring`으로 같은 일을 할 수 있다.

# 3. Spring Batch / Quartz를 쓴다면

스케줄링 프레임워크를 이미 쓰고 있다면 그쪽 기능을 먼저 검토한다.

## Spring Batch

Spring Batch는 `JobRepository`로 **같은 `JobInstance`(잡 이름 + 잡 파라미터)의 중복 완료 실행**을 막아준다.
이미 성공한 파라미터로 다시 실행하면 `JobInstanceAlreadyCompleteException`이 난다.

~~~java
JobParameters params = new JobParametersBuilder()
    .addLocalDate("targetDate", LocalDate.now().minusDays(1))  // 날짜를 파라미터로
    .toJobParameters();
jobLauncher.run(settlementJob, params);
~~~

> 다만 이건 "**같은 파라미터의 재실행**"을 막는 것이지, **두 인스턴스가 동시에 기동하는 경쟁**을 막아주진 않는다.
> 그래서 Spring Batch를 써도 **트리거 단계의 단일 실행은 ShedLock 등으로 따로 보장**해야 한다.

## Quartz 클러스터링

Quartz는 클러스터 모드(`org.quartz.jobStore.isClustered = true`)를 켜면 DB를 공유하며
**하나의 트리거를 클러스터 내 한 노드에만 할당**한다. 별도 락 코드 없이 단일 실행이 보장된다.
이미 Quartz를 쓰는 프로젝트라면 가장 자연스러운 선택이다.

# 4. 반대로, 일부러 나눠 돌리고 싶다면 — SKIP LOCKED

지금까지는 "한 번만 돌게" 막는 이야기였다.
그런데 처리할 **물량이 많아 여러 인스턴스가 나눠 돌리길 원하는** 경우도 있다.
이때는 중복 실행을 막는 게 아니라, **인스턴스끼리 같은 행을 잡지 않도록 분배**하는 게 목표다.

MySQL 8.0+ / PostgreSQL의 `SELECT ... FOR UPDATE SKIP LOCKED`가 여기에 맞다.
다른 트랜잭션이 이미 잠근 행은 **기다리지 않고 건너뛰어** 다음 행을 가져온다.

~~~sql
-- 인스턴스 A, B가 동시에 실행해도 서로 다른 행을 가져간다
SELECT * FROM job_queue
 WHERE status = 'READY'
 ORDER BY id
 LIMIT 100
 FOR UPDATE SKIP LOCKED;
~~~

~~~java
@Transactional
public List<Job> pollBatch() {
    List<Job> jobs = jobQueueRepository.findReadyBatchSkipLocked(100); // 위 쿼리
    jobs.forEach(j -> j.markProcessing());
    return jobs;
}
~~~

A가 1~100번을 잡으면 B는 그 행들을 **건너뛰고** 101~200번을 가져간다.
락 대기 없이 워커들이 큐를 나눠 소비하므로, 작업 큐를 여러 인스턴스로 병렬 처리할 때 유용하다.

> 단순 `FOR UPDATE`(SKIP LOCKED 없이)였다면 B는 A가 커밋할 때까지 **대기**한다.
> "나눠 처리"가 목적이면 `SKIP LOCKED`, "직렬화"가 목적이면 그냥 `FOR UPDATE`다.

# 5. 락은 보조일 뿐 — 멱등 배치가 본질

가장 중요한 이야기다. **분산 락(ShedLock 포함)도 "정확히 한 번"은 보장하지 못한다.**
락이 `lockAtMostFor`로 만료된 직후, 원래 인스턴스가 GC stop-the-world에서 깨어나 작업을 이어가면
두 인스턴스가 잠깐 겹칠 수 있다. 락은 **중복 빈도를 크게 줄여줄 뿐**, 0으로 만들지는 못한다.

그래서 배치 작업 자체를 **멱등(idempotent)하게** — 두 번 돌아도 결과가 같게 — 설계하는 것이 최후의 안전망이다.

- **처리 단위에 마커를 남긴다** : "이 정산 건 처리 완료" 플래그나 UNIQUE 제약. 두 번째 처리는 흡수된다.

~~~sql
-- 이미 정산된 주문이면 UNIQUE 위반으로 두 번째 INSERT가 실패 → 중복 차단
ALTER TABLE settlement ADD CONSTRAINT uk_order UNIQUE (order_id);
~~~

- **조건부 업데이트로 상태를 전이한다** : 이미 처리됐으면 0 rows라 두 번 실행돼도 안전하다.

~~~sql
UPDATE settlement
   SET status = 'DONE'
 WHERE order_id = ? AND status = 'READY';   -- READY일 때만 한 번 적용
~~~

이 멱등 패턴은 [DB 락 실전 글의 "중복 결제 막기"](/Spring-db-lock-hands-on/)에서 쓴 것과 같은 원리다.
**락으로 빈도를 줄이고, 멱등성으로 최종 정합성을 보장**하는 두 겹 방어가 정석이다.

# 6. 정리

| 목적 | 방법 |
|---|---|
| 클러스터에서 **한 번만** 실행 | **ShedLock** (`@SchedulerLock`) / Quartz 클러스터링 |
| 같은 파라미터 **재실행** 방지 | Spring Batch `JobRepository` |
| 물량을 **나눠** 병렬 처리 | `SELECT ... FOR UPDATE SKIP LOCKED` |
| 어떤 경우든 최종 안전망 | **멱등 설계** (UNIQUE 제약 · 조건부 업데이트) |

판단은 단순하다.

1. **한 번만 돌면 되는 배치(정산·집계·리포트)** → ShedLock으로 단일 실행 보장. 잡 단위 락이다.
2. **이미 스케줄링 프레임워크가 있다** → Quartz 클러스터링 / Spring Batch 기능을 먼저 활용.
3. **물량이 많아 나눠 돌려야 한다** → 동시 실행을 의도하고 `SKIP LOCKED`로 분배.
4. **그리고 무조건** → 작업을 멱등하게 짜둔다.

핵심은 — 이중화 배치엔 락이 맞지만, **행 락이 아니라 잡 단위 락(ShedLock)** 이고, 그마저도 **멱등 설계의 보조**라는 점이다.
공유 데이터 자체의 동시 갱신 제어가 궁금하다면 [동시성 제어를 위한 DB 락 실전](/Spring-db-lock-hands-on/)을 참고하자.
