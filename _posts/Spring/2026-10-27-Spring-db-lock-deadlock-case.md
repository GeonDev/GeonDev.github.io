---
layout: post
title: MSSQL UPDLOCK·HOLDLOCK 실무 데드락 사례 - 구독 갱신과 배치 중복 선점
date: 2026-10-27
Author: Geon Son
categories: Spring
tags: [Database, Lock, MSSQL, MyBatis, Deadlock, Concurrency]
comments: true
toc: true
---

[JPA 낙관적 락과 비관적 락으로 동시성 제어하기](/Spring-db-lock-hands-on/)의 부록에서 SQL Server 테이블 힌트 `UPDLOCK`, `HOLDLOCK`을 정리했다.
이 글은 그 힌트를 실제 서비스에 적용하면서 겪은 데드락과 중복 처리 문제를 쿼리 단위로 기록한다.

여기서는 두 사례를 다룬다.

- 인앱결제 구독 갱신 알림을 여러 워커가 동시에 처리하다 발생한 데드락. `UPDLOCK`만 쓰고 `HOLDLOCK`은 쓰지 않았다.
- 서버 2대에서 같은 배치가 동시에 돌 때 같은 대상을 두 번 처리하지 않도록 막은 선점 쿼리. `UPDLOCK, HOLDLOCK`을 함께 썼다.

공통 환경은 SQL Server, Spring Boot, MyBatis(JPA 아님)이고, 격리 수준은 기본값인 `READ COMMITTED`다.
테이블과 컬럼 이름은 일반화했다.

# 1. 구독 갱신 알림 동시 처리 데드락

## 개요

구독 갱신 처리 중 데드락이 발생한 것은 서버 알람으로 확인했다.
처음에는 같은 구독의 갱신 알림이 중복으로 와서, 요청 2건이 같은 행을 두고 경쟁한다고 판단했다.
1-1~1-3절은 이 가정에서 출발한 조치다. 잠금 순서를 정리하고, 잠금 범위를 좁히고, 중복 처리를 걸러냈다.

이 조치 뒤에도 데드락은 남았다. 다시 확인해 보니 충돌한 트랜잭션은 같은 구독이 아니라 **서로 다른 계정**의 갱신이었다.
각 계정의 갱신이 같은 테이블을 PK 조건으로 갱신하는데, 파라미터 타입 때문에 인덱스를 타지 못하고 테이블을 훑으면서 서로의 행에서 막힌 것으로 추정한다.
데드락 그래프는 확보하지 못해 원인을 확정하지는 못했다. 대응으로 파라미터를 `CAST`로 컬럼 타입에 맞췄다. 추정 근거와 실측값은 1-4절에 정리했다.

## 처리 구조

스토어(Google Play)의 구독 갱신 알림을 메시지 큐로 받고, 워커 여러 스레드가 동시에 처리한다.
알림 1건은 `@Transactional` 트랜잭션 하나로 처리한다.

관련 테이블은 두 개다.

| 테이블 | 의미 | 키·인덱스 |
|---|---|---|
| `payment` | 결제 | PK `order_no`(varchar), 구독번호 `sub_seq`(varchar) 인덱스 |
| `voucher` | 이용권 | PK `id`(varchar, `payment.order_no`와 같은 값). `goods_id`, `used`에는 인덱스 없음 |

알림 1건의 처리 순서는 다음과 같다. 아래 절에서는 이 번호로 단계를 가리킨다.

1. 갱신 대상 결제를 스토어 구매 토큰으로 조회한다.
2. 사용 중인 이용권을 `UPDLOCK`으로 잠금 조회한다.
3. 이미 처리된 갱신인지 확인하고, 처리됐으면 건너뛴다.
4. 새 결제 행을 대기 상태로 INSERT한다.
5. 이전 이용권을 종료 UPDATE한다.
6. 새 이용권을 INSERT하고 이력을 기록한다.
7. 결제 상태를 성공으로 UPDATE한다.
8. 구독 정보와 결제 이력을 갱신하는 후처리를 한다.

결제 행은 4단계에서 대기 상태로 먼저 들어가고, 7단계에서 성공으로 바뀐다. 1-3절의 문제는 새 결제 행이 INSERT된 뒤에도 한동안 잠금 조회 조건을 만족하지 않아서 생긴다.

## 1-1. 저장 프로시저와 앱 코드의 잠금 순서 불일치

처음 의심한 것은 같은 구독의 갱신 알림이 중복 전송되어 2건이 동시에 처리되는 경우였다.
Spring에서는 SQL Server 오류 1205가 `DeadlockLoserDataAccessException`으로 변환되어 올라왔다.

한 트랜잭션 안에서 `voucher` 테이블을 두 곳이 건드리고 있었다.
앱 코드(MyBatis 매퍼)의 `UPDATE`와 레거시 저장 프로시저다.
프로시저 하나가 새 이용권 INSERT, 이전 이용권 종료, 이력 기록(5~6단계)을 처리하고 있었다.
두 곳이 잠그는 행과 순서가 서로 달랐고, 프로시저 쪽 순서는 Java 코드만 봐서는 드러나지 않았다.

앞 글의 계좌 이체 예제와 원리는 같다. 다만 잠금 순서가 SQL 파일과 프로시저 본문으로 나뉘어 있으면 리뷰에서 순서를 비교할 수 없다.
프로시저 로직을 앱 코드로 옮겨 잠금 순서를 한곳에서 관리하도록 바꿨다.

## 1-2. 인덱스 없이 건 UPDLOCK

잠금 순서를 고정하려고 트랜잭션 맨 앞에 잠금 조회를 넣었다.
"이 사용자의 사용 중인 이용권을 먼저 잠그고 시작한다"는 의도다.

~~~sql
-- 변경 전
SELECT v.id
  FROM voucher v WITH (UPDLOCK)
  JOIN payment p WITH (NOLOCK) ON v.id = p.order_no
 WHERE p.member_id = @memberId
   AND v.used = 'Y'
   AND v.goods_id = @goodsId;
~~~

이 쿼리 뒤에도 데드락은 계속 났다.
`voucher`에는 `goods_id`, `used`로 걸러낼 인덱스가 없어서, 실행 계획이 `voucher`를 훑으면서 읽는 행마다 업데이트 락(U)을 요청했다.
대상 행만 잠그려던 쿼리가 다른 사용자의 행까지 건드리고, 그 행을 잡고 있던 트랜잭션과 서로 대기하게 된다.

인덱스를 추가하지 않고, 인덱스가 있는 쪽에서 출발하도록 조회 조건을 바꿨다.

~~~sql
-- 변경 후
SELECT v.id
  FROM payment p WITH (NOLOCK)
  JOIN voucher v WITH (UPDLOCK) ON v.id = p.order_no
 WHERE p.sub_seq = CAST(@subSeq AS varchar(100))
   AND v.used = 'Y'
   AND v.goods_id = @goodsId;
~~~

`payment`는 `sub_seq` 인덱스로 seek하고, `voucher`는 `order_no` 값으로 PK seek한다.
그 구독에 속한 `voucher` 행에만 U 락이 걸린다.

출발 조건의 파라미터는 `CAST(... AS varchar(100))`로 감쌌다.
MSSQL JDBC 드라이버는 기본 설정에서 문자열 파라미터를 varchar가 아니라 nvarchar로 보낸다.
varchar 컬럼인 `sub_seq`와 nvarchar 파라미터를 비교하면 컬럼 쪽에 암시적 변환이 붙어, 인덱스가 있어도 seek하지 못할 수 있다.
그러면 출발 테이블을 바꾼 효과가 사라진다. 드라이버 동작과 `CAST` 폭을 정하는 기준은 1-4절에서 다룬다.

![조인 출발 테이블에 따른 UPDLOCK 잠금 범위](/images/spring/spring-updlock-join-direction-lock-scope.svg){: .align-center}
*같은 UPDLOCK이라도 실행 계획이 어느 인덱스로 행에 접근하느냐에 따라 잠기는 행의 범위가 달라진다.*

SQL 문의 `FROM` 순서가 곧 조인 순서는 아니다. 실제로 어느 쪽에서 출발하는지는 실행 계획으로 확인해야 하고, 이 사례에서는 `WHERE` 조건을 인덱스가 있는 `p.sub_seq`로 바꾼 것이 핵심이다.
힌트가 붙은 테이블을 seek로 찾을 수 없으면 `UPDLOCK`은 "필요한 행만 예약"하는 힌트가 아니게 된다.

`payment`의 `NOLOCK`은 설계해서 붙인 것이 아니다. 원래 쿼리는 모든 테이블이 `NOLOCK`이었고, 수정하면서 `voucher`만 `UPDLOCK`으로 바꿔 `payment`에는 기존 관례가 남았다.
결과적으로 이 쿼리에서 잠그는 대상은 `voucher`이고, `payment`는 잠글 `voucher` 행을 찾는 경로로만 쓰인다.
`NOLOCK`은 커밋되지 않은 행을 읽을 수 있고, 스캔 도중 페이지 분할이 일어나면 행을 건너뛰거나 두 번 읽을 수 있다([SQL Server 테이블 힌트 문서](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table)).
이 조회 결과는 잠글 후보를 찾는 용도로만 쓰이고, 처리 여부 판단은 잠금을 얻은 뒤의 멱등성 확인(1-3절)이 맡는다.

잠금 조회에는 짧은 쿼리 타임아웃을 걸었다. 타임아웃으로 실패한 알림은 메시지 큐의 재전송으로 다시 처리된다.

## 1-3. 잠금 뒤 멱등성 확인

잠금 조회만으로는 중복 처리를 다 막지 못했다.
대기하던 트랜잭션은 먼저 끝난 트랜잭션이 새로 만든 이용권을 2단계 잠금 조회로 보지 못할 수 있다.
잠금 조회는 `payment.sub_seq`에서 출발해 `voucher`로 조인한다.
새 결제 행은 4단계에서 들어가지만, 그 행이 잠금 조회 조건(구독번호)을 만족하게 되는 시점은 그보다 늦다.
조건을 만족하기 전에 조회 대상을 정한 쪽에서는 새 결제 행과 거기에 연결된 새 이용권이 빠진다.

그래서 잠금을 얻은 뒤 한 번 더 확인한다.
"같은 스토어 구매 토큰으로 이번 갱신보다 늦게 끝나는 사용 중 이용권이 이미 있는가"를 보고, 있으면 이 알림은 처리된 것으로 보고 건너뛴다.

~~~sql
-- 단순화한 예시. 실제 컬럼명과 조건은 다르다.
SELECT COUNT(*)
  FROM voucher
 WHERE purchase_token = @purchaseToken
   AND used = 'Y'
   AND end_dt >= @newEndDt;
~~~

잠금 뒤 확인은 앞선 트랜잭션이 이미 커밋한 결과를 읽는다는 전제에 기댄다.
같은 구독의 요청이 2단계 잠금에서 직렬화되었다면, 기다린 쪽이 3단계를 실행하는 시점에는 먼저 끝난 트랜잭션이 이미 커밋했다. 그래서 이 확인 쿼리는 잠금 힌트 없이도 동작하고, 실제 쿼리도 `NOLOCK`으로 읽는다.

> 일반적으로 처리 여부를 `NOLOCK`으로 판단하면, 커밋 전 행을 근거로 "이미 처리됨"이라고 결론 낼 수 있다. 그 트랜잭션이 롤백되면 아무도 처리하지 않은 요청이 남는다.

`HOLDLOCK`으로 범위를 잠가 팬텀(조회 범위에 새로 들어오는 행)을 막는 방법도 있었지만 쓰지 않았다.

- `UPDLOCK`은 `READ COMMITTED`에서도 트랜잭션이 끝날 때까지 유지된다. 기존 행의 동시 갱신은 이것으로 막힌다.
- 새로 생기는 행은 위 멱등성 확인으로 걸러진다. 일반적으로 잠금 뒤 확인은 요청이 행 잠금에서 직렬화된다는 전제에 기댄다. 잠글 행이 없는 경우까지 막으려면 키 단위 잠금(애플리케이션 락 등)이나 유니크 제약이 필요하다.
- `voucher`의 PK 값(주문번호)은 순차적으로 증가해 새 행이 항상 키 끝에 들어간다. 이 구간에 범위 락을 걸면 다른 사용자의 INSERT까지 줄을 설 것으로 추정했다. 직접 측정하지는 않았다.

검증은 같은 구매 토큰으로 동시에 호출하는 통합 테스트로 했다. 수정 전에는 데드락으로 실패했고, 수정 후에는 통과했다.

## 1-4. JDBC 문자열 파라미터의 nvarchar 암시적 변환

마지막 데드락은 같은 구독이 아니라 **서로 다른 사용자의 갱신끼리** 발생했다.
갱신 시각이 몰리는 구독들이 여러 워커에서 동시에 처리될 때였고, 희생된 문장은 이용권을 종료하는 `UPDATE`였다.

~~~sql
UPDATE voucher
   SET used = 'N'
 WHERE id = #{orderId, jdbcType=VARCHAR}
~~~

PK 조건 한 줄짜리 `UPDATE`인데 무관한 행끼리 엇갈렸다는 것은 seek가 아니라 스캔이 일어났다는 신호다.
원인은 파라미터 타입으로 판단했다. 데드락 그래프로 확정하지는 못했으므로 추정이지만, 아래 근거로 유력하다고 봤다.

Microsoft JDBC Driver는 [`sendStringParametersAsUnicode`](https://learn.microsoft.com/en-us/sql/connect/jdbc/setting-the-connection-properties) 기본값이 `true`라서 `setString()`으로 넘긴 문자열을 nvarchar로 보낸다.
MyBatis의 `jdbcType=VARCHAR`는 null 처리 등에 쓰이는 타입 정보이고, 값은 여전히 `setString()`으로 바인딩되므로 이 동작을 바꾸지 못한다.

varchar 컬럼과 nvarchar 파라미터를 비교하면 [데이터 형식 우선순위](https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-type-precedence-transact-sql)에 따라 컬럼 쪽이 nvarchar로 변환된다.
컬럼이 SQL collation이면 인덱스 seek를 쓰지 못하고 스캔한다. Windows collation이면 범위 seek가 가능한 경우도 있지만 정확한 키 seek보다 넓게 읽는다.
실행 계획에서는 `CONVERT_IMPLICIT` 경고로 확인할 수 있다.

같은 `UPDATE`를 실측한 결과는 다음과 같다.

| 파라미터 | 실행 시간 |
|---|---|
| nvarchar 그대로 | 약 175ms |
| `CAST(... AS varchar(100))` | 약 5ms |

스캔하는 동안 다른 트랜잭션이 아직 커밋하지 않은 행에서 막히고, 그 트랜잭션도 내 쪽이 잡은 행을 기다리면 데드락이 된다.

파라미터를 쿼리에서 varchar로 바꿔 대응했다.

~~~sql
UPDATE voucher
   SET used = 'N'
 WHERE id = CAST(#{orderId, jdbcType=VARCHAR} AS varchar(100))
~~~

`CAST` 폭은 컬럼 폭보다 넓게 잡는다. 컬럼 폭과 같게 잡으면 그보다 긴 값이 잘린 뒤 다른 행과 일치할 수 있다.
또 nvarchar를 varchar로 바꾸면 컬럼 collation의 코드 페이지에 없는 문자는 `?`로 바뀐다. 주문번호처럼 ASCII만 쓰는 값에만 적용한다.

드라이버 연결 옵션 `sendStringParametersAsUnicode=false`로 전역 변경하는 방법은 쓰지 않았다.
한글이 들어가는 nvarchar 컬럼 파라미터까지 varchar로 보내게 되어 영향 범위가 너무 크다.

데드락 재시도 로직도 한 번 넣었다가 되돌렸다. `CAST` 적용 후에는 애플리케이션 재시도 없이, 실패한 알림을 메시지 큐 재전송에 맡겼다.

# 2. 배치 이중 실행 선점: UPDLOCK + HOLDLOCK

두 번째 사례는 외부 시스템에 처리를 요청하는 정기 배치다. 외부 스케줄러가 API를 호출하는 방식으로 시작되고, 2대의 서버 중 어느 인스턴스에서든 실행될 수 있다.
같은 대상에 두 번 요청하면 되돌리기 어려운 중복 처리가 생기는데, ShedLock처럼 DB로 중복 실행을 막는 장치는 없었다.
두 서버에서 실행이 겹치면 같은 대상을 동시에 집을 수 있는 구조였다.

배치 1회의 처리 순서는 다음과 같다.

1. 처리 대상을 조회한다.
2. 대상마다 작업 행을 선점 INSERT한다. 선점에 실패하면 건너뛴다.
3. 외부 API를 호출한다.
4. 작업 행의 상태를 UPDATE한다.

이 글은 2번 선점 쿼리를 다룬다. 아래 내용은 분석과 개발 DB 테스트에 근거한다.

RCSI(Read Committed Snapshot Isolation, 읽기 시 공유 락 대신 행 버전을 읽는 옵션)는 적용하지 않았다. 행 버전이 `tempdb`의 version store에 쌓이는데, 그 공간 관리 부담 때문에 DBA가 적용을 거절했다.
RCSI를 켜도 `UPDLOCK`, `HOLDLOCK` 힌트가 붙은 조회는 락을 잡으므로 아래 선점 쿼리의 동작 자체는 같다. 달라지는 것은 힌트 없는 일반 조회가 쓰기와 서로 막히는지 여부다.

배치 이중 실행 문제 전반은 [이중화된 배치·스케줄러 중복 실행 막기](/Spring-batch-ha-dedup/)에서 다뤘다. 여기서는 SQL Server 힌트 조합에만 집중한다.

## 조건부 INSERT로 선점

처리 대상마다 작업 행을 하나 INSERT하고, 당일 대기 중이거나 완료된 작업 행이 있으면 INSERT하지 않는다.

~~~sql
INSERT INTO jobs (target_id, status, reg_dt)
SELECT @targetId, 'PENDING', GETDATE()
 WHERE NOT EXISTS (
     SELECT 1
       FROM jobs WITH (UPDLOCK, HOLDLOCK)
      WHERE target_id = @targetId
        AND status IN ('PENDING', 'DONE')
        AND reg_dt >= @today
 );
~~~

반영된 행 수가 0이면 다른 서버가 먼저 선점한 것이므로 건너뛴다.
`target_id`에는 비클러스터드 인덱스가 있다. 인덱스가 있어야 범위 락이 해당 `target_id`의 키 범위로 좁혀진다. 인덱스가 없으면 훨씬 넓게 잠길 것으로 추정한다.

이 문장은 자동 커밋되는 단일 문장이라 락은 문장이 실행되는 동안만 유지된다.
외부 API 호출은 이 문장 밖에서 한다.

1장과 달리 여기서는 잠글 행이 아직 없다. 행 락만으로는 "없는 행"을 막을 수 없어서 `HOLDLOCK`의 키 범위 락이 필요하다.

## 힌트 조합별 차이

`HOLDLOCK`은 조회한 범위에 새 행이 들어오는 것을 막고, `UPDLOCK`은 같은 범위를 선점하려는 요청을 조회 단계부터 기다리게 한다.
아래는 `target_id` 인덱스로 키 범위를 잠그는 실행 계획을 전제로 한 설명이다.

예를 들어 인덱스에 `target_id`가 10과 20만 있고, 두 세션이 각각 15를 선점하려고 한다고 가정한다.
15라는 행은 아직 없으므로, SQL Server는 15가 들어갈 10과 20 사이의 인덱스 구간을 보호한다.

`HOLDLOCK`만 사용하면 다음 순서로 데드락이 발생할 수 있다.

1. A가 15가 없음을 확인하고, 해당 구간을 공유 모드로 잠근다(`RangeS-S`).
2. B도 15가 없음을 확인한다. 공유 모드끼리는 호환되므로 B도 같은 구간을 잠근다(`RangeS-S`).
3. A가 INSERT할 구간을 검사하는 잠금(`RangeI-N`)을 요청하지만, B의 공유 범위 잠금에 막힌다.
4. B도 INSERT를 위해 같은 잠금(`RangeI-N`)을 요청하지만, A의 공유 범위 잠금에 막힌다.

두 세션이 상대의 잠금 해제를 기다리므로 데드락이 된다. 조회할 때는 함께 통과했지만, INSERT할 때 서로를 막는 구조다.

`UPDLOCK, HOLDLOCK`을 함께 사용하면 대기하는 시점이 달라진다.

1. A가 15가 없음을 확인하고, 해당 구간을 업데이트 모드로 잠근다(`RangeS-U`).
2. B도 같은 모드의 잠금(`RangeS-U`)을 요청한다. 이 모드끼리는 호환되지 않으므로 조회 단계에서 기다린다.
3. A는 INSERT하고 커밋한다. B는 아직 공유 범위 잠금을 잡지 않았으므로 A의 INSERT를 막지 않는다.
4. B가 조회를 이어가면 A가 넣은 행이 있다. `NOT EXISTS`가 거짓이 되어 INSERT하지 않는다.

세 잠금 모드의 역할은 다음과 같다.

| 잠금 모드 | 역할 |
|---|---|
| `RangeS-S` | 키 범위를 공유 모드로 읽고 보호한다. 같은 모드의 조회는 함께 진행한다. |
| `RangeS-U` | 키 범위를 업데이트 모드로 읽고 보호한다. 같은 모드의 요청은 기다린다. |
| `RangeI-N` | 새 키를 INSERT하기 전에 해당 구간에 삽입이 가능한지 검사한다. |

이름은 인덱스 구간에 대한 모드와 경계 키에 대한 모드를 합친 것이다.
`S`는 공유, `U`는 업데이트, `I`는 삽입을 뜻한다. `RangeI-N`의 `N`은 경계 키에 대한 잠금이 없다는 뜻이며, 구간에 대한 검사까지 생략한다는 뜻은 아니다.

| 힌트 | 행이 없을 때 동작 | 결과 | 검증 |
|---|---|---|---|
| `UPDLOCK` | 잠글 행이 없다. 두 세션 모두 `NOT EXISTS`를 통과한다. | 중복 INSERT | 추정, 재현 안 함 |
| `HOLDLOCK` | 두 세션이 같은 범위에 `RangeS-S`를 함께 잡는다. 둘 다 INSERT를 위해 `RangeI-N`을 요청하고 상대의 `RangeS-S`에 막힌다. | 데드락 | 추정, 재현 안 함 |
| `UPDLOCK, HOLDLOCK` | 범위에 `RangeS-U`를 잡는다. `RangeS-U`끼리는 호환되지 않아 두 번째 세션이 기다린다. 첫 세션 커밋 후 새 행을 보고 0건이 된다. | 1건만 INSERT | 개발 DB 검증 |

락 모드별 호환성은 [Transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)의 Key-range lock 항목에 정리되어 있다.

개발 DB에서 같은 `target_id`로 5개 스레드를 동시에 실행했고, 1건만 INSERT되었으며 데드락은 없었다.

## 인덱스 접근 순서가 반대인 UPDATE

선점 쿼리는 비클러스터드 인덱스(`target_id`) 범위를 먼저 잠그고, 그다음 클러스터드 키로 넘어간다.
반대로 나중에 같은 행을 `UPDATE`하면서 `target_id`를 `SET`하면, `UPDATE`는 클러스터드 행을 먼저 잠그고 비클러스터드 인덱스를 갱신하러 간다.
두 문장의 잠금 순서가 반대라 데드락이 날 수 있다.

~~~sql
-- 피한 형태: 인덱스 컬럼을 다시 SET
UPDATE jobs SET status = 'DONE', target_id = @targetId WHERE id = @id;

-- 적용한 형태: 선점 INSERT에서 이미 넣은 인덱스 컬럼은 건드리지 않는다
UPDATE jobs SET status = 'DONE' WHERE id = @id;
~~~

값이 같으면 SQL Server가 비클러스터드 인덱스 갱신을 건너뛰는지는 확인하지 못했다. 그래서 `SET` 목록에서 빼는 쪽을 택했다.

개발 DB에서 A 세션이 `UPDATE` 후 커밋하기 전에 B 세션이 같은 `target_id`로 선점을 시도하게 했다.
B는 데드락 없이 A의 커밋을 기다렸다가 0건으로 끝났다.

## 실행이 겹칠 때의 잔류 집계

배치는 웹 요청으로 시작되므로, 수동 실행을 짧은 간격으로 두 번 누르면 로드밸런서가 두 요청을 서로 다른 인스턴스로 보낼 수 있다.
선점 락은 공유 DB에 있으므로 인스턴스가 달라도 같은 대상은 한 번만 처리된다. 두 실행이 겹치면 대상을 나눠 처리하는 결과가 된다.

선점은 동작했지만 종료 알림이 틀렸다.
배치는 끝날 때 "오늘 `PENDING`으로 남은 작업 행"을 세어 알림을 보낸다. 늦게 온 실행은 대상을 모두 선점 실패로 건너뛰어 금방 끝나고, 이때 다른 인스턴스가 지금 처리 중인 행까지 잔류 건으로 센다.

잔류 집계에서 1분 이내에 선점된 행을 뺐다.

~~~xml
<!-- 단순화한 예시. 실제 매퍼 ID와 조건은 다르다. -->
<select id="countStalled" resultType="int">
    SELECT COUNT(*)
      FROM jobs
     WHERE status = 'PENDING'
       AND reg_dt >= #{today}
       AND reg_dt &lt; DATEADD(MINUTE, -1, GETDATE())
</select>
~~~

1건의 처리 시간은 외부 호출 타임아웃(연결 5초, 응답 30초)이 상한이므로 1분 안에 끝난다. 1분이 지나도 `PENDING`인 행만 실제로 멈춘 건으로 본다.
마지막 1분 안에 멈춘 건은 요약 알림에서 빠지지만, 건별 실패 알림이 따로 나가므로 이 공백은 감수했다.

MyBatis XML 매퍼 안에서는 `<`를 그대로 쓰면 XML 파싱이 실패하고, 매퍼를 읽지 못해 애플리케이션 컨텍스트가 뜨지 않는다. `&lt;`로 이스케이프하거나 조건을 `<![CDATA[ ... ]]>`로 감싼다.

늦게 온 실행이 남기는 0건 실행 이력 1행과, 선점 전에 발급되어 소모되는 식별번호는 그대로 두었다. 번호에 구멍이 생길 뿐 처리 결과에는 영향이 없다.

## 한계

- `@targetId`가 테이블의 최댓값이면, 그 키부터 다음 키까지의 빈 구간이 인덱스 끝까지 잠긴다. 그동안 더 큰 `target_id`를 넣는 INSERT는 대기한다(추정). 데드락이 아니라 짧은 대기다.
- 같은 `target_id` 값을 가진 행이 많으면, 그 값으로 실행할 때 해당 행 전체가 범위 락에 걸린다. 기본값처럼 실제 대상이 아닌 값으로는 선점 쿼리를 실행하지 않는다.
- `sp_getapplock`은 기각했다. 세션 단위 락을 쓰면 작업이 끝날 때까지 커넥션을 붙잡아야 해서 커넥션 풀 운영과 맞지 않는다.
- 외부 호출 내내 행 락을 유지하는 방식도 기각했다. 락 유지 시간이 외부 API 응답 시간에 끌려간다.

# 3. 두 사례에서 HOLDLOCK 선택이 갈린 조건

| 구분 | 구독 갱신 | 배치 선점 |
|---|---|---|
| 잠글 대상 | 이미 있는 이용권 행 | 아직 없는 작업 행 |
| 힌트 | `UPDLOCK` | `UPDLOCK, HOLDLOCK` |
| 새 행 중복 방지 | 잠금 뒤 멱등성 확인 | 키 범위 락 |
| 트랜잭션 길이 | 알림 처리 전체 | 단일 문장(자동 커밋) |
| 범위 락을 피하거나 제한한 이유 | 키 끝 구간에 다른 사용자 INSERT가 몰림(추정) | 문장이 짧고 `target_id` 인덱스로 범위가 좁음 |

두 사례 모두 잠기는 범위를 정한 것은 힌트 자체보다 **힌트가 걸린 테이블을 어떤 인덱스로 읽느냐**였다.
`UPDLOCK`, `HOLDLOCK`은 실행 계획이 읽는 행과 키 범위에 걸린다. 힌트를 추가할 때는 실행 계획에서 seek 여부와 `CONVERT_IMPLICIT`부터 확인한다.
