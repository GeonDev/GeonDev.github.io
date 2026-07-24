---
layout: post
title: 백엔드 이론을 위한 IT 용어 정리
date: 2024-06-01
Author: Geon Son
categories: IT
tags: [Backend, CS, Database, Network]
comments: true
toc: true
---

> **IT 핵심 개념 정리 시리즈**
>
> - [백엔드 용어 정리](/it-backend-word/) (현재 글)
> - [네트워크 용어 정리](/it-word-list-network/)
>
> **이 글의 바로가기**
>
> - [데이터베이스](#용어정리--데이터베이스)
>   - [트랜잭션](#트랜잭션)
>   - [락과 MVCC](#락과-mvcc)
>   - [인덱스](#인덱스)
>   - [실행 계획, 조인, 페이징](#실행-계획-조인-페이징)
>   - [인덱스 운영과 저장 구조](#인덱스-운영과-저장-구조)
>   - [인덱스 설계 검증 기준](#인덱스-설계-검증-기준)
>   - [데이터 무결성](#데이터-무결성)
>   - [데이터 모델링과 DB 선택](#데이터-모델링과-db-선택)
>   - [DB 확장과 운영](#db-확장과-운영)
> - [JPA](#용어정리--jpa)
>   - [영속성 컨텍스트와 엔티티 생명주기](#영속성-컨텍스트와-엔티티-생명주기)
>   - [N+1과 조회 최적화](#n1과-조회-최적화)
> - [Spring](#용어정리--spring)
>   - [트랜잭션과 AOP](#트랜잭션과-aop)
>   - [Spring 핵심 원리](#spring-핵심-원리)
>   - [Spring MVC와 요청 처리](#spring-mvc와-요청-처리)
>   - [Spring Security와 인증](#spring-security와-인증)
>   - [외부 연동과 비동기 실행 안정성](#외부-연동과-비동기-실행-안정성)
>   - [Spring Batch](#spring-batch)
> - [Java](#용어정리--java)
>   - [Java 동시성](#java-동시성)
>   - [Java 예외 처리](#java-예외-처리)
>   - [JVM과 메모리](#jvm과-메모리)
>   - [Java 객체와 컬렉션](#java-객체와-컬렉션)
>   - [Java 언어 기능과 실행 환경](#java-언어-기능과-실행-환경)
> - [성능 및 운영](#용어정리--성능-및-운영)
>   - [커넥션 풀과 스레드 풀](#커넥션-풀과-스레드-풀)
>   - [Redis와 캐시 전략](#redis와-캐시-전략)
> - [아키텍처 및 분산 시스템](#용어정리--아키텍처-및-분산-시스템)
>   - [아키텍처 경계와 의존성](#아키텍처-경계와-의존성)
>   - [DDD와 멀티 모듈](#ddd와-멀티-모듈)
>   - [MSA와 분산 시스템](#msa와-분산-시스템)
>     - [도입 기준과 서비스 경계](#도입-기준과-서비스-경계)
>     - [통신과 데이터 소유권](#통신과-데이터-소유권)
>     - [운영과 검증](#운영과-검증)
>   - [분산 트랜잭션과 일관성](#분산-트랜잭션과-일관성)
>     - [MSA에서 정합성을 유지하는 방법](#msa에서-정합성을-유지하는-방법)
>   - [이벤트 기반 설계](#이벤트-기반-설계)
>   - [장애 대응 패턴](#장애-대응-패턴)
> - [메시지 브로커 및 이벤트 기반](#용어정리--메시지-브로커-및-이벤트-기반)
>   - [Kafka](#kafka)
>   - [메시징 모델과 브로커 비교](#메시징-모델과-브로커-비교)
>   - [메시지 전달 보장과 이벤트 처리](#메시지-전달-보장과-이벤트-처리)
> - [애플리케이션 설계와 품질](#용어정리--애플리케이션-설계와-품질)
>   - [API 설계와 HTTP](#api-설계와-http)
>   - [객체지향과 디자인 패턴](#객체지향과-디자인-패턴)
> - [운영체제](#용어정리--운영체제)
> - [컨테이너 및 오케스트레이션](#용어정리--컨테이너-및-오케스트레이션)
>   - [Docker](#docker)
>   - [Kubernetes](#kubernetes)
> - [AI와 Spring AI](#용어정리--ai와-spring-ai)
>   - [AI 전반 핵심 개념](#ai-전반-핵심-개념)
>   - [LLM 애플리케이션 구성](#llm-애플리케이션-구성)
>   - [AI Agent와 Harness Engineering](#ai-agent와-harness-engineering)
>   - [Spring AI](#spring-ai)
>   - [AI 품질과 운영](#ai-품질과-운영)

# 용어정리 – 데이터베이스

## 트랜잭션

* **트랜잭션** : 하나의 논리적 기능을 수행하기 위한 작업 단위다. 여러 SQL이 함께 실행되더라도 하나의 작업처럼 다루며,  
  모두 성공하면 커밋하고 중간에 실패하면 롤백해 데이터 정합성을 지킨다.


* **ACID 속성** : 트랜잭션이 안전하게 수행된다는 것을 보장하기 위한 성질
  * **Atomicity(원자성)**: 트랜잭션의 연산은 모든 연산이 완벽히 수행되어야 하며, 한 연산이라도 실패하면 트랜잭션 내의 모든 연산은 실패한다.
  * **Consistency(일관성)**: 트랜잭션은 제약 조건, 외래 키, 비즈니스 규칙을 만족하는 유효한 상태에서 또 다른 유효한 상태로만 변경되어야 한다.
  * **Isolation(고립성)**: 트랜잭션은 동시에 실행될 경우 다른 트랜잭션에 의해 영향을 받지 않고 독립적으로 실행되어야 한다.
  * **Durability(내구성)**: 트랜잭션이 커밋된 이후에는 시스템 오류가 발생하더라도 커밋된 상태로 유지되는 것을 보장해야 한다.


* **트랜잭션 격리수준(Isolation Level)**: 동시에 실행되는 트랜잭션을 서로 얼마나 고립시킬지 정하는 기준이다.  
  격리 수준이 높을수록 정합성은 좋아지지만 락 경합과 대기 시간이 늘 수 있고, 낮을수록 성능은 유리하지만  
  Dirty Read, Non-Repeatable Read, Phantom Read 같은 이상 현상이 생길 수 있다.
  * **SERIALIZABLE**: 가장 강력한 격리수준으로, 동시에 실행한 결과가 순서대로 하나씩 실행한 것과 같도록 보장한다.
    DBMS에 따라 잠금, predicate lock, 순차 실행 보장 실패 검출 등 구현 방식이 다르며 동시처리 성능이 낮아질 수 있다.
  * **REPEATABLE READ**: 같은 트랜잭션에서 같은 행을 다시 읽을 때 일관된 결과를 보장하는 격리 수준이다.
    스냅샷 생성 시점과 Phantom Read 처리 방식은 DBMS마다 다르며, MySQL InnoDB는 일반 읽기에 MVCC를, 잠금 읽기에 Next-Key Lock을 활용한다.
  * **READ COMMITTED**: 어떤 트랜잭션의 변경내용이 COMMIT되어야만 다른 트랜잭션에서 조회할 수 있다. Non-Repeatable Read가 발생한다.
  * **READ UNCOMMITTED**: 어떤 트랜잭션의 변경내용이 COMMIT이나 ROLLBACK에 상관없이 모두 노출된다. Dirty Read가 발생할 수 있다.


* **트랜잭션 부정합 종류**:
  * **Phantom Read(유령 읽기)** : 같은 트랜잭션에서 동일한 범위 조건으로 다시 조회했을 때, 다른 트랜잭션의 삽입·삭제로 결과 행 집합이 달라지는 현상
  * **Non-Repeatable Read(반복 읽기 불가능)** : 같은 트랜잭션에서 동일한 행을 다시 읽었을 때, 다른 트랜잭션이 커밋한 수정·삭제로 결과가 달라지는 현상
  * **Dirty Read** : 다른 트랜잭션이 아직 커밋하지 않은 데이터를 읽는 현상. 해당 트랜잭션이 롤백하면 실제로 확정되지 않은 값을 읽은 셈이 된다.

![두 트랜잭션의 시간 흐름으로 비교한 Dirty Read, Non-Repeatable Read, Phantom Read와 격리 수준](/images/it/database-isolation-anomalies.png)


* **격리 수준과 이상 현상 정리**

  | 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read |
  |-----------|:----------:|:-------------------:|:------------:|
  | READ UNCOMMITTED | 발생 가능 | 발생 가능 | 발생 가능 |
  | READ COMMITTED | 방지 | 발생 가능 | 발생 가능 |
  | REPEATABLE READ | 방지 | 방지 | DBMS 구현에 따라 다름 |
  | SERIALIZABLE | 방지 | 방지 | 방지 |

  MySQL InnoDB의 `REPEATABLE READ`는 일반 읽기에서는 MVCC 스냅샷을, 잠금 읽기에서는 Next-Key Lock을 활용해 Phantom Read를 제어한다.
  모든 DBMS의 `REPEATABLE READ`가 같은 방식으로 동작하는 것은 아니다.

## 락과 MVCC

* **락(Lock)** : 동시 접근으로부터 데이터 정합성을 보호하기 위한 잠금 메커니즘
  * **공유 락(Shared Lock, S Lock, 읽기 락)** : 여러 트랜잭션이 동시에 읽을 수 있으나, 쓰기는 막는다. 공유 락끼리는 호환된다.
  * **배타 락(Exclusive Lock, X Lock, 쓰기 락)** : 한 트랜잭션이 독점하며 다른 트랜잭션의 충돌하는 락 획득과 쓰기를 막는다. 일반 조회까지 막는지는 MVCC 사용 여부와 조회 방식 등 DBMS 구현에 따라 다르다.
  * **비관적 락(Pessimistic Lock)** : 충돌이 자주 발생한다고 가정하고,  
    데이터를 읽는 시점에 미리 DB 락(`SELECT ... FOR UPDATE`)을 건다. 충돌이 잦은 환경에 적합하나 동시성이 떨어지고 데드락 위험이 있다.
  * **낙관적 락(Optimistic Lock)** : 충돌이 드물다고 가정하고 락을 걸지 않으며,  
    보통 **버전(version) 컬럼**으로 갱신 시점에 충돌 여부를 검사한다. 변경 전후 버전이 다르면 예외를 던져 재시도한다. 동시성은 좋으나 충돌이 잦으면 재시도 비용이 크다.


* **MVCC(Multi-Version Concurrency Control, 다중 버전 동시성 제어)** : 데이터를 변경할 때 이전 버전(스냅샷)을 함께 보관해, **읽기 작업이 쓰기 락을 기다리지 않도록** 하는 동시성 제어 기법.  
  읽는 트랜잭션은 자신의 시점에 맞는 스냅샷을 보고, 쓰는 트랜잭션은 새로운 버전을 만든다. 이로써 읽기-쓰기 간 블로킹을 줄여 동시성을 높인다. (MySQL InnoDB, PostgreSQL, Oracle 등이 사용)

![MVCC 스냅샷 읽기와 비관적 락·낙관적 락의 동작을 시간 순서로 비교한 흐름](/images/it/database-mvcc-lock-timeline.png)


* **락 선택 기준** : 충돌이 많고 반드시 직렬화가 필요하면 DB의 비관적 락(`SELECT ... FOR UPDATE`)이나 원자적 조건 업데이트가 단순하고 안전하다. 충돌이 적으면 버전 컬럼 기반 낙관적 락으로 재시도한다. Redis 분산 락도 사용할 수 있지만 락 만료, 락 소유자 검증, 네트워크 장애를 함께 고려해야 하므로 강한 정합성이 필요하면 DB 락을 우선 검토한다.

## 인덱스

* **인덱스(Index)** : 테이블 검색 속도를 높이기 위한 자료구조다. 조건에 맞는 데이터를 찾을 때 전체 테이블을 스캔하지 않고 정렬된 구조를 탐색하므로 조회 성능을 높일 수 있지만, 쓰기 시 인덱스 갱신 비용과 저장 공간이 추가로 든다.


* **B-Tree / B+Tree 인덱스 구조** : 대부분의 RDBMS 인덱스는 B+Tree 기반이다.  
  루트에서 리프까지의 깊이가 일정한 균형 트리라 일반적으로 O(log n) 수준의 검색 성능을 내며, 리프 노드가 정렬되어 있어 범위 검색과 정렬에도 유리하다.
  * **리프 노드 연결 구조** : B+Tree는 검색 키와 행을 찾기 위한 정보(행 위치 또는 PK 등)를 리프 노드에 저장하고, 리프 노드를 순차 탐색할 수 있도록 서로 연결한다. 세부 저장 방식은 DBMS와 인덱스 종류에 따라 다르다.
    덕분에 한 지점을 찾은 뒤 옆으로 순차 이동하며 읽을 수 있어 **범위 검색(BETWEEN, 부등호)과 정렬(ORDER BY)에 매우 유리**하다.
  * **왜 빠른가** : 정렬된 상태로 유지되므로 이진 탐색처럼 범위를 좁혀가며 찾고, 디스크 I/O 횟수(트리 깊이)가 적기 때문이다.

![B+Tree 탐색과 리프 노드 범위 스캔, 복합 인덱스 A·B·C의 사전식 정렬 구조](/images/it/database-btree-composite-index.png)


* **인덱스가 동작하지 않는 경우 / 주의점** : 인덱스를 걸어도 옵티마이저가 사용하지 않거나 효율이 떨어지는 대표 케이스
  * **선두 컬럼 미사용** : 복합 인덱스 (A, B)에서 선두 컬럼 A가 조건절에 없으면 인덱스를 제대로 타기 어렵다.
  * **인덱스 컬럼에 함수/연산 사용** : `WHERE SUBSTR(col,1,3)='abc'`, `WHERE col+1 = 10`처럼 컬럼을 가공하면 인덱스를 타지 못한다. (함수 기반 인덱스를 따로 만들면 가능)
  * **LIKE '%xx'** : 일반적인 B-Tree 인덱스는 검색 시작점을 정할 수 없어 선두 와일드카드 검색에 효율적으로 사용하기 어렵다. `LIKE 'xx%'` 같은 전방 일치는 문자 정렬 규칙과 DBMS 조건이 맞으면 범위 검색에 인덱스를 활용할 수 있다.
  * **형변환(묵시적 타입 캐스팅)** : 컬럼 타입과 조건 값 타입이 달라 묵시적 형변환이 일어나면 인덱스를 타지 못할 수 있다.
  * **카디널리티가 낮은 컬럼** : 성별처럼 값의 종류가 적으면 인덱스 효과가 작다. NULL이 많은 컬럼이나 부정 조건(`!=`, `NOT IN`)도 비효율적이다.


* **복합 인덱스와 커버링 인덱스**
  * **복합 인덱스(Composite Index)** : 여러 컬럼을 묶어 만든 인덱스. 컬럼 순서가 중요하며, **선두 컬럼부터 차례로 조건에 사용**되어야 효율적이다.  
    등치(=) 조건 컬럼을 앞에, 범위 조건 컬럼을 뒤에 두는 것이 유리하다.
  * **커버링 인덱스(Covering Index)** : 쿼리가 필요로 하는 컬럼을 인덱스가 모두 포함하는 경우.  
    실제 테이블(데이터 블록) 접근 없이 인덱스만 읽어 결과를 반환하므로 매우 빠르다.

## 실행 계획, 조인, 페이징

* **옵티마이저와 실행계획(Execution Plan)** : 옵티마이저는 SQL을 어떤 순서와 방식으로 처리할지 비용을 계산해 실행 계획을 선택하는 DBMS 엔진이다.  
  실행 계획을 보면 인덱스 사용 여부, 조인 방식, 예상 row 수, 풀 스캔 여부를 확인할 수 있어 쿼리 튜닝의 출발점이 된다.
  * **실행계획(Execution Plan)** : 옵티마이저가 결정한 SQL 처리 경로. 인덱스 사용 여부, 조인 방식, 예상 처리 행 수 등을 보여준다.
  * **EXPLAIN** : 실행계획을 미리 확인하는 명령. (MySQL: `EXPLAIN`, `EXPLAIN ANALYZE` ) 쿼리 튜닝 시 인덱스를 타는지,  
    풀 스캔을 하는지, 예상 row 수가 얼마인지를 확인하는 1차 도구다.


* **JOIN 기법 종류**
  * **중첩 루프 조인 (Nested Loops Join)** : 선행 테이블의 결과를 하나씩 읽고 후행 테이블을 반복 조회하는 방식. 선행 테이블의 결과가 작고,  
    후행 테이블의 조인 컬럼에 인덱스가 있을 때 유리하다. 선행 테이블의 처리 범위가 전체 비용을 크게 좌우한다.
  * **병합 조인 (Sort Merge Join)** : 양쪽 입력을 조인 키 기준으로 정렬한 뒤 순차적으로 비교하는 방식.  
    이미 정렬되어 있거나 정렬 비용이 감당 가능할 때 유리하며, 동등 조건뿐 아니라 범위 조건 조인에도 사용할 수 있다.
  * **해시 조인 (Hash Match Join)** : 작은 입력으로 해시 테이블을 만들고 큰 입력을 탐색하면서 매칭하는 방식.  
    대량 데이터의 동등 조인(`=`)에 유리하지만, 해시 테이블을 만들 메모리가 부족하면 디스크 I/O가 늘어날 수 있다.
    * **Build Input (outer table)** : 테이블 중 작은 테이블을 읽어 해시 테이블을 생성한다.
    * **Probe Input (inner table)** : 큰 테이블을 읽으며 해시 테이블을 탐색하며 Join 한다.


* **페이징 처리** : 대량 데이터를 나눠 조회하는 방법
  * **OFFSET 기반 페이징** : `LIMIT n OFFSET m` 방식. 구현이 간단하지만 **뒤 페이지로 갈수록 느려진다.  
    ** OFFSET이 커지면 DB가 건너뛸 행까지 모두 읽고 버려야 하기 때문이다. 또한 페이징 중 데이터가 추가/삭제되면 행이 밀려 중복/누락이 발생할 수 있다.
  * **커서 기반 페이징(Cursor / Keyset Pagination)** : 마지막 키로 다음 데이터를 조회한다. 예:  
    `WHERE id < lastId ORDER BY id DESC LIMIT n` 인덱스를 그대로 타므로 깊은 페이지에서도 성능이 일정하다. 연속 조회에는 적합하지만 임의 페이지 이동은 어렵다.
* **페이징 방식 선택 기준** : 특정 페이지로 바로 이동해야 하면 OFFSET 방식을 유지하되 검색 조건과 인덱스를 함께 튜닝한다. 깊은 페이지 조회가 잦고 데이터 변경이 많은 목록은 커서 기반 페이징이 유리하다. 커서 방식은 앞의 행을 버리는 비용이 없고 데이터 추가/삭제 중 중복이나 누락 가능성도 줄일 수 있다.


## 인덱스 운영과 저장 구조

* **클러스터링(Clustering)** : 연관된 데이터를 물리적으로 가깝게 배치해 디스크 I/O를 줄이는 기법이다. 구현 방식은 DBMS마다 다르며, 대표적으로 클러스터 인덱스는 인덱스 키 순서에 따라 테이블 데이터를 저장한다. 조회에는 유리할 수 있지만 쓰기·페이지 분할 비용을 함께 고려해야 한다.


* **Clustered Index와 Non-Clustered Index**
  * **클러스터 인덱스(Clustered Index)**: 테이블 데이터가 인덱스 키 순서에 가깝게 저장되는 구조. 테이블당 하나만 가능하다.  
    MySQL InnoDB에서는 Primary Key가 클러스터 인덱스가 되며, PK가 없으면 내부적으로 대체 키를 사용한다.
  * **논클러스터 인덱스(Non-Clustered Index, Secondary Index)**: 데이터 자체와 별도의 인덱스 구조를 가진다.  
    인덱스에서 원하는 키를 찾은 뒤 실제 행을 다시 찾아가야 할 수 있다. InnoDB의 보조 인덱스는 리프 노드에 Primary Key 값을 저장한다.


* **Index 설정 기준**
  * **카디널리티 (Cardinality) 높음** : 중복도가 낮은 컬럼
  * **선택도 (Selectivity) 높음** : 조건에 맞는 행이 적게 조회되는 컬럼


* **인덱스 추가 후에도 느릴 때 점검 순서** : `EXPLAIN` 또는 `EXPLAIN ANALYZE`로 실행 계획을 먼저 본다. 인덱스가 실제 사용되는지,  
  예상 row 수와 실제 row 수가 크게 다른지, 풀 스캔이나 filesort가 발생하는지 확인한다. 이후 조건절이 인덱스 선두 컬럼을 사용하는지, 컬럼에 함수/형변환이 걸려 있는지, 카디널리티가 낮아 옵티마이저가 인덱스를 포기했는지 점검하고, 필요하면 복합 인덱스 순서나 커버링 인덱스를 검토한다.


## 인덱스 설계 검증 기준

* **복합 인덱스의 실제 정렬** : 복합 인덱스 `(A, B, C, D)`의 리프 노드는
  **`(A → B → C → D)` 사전식 순서**로 정렬된다.
  * `A`가 같은 행끼리 `B`가 모인다.
  * `A`, `B`가 같을 때만 `C`, `D`의 순서가 의미를 가진다.
  * `A = ? AND B = ? AND C >= ?`는 연속된 리프 범위를 읽을 수 있다.
  * `B = ?`만으로는 일반적으로 연속 범위를 특정할 수 없다.

* **범위 조건 이후의 컬럼** : `(A, B, C)`에서 `A = ? AND B >= ? AND C = ?`라면,
  `B`의 범위가 시작된 이후 `C`는 탐색 범위를 더 좁히는 키로 쓰기 어렵다.
  DBMS가 `C`를 인덱스 조건으로 추가 평가할 수는 있지만,
  `A`, `B`가 모두 등치 조건인 경우만큼 효율적이지 않다.

* **인덱스와 정렬의 관계**
  * `WHERE A = ? ORDER BY B, C`는 `(A, B, C)` 인덱스로 정렬 작업을 피할 수 있다.
  * 정렬 방향이 섞이거나 중간 컬럼이 빠지면 별도 정렬(filesort)이 필요할 수 있다.
  * 실행 계획에서 `Using filesort`, 실제 읽은 행 수, 정렬 메모리·디스크 사용을 확인한다.

* **쓰기 비용과 페이지 분할**
  * 인덱스 하나를 추가하면 `INSERT`, `UPDATE`, `DELETE`마다 해당 B+Tree도 갱신된다.
  * 삽입 위치의 페이지가 가득 차면 페이지 분할이 발생한다.
  * 무작위 UUID는 분할 비용을 키울 수 있고, 단조 증가 키는 특정 페이지 경합을 키울 수 있다.
  * 조회 성능뿐 아니라 쓰기 경로와 저장 공간을 함께 평가한다.

* **성능 검증 기록**
  * 같은 데이터 규모, 캐시 상태, 동시성, 쿼리 파라미터 분포에서 전후를 비교한다.
  * `EXPLAIN ANALYZE`, p50·p95·p99, TPS, CPU·디스크 I/O, 인덱스 크기를 기록한다.
  * `INSERT`·`UPDATE` 지연과 느린 쿼리 로그도 함께 확인한다.

## 데이터 무결성

* **데이터 무결성** : 데이터가 정해진 규칙을 만족하며 정확하고 일관된 상태를 유지하는 성질이다. RDBMS는 Primary Key, Foreign Key, Unique, Not Null, Check 같은 제약 조건으로 잘못된 데이터가 저장되는 것을 차단한다.
  * **개체 무결성(Entity Integrity)** : 각 행을 식별할 수 있는 Primary Key가 있어야 하며, Primary Key는 중복되거나 `NULL`일 수 없다.
  * **참조 무결성(Referential Integrity)** : Foreign Key가 참조하는 값은 대상 테이블에 존재해야 하며, 연관된 데이터의 삭제·변경 규칙도 일관되게 유지해야 한다.


## 데이터 모델링과 DB 선택

* **정규화**: 데이터 중복을 줄이고 무결성을 높이기 위해 테이블을 체계적으로 분리하는 과정. 중복 설계는 삽입/삭제/갱신 이상을 만들 수 있다.
  * **제 1 정규형 (1NF: First Normal Form)** : 각 필드는 하나의 값만 가져야 한다.
  * **제 2 정규형 (2NF: Second Normal Form)** : 1NF를 만족하고, 기본 키가 복합 키일 때 모든 비주요 속성이 기본 키 전체에 완전 함수 종속되어야 한다. 즉, 키 일부에만 종속되는 속성이 없어야 한다.
  * **제 3 정규형 (3NF: Third Normal Form)** : 2NF를 만족하고, 비주요 속성이 기본 키가 아닌 다른 비주요 속성에 이행적으로 종속되지 않아야 한다.


* **SQL vs NoSQL** : 데이터 모델과 일관성/확장 전략의 차이
  * **SQL(관계형 DB)** : 정해진 스키마(테이블/행/열), ACID 트랜잭션, JOIN과 복잡한 쿼리에 강점. 복제·샤딩 등 수평 확장도 가능하다.
  * **NoSQL** : 문서/키-값/컬럼/그래프 등 다양한 모델을 제공하며, 유연한 스키마와 대용량·고처리량에 강점이 있다. 일관성 모델과 트랜잭션 지원은 제품·설정마다 다르다.
    (MongoDB, Cassandra, Redis, DynamoDB 등)
  * **선택 기준** : 데이터 구조가 명확하고 트랜잭션·정합성·복잡한 조인이 중요하면 SQL,  
    스키마가 자주 변하거나 초대용량·고확장·고가용성이 중요하면 NoSQL이 유리하다.

## DB 확장과 운영

* **Replication(복제)** : Primary의 데이터를 Replica로 복제해 읽기 부하 분산과 장애 대응에 활용한다.  
  보통 비동기 복제이므로 Primary 장애 직후 일부 데이터 유실이나 복제 지연(Replication Lag)을 고려해야 한다.


* **Sharding(샤딩)** : 데이터를 여러 DB 노드에 나누어 저장하는 수평 분할 방식. 대용량 쓰기/저장 한계를 넘는 데 유리하지만, 샤딩 키 선택, 조인 제약,  
  리밸런싱, 운영 복잡도가 증가한다.


* **데이터베이스 파티셔닝**: 큰 테이블을 파티션(Partition)이라는 작은 단위로 나누어 관리하는 기법이다. 파티션 제거(Partition Pruning)가 가능한 쿼리는 성능과 관리성을 높일 수 있지만, 파티션 키와 맞지 않는 조인·조회는 오히려 비용이 커질 수 있다.


* **DB Migration** : 스키마 변경을 버전으로 관리하는 방식. 운영에서는 하위 호환 가능한 변경을 먼저 배포하고,
  애플리케이션 배포 후 불필요한 컬럼/인덱스를 제거하는 식으로 단계적으로 진행하는 것이 안전하다. (Flyway, Liquibase)

# 용어정리 – JPA

## 영속성 컨텍스트와 엔티티 생명주기

* **JPA / Hibernate / Spring Data JPA** : **JPA**는 자바의 ORM 표준 명세(인터페이스), **Hibernate**는 JPA를 구현한 대표적인 구현체, **Spring Data JPA**는 JPA를 더 쉽게 쓰도록 Repository 인터페이스만 정의하면 구현체를 자동 생성해주는 스프링 모듈이다.
  * **ORM(Object-Relational Mapping)** : 객체와 관계형 DB의 테이블을 매핑해, SQL을 직접 작성하지 않고 객체 중심으로 데이터를 다루게 해주는 기술. 객체-테이블 간 패러다임 불일치를 해결한다.


* **영속성 컨텍스트** : 엔티티를 관리하는 JPA의 1차 캐시 공간. 엔티티 조회, 변경 감지, 쓰기 지연, 동일성 보장을 제공한다.


* **영속성 컨텍스트의 이점**
  * **1차 캐시** : 조회가 가능하며 1차 캐시에 없으면 DB에서 조회하여 1차 캐시에 올려 놓는다.
  * **동일성 보장** : 같은 트랜잭션/영속성 컨텍스트 안에서는 같은 식별자의 엔티티에 대해 동일성 비교(`==`)가 가능하다.
  * **쓰기 지연** : 트랜잭션 커밋하기 전까지 SQL을 바로 보내지 않고 모아서 보낼 수 있다.
  * **변경 감지** : commit 되는 시점에 Entity와 스냅샷을 비교하여 update SQL을 생성한다.
  * **지연 로딩** : 연관 엔티티를 실제 사용하는 시점에 SQL을 실행하여 데이터를 가져온다.

![JPA 영속성 컨텍스트의 구성과 동작 흐름](/images/it/jpa-persistence-context.png)


* **변경 감지(Dirty Checking)** : 영속 상태의 엔티티 값을 변경하면,  
  트랜잭션 커밋 시점에 영속성 컨텍스트가 최초 스냅샷과 비교해 변경된 부분에 대한 UPDATE SQL을 자동 생성/실행한다. 영속 상태에서는 별도의 `save()` 호출이 필요 없다. 단, 준영속(detached) 엔티티는 변경 감지가 동작하지 않는다.


* **프록시(JPA)** : 연관된 엔티티가 항상 필요한 것은 아니므로, 실제 사용될 때까지 DB 조회를 지연시키기 위해 실제 엔티티를 대신하는 가짜 객체를 사용한다.  
  이를 프록시 객체라고 한다.
  * **LazyInitializationException** : 영속성 컨텍스트가 닫힌 뒤 지연 로딩 프록시를 초기화하려고 하면 발생한다.  
    서비스 계층의 트랜잭션 안에서 필요한 데이터를 조회하거나 DTO로 변환해 해결한다. OSIV(Open Session In View)를 켜두면 View 계층에서도 지연 로딩이 가능하지만, DB 커넥션을 오래 잡을 수 있어 주의가 필요하다.


* **엔티티 생명주기(Entity Lifecycle)**
  * **비영속(Transient)** : 영속성 컨텍스트와 무관하게 객체만 생성된 상태 (`new`)
  * **영속(Managed)** : 영속성 컨텍스트가 관리하는 상태 (`persist()`, 조회). 변경 감지(Dirty Checking) 대상.
  * **준영속(Detached)** : 영속 상태였다가 분리된 상태 (`detach()`, `clear()`, 트랜잭션 종료). 변경 감지가 동작하지 않음.
  * **삭제(Removed)** : 삭제 예정 상태 (`remove()`)


* **merge와 persist 차이**
  * **persist** : 새 엔티티를 영속 상태로 만든다. 이미 영속 상태가 된 객체 자체가 관리 대상이다.
  * **merge** : 준영속 엔티티의 값을 영속 엔티티에 복사하고, 복사된 영속 엔티티를 반환한다.  
    파라미터로 넘긴 준영속 객체가 다시 영속 상태가 되는 것이 아니므로 반환값을 사용해야 한다.


* **flush** : 영속성 컨텍스트의 변경 내용을 DB에 반영(SQL 전송)하는 것. 영속성 컨텍스트를 비우는 것이 아니라 동기화하는 것. (커밋,  
  JPQL 쿼리 실행 시 자동 호출)


* **영속성 전이(Cascade)와 고아 객체(orphanRemoval)** : Cascade는 부모 상태 변화를 자식에게 전파한다. 예: 부모 저장 시 자식도 저장한다.  
  orphanRemoval은 부모와의 연관관계가 끊긴 자식 엔티티를 자동 삭제하는 옵션.

## N+1과 조회 최적화

* **페치 전략(Fetch Type)** : 연관된 엔티티를 언제 로딩할지 결정하는 전략
  * **즉시 로딩(EAGER)** : 엔티티 조회 시 연관 엔티티도 즉시 함께 조회. 예측이 어렵고 N+1을 유발하기 쉽다. (`@ManyToOne`,  
    `@OneToOne`의 기본값)
  * **지연 로딩(LAZY)** : 연관 엔티티를 실제 사용하는 시점에 조회(프록시).  
    **실무에서는 모든 연관관계를 LAZY로 설정하고 필요 시 Fetch Join으로 해결하는 것을 권장.** (`@OneToMany`, `@ManyToMany`의 기본값)


* **N + 1 문제** : 연관 관계가 설정된 엔티티를 조회할 경우 조회된 데이터 개수(N)만큼 연관관계 조회 쿼리가 추가로 발생하는 문제.  
  1개의 쿼리를 예상했지만 연관 엔티티 조회 때문에 N개의 쿼리가 더 실행된다.
  * **즉시 로딩에서 발생** : JPQL은 작성된 쿼리를 먼저 실행한 뒤 페치 전략을 적용한다. 연관 엔티티가 원래 쿼리에 포함되지 않았다면 JPA 구현체가 즉시 로딩을 맞추기 위해 엔티티별 추가 조회를 실행할 수 있다.
  * **지연 로딩에서 발생** : 지연 로딩으로 설정된 연관 엔티티를 실제로 사용하는 순간 프록시가 초기화되며 추가 조회가 실행된다. 이 과정이 조회된 엔티티마다 반복되면 N개의 쿼리가 추가된다.

![JPA N+1 문제의 반복 쿼리와 Fetch Join, Batch Size를 이용한 조회 최적화 비교](/images/it/jpa-n-plus-one-optimization.png)


* **N + 1 해결**
  * **패치 조인(Fetch Join)** : 미리 JOIN하여 한 번에 데이터를 가져오면 N+1을 방지할 수 있다.
    * 1:N 컬렉션 Fetch Join은 row 증가와 엔티티 중복을 만들 수 있어 `distinct`가 필요할 수 있다.
    * 컬렉션 Fetch Join과 페이징을 함께 사용하면 메모리 페이징 문제가 발생할 수 있다.
    * 둘 이상의 컬렉션을 동시에 Fetch Join하면 `MultipleBagFetchException`이 발생할 수 있다.
  * **배치 사이즈(Batch Size)** : `@BatchSize` 또는 `default_batch_fetch_size`를 설정한다.  
    한 번의 쿼리로 여러 연관 엔티티를 조회하는 방법이다. 엔티티를 지정한 개수 만큼 IN을 활용하여 호출하게 된다.
  * **EntityGraph** : 조회 시 필요한 연관관계를 그래프로 지정하여 Fetch Join과 비슷하게 한 번에 로딩할 수 있다.  
    Repository 메서드에 적용하기 쉽다.


* **조회 최적화 판단 기준**
  * 한 화면에서 항상 필요한 연관 데이터는 Fetch Join이나 EntityGraph로 명시적으로 함께 조회한다.
  * 1:N 컬렉션 조회와 페이징이 섞이면 Fetch Join보다 batch size나 DTO 직접 조회가 안전한 경우가 많다.
  * 연관관계는 기본적으로 LAZY로 두고, 조회 목적마다 필요한 데이터만 가져온다.


* **JPQL과 QueryDSL** : 복잡한 조회 쿼리 작성 방법
  * **JPQL** : 테이블이 아닌 엔티티 객체를 대상으로 하는 객체지향 쿼리. 문자열이라 컴파일 시점에 오류를 잡지 못한다.
  * **QueryDSL** : 자바 코드로 타입 안전(Type-safe)하게 쿼리를 작성하는 라이브러리. 컴파일 시점에 문법 오류를 잡고 동적 쿼리 작성에 강점이 있다.  
    (실무에서 널리 사용)


* **JPA 벌크 업데이트 주의점** : JPQL 벌크 업데이트/삭제는 영속성 컨텍스트를 거치지 않고 DB에 직접 반영된다.  
  따라서 이미 1차 캐시에 올라온 엔티티 값과 DB 값이 불일치할 수 있다. 벌크 연산 후에는 `clear()`로 영속성 컨텍스트를 비우거나 별도 트랜잭션으로 분리해 오염을 막는다.

# 용어정리 – Spring

## 트랜잭션과 AOP

* **@Transactional** : Spring AOP를 통해 구현되어 있다. `@Transactional`이 선언되면 해당 빈에 트랜잭션 프록시가 적용되고,  
  메서드 호출 전후로 트랜잭션 시작/커밋/롤백을 처리한다. 기본적으로 `RuntimeException`과 `Error`가 발생하면 롤백하고, Checked Exception은 롤백하지 않는다. Checked Exception까지 롤백하려면 `rollbackFor`를 지정해야 한다.


* **@Transactional 특징**
  * `@Transactional`은 우선순위를 가지고 있다. 메서드에 선언된 트랜잭션의 우선순위가 가장 높고, 인터페이스에 선언된 트랜잭션의 우선순위가 가장 낮다.
  * Spring의 기본 트랜잭션 AOP는 Proxy Mode이므로 프록시를 거친 메서드 호출에 트랜잭션이 적용된다.
  * `readOnly = true`는 쓰기 작업을 절대 막는 옵션이라기보다 읽기 전용 힌트에 가깝다.  
    JPA/Hibernate에서는 플러시 최적화 등에 영향을 줄 수 있으나 DB와 구현체에 따라 동작이 다르다.


* **적용되지 않는 대표 사례** : Spring의 기본 트랜잭션은 프록시 기반 AOP이므로 프록시를 거치지 않는 호출에는 동작하지 않는다.  
  같은 클래스 내부에서 메서드를 직접 호출하는 self-invocation, `private` 메서드, `final` 메서드가 대표적이다. 또한 기본 롤백 대상은 `RuntimeException`과 `Error`이며, Checked Exception까지 롤백하려면 `rollbackFor`를 지정해야 한다.


* **@Transactional Propagation(트랜잭션 전파)** : 이미 트랜잭션이 진행 중일 때 추가 트랜잭션 진행을 어떻게 할지 결정할 수 있는 옵션
  * **REQUIRED** : 트랜잭션이 필요함(없으면 새로 만듦)
  * **SUPPORTS** : 트랜잭션이 있으면 지원함(트랜잭션이 없어도 됨)
  * **MANDATORY** : 트랜잭션이 의무임(트랜잭션이 반드시 필요함) / 없으면 IllegalTransactionStateException 예외 발생
  * **REQUIRES_NEW** : 항상 새로운 트랜잭션이 필요함 / 기존 트랜잭션이 있다면 보류시키고 새로 만듦
  * **NOT_SUPPORTED** : 트랜잭션 없이 진행함 / 기존 트랜잭션이 있다면 보류시킴
  * **NEVER** : 트랜잭션을 사용하지 않음(기존 트랜잭션도 허용하지 않음)/ 트랜잭션이 있으면 IllegalTransactionStateException 예외 발생
  * **NESTED** : 기존 트랜잭션 안에 Savepoint를 만들어 중첩 트랜잭션처럼 동작함. 내부 작업만 롤백하고 외부 트랜잭션은 계속 진행할 수 있다.  
    DB와 트랜잭션 매니저가 Savepoint를 지원해야 한다.


* **물리 트랜잭션과 논리 트랜잭션** : DB 커넥션에 실제로 시작되는 트랜잭션을 물리 트랜잭션이라고 한다.  
  스프링에서 `@Transactional` 메서드 단위로 관리되는 트랜잭션 범위를 논리 트랜잭션이라고 한다. `REQUIRED` 전파에서는 여러 논리 트랜잭션이 하나의 물리 트랜잭션에 참여할 수 있으며, 내부 논리 트랜잭션이 롤백 전용으로 표시되면 최종 커밋 시 전체 물리 트랜잭션이 롤백될 수 있다.
  * **물리 트랜잭션** : 실제 데이터베이스에 적용되는 트랜잭션으로, 커넥션을 통해 커밋/롤백하는 단위
  * **논리 트랜잭션** : 스프링이 트랜잭션 매니저를 통해 트랜잭션을 처리하는 단위


* **전파 옵션의 비용과 함정** : `REQUIRES_NEW`는 외부 트랜잭션을 잠시 멈추고 별도 커넥션을 사용한다.  
  반복 호출하거나 커넥션 풀이 작은 환경에서 사용하면 기존 트랜잭션이 커넥션을 잡은 채 새 커넥션을 기다려 풀 고갈 또는 데드락 위험을 키울 수 있다. `NESTED`는 savepoint 기반이며 JPA·DB·트랜잭션 매니저 조합에 따라 지원 여부가 다르다. 전파 옵션은 독립 커밋이 반드시 필요한지, 실패가 외부 작업에 전파돼야 하는지를 먼저 정한 뒤 사용한다.

![Spring 트랜잭션 프록시 호출과 self-invocation 우회, REQUIRED와 REQUIRES_NEW 전파 방식 비교](/images/it/spring-transaction-proxy-propagation.png)


* **AOP(Aspect Oriented Programming)** : 로깅, 트랜잭션, 보안처럼 여러 곳에 반복되는 공통 관심사를 핵심 로직과 분리하는 방식이다.  
  Spring에서는 주로 프록시 기반으로 메서드 호출을 가로채 부가 기능을 적용한다.


* **AOP 특징**
  * Pointcut에 매칭되는 스프링 빈에는 프록시 객체를 생성하고 타겟 객체(Target) 대신 프록시 빈으로 등록
  * 생성된 프록시는 타겟 객체(Target)의 호출을 가로채고 Advice의 기능을 호출 후에 타겟 객체(Target)의 기능을 호출한다.


* **AOP 주요 요소**
  * **Target** : 부가기능을 부여할 대상 (핵심기능을 담고 있는 모듈)
  * **Aspect** : 부가기능을 정의한 모듈 , Advice 와 PointCut을 갖고 있다.
  * **Advice** : 실질적으로 부가기능을 담은 구현체
  * **PointCut** : 부가기능이 적용될 대상(Method)을 선정하는 방법
  * **JoinPoint** : Advice가 적용될 수 있는 위치

## Spring 핵심 원리

* **Spring Framework의 핵심** : 자바 엔터프라이즈용 경량 프레임워크다. 핵심 기술은 **IoC/DI, AOP, PSA**이며 비즈니스 로직에 집중하게 돕는다.


* **Spring의 레이어드 아키텍처** : 요청 처리, 업무 흐름, 데이터 접근의 책임을 계층별로 분리하는 구조다. 각 계층은 정해진 방향으로만 의존하게 해 변경 영향을 줄이지만, 계층을 건너뛰는 호출이나 모든 로직을 Service에 모으는 구조는 피해야 한다.
  * **Presentation Layer** : HTTP 요청과 응답을 처리한다. (`Controller`)
  * **Application Layer** : 유스케이스의 흐름과 트랜잭션 경계를 조정한다. (`Service`)
  * **Persistence Layer** : DB 조회와 저장을 담당한다. (`Repository`)


* **Spring DI/IoC**
  * **IoC(제어의 역전)** : 객체 생성과 생명주기, 호출 흐름에 대한 제어를 애플리케이션 코드가 직접 수행하지 않고 프레임워크나 컨테이너에 위임하는 원리다.
  * **DI(의존관계 주입)** : 객체가 필요한 의존 대상을 직접 생성하지 않고 외부에서 전달받는 방식이다. Spring 컨테이너는 빈 설정을 바탕으로 의존관계를 연결한다.
    * **생성자 주입** : 필수 의존관계를 생성 시점에 전달하고 필드를 `final`로 선언할 수 있어 불변성과 테스트 편의성이 좋다. 누락된 의존성을 객체 생성 시점에 확인할 수 있고 생성자 기반 순환 참조도 애플리케이션 시작 단계에서 드러난다.
    * **수정자(Setter) 주입** : 선택, 변경 가능성이 있는 의존관계에 사용되며 스프링빈을 선택적으로 등록한다.
    * **필드 주입** : `@Autowired` 를 사용하는데 외부에서 변경이 불가능하여 테스트 하기 힘들다. DI 프레임워크 없이는 작동하기 힘들며,  
      주로 애플리케이션과 관계없는 테스트코드나 `@Configuration` 같은 스프링 설정 목적으로 사용


* **POJO(Plain Old Java Object)** : 특정 기술/프레임워크에 종속되지 않는 순수 자바 객체. 스프링은 POJO 기반 개발을 지향한다.


* **PSA(Portable Service Abstraction)** : 일관된 추상화를 제공해 구현 기술을 바꿔도 코드 변경을 최소화하는 것. (예:  
  `@Transactional`은 JPA/JDBC 등 어떤 기술이든 동일하게 동작, `PlatformTransactionManager` 추상화)


* **Spring vs Spring Boot** : Spring Boot는 Spring을 더 쉽게 쓰기 위한 도구로, 복잡한 설정을 자동화한다.
  * **자동 설정(Auto Configuration)** : `@EnableAutoConfiguration`은 classpath를 감지해 필요한 빈을 자동 등록한다.  
    `@SpringBootApplication`에 포함되어 있다. `@Conditional` 기반으로 조건에 맞을 때만 설정이 적용된다.
  * **내장 WAS(Embedded Tomcat)** : 별도 WAS 설치 없이 jar 하나로 실행 가능
  * **Starter 의존성** : `spring-boot-starter-web` 처럼 관련 의존성을 묶어 버전 충돌 없이 관리
  * **@SpringBootApplication** : `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`을 합친 어노테이션


* **스프링 컨테이너(Spring Container)** : 스프링 빈의 생성, 의존성 주입, 생명주기를 관리하는 핵심 런타임이다.  
  개발자는 객체 생성과 의존관계 연결을 직접 관리하지 않고, 컨테이너가 설정과 어노테이션을 기반으로 빈을 구성하도록 위임한다.
  * **BeanFactory** : 스프링 빈의 생성, 의존성 주입, 조회를 담당하는 핵심 컨테이너 인터페이스. 빈 생성 시점은 구현과 설정에 따라 달라진다.
  * **ApplicationContext** : `BeanFactory` 기능에 이벤트 발행, 국제화, 리소스 조회 등 애플리케이션 기능을 더한 컨테이너. 일반적으로 초기화할 때 지연 설정이 아닌 싱글톤 빈을 미리 생성한다.


* **Spring Bean** : 스프링 컨테이너에 의해 생성되고 관리되는 자바 객체를 뜻하며, 스프링 컨테이너는 하나 이상의 빈(Bean)을 관리한다.
  * **Spring Bean 생명주기** : 스프링 빈 생성 → 의존관계 주입 → 초기화 콜백 메서드 호출 → 사용 → 제거 콜백 메서드 호출 → 스프링 종료
    * **Spring Bean 콜백(초기화 및 소멸)** :
      * **@PostConstruct** : 초기화 콜백 (의존관계 주입이 끝나면 호출)
      * **@PreDestroy** : 제거 콜백 (메모리 반납, 연결 종료와 같은 과정)


* **Spring Bean 등록** : `@ComponentScan`은 `@Component` 클래스를 자동 등록한다.  
  `@Configuration` 클래스와 `@Bean` 메서드로도 직접 등록할 수 있다. `@Bean`(메서드) 을 사용하여 빈 설정파일에 직접 빈을 등록할 수 있다.
  * **Bean/Component 차이점**
    * **@Bean** : 개발자가 작성한 method를 기반으로 메서드에서 반환하는 인스턴스 객체 생성
    * **@Component** : 개발자가 작성한 class를 기반으로 실행시점에 인스턴스 객체를 생성.
    (`@Controller`, `@Service`, `@Repository` 는 모두 `@Component`)


* **Bean Scope** : 빈 스코프는 빈이 존재할 수 있는 범위를 뜻하며 싱글톤(singleton), 프로토타입(prototype), request, session,  
  application 등이 있다.
  * **singleton Scope** : 스프링 빈 스코프의 기본값, 스프링 컨테이너의 시작과 종료까지 유지, 싱글톤 스코프의 빈을 조회하면,  
    스프링 컨테이너는 항상 같은 인스턴스를 반환한다.
  * **prototype Scope** : 빈의 생성과 의존관계 주입까지만 관여하고 더는 관리하지 않는 매우 짧은 범위의 스코프, 항상 새로운 인스턴스를 생성해서 반환한다


* **빈 충돌 해결** : 같은 타입의 빈이 여러 개일 때 주입 대상을 특정하는 방법
  * **@Primary** : 여러 후보 중 우선적으로 주입될 빈을 지정
  * **@Qualifier** : 주입 시 특정 이름의 빈을 명시적으로 선택


* **순환 참조(Circular Dependency)** : A 빈이 B를, B 빈이 A를 서로 주입받는 상황이다.
  * **생성자 주입**은 빈 생성 시점에 순환 참조를 감지해 애플리케이션 구동을 실패시킨다.
  * Spring Boot 2.6+는 기본적으로 순환 참조를 금지한다.
  * 런타임 장애를 예방하려면 설계를 분리하는 것이 정석이다.

## Spring MVC와 요청 처리

* **Spring MVC 요청 처리 흐름** 클라이언트 요청 → **DispatcherServlet** → **HandlerMapping** → Controller 탐색 → **HandlerAdapter** 실행 → Controller 결과 반환 → **ViewResolver** 결정 (또는 `@ResponseBody` /`@RestController`면 HttpMessageConverter가 JSON 직렬화) → 응답 반환
  * **DispatcherServlet** : 모든 요청을 받아 적절한 핸들러로 분배하는 프론트 컨트롤러
  * **@RestController** : `@Controller` + `@ResponseBody`. View가 아닌 데이터(JSON)를 반환


* **Servlet Filter** : 서블릿 실행 전후에 공통 작업을 처리한다.
  이 필터가 있음으로써 WAS에서 설정을 변경하지 않고도 모든 서블릿에 영향을 준다.
  * **Filter 에러 처리** : Filter 예외는 `@ControllerAdvice`가 직접 처리하지 않는다. Filter에서 직접 응답을 만들거나 error dispatch를 통해 `ErrorController`로 전달하도록 구성한다.


* **Spring Interceptor** : DispatcherServlet 내부에서 컨트롤러 실행 전후에 공통 로직을 처리한다. 인증, 로깅,  
  권한 체크처럼 Spring MVC 핸들러 정보가 필요한 작업에 적합하다.
  * **Interceptor 에러 처리** : DispatcherServlet의 예외 처리 흐름을 타는 예외는 `@ControllerAdvice`로 처리할 수 있다.


* **MVC 요청 흐름에서 AOP의 위치** : AOP는 Filter나 Interceptor처럼 모든 요청이 순서대로 통과하는 고정 단계가 아니다.
  AOP가 적용된 Spring Bean 대신 등록된 **프록시의 메서드 호출 경계**에서 동작한다. 예를 들어 Controller가 `@Transactional` Service를 호출하면
  `Controller → Service Proxy(AOP) → 실제 Service` 순서로 실행되며, 프록시가 메서드 실행 전 트랜잭션을 시작하고 정상 반환 시 커밋하거나 예외 시 롤백한다.
  Repository나 Controller에도 AOP가 적용되어 프록시로 등록됐다면 각각의 호출 경계에서 같은 방식으로 동작할 수 있다.
  * **Filter** : Servlet 컨테이너의 요청·응답 경계
  * **Interceptor** : DispatcherServlet 내부의 Handler 실행 경계
  * **AOP** : 프록시가 적용된 Spring Bean의 메서드 호출 경계

![Servlet Filter와 Interceptor를 거쳐 Controller가 Service·Repository AOP 프록시를 호출하는 Spring MVC 요청 생명주기](/images/it/spring-mvc-request-lifecycle.png)


## Spring Security와 인증

![로그인 인증부터 JWT 발급, 보호 API 요청의 토큰 검증과 권한 확인까지의 Spring Security 흐름](/images/it/spring-security-jwt-flow.png)

* **인증(Authentication)과 인가(Authorization)** : **인증**은 "누구인지"를 확인하는 것(로그인),  
  **인가**는 "무엇을 할 수 있는지" 권한을 확인하는 것(접근 제어).


* **Spring Security 인증 과정** 인증 요청 → AuthenticationFilter → UsernamePasswordAuthenticationToken 생성 → AuthenticationManager 인증 → UserDetailsService 조회 → SecurityContext 저장 이후 UserDetailsService 구현체를 통해 DB에 저장된 정보와 비교해 일치하면 UserDetails 구현 객체를 반환해 SecurityContext에 저장한다.


* **Spring Security 구조**
  * **SecurityFilterChain** : 여러 보안 필터(Filter)들의 모음. 요청은 이 필터 체인을 거쳐 인증/인가가 처리된다.  
    (과거 `WebSecurityConfigurerAdapter`는 deprecated → 현재는 `SecurityFilterChain` 빈으로 설정)
  * **SecurityContextHolder** : 인증된 사용자 정보(Authentication)를 보관하는 곳. 기본적으로 ThreadLocal에 저장된다.
  * **PasswordEncoder** : 비밀번호를 단방향 해시로 암호화 (BCrypt 권장)


* **JWT(Json Web Token)** : 인증/인가에 필요한 클레임을 담고 서명한 토큰이다.  
  서버가 세션 상태를 저장하지 않아도 요청마다 토큰 검증으로 사용자를 식별할 수 있어 Stateless 구조에 자주 사용된다.
  * **Header(헤더)** : 토큰 타입(`typ`), 서명 알고리즘(`alg`), 선택적으로 서명 키를 식별하는 ID(`kid`) 등의 정보가 담긴다.
  * **Payload(페이로드)** : 토큰에서 사용할 정보의 조각들인 클레임(Claim)이 담겨 있다. 클레임(Claim)은 Key/Value 형태로 된 값을 갖는다.
  * **Signature(서명)** : Base64URL로 인코딩한 Header와 Payload를 서명 키로 서명한 값이다. 토큰이 변조되지 않았고 신뢰하는 주체가 발급했는지 검증하는 용도이며, Payload를 암호화하지는 않는다.


* **JWT의 동작 방식**
  * **인증(Authentication)** : 로그인 성공 시 서버가 JWT를 발급하고, 클라이언트는 이후 요청에 토큰을 포함한다.
  * **인가(Authorization)** : 서버는 토큰의 서명과 클레임을 검증해 사용자와 권한을 판단한다.


* **JWT의 장점**
  * **자가 포함(Self-contained)** : 필요한 클레임을 토큰에 담을 수 있어 별도 세션 조회를 줄인다.
  * **확장성** : 서버 상태 의존이 작아 여러 인스턴스나 서비스 간 인증 처리에 유리하다.
  * **주의점** : Payload는 암호화가 아니라 인코딩이므로 민감 정보를 넣으면 안 된다.


* **토큰 수명과 폐기 전략** : Access Token은 탈취 피해 범위를 줄이기 위해 짧은 만료 시간을 두고,  
  Refresh Token은 서버 측 저장소에서 회전(rotation)·폐기·재사용 탐지를 관리한다. 권한 변경이나 강제 로그아웃을 즉시 반영해야 하면 JWT만으로는 부족하므로 토큰 버전, deny-list, 세션 저장소 등 상태 확인 수단이 필요하다. 검증 시에는 서명뿐 아니라 만료 시간(`exp`), 발급자(`iss`), 대상(`aud`), 허용 알고리즘을 검증하고, 클라이언트가 보낸 알고리즘을 그대로 신뢰하지 않는다.


* **브라우저 보안 경계** : 쿠키 기반 인증은 CSRF 방어가 필요하며 `SameSite`, CSRF 토큰, Origin/Referer 검증을 조합한다.  
  토큰을 JavaScript가 읽을 수 있는 저장소에 두면 XSS 탈취 위험이 커지고, `HttpOnly` 쿠키는 XSS 노출을 줄이는 대신 CSRF 대책이 필요하다. CORS는 서버 간 보안 장치가 아니라 브라우저의 교차 출처 읽기 제한이므로, 인증·인가를 대신하지 않는다.


* **세션 기반 인증 vs 토큰(JWT) 기반 인증**
  * **세션 방식** : 서버가 세션을 저장(Stateful). 서버 확장(Scale-out) 시 세션 공유 문제가 있어 세션 클러스터링이나 Redis 세션 스토리지가 필요.
  * **JWT 방식** : 서버가 상태를 저장하지 않음(Stateless). 확장에 유리하나 토큰 탈취/만료 관리가 과제 → Access Token + Refresh Token 조합으로 보완.
  * **JWT 주의점** : JWT는 서명된 토큰이지 기본적으로 암호화된 토큰이 아니다.  
    Payload는 Base64URL로 인코딩되어 쉽게 읽을 수 있으므로 민감 정보를 넣으면 안 된다. 또한 서버가 토큰 상태를 저장하지 않기 때문에 강제 로그아웃, 토큰 폐기, 권한 변경 즉시 반영이 어렵다.


* **OAuth 2.0** : 제3자 애플리케이션에 비밀번호를 노출하지 않고 자원 접근 권한을 위임하는 인가 프레임워크. (소셜 로그인의 기반) Resource Owner,  
  Client, Authorization Server, Resource Server로 구성되며, 보통 **Authorization Code Grant** 방식을 사용한다. 사용자 인증 후 인증 코드를 받아 Access Token으로 교환한다.

## 외부 연동과 비동기 실행 안정성

* **Timeout** : 외부 API, DB, Redis, Kafka 등 원격 호출에는 반드시 연결 시간(connect timeout)과 응답 대기 시간(read timeout)을 설정해야 한다. timeout이 없으면 장애가 난 외부 시스템 때문에 애플리케이션 스레드가 고갈될 수 있다.


* **Retry** : 일시적인 네트워크 오류에는 재시도가 도움이 되지만, 무조건 재시도하면 장애 시스템에 부하를 더 줄 수 있다. 재시도 횟수 제한, 지수 백오프,  
  jitter, 멱등성 보장이 필요하다.


* **Rate Limiting** : 특정 사용자나 클라이언트의 과도한 요청을 제한해 시스템을 보호하는 방법. API Gateway, Nginx,  
  Redis 카운터 등을 이용해 구현하며, 처리 비용이 크거나 남용 위험이 큰 엔드포인트에 특히 중요하다.


* **@Async** : Spring AOP를 통해 구현되어 있다. `@Async`가 선언되면 스프링이 프록시 객체를 만들어 비동기 실행을 위임한다.
  프록시 기반이기 때문에 `private 메서드`, `final 메서드`, self-invocation(같은 클래스 내부 호출)에서는 동작하지 않는다. 반드시 `@EnableAsync`가 필요하며, 운영 환경에서는 명시적인 Executor 설정이 권장된다.


* **@Async의 Thread Pool**
  * **SimpleAsyncTaskExecutor** : 작업마다 새로운 스레드를 생성하고 비동기 방식으로 동작한다. 스레드 풀 방식이 아니므로 스레드를 재사용하지 않으며, 요청이 많으면 스레드가 과도하게 늘어날 수 있다.
  * **ThreadPoolTaskExecutor** : 스레드 풀 기반의 TaskExecutor. 운영 환경에서는 `corePoolSize`, `maxPoolSize`, `queueCapacity`, `RejectedExecutionHandler`를 명시적으로 설정하는 것이 좋다.
    * **ThreadPoolTaskExecutor 옵션**
      * corePoolSize : 기본적으로 유지할 스레드 개수
      * maxPoolSize : 스레드 풀에 살아있는 최대 개수
      * queueCapacity : 모든 core 스레드가 작업 중일 때 대기열에 쌓을 수 있는 작업 개수
      * keepAliveSeconds : 스레드 풀 내 스레드 개수가 corePoolSize 초과인 상태에서, 대기 상태의 스레드가 종료되는 시간
    * **ThreadPool 동작 방식**
      * 스레드 수가 corePoolSize보다 작으면 새 스레드를 만들어 작업을 실행한다.
      * core 스레드가 모두 작업 중이면 queueCapacity만큼 큐에 작업을 쌓는다.
      * 큐가 가득 차고 스레드 수가 maxPoolSize보다 작으면 추가 스레드를 만든다.
      * 큐도 가득 차고 maxPoolSize에도 도달하면 거부 정책이 동작한다.


* **@Async의 반환 타입** : `void`, `Future`, `CompletableFuture`를 사용할 수 있다.
  * **Future** : `future.get()`을 호출하면 결과가 올 때까지 현재 스레드가 대기한다. 비동기로 작업을 시작했더라도 곧바로 `get()`을 호출하면 호출자는 블로킹되므로 비동기의 이점을 얻기 어렵다.
  * **CompletableFuture** : Java 8에서 추가된 방식. 여러 연산을 결합할 수 있고, 연산이 완료되면 다음 단계의 작업을 수행하거나 예외를 처리할 수 있다. 최근 코드에서는 `ListenableFuture`보다 `CompletableFuture`를 주로 사용한다.

## Spring Batch

* **Spring Batch** : 대량 데이터를 일정한 단위로 읽고 가공해 저장하는 배치 작업을 구성하는 프레임워크다. 온라인 API가 요청 한 건을 짧게 처리하는 데 초점을 둔다면, 배치는 정산·집계·데이터 이관처럼 많은 데이터를 안정적으로 끝까지 처리하고 실패 지점부터 재시작하는 데 초점을 둔다.


* **Job과 Step** : Job은 하나의 배치 작업 전체이고 Step은 그 안의 처리 단계다. 각 실행의 상태와 파라미터는 JobRepository에 기록되므로 같은 작업의 중복 실행을 통제하고 실패한 Step부터 재시작할 수 있다. 재실행할 작업은 같은 입력을 다시 처리해도 결과가 깨지지 않도록 멱등하게 설계한다.


* **Chunk 처리** : ItemReader가 데이터를 읽고 ItemProcessor가 가공하며 ItemWriter가 결과를 저장한다. 일정 개수인 chunk 단위로 트랜잭션을 커밋하므로 한 건마다 커밋하는 비용을 줄일 수 있지만, chunk가 너무 크면 락 유지 시간과 롤백 범위가 커지고 너무 작으면 커밋 비용이 증가한다.


* **성능과 운영 기준** : 페이징 조회는 안정적인 정렬 키와 인덱스를 사용하고, 대량 데이터는 파티셔닝이나 병렬 Step으로 나눌 수 있다. 다만 병렬도를 높이면 DB 커넥션과 락 경합도 함께 증가하므로 처리량만 보지 말고 실패·재시도 횟수, 처리 건수, 소요 시간과 DB 부하를 관측한다.

# 용어정리 – Java

## Java 동시성

![두 스레드가 공유 값을 변경할 때 synchronized, volatile, AtomicInteger가 보장하는 가시성과 원자성 비교](/images/it/java-concurrency-control.png)

* **동시성 키워드: synchronized / volatile / atomic** : 멀티스레드 환경에서 가시성(Visibility)과 원자성(Atomicity)을 다룬다.
  * **synchronized** : 임계 영역에 한 번에 하나의 스레드만 진입하도록 락(lock)을 거는 키워드.  
    **원자성과 가시성을 모두 보장**하지만 락 경합으로 성능 비용이 있다.
  * **volatile** : 한 스레드의 쓰기가 이후 다른 스레드의 읽기에 보이도록 Java 메모리 모델의 **가시성과 순서 규칙(happens-before)**을 제공한다.
    그러나 `count++`처럼 읽기-수정-쓰기 복합 연산의 **원자성은 보장하지 못한다.**
  * **atomic (java.util.concurrent.atomic)** :
    `AtomicInteger` 등은 CAS(Compare-And-Swap)를 활용해 개별 읽기·갱신 연산의 원자성과 가시성을 제공한다. 락 없이 구현된 연산이 많아 단순 카운터 등에 적합하지만, 여러 호출을 묶은 로직까지 자동으로 원자적이 되지는 않는다.


* **동시성 제어 선택 기준** : 단순 상태 변경 전파처럼 가시성만 필요하면 `volatile`을 사용할 수 있지만, `count++` 같은 복합 연산에는 적합하지 않다.  
  임계 영역 전체의 원자성과 가시성이 필요하면 `synchronized`가 명확하고, 단순 카운터나 누적값처럼 짧은 원자 연산은 `AtomicInteger` 같은 atomic 계열이 락 경합을 줄이는 데 유리하다.


* **CAS와 ABA 문제** : CAS는 값이 예상값과 같을 때만 변경하는 낙관적 방식이다.  
  값이 `A → B → A`로 바뀌면 CAS는 값이 처음부터 `A`였다고 오인할 수 있는데, 이를 ABA 문제라고 한다. 단순 카운터에는 보통 문제가 없지만 상태 전이가 중요한 자료구조에서는 버전 번호를 함께 비교하는 `AtomicStampedReference` 같은 방법을 검토한다. 또한 CAS는 경합이 심하면 반복 재시도로 CPU를 소모할 수 있어, 항상 락보다 빠른 것은 아니다.


* **가시성과 안전한 공개** : 불변 객체는 생성자에서 완전히 초기화한 뒤 `final` 필드로 보관하면 다른 스레드에 안전하게 공개하기 쉽다.  
  반면 일반 컬렉션을 여러 스레드가 동시에 수정하면 `volatile` 참조만으로는 안전하지 않으며, 동기화·동시성 컬렉션·메시지 전달 중 하나로 변경 범위를 보호해야 한다. `ConcurrentHashMap`도 개별 연산은 안전하지만 여러 연산을 묶은 업무 규칙까지 원자적으로 만들어 주지는 않는다.


## Java 예외 처리

* **Error와 Exception**
  * **Error** : JVM이나 실행 환경의 심각한 문제를 나타내는 `Throwable` 계열이다. 애플리케이션에서 일반적으로 복구를 시도하지 않으며, 발생했다고 항상 즉시 프로세스가 종료되는 것은 아니다.
  * **Exception** : 애플리케이션이 처리하거나 호출자에게 전달할 수 있는 예외 상황을 나타내는 `Throwable` 계열이다.
    * **Checked Exception과 Unchecked Exception**
      * **Checked Exception** : `RuntimeException`을 상속하지 않는 예외로, 컴파일러가 `try-catch` 처리 또는 `throws` 선언을 요구한다.
        (대표적으로 FileNotFoundException)
      * **Unchecked Exception** : `RuntimeException`을 상속하는 예외로, 컴파일러가 명시적인 처리를 강제하지 않는다. (대표적으로 `NullPointerException`)

## JVM과 메모리

* **JVM** : 자바 바이트코드를 실행하는 가상 머신. 클래스 로딩, 바이트코드 실행, 메모리 관리(GC)를 담당한다.
  * **Class Loader** : VM내로 클래스를 로드하고, 링크를 통해 배치하는 작업을 수행하는 모듈
  * **Execution engine(실행 엔진)** : 바이트 코드를 실행시키는 역할
    * **Interpreter** : 바이트 코드를 한 줄씩 실행한다.
    * **JIT 컴파일러** : 인터프리터가 반복되는 코드를 발견하면 JIT 컴파일러가 반복되는 코드를 네이티브 코드로 바꿔준다.  
      그 다음부터 인터프리터는 네이티브 코드로 컴파일된 코드를 바로 사용한다.
    * **GC(Garbage Collector)** : 힙 영역에서 사용되지 않는 객체들을 제거하는 작업을 수행
  * **Runtime Data Areas**: 프로그램 실행 중에 사용되는 다양한 영역
  * **JNI(Java Native Interface)**: 자바 애플리케이션에서 C, C++, 어셈블리어로 작성된 함수를 사용할 수 있는 방법을 제공,  
    Native 키워드를 사용하여 메서드를 호출 (대표적인 메서드는 Thread의 currentThread())
  * **Native Method Library**: C, C++로 작성된 라이브러리

![JVM 메모리 구조와 세대별 GC 흐름](/images/it/jvm-memory-gc.png)


* **GC(Garbage Collector)** : Heap에서 더 이상 도달할 수 없는 객체의 메모리를 회수하는 JVM 기능이다. 수집 범위와 알고리즘, Stop-the-world 구간은 사용하는 GC에 따라 다르다.
  * **Young GC(Minor GC)** : 전통적인 세대별 GC에서는 Young 영역을 주로 Eden과 두 Survivor 공간으로 구성한다. 살아남은 객체를 Survivor 공간으로 복사하고, 일정 조건을 만족한 객체는 Old 영역으로 승격한다. 세부 구조와 동작은 GC 구현에 따라 다르다.
  * **Major GC와 Full GC** : 용어는 JVM 구현과 도구마다 다르게 쓰인다. 일반적으로 Major GC는 Old 영역 수집을, Full GC는 Heap 전체 수집을 뜻하므로 둘을 같은 의미로 단정하면 안 된다. Mark, Sweep, Compact 사용 여부도 GC 알고리즘에 따라 다르다.


* **Mark & Sweep & Compact & Promotion**
  * **Mark**: 접근 가능한 객체에 Mark하여 표시
  * **Sweep**: Mark되지 않은 객체들을 제거하는 과정
  * **Compact**: Sweep 과정에 의해 삭제되면 메모리 단편화가 발생하는데, Compact를 통해 빈자리들을 채워줌
  * **Promotion** : Survivor 영역에서 계속해서 살아남은 객체들이 특정 age 값에 도달하면, Old Generation으로 이동하게 되는 과정


* **GC(Garbage Collector) 알고리즘**
  * **Serial GC** : 서버의 CPU 코어가 1개일 때 사용하기 위해 개발된 GC, Stop The World 시간이 길다,  
    Mark & Sweep & Compact 알고리즘을 사용
  * **Parallel GC** : Serial GC와 기본적인 알고리즘은 같지만, Young 영역의 Minor GC를 멀티 쓰레드로 수행
  * **G1 GC (Garbage First)** : 기존의 GC 알고리즘에서는 Heap 영역을 물리적으로 고정된 Young/Old 영역으로 나누어 사용하였지만,  
    G1 GC는 Region이라는 개념을 도입하여 Heap을 여러 영역으로 나누어 관리한다. 전체 Heap을 한 번에 처리하지 않고 회수 효율이 높은 Region을 우선 수집하여 Stop The World 시간을 예측 가능하게 줄이는 것을 목표로 한다. (Java 9+ 기본 GC)
  * **ZGC / Shenandoah** : 대용량 Heap용 저지연(Low-Latency) GC다. Stop-The-World를 수 밀리초 이내로 줄이는 것을 목표로 한다.  
    대부분의 GC 작업(마킹, 재배치)을 애플리케이션 스레드와 동시에(Concurrent) 수행한다. ZGC는 수 TB 단위의 Heap까지 확장 가능한 것이 특징이다.


* **GC 문제가 의심될 때 확인 순서** : 먼저 지표에서 GC pause time, GC frequency, heap 사용률, old 영역 증가 추세를 확인한다.  
  이후 GC 로그로 Minor/Full GC 빈도와 원인을 보고, 메모리 누수가 의심되면 Heap Dump의 dominator tree와 객체 참조를 분석한다. CPU가 높거나 요청이 멈추는 상황이면 Thread Dump로 데드락, 블로킹 I/O, 락 경합을 확인한다.
  * **Heap Dump** : 특정 시점의 Heap에 존재하는 객체와 참조 관계를 기록한 파일이다. 어떤 객체가 메모리를 많이 차지하고 무엇이 객체의 해제를 막는지 분석한다.
  * **Thread Dump** : 특정 시점의 모든 스레드 상태와 호출 스택을 기록한 파일이다. 데드락, 락 경합, 블로킹 I/O와 CPU를 과도하게 사용하는 스레드를 찾는 데 사용한다.


* **자바의 메모리 영역**
  * **Stack 영역** : 기본 자료형(원시 자료형, Primitive type), 지역변수, 매개변수가 저장되는 메모리 영역.  
    Heap 영역에 생성된 데이터의 참조값이 할당되며, 메서드가 호출될 때 메모리에 할당되고 메서드 종료 시 삭제된다.
  * **Heap 영역** : 인스턴스를 생성(new)할 때 사용되는 메모리 영역,  
    참조형 데이터 객체의 실제 데이터가 저장되는 공간 (Stack 영역에서 실제데이터가 존재하는 Heap 영역의 참조값을 가지고 있다.), GC가 관리한다.
  * **static 필드** : 클래스에 속해 모든 인스턴스가 공유하는 필드다. static 필드가 참조하는 객체는 Heap에 존재하며, 클래스 로더가 살아 있는 동안에는 보통 도달 가능하므로 GC 대상이 되지 않는다.
  * **Metaspace** : 클래스 메타데이터(클래스 구조, 메서드 정보 등)가 저장되는 영역.  
    **Java 8부터 기존의 PermGen(Permanent Generation)을 대체**하며, Heap이 아닌 **네이티브 메모리(OS 메모리)에 할당**된다. 따라서 고정 크기였던 PermGen과 달리 필요에 따라 동적으로 크기가 늘어나 `OutOfMemoryError: PermGen space` 같은 문제를 줄였다.

## Java 객체와 컬렉션

* **동일성(identity)와 동등성(equality)**
  * **동일성(identity)** : 두 참조가 같은 객체를 가리키는지 비교하며 `==` 연산자를 사용한다. JVM의 실제 메모리 주소를 직접 비교한다는 뜻은 아니다.
  * **동등성(equality)** : 객체의 내부 값이 같음을 비교, `equals()` 메서드를 오버라이드하여 구현


* **equals()와 hashCode() 규약** : 두 메서드는 반드시 **함께 오버라이드**해야 한다.
  * **규약** : `equals()`로 같다고 판단되는 두 객체는 반드시 같은 `hashCode()`를 반환해야 한다.  
    (역은 성립하지 않아도 됨 — hashCode가 같아도 equals는 다를 수 있다)
  * **왜 함께 오버라이드해야 하나(HashMap과의 연관)** : `HashMap`, `HashSet` 등 해시 기반 컬렉션은 먼저 `hashCode()`로 버킷을 찾고,  
    같은 버킷 안에서 `equals()`로 최종 일치를 판단한다. `equals()`만 재정의하고 `hashCode()`를 재정의하지 않으면, 논리적으로 같은 객체라도 서로 다른 버킷에 저장되어 **조회/중복 제거가 정상 동작하지 않는다.**


* **String / StringBuilder / StringBuffer**
  * **String** : **불변(Immutable)** 객체. 문자열을 더할 때마다 새로운 객체가 생성되므로, 반복적인 문자열 연결에는 비효율적이다.  
    (String Constant Pool로 리터럴 재사용)
  * **StringBuilder** : 가변(Mutable) 객체. 문자열을 변경해도 같은 객체를 수정한다.  
    **동기화하지 않아(non-synchronized) 단일 스레드 환경에서 빠르다.**
  * **StringBuffer** : StringBuilder와 동일하나 **메서드가 동기화(synchronized)되어 스레드 안전**하다.  
    대신 동기화 비용으로 단일 스레드에서는 StringBuilder보다 느리다.


* **컬렉션 프레임워크(Collection Framework)**
  * **List / Set / Map** : List는 순서가 있고 중복을 허용, Set은 순서가 없고(일부 구현 제외) 중복을 허용하지 않음,  
    Map은 Key-Value 쌍으로 Key의 중복을 허용하지 않는다.
  * **ArrayList vs LinkedList** : ArrayList는 배열 기반이라 `get`이 O(1)로 빠르다. 중간 삽입·삭제에는 요소 이동이 필요하다.  
    LinkedList는 노드 연결 기반이라 양 끝 또는 이미 찾은 노드의 삽입·삭제는 빠르지만, 특정 위치를 먼저 찾는 데 O(n)이 걸린다.
  * **HashMap 내부 동작** : Key의 `hashCode()`로 **버킷(bucket)** 위치를 정하고 그 안에 저장한다.  
    서로 다른 Key가 같은 버킷에 들어가는 **해시 충돌(Collision)** 시에는 같은 버킷의 엔트리를 연결해 관리한다. **Java 8부터는 엔트리가 임계값(기본 8개)에 도달하고 테이블 용량도 최소 기준(기본 64)을 만족하면 레드-블랙 트리로 전환(Treeify)** 하여 충돌이 많은 버킷의 조회 성능을 개선한다.

## Java 언어 기능과 실행 환경

* **Stream API** : 컬렉션 등의 데이터를 내부 반복으로 정렬·필터링·변환하는 API. Stream 연산 자체는 원본 컬렉션을 변경하지 않지만, 람다 내부의 부작용으로 요소 객체나 외부 상태를 변경하지 않도록 주의해야 한다. `parallel()`로 병렬 처리도 가능하다.
  * **Mutable 객체** : 생성된 이후에도 객체 내부 상태를 변경할 수 있는 객체다. setter는 상태 변경 방법 중 하나일 뿐 필수 조건은 아니다.
  * **Immutable 객체** : 생성된 이후 수정 불가능하며, 변경이 필요하면 새 객체를 만든다. 내부에 가변 객체를 노출하지 않고 안전하게 공개하면 스레드 안전성에 유리하다. 자바의 대표적인 불변 객체는 `String`이다.


* **함수형 인터페이스와 람다**
  * **함수형 인터페이스(Functional Interface)** : 추상 메서드가 하나인 인터페이스다. `@FunctionalInterface`로 명시할 수 있다.  
    (대표적으로 `Runnable`, `Comparator`, `Function`, `Supplier`, `Consumer`, `Predicate`)
  * **람다 표현식(Lambda)** : 함수형 인터페이스의 구현을 익명 함수 형태(`(x) -> x + 1`)로 간결하게 표현하는 문법.
  * **메서드 레퍼런스(Method Reference)** : 람다가 단순히 기존 메서드를 호출하기만 할 때 더 간결하게 표현하는 문법.  
    (`System.out::println`, `String::valueOf`, `User::getName`)


* **제네릭(Generics)** : 클래스 내부에서 사용할 데이터 타입을 외부에서 지정하는 기법,  
  객체의 타입을 컴파일 시에 체크하기 때문에 객체의 타입 안정성을 높이고 형변환의 번거로움을 줄여주며 재사용성을 높인다.
제네릭은 참조 타입에서만 사용할 수 있으며 원시 타입에서 사용하고 싶다면 래퍼(Wrapper) 클래스를 사용하여야 한다.
  * **와일드카드** : 와일드카드는 ? 문자를 사용하여 불특정 타입을 나타낼 때 사용되며 주로 메서드 파라미터에 적용한다.
    * **무제한 와일드카드** : 어떤 타입이라도 허용 (List<?> list)
    * **상한 경계 와일드카드 (Upper Bounded Wildcard)** : 특정 타입의 하위 클래스만 허용 (List<? extends Number> list)
    * **하한 경계 와일드카드 (Lower Bounded Wildcard)** : 특정 타입의 상위 클래스만 허용 (List<? super Integer> list)


* **리플렉션(Reflection)** : 런타임에 클래스, 생성자, 필드와 메서드의 메타데이터를 조회하고 동적으로 객체를 생성하거나 메서드를 호출하는 기능이다. Spring의 의존성 주입, JPA의 엔티티 생성, 직렬화 라이브러리처럼 실행 시점에 타입을 분석해야 하는 프레임워크에서 활용한다. 캡슐화를 우회할 수 있고 일반 호출보다 분석과 실행 비용이 있으므로 애플리케이션 업무 로직에서 무분별하게 사용하지 않는다.


* **직렬화(Serialization)와 역직렬화(Deserialization)**
  * **직렬화** : 객체나 데이터 구조를 JSON, Protocol Buffers, 바이트 스트림처럼 저장·전송 가능한 형식으로 변환하는 과정이다.
  * **역직렬화** : 저장·전송된 데이터를 애플리케이션의 객체나 데이터 구조로 복원하는 과정이다. 외부 입력을 객체로 만들기 때문에 타입뿐 아니라 허용 필드와 업무 규칙도 검증해야 한다.


* **record / Optional 사용 의도**
  * **record (Java 16+)** : 불변 데이터 전달용 객체(DTO/VO)를 간결하게 정의하기 위한 타입. 필드 선언만으로 생성자, getter,  
    `equals()`/`hashCode()`/`toString()`이 자동 생성된다. **불변 데이터를 보일러플레이트 없이 표현**하려는 의도.
  * **Optional** : 값이 없을 수 있음(null 가능성)을 타입으로 명시해 **NullPointerException을 예방**하려는 의도.  
    주로 메서드 반환 타입에 사용하며, 필드/파라미터로 남용하는 것은 권장되지 않는다.


* **Java의 실행 방식**
  * 자바 컴파일러(`javac`)가 소스 파일(`.java`)을 바이트코드 파일(`.class`)로 변환한다.
  * Class Loader가 필요한 클래스를 JVM에 로드하고 검증·링크·초기화한다.
  * Execution Engine이 바이트코드를 인터프리터나 JIT 컴파일러로 실행한다.
  * 실행 중 객체와 스레드 정보는 Heap, Stack 등 JVM Runtime Data Area에서 관리된다.


* **Java 버전별 특징**
  * **Java 8** : Lambda, Stream API, Optional, 새로운 날짜/시간 API(`java.time`) 추가
  * **Java 11 (LTS)** : HTTP Client 표준화, `var`를 람다 파라미터에 사용 가능, `javac`로 컴파일하지 않고 단일 소스 파일 실행 가능.  
    Java 9부터 G1 GC가 기본 GC가 되었고, Java 11은 장기 지원 버전으로 많이 사용된다.
  * **Java 17 (LTS)** : Sealed Class, Pattern Matching for `instanceof`, Text Blocks 등 추가.  
    Spring Boot 3의 최소 요구 버전이 Java 17이다.
  * **Java 21 (LTS)** : **Virtual Threads (Project Loom)**, Sequenced Collections,  
    Pattern Matching for `switch`, Record Patterns 추가
  * **Virtual Threads** : 운영체제 스레드와 1:1 매칭되지 않는 경량 스레드로,  
    많은 동시 I/O 작업을 기존 플랫폼 스레드보다 적은 비용으로 처리할 수 있다.

# 용어정리 – 성능 및 운영

## 커넥션 풀과 스레드 풀

* **Connection Pool** : DB 연결을 매 요청마다 새로 만들지 않고 미리 만들어 둔 연결을 재사용하는 방식. 풀 크기가 너무 작으면 대기 시간이 늘고,  
  너무 크면 DB가 감당하지 못한다. 애플리케이션 인스턴스 수까지 고려해 전체 DB 커넥션 수를 계산해야 한다.


* **HikariCP 주요 설정** : `maximumPoolSize`, `minimumIdle`, `connectionTimeout`, `idleTimeout`,  
  `maxLifetime`이 중요하다. DB의 wait timeout보다 `maxLifetime`을 짧게 잡아 죽은 커넥션을 재사용하지 않도록 한다.


* **Thread Pool** : 요청 처리나 비동기 작업을 제한된 스레드로 처리하는 방식. 스레드가 부족하면 큐 대기가 늘고,  
  큐가 무제한이면 장애 시 메모리 사용량이 급증할 수 있다. 작업 특성(CPU bound / I/O bound)에 따라 풀 크기와 큐 크기를 다르게 잡아야 한다.

* **Pool 고갈 대응** : 대기 시간 증가, timeout, active connection/thread 수, queue size를 함께 본다. 원인은 느린 쿼리,  
  외부 API 지연, 락 경합, 트래픽 급증일 수 있으므로 지표와 trace로 병목 구간을 먼저 좁힌다.

![HTTP 요청이 스레드 풀과 커넥션 풀을 거쳐 DB로 전달되는 흐름과 풀 고갈 시 대기·타임아웃](/images/it/thread-connection-pool-flow.png)

## Redis와 캐시 전략

* **Redis (Remote Dictionary Server)** : 인메모리 기반 Key-Value 저장소. 캐시, 세션 저장소, 분산 락, 랭킹 등에 사용된다.  
  명령 처리는 주로 단일 이벤트 루프에서 실행되므로 무거운 명령(`KEYS *`, 큰 범위 `SORT`)은 피해야 한다.


* **Redis 캐싱 전략 (읽기)**
  * **Cache Aside (Look Aside)** : 앱이 캐시를 먼저 확인하고(Cache Hit 시 반환), 없으면(Cache Miss) DB에서 조회 후 캐시에 저장.  
    가장 일반적인 방식. 캐시 장애가 DB 조회로 이어져 시스템이 죽지는 않지만, 최초 조회 시 지연이 발생한다.
  * **Read Through** : 애플리케이션은 캐시만 조회하고, 캐시가 내부적으로 DB를 조회해 값을 채우는 방식. 캐시 계층에 데이터 로딩 책임이 들어간다.


* **Redis 캐싱 전략 (쓰기)**
  * **Write Through** : 캐시와 DB에 동시에(캐시 갱신 후 DB 저장) 데이터를 저장.  
    데이터 정합성은 좋으나 매 쓰기마다 두 곳에 저장하므로 쓰기 속도가 느리다.
  * **Write Back (Write Behind)** : 데이터를 캐시에 먼저 저장하고 일정 시간/일정량이 모이면 DB에 배치(Batch) 저장.  
    쓰기 성능은 매우 좋으나 DB 반영 전 캐시 장애 시 유실 위험이 있다.
  * **Write Around** : 쓰기는 DB에만 하고 캐시는 갱신하지 않음. 이후 조회 시점에 캐시에 적재. 자주 읽히지 않는 데이터에 적합.


* **캐시 장애 상황**
  * **Cache Stampede (Thundering Herd)** : 인기 키가 동시에 만료되면,  
    수많은 요청이 한꺼번에 DB로 몰려(Cache Miss) DB에 부하가 폭증하는 현상. 해결책으로 만료 시간 분산(TTL Jitter), 갱신 시 분산 락(PER 알고리즘, 단일 스레드만 재계산), 논블로킹 재계산 등이 있다.
  * **Cache Penetration(캐시 관통)** : 캐시와 DB 모두에 없는 데이터를 반복 조회해 매번 DB까지 도달하는 현상.  
    → 빈 결과도 캐싱하거나 **Bloom Filter**로 존재 여부 사전 차단.
  * **Cache Avalanche(캐시 눈사태)** : 다수의 키가 동시에 만료되거나 캐시 서버 자체가 다운되어 부하가 일시에 DB로 몰리는 현상. → TTL 분산,  
    다중화(Replica), 서킷 브레이커.


* **캐시 일관성과 무효화(Invalidation)** : "캐시 무효화는 컴퓨터 과학의 어려운 문제 중 하나"로 불릴 만큼 까다롭다.  
  DB 갱신 시 캐시를 어떻게 동기화할지가 핵심.
  * **TTL(Time To Live)** : 만료 시간을 두어 일정 시간 뒤 자동으로 캐시를 비우는 가장 단순한 방법
  * **Cache Eviction 정책** : 메모리가 가득 찼을 때 데이터를 제거하는 정책. **LRU(가장 오래 안 쓰인 것)**, **LFU(가장 적게 쓰인 것)**,  
    TTL 기반 등
  * **Write 시 캐시 갱신/삭제** : 데이터 변경 시 캐시를 갱신(Update)하거나 삭제(Delete)하여 정합성 유지.  
    일반적으로 갱신보다 **삭제(Cache Invalidation)** 후 다음 조회 시 재적재가 안전하다.


* **캐시 도입 시 판단 기준** : 캐시는 성능을 높이지만 정합성과 장애 전파 문제를 만든다. TTL, 무효화 정책, 캐시 미스 시 DB 보호 전략을 함께 설계해야 한다.  
  인기 키 동시 만료는 Cache Stampede로 이어질 수 있으므로 TTL jitter, 분산 락, 비동기 재계산을 고려하고, 캐시 장애 시 DB가 버틸 수 있도록 circuit breaker, rate limit, fallback을 준비한다.

![Redis Cache Aside의 Hit·Miss 조회 흐름과 인기 키 만료에 따른 Cache Stampede 및 방지 방법](/images/it/redis-cache-aside-stampede.png)


* **Redis 자료구조** : String, List, Set, Sorted Set(ZSet), Hash, Bitmap, HyperLogLog, Geo,  
  Stream 등을 지원한다.
  * **Sorted Set** : score 기반 정렬 → 실시간 랭킹/리더보드에 활용
  * **Hash** : 객체(필드-값) 저장에 적합
  * **Set** : 중복 제거, 교집합/합집합 연산 (공통 관심사, 태그)


* **Redis 분산 락 (Distributed Lock)** : 여러 서버/인스턴스가 공유 자원에 동시에 접근하는 것을 막기 위해 사용.  
  단일 Redis에서는 보통 `SET key value NX PX ttl` 형태로 락 획득과 만료 시간 설정을 원자적으로 처리한다. `value`에는 예측 불가능한 고유 토큰을 넣고, 해제 시에는 **토큰이 일치할 때만 삭제**하는 Lua Script를 사용한다. TTL이 지난 뒤 다른 요청이 같은 키를 획득할 수 있으므로 단순 `DEL`은 이전 보유자가 새 보유자의 락을 지우는 오류를 만든다.


* **Redis 락의 보장 범위와 장애 모델**
  * `SET NX PX`의 원자성은 **해당 Redis 인스턴스 안에서만** 보장된다.
  * 비동기 복제 전 Primary가 장애 나면, 승격된 Replica는 기존 락을 모를 수 있다.
  * 따라서 단일 Redis 락은 장애 상황까지 포함한 강한 상호 배제를 보장하지 않는다.
  * 캐시 재생성과 중복 실행이 치명적인 작업을 구분해야 한다.

* **락 만료와 소유권**
  * 작업 시간이 TTL보다 길면, 만료 후 다른 요청이 진입할 수 있다.
  * TTL은 작업 시간의 상한과 네트워크 지연을 고려해 정한다.
  * 연장 시에는 소유 토큰을 검증하고, 실패하면 락을 잃었을 수 있다고 판단한다.
  * 중요한 쓰기는 DB 트랜잭션 또는 조건부 갱신으로 최종 무결성을 보장한다.


* **락이 만료된 뒤 이전 보유자가 작업을 완료하는 문제** : 작업 시간이 TTL을 넘으면 락이 자동으로 만료되고 다른 요청이 새 락을 얻을 수 있다. 이때 이전 보유자가 자신이 락을 잃은 사실을 모른 채 늦게 쓰기를 완료하면, 새 보유자의 결과를 오래된 작업이 덮어쓸 수 있다. 고유 토큰을 확인한 뒤 락을 해제하는 방식은 다른 사람의 락을 삭제하는 문제는 막지만, 이미 만료된 락의 이전 보유자가 보호 대상에 쓰는 것까지 막지는 못한다.


* **Fencing Token(펜싱 토큰)** : 락을 획득할 때마다 단조 증가하는 번호를 함께 발급하고, 실제 데이터를 저장하는 시스템이 마지막으로 처리한 번호보다 작은 요청을 거부하는 방식이다. 락이 만료된 이전 보유자의 작업이 늦게 도착해도 더 작은 번호를 가지므로 쓰기가 차단된다. Redis 락이 자동으로 제공하는 기능은 아니며, 보호 대상 DB나 저장소가 토큰을 비교하고 거부하도록 함께 구현해야 한다.

![Redis 분산 락의 고유 토큰 기반 안전한 해제와 TTL 만료 뒤 Fencing Token으로 늦은 쓰기를 거부하는 흐름](/images/it/redis-distributed-lock-fencing-token.png)


* **Redis 영속성(Persistence)** : 인메모리지만 재시작 시 데이터 복구를 위해 디스크 저장 옵션을 제공한다.
  * **RDB (Snapshot)** : 특정 시점의 메모리 전체를 스냅샷으로 저장. 파일이 작고 복구가 빠르지만, 스냅샷 사이의 데이터는 유실될 수 있다.
  * **AOF (Append Only File)** : 모든 쓰기 명령을 로그로 기록. 유실이 적고 안정적이지만 파일이 크고 복구가 상대적으로 느리다.  
    (실무에서는 RDB + AOF 혼용)


* **Redis 고가용성 / 확장**
  * **Replication(복제)** : Primary-Replica 구조로 데이터를 복제해 읽기 부하를 분산하고 장애에 대비한다.
  * **Sentinel(센티넬)** : Primary 장애를 감지해 Replica를 자동으로 승격(Failover)시켜 고가용성을 확보한다.
    비동기 복제 기반이므로 장애 시 일부 데이터 유실 가능성이 있다.
  * **Cluster(클러스터)** : 데이터를 16384개의 해시 슬롯으로 **샤딩(Sharding)**하여 여러 노드에 분산 저장 → 수평 확장

# 용어정리 – 아키텍처 및 분산 시스템

## 아키텍처 경계와 의존성

* **소프트웨어 아키텍처** : 시스템의 주요 구성 요소, 책임, 의존관계와 변경 원칙을 정하는 구조적 결정이다. 시스템이 커질수록 한 기능의 변경과 장애가 여러 영역으로 퍼질 수 있으므로, 아키텍처를 통해 변경과 장애의 영향 범위를 통제한다. 좋은 아키텍처는 패턴을 많이 적용한 구조가 아니라 필요한 품질과 운영 조건을 가장 단순하게 만족하는 구조다.


* **응집도와 결합도**
  * **응집도(Cohesion)** : 하나의 모듈 안에 같은 목적과 변경 이유를 가진 기능이 모여 있는 정도다. 관련 규칙과 데이터는 가까이 두는 것이 좋다.
  * **결합도(Coupling)** : 한 모듈의 변경이 다른 모듈에 영향을 주는 정도다. 결합을 모두 제거할 수는 없으므로 안정적인 인터페이스를 통해 의존 방향과 변경 전파를 통제한다.
  * **설계 기준** : 함께 변경되는 코드는 모으고, 서로 다른 이유로 변경되는 코드는 분리한다. 단순히 클래스나 서비스를 많이 나누면 호출과 상태 전달만 늘어날 수 있다.


* **의존성 역전 원칙(DIP)** : 상위 수준의 업무 정책이 DB, 메시지 브로커, 외부 API 같은 구체 기술에 직접 의존하지 않고 추상화에 의존하게 하는 원칙이다. 추상화는 사용하는 쪽의 필요에 맞춰 정의하며, 인터페이스를 만들었다는 사실만으로 의존성이 역전되는 것은 아니다.


* **헥사고날 아키텍처(Ports and Adapters)** : 애플리케이션 핵심 로직을 외부 환경에서 분리하기 위해 Port와 Adapter를 사용하는 구조다.
  * **Inbound Port** : 외부에서 애플리케이션이 제공하는 기능을 호출하는 진입 계약이다. Use Case 인터페이스가 대표적이다.
  * **Outbound Port** : 애플리케이션이 저장소나 외부 서비스에 요구하는 기능을 정의한 계약이다.
  * **Adapter** : HTTP Controller, JPA Repository 구현, 메시지 Consumer처럼 Port를 외부 기술과 연결한다.
  * **의존 방향** : 외부 Adapter가 내부 Port와 업무 규칙에 의존하며, 핵심 로직은 구체적인 프레임워크나 인프라 구현을 알지 않도록 한다.
  * **주의점** : 모든 CRUD에 Port와 Adapter를 기계적으로 추가하면 구조만 복잡해질 수 있다. 외부 기술 교체 가능성, 테스트 격리와 업무 규칙의 복잡성이 실제로 경계를 필요로 하는지 판단한다.

![헥사고날 아키텍처의 Inbound·Outbound Port와 Adapter, 실행 흐름 및 코드 의존 방향](/images/it/hexagonal-architecture.png)


* **클린 아키텍처와의 관계** : 클린 아키텍처도 업무 규칙을 중심에 두고 의존성이 안쪽으로 향하게 한다. 헥사고날 아키텍처는 Port와 Adapter를 중심으로 경계를 설명하고, 클린 아키텍처는 Entity·Use Case·Interface Adapter 같은 계층으로 설명하지만 핵심 지향점은 유사하다.


* **아키텍처 선택 기준** : 패턴 이름보다 변경 빈도, 트랜잭션 경계, 성능·가용성·보안 요구, 팀 구조와 운영 역량을 먼저 본다. 미래 가능성만으로 복잡성을 미리 도입하지 않고, 현재 문제를 해결하는 가장 단순한 구조에서 측정 가능한 필요가 생길 때 확장한다.

## DDD와 멀티 모듈

* **DDD(Domain-Driven Design)** : 복잡한 업무 규칙을 기술 구조보다 도메인 모델과 용어를 중심으로 설계하는 접근법이다. 단순히 Entity나 Repository라는 이름을 사용하는 것이 아니라, 개발자와 업무 담당자가 같은 용어로 규칙을 표현하고 그 경계를 코드와 데이터 소유권에 반영하는 것이 핵심이다.


* **Entity와 Value Object** : Entity는 주문처럼 식별자를 기준으로 생명주기를 추적하는 객체이고, Value Object는 금액·주소처럼 속성 값 자체가 의미를 가지는 객체다. Value Object를 불변으로 만들고 생성 시 유효성을 검증하면 관련 규칙이 여러 서비스 코드에 흩어지는 것을 줄일 수 있다.


* **Aggregate(애그리거트)** : 하나의 트랜잭션에서 일관성을 지켜야 하는 객체들의 묶음이며, 외부에서는 Aggregate Root를 통해서만 상태를 변경한다. Aggregate를 너무 크게 만들면 락 범위와 로딩 비용이 커지고, 너무 작게 나누면 하나의 규칙을 여러 트랜잭션과 이벤트로 맞춰야 하므로 업무 불변식을 기준으로 경계를 정한다.


* **Bounded Context** : 같은 용어와 모델이 일관된 의미를 갖는 업무 경계다. 경계가 다른 영역은 같은 단어도 규칙과 데이터 구조가 다를 수 있으므로 모델을 억지로 공유하지 않고 API나 이벤트로 연결한다. 이 경계는 모듈러 모놀리스의 모듈이나 MSA의 서비스 후보가 될 수 있지만 반드시 하나의 서비스와 일치하는 것은 아니다.


* **멀티 모듈 프로젝트** : 하나의 코드 저장소와 빌드 안에서 도메인·애플리케이션·인프라 또는 업무 영역별로 모듈을 분리하는 방식이다. 컴파일 의존성을 통해 접근 방향을 제한하고 공통 코드의 무분별한 참조를 줄일 수 있다. 단순히 모듈 수를 늘리는 것이 목적은 아니며, 순환 의존이 없고 각 모듈의 공개 API와 변경 이유가 명확해야 한다.

## MSA와 분산 시스템

* **분산 시스템(Distributed System)** : 네트워크로 연결된 여러 프로세스나 서버가 하나의 시스템처럼 협력하는 구조다. 각 노드는 독립적으로 실패할 수 있고, 네트워크 요청은 지연·유실·중복되거나 순서가 바뀔 수 있다. 따라서 원격 호출을 로컬 메서드 호출처럼 취급하면 안 되며 timeout, 재시도, 멱등성, 부분 실패와 관측 가능성을 기본 전제로 설계해야 한다.


* **Monolithic vs MSA** : 모놀리식은 하나의 배포 단위에 모든 기능이 포함되어 개발·테스트·운영이 상대적으로 단순하다. 규모가 커지면 변경 영향 범위와 빌드·배포 시간이 증가할 수 있지만, 모듈 경계를 명확히 한 **모듈러 모놀리스(Modular Monolith)**로 상당 부분 개선할 수 있다. MSA는 기능별 독립 배포와 부분 확장, 장애 격리에 유리하지만 모든 서비스 호출과 데이터 변경에 분산 시스템의 복잡성이 추가된다.


* **MSA (Microservices Architecture)** : 애플리케이션을 업무 능력과 데이터 소유권을 기준으로 독립적인 서비스로 나누어 개발·배포하는 아키텍처다. 서비스가 단순히 작거나 API가 많다고 MSA인 것은 아니며, 각 서비스가 자신의 변경과 배포 주기를 독립적으로 가져갈 수 있어야 한다.
  * **장점** : 서비스별 독립 배포/확장, 장애 격리, 기술 스택의 다양성(Polyglot), 팀별 독립 개발
  * **단점** : 네트워크 지연과 부분 실패, 데이터 정합성 보장의 어려움, 계약·버전 관리, 통합 테스트와 운영 복잡도, 인프라 비용

### 도입 기준과 서비스 경계

* **MSA 도입 판단 기준** : 조직과 시스템에 독립 배포·확장이 필요한 명확한 경계가 있고, 이를 담당할 팀과 자동화된 배포·관측 인프라가 준비됐을 때 효과가 크다. 팀 규모가 작거나 도메인 경계가 불명확하고 배포 빈도가 낮다면 모듈러 모놀리스가 더 단순하고 경제적일 수 있다. MSA는 성능 개선 기법이 아니라 조직과 변경의 독립성을 얻기 위해 운영 복잡성을 감수하는 선택이다.


* **서비스 경계(Service Boundary)** : 기술 레이어나 테이블 수보다 업무 능력과 변경 이유를 기준으로 나눈다. DDD의 Bounded Context를 참고할 수 있으며, 주문·결제처럼 용어와 규칙, 데이터 생명주기가 다른 영역을 분리한다.
  * 경계가 너무 크면 독립 배포와 확장의 이점이 줄어든다.
  * 경계가 너무 작으면 서비스 간 호출과 배포 단위가 늘어 **분산 모놀리스(Distributed Monolith)**가 되기 쉽다.
  * 하나의 업무 변경이 항상 여러 서비스를 동시에 수정·배포하게 만든다면 서비스 경계를 다시 검토한다.


* **분산 모놀리스** : 서비스는 여러 개로 나뉘었지만 강한 동기 호출, 공유 DB, 공동 배포와 순환 의존 때문에 독립적으로 변경할 수 없는 구조다. 모놀리스의 결합도와 분산 시스템의 운영 비용을 동시에 가지므로 API 계약, 데이터 소유권과 배포 독립성을 점검해야 한다.


### 통신과 데이터 소유권

* **동기 통신과 비동기 통신**
  * **동기 통신(HTTP/gRPC)** : 호출 결과가 즉시 필요하고 성공·실패를 바로 판단해야 할 때 적합하다. 흐름은 이해하기 쉽지만 호출 체인이 길어질수록 지연 시간과 장애 전파 가능성이 커진다.
  * **비동기 통신(Message/Event)** : 발행자와 소비자의 시간적 결합을 줄이고 트래픽을 완충할 수 있다. 대신 처리 지연, 중복, 순서, 재처리와 최종적 일관성을 다뤄야 한다.
  * **선택 기준** : 사용자 요청 안에서 결과가 반드시 필요하면 동기 호출을 사용하고, 후속 처리나 지연을 허용할 수 있는 작업은 비동기 이벤트를 검토한다. 모든 통신을 한 방식으로 통일할 필요는 없다.


* **Database per Service와 데이터 소유권** : 각 서비스는 자신의 데이터를 소유하고 다른 서비스가 해당 저장소를 직접 수정하지 못하게 하는 것이 기본 원칙이다. 반드시 물리 DB 서버를 서비스마다 하나씩 둔다는 뜻은 아니며, 스키마·계정·접근 권한 등으로 논리적 소유권을 분리할 수도 있다.
  * 다른 서비스의 데이터는 공개 API, 이벤트 또는 별도 조회 모델을 통해 사용한다.
  * 여러 서비스가 같은 테이블을 직접 읽고 쓰면 스키마 변경과 배포가 결합되고 데이터 책임이 불명확해진다.
  * 서비스 간 조인과 트랜잭션이 어려워지므로 데이터 중복과 최종적 일관성을 의도적으로 받아들여야 할 수 있다.


* **API 계약과 하위 호환성** : 제공자는 기존 소비자가 사용하는 필드와 의미를 갑자기 제거하거나 변경하지 않는다. 필드 추가 같은 호환 가능한 변경을 먼저 배포하고 소비자 전환 후 이전 계약을 제거하는 방식으로 진화시킨다. Consumer-Driven Contract Test로 실제 소비자의 기대를 자동 검증할 수 있다.


* **멱등성과 요청 식별자** : 네트워크 timeout 뒤 재시도하면 원래 요청과 재시도가 모두 처리될 수 있다. 결제·주문 생성 같은 명령은 idempotency key나 업무 키로 중복 실행을 막고, 이벤트 소비자도 처리한 event ID를 기록하는 등 중복 전달을 전제로 설계한다.


### 운영과 검증

* **MSA 핵심 구성요소**
  * **API Gateway** : 외부 클라이언트의 단일 진입점으로 라우팅, 인증, Rate Limiting 같은 공통 관심사를 처리한다. 업무 로직을 과도하게 넣으면 Gateway가 병목과 단일 변경 지점이 될 수 있다. (Spring Cloud Gateway)
  * **Service Discovery** : 동적으로 변하는 서비스 인스턴스의 위치를 등록·조회하는 메커니즘이다. Eureka·Consul 같은 별도 레지스트리나 Kubernetes Service와 DNS를 사용할 수 있다.
  * **중앙 설정 관리** : 환경별 설정을 일관되게 배포하고 변경 이력을 관리한다. 비밀값은 일반 Config Server보다 Vault나 클라우드 Secret Manager 같은 전용 저장소로 분리한다.


* **Observability(관측 가능성)** : 외부에 드러난 신호를 이용해 시스템 내부에서 무슨 일이 일어나는지 파악하는 능력이다. 서비스가 여러 개로 나뉘면 한 요청의 로그와 지표가 여러 인스턴스에 흩어지므로 세 신호를 연결해서 봐야 한다.
  * **Logging** : 개별 사건의 상세 기록이다. 서비스명, 요청 ID와 Trace ID를 함께 남겨 같은 요청의 로그를 찾는다. (ELK 등)
  * **Metrics** : 오류율, 처리량, p95·p99 지연, CPU, Heap, 스레드·커넥션 풀처럼 시간에 따른 수치를 집계한다. 이상 징후 탐지와 알림에 적합하다. (Prometheus, Grafana 등)
  * **Tracing** : Trace ID와 Span ID를 전파해 여러 서비스를 거친 호출 순서와 각 구간의 지연을 추적한다. 병목 위치를 찾은 뒤 해당 구간의 메트릭과 로그를 확인한다. (Micrometer Tracing, Jaeger, Zipkin 등)


* **장애 전파와 호출 체인** : 서비스 A가 B를, B가 C를 동기 호출하면 C의 지연이 전체 요청과 스레드·커넥션 풀 고갈로 전파될 수 있다. 각 호출에 timeout을 두고, 재시도는 일시적이고 멱등한 실패에만 제한적으로 적용한다. Circuit Breaker와 Bulkhead는 뒤의 [장애 대응 패턴](#장애-대응-패턴)과 함께 설계한다.


* **배포 독립성과 호환 순서** : 서비스가 나뉘어 있어도 항상 같은 순서로 함께 배포해야 한다면 독립성이 약하다. DB와 API 변경은 `확장(새 구조 추가) → 새 구조 사용 → 이전 구조 제거` 순서로 진행하고, 신·구 버전이 동시에 동작하는 배포 구간을 고려한다.


* **MSA 테스트 전략** : 서비스 내부 로직은 단위·통합 테스트로 빠르게 검증하고, 서비스 간 API·이벤트 스키마는 계약 테스트로 확인한다. 핵심 사용자 흐름만 제한된 End-to-End 테스트로 검증하며, 네트워크 지연·timeout·중복 메시지·의존 서비스 장애 같은 실패 시나리오도 포함한다.


* **운영 준비도** : 중앙 로그, 메트릭, 분산 추적, 표준화된 health check, 자동 배포·롤백과 서비스별 SLO가 없으면 서비스 수만큼 장애 분석 비용이 증가한다. 각 서비스의 소유 팀과 온콜·복구 책임도 명확해야 한다.

## 분산 트랜잭션과 일관성

* **CAP 이론** : 네트워크 분할이 발생한 동안 **Consistency(일관성)**와 **Availability(가용성)**를 동시에 완전히 보장할 수 없다는 이론이다. 분산 시스템에서 네트워크 분할 가능성을 무시하기 어려우므로, 분할 시 요청을 거부·대기해 일관성을 지킬지(CP), 일부 노드의 오래된 응답을 허용해 가용성을 지킬지(AP)를 결정해야 한다.
  * **CP 시스템 성향** : 일관성을 위해 일부 요청을 거부하거나 대기 (예: ZooKeeper, etcd, HBase)
  * **AP 시스템 성향** : 가용성을 위해 오래된 데이터라도 응답 (예: Cassandra, DynamoDB)
  * **주의점** : 실제 제품을 단순히 CP/AP로 고정 분류하기는 어렵다. 설정, 쿼럼, 복제 방식, 읽기/쓰기 옵션에 따라 일관성과 가용성의 균형이 달라진다.


* **일관성 모델**
  * **강한 일관성(Strong Consistency)** : 성공한 쓰기 이후의 읽기가 최신 값을 반환하도록 보장하는 모델이다. 사용하기 단순하지만 노드 간 조정으로 지연이나 가용성 비용이 커질 수 있다.
  * **최종적 일관성(Eventual Consistency)** : 새 변경이 없는 상태가 지속되면 시간이 지나 모든 복제본이나 조회 모델이 같은 상태로 수렴하는 모델이다. 수렴 전 오래된 값이 보일 수 있으므로 사용자 경험과 업무 규칙이 이를 허용하는지 판단해야 한다.


### MSA에서 정합성을 유지하는 방법

* **정합성 경계를 서비스 안으로 모은다** : 반드시 동시에 확정돼야 하는 업무 규칙과 데이터는 가능하면 한 서비스가 소유하고, 로컬 트랜잭션·DB 제약·조건부 UPDATE로 원자성을 보장한다. 하나의 업무 규칙을 여러 서비스에 나누면 매번 네트워크를 거쳐야 하므로 정합성 유지가 훨씬 어려워진다.


* **데이터의 단일 소유자를 정한다** : 각 데이터의 최종 판단 주체를 하나로 두고 다른 서비스는 소유 DB를 직접 수정하지 않는다. 필요한 변경은 API나 이벤트로 요청하며, 여러 서비스가 같은 값을 각각 원본으로 관리하지 않도록 한다.


* **DB 변경과 이벤트 기록을 함께 커밋한다** : 업무 데이터 저장과 메시지 발행을 차례로 실행하면 둘 중 하나만 성공하는 Dual Write 문제가 생긴다. Transactional Outbox를 사용해 업무 데이터와 발행할 이벤트를 같은 로컬 트랜잭션에 저장하고, 별도 프로세스가 메시지 브로커로 전달한다.


* **중복과 순서 변경을 전제로 처리한다** : 메시지는 장애 복구와 재시도 과정에서 중복되거나 늦게 도착할 수 있다. 소비자는 event ID, Unique Key, 상태 전이 조건과 version을 이용해 같은 작업의 반복 실행과 오래된 이벤트의 덮어쓰기를 방지한다.


* **여러 서비스의 흐름은 Saga로 관리한다** : 각 서비스의 로컬 트랜잭션을 순서대로 실행하고, 중간 단계가 실패하면 이미 완료한 작업을 보상 트랜잭션으로 상쇄한다. 전체 흐름은 중앙 오케스트레이터가 관리하거나 각 서비스가 이벤트를 주고받는 방식으로 진행할 수 있다.


* **중간 상태와 복구 절차를 설계한다** : 최종적 일관성에서는 모든 서비스의 상태가 즉시 같아지지 않으므로 `PENDING`, `CONFIRMED`, `FAILED` 같은 처리 상태를 명시한다. timeout·보상 실패·이벤트 누락에 대비해 재시도, 대사 작업, 수동 복구와 감사 로그도 함께 준비한다.


* **핵심 판단 질문** : “모든 데이터가 항상 같은가?”보다 “어떤 규칙을 즉시 지켜야 하는가, 어느 정도 지연을 허용하는가, 실패하면 누가 어떤 상태로 복구하는가?”를 먼저 정의해야 한다. MSA의 정합성은 단일 기술이 아니라 로컬 트랜잭션, 데이터 소유권, 이벤트 전달, 멱등성, 보상과 운영 복구를 연결한 결과다.

* **분산 트랜잭션과 데이터 정합성**
  * **2PC (Two-Phase Commit)** : 코디네이터가 Prepare(준비) → Commit(확정) 두 단계로 모든 참여 노드의 커밋을 동기적으로 보장.  
    원자적 커밋을 제공하지만 장애 시 블로킹 가능성과 참여자의 자원·락 유지로 성능과 가용성 비용이 크다. 참여 시스템과 트랜잭션 매니저가 지원하고 강한 원자성이 반드시 필요한 제한된 범위에서 검토한다.
  * **Saga 패턴** : MSA 환경에서 여러 서비스에 걸친 분산 트랜잭션을 관리하는 패턴. 각 서비스의 로컬 트랜잭션을 순차적으로 실행하며,  
    중간에 실패하면 **보상 트랜잭션(Compensating Transaction)**으로 이전 작업을 되돌려 데이터 일관성(최종적 일관성)을 맞춘다.
    * **Choreography(코레오그래피)** : 중앙 조정자 없이 각 서비스가 이벤트를 발행/구독하며 다음 단계를 진행.  
      구현이 단순하지만 흐름 파악이 어렵고 서비스 간 결합이 생길 수 있다.
    * **Orchestration(오케스트레이션)** : 중앙 오케스트레이터가 각 서비스를 순서대로 호출하고 보상 로직을 관리.  
      오케스트레이터는 Saga ID, 현재 단계와 완료된 작업을 저장하고, 미리 정의한 상태 머신에 따라 각 서비스에 명령을 보낸다.
      서비스는 로컬 트랜잭션을 커밋한 뒤 성공·실패 결과를 돌려주며, 오케스트레이터는 결과에 따라 다음 명령이나 보상 명령을 선택한다.
      통신은 HTTP 같은 동기 호출이나 메시지 브로커를 사용할 수 있다. 메시징 방식에서는 오케스트레이터가 `결제 승인`, `재고 차감` 같은
      Command를 발행하고 서비스가 `결제 완료`, `재고 차감 실패` 같은 결과 이벤트를 발행한다.
      오케스트레이터는 전역 DB 트랜잭션이나 락을 유지하지 않으며, timeout·중복 응답·재시작에 대비해 상태 저장, 멱등성, 재시도와 수동 복구가 필요하다.
      전체 흐름은 한곳에서 확인하기 쉽지만 업무 순서와 실패 처리 로직이 오케스트레이터에 집중되는 단점이 있다.

![메시지 기반 Saga에서 오케스트레이터가 명령과 결과 이벤트로 실행 순서와 보상을 결정하는 흐름](/images/it/saga-compensation-flow.png)


* **분산 트랜잭션 처리 판단 기준** : 2PC는 강한 일관성을 제공하지만 락 유지, 코디네이터 장애, 가용성 저하 부담이 크다.  
  일반적인 MSA에서는 각 서비스의 로컬 트랜잭션과 이벤트를 조합하고, 실패 시 보상 트랜잭션을 수행하는 Saga 패턴을 더 자주 사용한다. DB 변경과 이벤트 발행의 이중 쓰기 문제는 Transactional Outbox로 줄인다.


* **Saga 보상의 한계** : 보상 트랜잭션은 DB rollback처럼 시간을 되돌리는 기능이 아니라 이미 완료된 상태를 새 작업으로 상쇄하는 것이다.
  이미 완료된 외부 작업처럼 완전히 되돌릴 수 없는 단계가 있으므로, 각 단계의 멱등성·재시도·수동 복구 절차와 중간 상태의 사용자 노출 방식을 설계해야 한다.


* **일관성 경계의 명시** : 어떤 데이터가 즉시 일관되어야 하는지와, 이벤트 전달 지연 동안 최종 일관성을 허용할 수 있는지를 구분한다.
  즉시 일관성이 필요한 변경은 조건부 갱신·트랜잭션으로 보호하고, 지연을 허용할 수 있는 작업은 이벤트 기반 비동기 처리를 검토한다. 설계의 핵심은 사용 기술의 이름보다 실패 시 허용되는 상태와 복구 절차를 정하는 것이다.


* **정합성 검증과 복구** : 재시도와 보상만으로 모든 불일치를 막을 수는 없다. 주문·결제·재고처럼 중요한 데이터는 주기적인 대사(Reconciliation) 작업으로 시스템 간 상태를 비교하고, 자동 보정이 위험한 경우 운영자가 원인과 이력을 확인해 재처리할 수 있는 관리 도구와 감사 로그를 마련한다.


## 이벤트 기반 설계

* **Event-Driven Architecture(EDA)** : 서비스가 상태 변경을 이벤트로 발행하고 다른 서비스가 이를 구독해 후속 작업을 수행하는 구조다. 발행자는 소비자를 직접 알 필요가 없어 결합도를 낮출 수 있지만, 이벤트 계약·중복·순서·지연·재처리와 전체 흐름 추적이 새로운 설계 과제가 된다.


* **이벤트와 명령의 구분**
  * **Command(명령)** : 특정 수신자에게 작업 수행을 요청하며 `주문을 취소하라`처럼 의도가 담긴다. 거절되거나 실패할 수 있다.
  * **Event(이벤트)** : 이미 발생한 사실을 `주문이 취소됐다`처럼 과거형으로 표현한다. 발행자는 소비자가 어떤 후속 작업을 할지 가정하지 않는 것이 좋다.
  * 명령을 이벤트처럼 방송하면 책임이 불명확해지고, 이벤트에 특정 소비자의 처리 절차를 넣으면 서비스 간 결합이 커진다.


* **이벤트 계약(Event Contract)** : 이벤트 이름, 의미, 식별자, 발생 시각, 집계 ID, 스키마 버전을 명확히 정의한다. 기존 소비자를 깨지 않도록 필드 추가 중심으로 진화시키고, 의미 변경이 크면 새 이벤트 타입이나 버전을 사용한다. 이벤트는 발행 서비스의 내부 테이블 구조를 그대로 노출하지 않는다.


* **CQRS (Command Query Responsibility Segregation)** : 상태를 변경하는 명령 모델과 조회 모델을 분리하는 패턴이다. 쓰기 모델은 업무 규칙과 정합성을 지키기 좋은 구조가 중요하지만, 조회 화면은 여러 영역의 데이터를 조합해 빠르게 읽는 구조가 중요하므로 두 모델이 원하는 형태가 다를 수 있다. 특히 MSA에서 한 화면을 위해 여러 서비스 API를 매번 호출하면 지연과 장애 지점이 늘어나므로, 필요한 데이터를 미리 모은 조회 모델을 둘 수 있다. 반드시 DB를 분리하는 것은 아니며, 필요할 때 별도의 읽기 DB나 비정규화된 뷰를 사용한다. 이 경우 데이터 반영 지연과 운영 복잡성이 생기므로 단순 CRUD에는 과할 수 있다.


* **Transactional Outbox 패턴** : DB 업데이트와 메시지 발행을 하나의 로컬 트랜잭션으로 묶어 처리하는 패턴.
  비즈니스 데이터와 함께 Outbox 테이블에 메시지를 저장하고, 별도의 릴레이 프로세스(또는 CDC)가 Outbox 테이블을 읽어 메시지 브로커로 전달한다. "DB 커밋은 됐는데 메시지 발행은 실패"하는 이중 쓰기(Dual Write) 문제를 줄이지만, 릴레이 재시도로 메시지가 중복 발행될 수 있으므로 소비자 멱등성이 필요하다.
  * **CDC (Change Data Capture)** : DB의 변경 로그(예: MySQL binlog)를 캡처해 이벤트로 전파하는 기법 (Debezium)


* **이벤트 처리 운영 기준** : 이벤트 지연 시간, 소비 지연(lag), 실패·재시도 횟수와 DLQ 적재량을 관측한다. 재처리는 과거 이벤트가 현재 로직으로 다시 실행되는 작업이므로 순서, 중복 부수 효과와 스키마 호환성을 확인하고 실행 주체·범위·감사 기록을 남긴다.

## 장애 대응 패턴

* **Resilience(회복 탄력성)** : 장애를 완전히 없애는 것이 아니라 일부 구성 요소가 실패해도 영향 범위를 제한하고, 시스템이 예측 가능한 방식으로 기능을 유지·복구하게 하는 능력이다. 패턴 하나로 달성되는 속성이 아니며 용량 계획, 격리, 관측, 복구 절차와 함께 설계한다.


* **Timeout과 Deadline** : 모든 원격 호출에는 연결·응답 timeout을 설정한다. 상위 요청의 전체 deadline보다 하위 호출 timeout의 합이 길면 이미 응답할 수 없는 작업이 계속 자원을 소비한다. 남은 시간 예산을 하위 호출에 전달하고 취소가 가능한 작업은 deadline 초과 시 중단한다.


* **Retry(재시도)** : 일시적인 네트워크 오류나 과부하처럼 다시 성공할 가능성이 있는 실패에만 적용한다. 지수 백오프와 jitter, 최대 횟수를 두고 멱등하지 않은 작업은 중복 실행 방지 장치 없이 재시도하지 않는다. 여러 계층에서 동시에 재시도하면 호출 수가 기하급수적으로 늘어나는 **Retry Storm**이 발생할 수 있으므로 재시도 책임을 한 계층에 둔다.


* **Circuit Breaker(서킷 브레이커)** : 일정 구간의 실패율이나 지연이 임계치를 넘으면 회로를 열어 호출을 빠르게 실패시키고, 장애 시스템과 호출자의 자원을 보호한다. 일정 시간이 지나면 제한된 요청으로 회복 여부를 확인한다. `Closed → Open → Half-Open` 상태로 동작하며 임계값은 실제 트래픽과 SLO를 기준으로 조정한다. (Resilience4j)


* **Bulkhead(벌크헤드)** : 의존 서비스나 작업 유형별로 스레드 풀, 커넥션, 큐와 동시 실행 수를 분리해 한 영역의 지연이 전체 자원을 고갈시키지 않도록 한다. 격리만 하고 큐를 무제한으로 두면 지연이 누적되므로 큐 크기와 거부 정책도 함께 정한다.


* **Fallback과 Graceful Degradation** : 핵심 기능이 실패했을 때 캐시된 값, 축소된 응답, 비핵심 기능 생략으로 제한적인 서비스를 제공하는 방식이다. 오래된 데이터가 잘못된 의사결정을 만들 수 있는 결제·권한·재고에는 무조건 fallback하지 않고 명확히 실패시키는 편이 안전할 수 있다.


* **복구와 검증** : 장애가 끝났다고 데이터가 자동으로 정상화되는 것은 아니다. 재처리·대사·수동 보정 절차와 Runbook을 준비하고, 장애 상황에서 timeout, 격리, 자동 복구와 알림이 실제로 동작하는지 검증한다.

# 용어정리 – 메시지 브로커 및 이벤트 기반

## Kafka

* **메시지 브로커(Message Broker)** : 시스템 간 메시지를 비동기적으로 중계해주는 미들웨어.  
  생산자(Producer)와 소비자(Consumer)를 분리하여 **결합도를 낮추고(Decoupling)**, 일시적 부하를 완충(Buffering)하며, 트래픽 급증을 받아내는 역할을 한다.
  * **동기 통신 vs 비동기 메시징** : REST 같은 동기 호출은 응답을 기다리며 강하게 결합되지만,  
    메시징은 발행 후 즉시 반환되어 느슨하게 결합되고 장애 격리에 유리하다.


* **Kafka (Apache Kafka)** : 대용량 실시간 데이터 스트리밍을 위한 **분산 이벤트 스트리밍 플랫폼**.  
  메시지를 디스크에 로그(Append-only Log) 형태로 영구 저장하고, 높은 처리량(High Throughput)과 수평 확장에 강점이 있다. 단순 큐를 넘어 이벤트 소싱/로그 수집/스트림 처리에 널리 쓰인다.

![Kafka 파티션과 Consumer Group의 메시지 처리 구조](/images/it/kafka-consumer-group.png)


### 메시지 저장과 순서

* **Producer와 Topic** : Producer가 메시지를 발행하면 메시지 키나 Partitioner에 따라 Topic 안의 Partition이 결정된다. 같은 업무 키를 같은 Partition으로 보내면 관련 메시지의 순서를 유지할 수 있다.
* **Partition** : 메시지가 순서대로 추가되는 Append-only Log다. Partition을 여러 개 두면 저장과 소비를 병렬화할 수 있지만, 순서는 **각 Partition 안에서만** 보장된다.
* **Offset** : Partition 안에서 메시지의 위치를 나타내는 번호다. 메시지를 삭제하는 표시가 아니라 Consumer가 어디까지 읽었는지 기록하고 다시 읽기 위한 기준이다.


### 소비와 병렬 처리

* **Consumer Group** : 같은 Group의 Consumer들이 Partition을 나눠 처리한다. 한 Partition은 Group 안의 Consumer 하나에만 할당되므로, Consumer 수가 Partition 수보다 많으면 일부 Consumer는 작업을 받지 못한다.
* **독립적인 구독** : 서로 다른 Consumer Group은 같은 Topic을 각자의 Offset으로 읽는다. 같은 Group은 작업을 분담하고, 다른 Group은 동일한 이벤트를 독립적인 목적으로 처리하는 구조다.
* **Rebalance** : Consumer가 추가·제거되거나 Partition 수가 바뀌면 Group 안의 Partition 할당을 다시 조정한다. 이 과정에서 처리가 잠시 멈추거나 메시지가 다시 처리될 수 있으므로 처리 로직은 멱등하게 만드는 것이 안전하다.


### Broker와 데이터 복제

* **Broker와 Cluster** : Broker는 Partition 데이터를 저장하고 Producer·Consumer 요청을 처리하는 Kafka 서버다. 여러 Broker가 Cluster를 구성하고 Partition의 Leader를 분산해 저장 용량과 처리량을 확장한다.
* **Leader와 Follower** : 각 Partition은 하나의 Leader와 여러 Follower Replica를 가진다. 쓰기와 읽기는 기본적으로 Leader를 거치며 Follower는 Leader의 로그를 복제한다. Replication Factor가 3이면 복제본 세 개를 서로 다른 Broker에 배치한다.
* **ISR(In-Sync Replicas)** : Leader를 일정 범위 안에서 따라가고 있는 Replica 집합이다. 느려지거나 통신이 끊긴 Follower는 ISR에서 제외되고 다시 따라잡으면 합류한다.
* **`acks=all`과 `min.insync.replicas`** : `acks=all`은 현재 ISR의 복제가 끝나야 쓰기에 성공한다. Replication Factor 3, `min.insync.replicas=2`라면 한 Broker 장애까지 쓰기를 계속할 수 있지만 ISR이 하나만 남으면 데이터 내구성을 위해 쓰기를 거부한다.


### 장애 감지와 Leader 복구

* **Leader 재선출** : Controller가 Broker 장애를 감지하면 해당 Partition의 ISR 중 하나를 새 Leader로 선출한다. Producer와 Consumer는 변경된 Leader 정보를 조회한 뒤 요청을 재개한다.
* **Unclean Leader Election** : ISR 밖의 Replica까지 Leader로 선출하면 서비스를 더 빨리 재개할 수 있지만, 아직 복제되지 않은 메시지를 잃을 수 있다.
* **KRaft Controller** : Controller들이 메타데이터 쿼럼을 구성해 Broker 등록, Partition 정보와 Leader 선출 결정을 관리한다. Controller 장애 복구를 위한 메타데이터 쿼럼과 메시지를 보존하는 Partition 복제는 서로 다른 역할이다.
* **복제의 한계** : Replication은 Broker 장애에 대비한 데이터 내구성과 가용성을 제공한다. Consumer 처리 중 장애로 생기는 중복이나 누락은 해결하지 않으므로 Offset 커밋 순서, 멱등한 Consumer와 재처리 전략을 별도로 설계해야 한다.

## 메시징 모델과 브로커 비교

* **메시징 모델**
  * **Point-to-Point (Queue)** : 하나의 메시지를 하나의 소비자만 처리. 작업 분산(Work Queue)에 적합.
  * **Publish-Subscribe (Topic)** : 하나의 메시지를 구독한 모든 소비자가 수신. 이벤트 브로드캐스트에 적합.


* **Kafka vs RabbitMQ** : 둘 다 대표적인 메시지 브로커지만 지향점이 다르다.
  * **Kafka** : 로그 기반, 높은 처리량과 데이터 보존(재처리 가능)에 강점. 대용량 스트리밍/이벤트 소싱에 적합. Consumer가 offset을 관리하며 Pull 방식으로 가져간다.
  * **RabbitMQ** : 전통적인 메시지 큐(AMQP). 복잡한 라우팅과 낮은 지연, 메시지 단위 처리에 강점. 메시지는 consumer ack 이후 큐에서 제거되는 것이 일반적이며, prefetch/QoS로 소비 속도를 제어한다.


* **Amazon SQS** : AWS가 운영을 대신하는 관리형 메시지 큐다. Standard Queue는 높은 처리량을 제공하지만 중복 전달과 순서 변경이 가능해 소비자가 멱등해야 하고, FIFO Queue는 메시지 그룹 안의 순서와 중복 제거를 지원하는 대신 처리량과 사용 조건을 함께 고려해야 한다. 소비 중인 메시지는 Visibility Timeout 동안 다른 소비자에게 보이지 않으며, 그 안에 삭제하지 못하면 다시 전달될 수 있다.


## 메시지 전달 보장과 이벤트 처리

* **메시지 전달 보장(Delivery Semantics)**
  * **At-Most-Once** : 최대 한 번. 유실 가능성은 있으나 중복은 없음 (성능 우선)
  * **At-Least-Once** : 최소 한 번. 유실은 없으나 중복 가능 → **소비자의 멱등성(Idempotency) 처리 필요**. (가장 일반적)
  * **Exactly-Once** : 정확히 한 번. Kafka는 멱등 프로듀서와 트랜잭션으로 Kafka 내부의 consume-process-produce 흐름에서 정확히 한 번 처리를 지원할 수 있다. 단, 외부 DB/API까지 포함하면 별도의 멱등 처리나 트랜잭션 아웃박스 같은 패턴이 필요하다.


* **Kafka Producer 주요 설정**
  * **acks** : 브로커가 메시지를 저장했다고 응답하는 기준. `acks=0`은 빠르지만 유실 위험이 크고, `acks=all`은 ISR 복제까지 기다려 안정성이 높다.
  * **enable.idempotence** : 프로듀서 재시도 과정에서 중복 기록을 방지하는 옵션.


* **중복과 순서 처리 기준** : Kafka는 보통 At-Least-Once로 운영하므로 중복 소비를 전제로 처리해야 한다.
  메시지 ID로 처리 이력을 저장하거나 upsert를 사용해 재전달된 메시지의 부수 효과를 막는다.


* **Offset 커밋과 재처리** : DB 저장 같은 부수 효과를 먼저 완료하고 offset을 커밋하면,  
  커밋 전 장애 시 메시지가 재전달될 수 있으므로 소비자는 멱등해야 한다. 반대로 offset을 먼저 커밋하면 처리 전 장애에서 메시지가 유실될 수 있다. 실패한 이벤트를 재처리할 때는 원본 토픽을 무작정 되감기보다, 처리 이력·재처리 범위·순서 영향·DLQ 복구 절차를 정하고 별도 consumer group 또는 재처리 토픽을 사용하는 편이 안전하다.


* **파티션 수 변경 시 주의점** : 파티션을 늘리면 병렬성은 증가하지만 Key의 파티션 매핑이 바뀔 수 있다. 순서가 중요한 Topic은 파티션 수 변경이 기존·신규 이벤트의 처리 순서에 미치는 영향을 먼저 확인해야 한다.


* **DLQ (Dead Letter Queue)** : 정해진 횟수만큼 재시도해도 처리에 실패한 메시지를 별도 큐로 보내 격리/분석하는 메커니즘.  
  실패 메시지가 전체 처리를 막는 것을 방지한다.

# 용어정리 – 애플리케이션 설계와 품질

## API 설계와 HTTP

* **REST API** : 자원(Resource)을 URI로 식별하고, HTTP 메서드로 자원에 대한 행위를 표현하는 API 설계 스타일.  
  핵심은 URI를 동사보다 **명사 중심**으로 잡고, 행위는 GET/POST/PUT/PATCH/DELETE 같은 메서드 의미에 맡기는 것이다.


* **REST API 주요 요소**
  * **자원(Resource)** : `/users`, `/orders/1`처럼 URI로 식별되는 대상
  * **표현(Representation)** : JSON, XML, HTML 등 클라이언트와 서버가 주고받는 자원의 형태
  * **무상태성(Stateless)** : 서버가 요청 간 클라이언트 상태를 저장하지 않고, 각 요청이 필요한 정보를 포함해야 한다.


* **HTTP 메서드 선택 기준**
  * **GET** : 조회 (`GET /users/1`)
  * **POST** : 생성 또는 명령성 처리 (`POST /users`, `POST /orders/1/cancel`)
  * **PUT** : 자원 전체 교체. 같은 요청을 여러 번 보내도 결과가 같아야 한다.
  * **PATCH** : 자원 일부 변경. 변경 방식에 따라 멱등하지 않을 수 있다.
  * **DELETE** : 삭제. 여러 번 호출해도 최종 상태는 동일하게 삭제된 상태다.


* **URI 설계 기준**
  * **명사 사용** : `/getUser`보다 `/users/{id}`가 낫다.
  * **계층 표현** : `/users/{userId}/orders/{orderId}`처럼 소유 관계를 표현한다.
  * **행위가 필요한 경우** : REST 자원으로 표현하기 어렵다면 `/orders/{id}/cancel`처럼 명령 리소스를 둘 수 있다.
  * **버전 관리** : 큰 호환성 변경은 `/v1/users`처럼 URL에 넣거나, 헤더 기반 버전 전략을 사용한다.


* **API 응답 설계**
  * **성공 상태 코드** : 조회는 `200 OK`, 생성은 `201 Created`, 본문 없는 성공은 `204 No Content`를 사용한다.
  * **에러 상태 코드** : 요청 형식 오류는 `400`, 인증 필요는 `401`, 권한 없음은 `403`, 리소스 없음은 `404`, 충돌은 `409`를 사용한다.
  * **에러 바디** : 클라이언트가 처리할 수 있도록 `code`, `message`, `traceId`, `details` 같은 필드를 일관되게 제공한다.


* **동시 수정과 조건부 요청** : 같은 자원을 여러 사용자가 수정할 수 있으면 마지막 요청이 이전 변경을 덮어쓰는 Lost Update가 생길 수 있다.  
  응답에 버전 또는 `ETag`를 제공하고 클라이언트가 `If-Match`로 기대 버전을 보내게 하면, 서버는 값이 달라진 경우 `412 Precondition Failed` 또는 업무 의미에 맞는 `409 Conflict`로 거절할 수 있다. DB의 낙관적 락 version 컬럼과 연결하면 API부터 저장소까지 같은 동시성 규칙을 유지할 수 있다.


* **재시도 가능한 명령 API와 멱등성 키(Idempotency Key)** : 네트워크 timeout은 서버 처리 실패를 의미하지 않는다.
  중복 실행이 위험한 `POST` 명령에는 멱등성 키를 받아 요청 상태와 결과를 저장하고, 같은 키로 재시도되면 동일 결과를 반환한다. 키가 같지만 본문이 다르면 오류로 처리하며, 저장 기간과 정리 정책을 정한다. HTTP 메서드의 멱등성만으로 업무 동작의 중복 실행이 방지되는 것은 아니다.


* **REST vs RPC/gRPC 선택 기준**
  * **REST** : 자원 중심 API, 외부 공개 API, 브라우저/HTTP 생태계와의 호환성이 중요한 경우에 적합하다.
  * **RPC/gRPC** : 행위 중심 호출, 내부 서비스 간 통신, 강한 타입 계약, 낮은 지연과 높은 처리량이 중요한 경우에 적합하다.
  * **실무 판단** : 외부 클라이언트가 다양하면 REST가 단순하고, 내부 MSA에서 명확한 계약과 성능이 중요하면 gRPC를 검토한다.


* **멱등성(Idempotent)과 안전성(Safe)** : HTTP 메서드의 성질
  * **안전한(Safe) 메서드** : 호출해도 **서버의 자원 상태를 변경하지 않는** 메서드. (조회 전용)
  * **멱등한(Idempotent) 메서드** : **같은 요청을 여러 번 보내도 결과(서버 상태)가 한 번 보낸 것과 동일한** 메서드. 네트워크 재시도 시 안전하다. (단,  
    응답 코드까지 같다는 의미는 아님)
  * **메서드별 멱등성/안전성**

    | 메서드 | 안전(Safe) | 멱등(Idempotent) | 비고 |
    |--------|:---------:|:----------------:|------|
    | GET    | O         | O                | 조회만, 상태 변경 없음 |
    | HEAD   | O         | O                | 본문 없는 GET |
    | POST   | X         | X                | 호출마다 새 자원 생성 |
    | PUT    | X         | O                | 같은 값으로 전체 교체 → 결과 동일 |
    | DELETE | X         | O                | 여러 번 삭제해도 최종 상태 동일(이미 삭제됨) |
    | PATCH  | X         | X (구현에 따라 다름) | 부분 수정, 보장되지 않음 |


* **HTTP 상태 코드** : 응답의 결과를 나타내는 코드
  * **2xx (성공)** : 요청 성공. (200 OK, 201 Created — 생성됨, 204 No Content — 성공했으나 본문 없음)
  * **3xx (리다이렉션)** : 추가 동작 필요. (301 Moved Permanently — 영구 이동, 302 Found — 임시 이동,  
    304 Not Modified — 캐시 사용)
  * **4xx (클라이언트 오류)** : 요청 자체의 문제. (400 Bad Request, 401 Unauthorized — 인증 필요,  
    403 Forbidden — 권한 없음, 404 Not Found, 409 Conflict)
  * **5xx (서버 오류)** : 서버 측 처리 실패. (500 Internal Server Error, 502 Bad Gateway,  
    503 Service Unavailable)


## 객체지향과 디자인 패턴

* **SOLID(객체지향 5대원칙)**
  * **SRP(단일 책임 원칙)** : 클래스가 변경되는 이유를 하나의 책임으로 모은다.
  * **OCP(개방-폐쇄 원칙)** : 기존 코드를 크게 수정하지 않고 동작을 확장할 수 있게 설계한다.
  * **LSP(리스코프 치환 원칙)** : 하위 타입은 상위 타입이 약속한 동작을 깨뜨리지 않고 대체할 수 있어야 한다.
  * **ISP(인터페이스 분리 원칙)** : 사용하지 않는 기능에 의존하지 않도록 인터페이스를 역할별로 나눈다.
  * **DIP(의존관계 역전 원칙)** : 상위 정책과 하위 구현이 구체 클래스보다 추상화에 의존하게 한다.


* **생성 패턴**
  * **Singleton** : 인스턴스를 하나만 생성하고 공유한다.
  * **Factory Method** : 객체 생성 책임을 하위 타입이나 별도 생성 메서드에 위임한다.
  * **Abstract Factory** : 서로 관련된 객체군을 구체 클래스에 의존하지 않고 생성한다.
  * **Builder** : 복잡한 객체의 생성 과정을 단계적으로 구성한다.
  * **Prototype** : 기존 객체를 복제해 새 객체를 만든다.


* **구조 패턴**
  * **Adapter** : 호환되지 않는 인터페이스를 변환한다.
  * **Bridge** : 추상화와 구현을 분리해 각각 독립적으로 변경한다.
  * **Composite** : 단일 객체와 객체의 집합을 같은 방식으로 다룬다.
  * **Decorator** : 객체를 감싸 실행 중에 기능을 추가한다.
  * **Facade** : 복잡한 하위 시스템에 단순한 진입점을 제공한다.
  * **Flyweight** : 공유 가능한 객체를 재사용해 메모리 사용을 줄인다.
  * **Proxy** : 대리 객체를 통해 접근 제어, 지연 로딩 등을 구현한다.


* **행위 패턴**
  * **Observer** : 한 객체의 상태 변화를 여러 구독자에게 알린다.
  * **Strategy** : 교체 가능한 알고리즘을 캡슐화한다.
  * **Command** : 요청을 객체로 만들어 실행, 저장, 취소 등을 제어한다.
  * **State** : 상태별 동작과 상태 전환을 객체로 분리한다.
  * **Chain of Responsibility** : 여러 처리자가 요청을 차례로 전달하며 처리한다.
  * **Visitor** : 객체 구조와 그 구조에 수행할 연산을 분리한다.
  * **Interpreter** : 문법 규칙을 객체로 표현하고 해석한다.
  * **Memento** : 캡슐화를 유지하면서 객체 상태를 저장하고 복원한다.
  * **Mediator** : 객체 간 상호작용을 중재 객체에 모은다.
  * **Template Method** : 알고리즘의 뼈대는 상위 타입에 두고 일부 단계를 하위 타입이 구현한다.
  * **Iterator** : 컬렉션 내부 구조를 노출하지 않고 요소를 순회한다.

# 용어정리 – 운영체제

* **프로세스와 스레드** : 프로세스는 실행 중인 프로그램을 의미하고, 스레드는 프로세스 안에서 실행 흐름을 나눈 단위다.  
  한 프로세스 안에는 여러 개의 스레드가 생성될 수 있다. 프로세스는 운영체제로부터 독립적인 자원을 할당받지만, 스레드는 같은 프로세스의 코드/데이터/힙 영역을 공유한다. 그래서 스레드 간 통신은 효율적이지만, 공유 자원 접근에 따른 동시성 문제를 고려해야 한다.


* **세마포어와 뮤텍스** : 공유 자원에 여러 프로세스·스레드가 동시에 접근할 때 동기화가 필요하다. 뮤텍스(Mutex)와 세마포어(Semaphore)는 대표적인 동기화 도구다.
  * **뮤텍스(Mutex)** : 공유 자원 또는 임계 영역에 하나의 Process·Thread만 접근하게 한다.  
    임계구역(Critical Section)을 가진 스레드들의 실행시간(Running Time)이 서로 겹치지 않고 각각 단독으로 실행(상호배제_Mutual Exclusion)되도록 하는 기술
  * **세마포어(Semaphore)** : permit 개수만큼 접근을 허용하는 카운터 기반 동기화 도구. permit이 1개인 binary semaphore는 뮤텍스처럼 사용할 수 있고, 여러 개면 제한된 자원을 동시에 사용할 수 있다.


* **교착상태(Deadlock)** : 둘 이상의 프로세스들이 자원을 점유한 상태에서 서로 다른 프로세스가 점유하고 있는 자원을 요구하며 무한정 기다리는 상황
  * **교착상태(Deadlock) 발생 조건** : 아래 4가지가 모두 만족될 때 발생한다.
    * 상호 배제(Mutual Exclusion) : 한 번에 한 프로세스만 공유 자원에 접근 가능하며, 접근 권한이 제한적일 경우.
    * 점유 대기 (Hold & Wait) : 공유 자원에 대한 접근 권한을 가진 채로 다른 자원에 대한 접근 권한을 요구.
    * 비선점 (Nonpreemptive) : 다른 프로세스의 자원을 뺏을 수 없음.
    * 순환 대기 (Circular wait) : 두 개 이상의 프로세스가 자원 접근을 기다릴 때, 관계가 순환적 구조.
  * **교착상태 해결 방법** : 크게 4가지로 나뉜다.
    * **예방(Prevention)** : 위 4가지 발생 조건 중 하나 이상을 원천적으로 차단. 자원 효율이 떨어진다.
    * **회피(Avoidance)** : 교착이 발생하지 않는 안전 상태(Safe State)를 유지하며 자원을 할당.  
      대표적으로 **은행원 알고리즘(Banker's Algorithm)**이 있다. (자원 요청 시 할당 후에도 안전 상태가 유지되는지 미리 검사)
    * **탐지(Detection)** : 교착을 허용하되 자원 할당 그래프 등으로 발생 여부를 주기적으로 검사.
    * **회복(Recovery)** : 교착이 탐지되면 프로세스 강제 종료나 자원 선점(Preemption)으로 해소.

![두 스레드의 순환 대기로 발생하는 교착상태와 동일한 락 획득 순서로 예방하는 방법](/images/it/os-deadlock-lock-order.png)


* **컨텍스트 스위칭(Context Switching)** : CPU가 현재 실행 중인 프로세스/스레드를 잠시 멈추고 다른 것을 실행하기 위해 상태를 교체하는 작업.
  * **과정** : 실행 중이던 작업의 상태(레지스터, 프로그램 카운터 등)를 PCB(Process Control Block)에 저장하고,  
    다음에 실행할 작업의 상태를 PCB에서 복원한다.
  * **비용** : 상태 저장/복원 자체의 오버헤드에 더해, 프로세스 전환 시 주소 공간 변경으로 캐시·TLB 미스가 늘 수 있다. 최신 CPU의 ASID/PCID 같은 기능은 TLB flush 비용을 줄일 수 있다.
    같은 프로세스 내 스레드 전환은 메모리 공간(주소 공간)을 공유하므로 상대적으로 비용이 적다.


* **가상 메모리(Virtual Memory)** : 실제 물리 메모리(RAM)보다 큰 메모리를 사용할 수 있도록, 각 프로세스에 독립적인 논리 주소 공간을 제공하는 기법.  
  당장 필요한 부분만 물리 메모리에 올리고 나머지는 디스크(Swap 영역)에 두어, 메모리를 효율적으로 활용하고 프로세스 간 메모리를 격리한다.
  * **페이징(Paging)** : 논리 메모리를 고정 크기의 **페이지(Page)**, 물리 메모리를 같은 크기의 **프레임(Frame)**으로 나누어 매핑하는 방식.  
    외부 단편화가 없으나 내부 단편화가 발생할 수 있다. (주소 변환은 페이지 테이블, 가속은 TLB가 담당)
  * **세그멘테이션(Segmentation)** : 메모리를 코드/데이터/스택 등 **논리적 의미 단위(가변 크기 세그먼트)**로 나누는 방식.  
    논리적 분할에 유리하나 외부 단편화가 발생한다.
  * **페이지 폴트(Page Fault)** : 프로세스가 접근한 가상 페이지가 현재 유효하게 매핑되어 있지 않을 때 발생하는 예외다.
    운영체제는 원인에 따라 파일이나 Swap에서 페이지를 읽거나 새 페이지를 할당한 뒤 실행을 재개할 수 있고, 잘못된 주소라면 프로세스에 오류를 전달한다. 디스크 I/O를 동반하는 페이지 폴트가 지나치게 잦아 실행보다 교체에 시간을 쓰는 상황을 **스래싱(Thrashing)**이라 한다.


* **동기/비동기, 블로킹/논블로킹** : 두 기준은 다른 관점이다. 동기/비동기는 **작업 완료(결과)를 누가 확인/처리하는가(관심사·순서)**,  
  블로킹/논블로킹은 **호출한 쪽이 제어권을 돌려받는가(대기 여부)** 를 따진다. 네 가지 조합이 가능하다.
  * **동기 + 블로킹** : 호출 후 결과가 나올 때까지 대기하고, 결과를 직접 받아 처리한다. (일반적인 함수 호출, `Future.get()`)
  * **동기 + 논블로킹** : 호출은 바로 반환되지만(제어권 회수), 호출한 쪽이 완료 여부를 계속 확인(polling)하며 결과를 직접 챙긴다.
  * **비동기 + 블로킹** : 작업 처리는 다른 곳에 맡기지만 결과를 기다리며 대기. (잘 쓰이지 않는 비효율적 조합)
  * **비동기 + 논블로킹** : 호출은 바로 반환되고, 작업이 끝나면 콜백/이벤트로 결과를 통지받는다. I/O 대기가 많은 작업에 유리하지만, 작업 특성과 코드 복잡도를 함께 고려해야 한다. (CompletableFuture 콜백,
    Node.js, NIO 등)


* **스레드 안전(Thread Safety)** : 여러 스레드가 동시에 코드를 실행해도 공유 상태가 깨지지 않고 의도한 결과를 보장하는 성질이다.
  * **Critical Section(임계 구역)** : 여러 스레드가 동시에 실행하면 문제가 생길 수 있어 동기화가 필요한 코드 영역이다.
  * **Race Condition(경쟁 상태)** : 공유 자원에 접근하는 순서에 따라 결과가 달라지는 현상이다.
  * **Mutual Exclusion(상호 배제)** : 한 시점에 하나의 스레드만 임계 구역에 진입하도록 제한하는 방식이다.


* **스레드 안전성을 확보하는 주요 기법**
  * **Locks (락)** : 상호 배제를 구현하기 위한 가장 일반적인 방법. 자원에 접근할 때 락을 걸고, 작업이 끝나면 락을 해제(Mutex, Spinlock)
  * **Atomic Operations (원자적 연산)** : 중간 상태가 관찰되지 않는 하나의 연산으로 상태를 변경한다. CPU 수준에서 지원되는 경우가 많다.  
    (AtomicInteger in Java)
  * **Thread-Local Storage** : 스레드마다 별도의 저장 공간을 제공하여, 스레드 간의 자원 공유를 피함.(ThreadLocal in Java)
  * **Immutable Objects (불변 객체)** : 객체의 상태를 변경할 수 없도록 설계하여,  
    여러 스레드가 동시에 읽기만 할 수 있게 하고 상태 변경이 필요한 경우 새로운 객체를 생성한다.
  * **Concurrent Collections** : 동시성 문제를 해결하기 위해 설계된 컬렉션으로 내부적으로 필요한 동기화 메커니즘을 포함하고 있다.  
    (ConcurrentHashMap in Java)


* **사용자 모드 vs 커널 모드, 시스템 콜**
  * **사용자 모드(User Mode)** : 일반 응용 프로그램이 실행되는 모드. 하드웨어나 핵심 자원에 직접 접근할 수 없도록 권한이 제한된다.
  * **커널 모드(Kernel Mode)** : 운영체제(커널)가 실행되는 모드. 모든 자원에 접근할 수 있는 특권 모드.
  * **시스템 콜(System Call)** : 사용자 프로그램이 파일 입출력, 네트워크, 프로세스 생성 등 커널의 기능이 필요할 때 OS에 요청하는 인터페이스.  
    시스템 콜이 호출되면 사용자 모드 → 커널 모드로 전환(Mode Switch)되며, 이 전환 비용 때문에 잦은 시스템 콜은 성능에 영향을 준다.


# 용어정리 – 컨테이너 및 오케스트레이션

## Docker

* **Docker** : 애플리케이션과 실행 환경을 컨테이너로 패키징해 어디서나 동일하게 실행하도록 돕는 플랫폼이다.

![Dockerfile로 이미지 레이어를 빌드하고 Registry에서 내려받아 컨테이너, 볼륨, 네트워크로 실행하는 구조](/images/it/docker-image-container-runtime.png)


* **컨테이너 vs 가상머신(VM)** : VM은 Hypervisor 위에 Guest OS 전체를 띄우는 반면,  
  컨테이너는 **호스트 OS의 커널을 공유**하고 프로세스 수준으로 격리한다. 따라서 컨테이너는 OS를 포함하지 않아 가볍고, 부팅이 빠르며, 자원 효율이 높다.
  * 리눅스 커널의 **namespace(자원 격리)**와 **cgroup(자원 제한)** 기술을 기반으로 격리를 구현한다.


* **Docker 핵심 개념**
  * **Image(이미지)** : 컨테이너 실행에 필요한 파일과 설정을 담은 읽기 전용 템플릿. 변경 불가능(Immutable)하다.
  * **Container(컨테이너)** : 이미지를 실행한 인스턴스. 이미지 위에 쓰기 가능한 레이어가 올라간 상태.
  * **Dockerfile** : 이미지를 만드는 빌드 절차를 코드로 정의한 파일 (FROM, RUN, COPY, CMD, ENTRYPOINT 등)
  * **Layer(레이어)** : 이미지는 여러 읽기 전용 레이어로 구성되며, 변경된 레이어만 다시 빌드/전송하므로 캐싱과 재사용에 효율적이다.
  * **Registry(레지스트리)** : 이미지를 저장/공유하는 저장소 (Docker Hub, ECR, Harbor)
  * **Volume(볼륨)** : 컨테이너의 쓰기 가능 레이어는 컨테이너 삭제 시 함께 사라진다. 데이터를 컨테이너 생명주기와 분리해 보관하기 위해 호스트나 별도 저장소를 마운트하는 메커니즘이다.


* **이미지 최적화**
  * **Multi-stage Build** : 빌드 단계와 실행 단계를 분리해, 최종 이미지에는 실행에 필요한 산출물만 포함시켜 이미지 크기를 줄이는 기법
  * **경량 베이스 이미지** : alpine, distroless 등 작은 베이스 이미지를 사용해 용량과 공격 표면을 줄임
  * **레이어 캐시 활용** : 자주 바뀌지 않는 의존성 설치를 앞 레이어에 두어 캐시 적중률을 높임 (예:
    `COPY pom.xml` → 의존성 다운로드 → `COPY src`)


* **Docker Compose** : 여러 컨테이너로 구성된 애플리케이션을 하나의 YAML 파일(`docker-compose.yml`)로 정의하고 한 번에 실행/관리하는 도구.
  주로 로컬 개발 환경 구성에 사용된다.

## Kubernetes

* **Kubernetes (K8s)** : 컨테이너 오케스트레이션 플랫폼. 원하는 상태를 선언하면 컨트롤러가 현재 상태를 조정해 배포, 스케일링, 복구를 자동화한다.


* **컨테이너 오케스트레이션(Orchestration)** : 다수의 컨테이너를 여러 서버에 걸쳐 배포/확장/관리/복구하는 것을 자동화하는 것.  
  컨테이너 수가 많아지면 수동 관리가 불가능하기 때문에 필요하다. 대표 도구가 **Kubernetes(K8s)**.

* **Cluster와 Node** : Cluster는 Control Plane과 여러 Worker Node를 포함한 Kubernetes 전체 환경이다. Node는 실제로 Pod가 실행되는 서버이며, Scheduler가 Pod의 자원 요청과 제약 조건을 보고 적절한 Node를 선택한다.


* **Namespace** : 하나의 Cluster 안에서 리소스의 이름과 관리 범위를 나누는 **논리적인 구역**이다. `dev`와 `prod` Namespace에 각각 `backend`라는 Service를 만들 수 있으며, Deployment·Pod·Service·ConfigMap·Secret·PVC는 자신이 속한 Namespace 안에서 관리된다.
  * Namespace는 별도의 서버나 가상 Cluster가 아니다. 서로 다른 Namespace의 Pod가 같은 Worker Node에서 실행될 수도 있다.
  * Control Plane은 Cluster의 모든 Namespace와 리소스 상태를 관리하고, Scheduler는 Namespace와 관계없이 Pod를 적절한 Worker Node에 배치한다. Ingress·Service·Deployment 같은 애플리케이션 리소스는 각각 특정 Namespace에 속한다.
  * Namespace만 만들었다고 네트워크와 권한이 자동으로 차단되지는 않는다. 접근 권한은 RBAC, 자원 한도는 ResourceQuota, Pod 간 통신 제한은 NetworkPolicy로 별도 설정한다.
  * 같은 Namespace의 Service는 `backend`처럼 호출하고, 다른 Namespace의 Service는 `backend.prod` 또는 전체 DNS 이름으로 호출한다.
  * Node·PersistentVolume·StorageClass·Namespace 자체는 특정 Namespace에 속하지 않는 Cluster 범위 리소스다.

* **워크로드 오브젝트의 관계**
  * **Pod(파드)** : 하나 이상의 컨테이너를 함께 실행하는 최소 단위다. 같은 Pod의 컨테이너는 네트워크와 볼륨을 공유하며, Pod는 재생성될 때 IP가 바뀔 수 있다.
  * **ReplicaSet** : Label Selector에 맞는 Pod가 지정한 개수만큼 실행되도록 유지한다.
  * **Deployment** : ReplicaSet을 생성·교체하며 원하는 Pod 수, Rolling Update와 Rollback을 관리한다. 일반적으로 Pod나 ReplicaSet을 직접 운영하기보다 Deployment를 선언한다.
  * 관계는 `Deployment → ReplicaSet → Pod` 순서이며, 장애로 Pod가 사라지면 ReplicaSet이 새 Pod를 생성해 원하는 개수를 맞춘다.


* **트래픽과 설정 오브젝트**
  * **Service** : Label Selector로 같은 Namespace의 Pod를 찾아 고정된 접근 주소와 로드밸런싱을 제공한다. Pod가 교체되어 IP가 바뀌어도 Client는 Service 주소를 사용한다.
    * **ClusterIP** : 클러스터 내부 통신용 (기본값)
    * **NodePort** : 각 노드의 특정 포트로 외부 노출
    * **LoadBalancer** : 클라우드 로드밸런서와 연동해 외부 노출
  * **Ingress** : 외부 HTTP/HTTPS 요청을 도메인과 경로 규칙에 따라 Service로 전달한다. 실제 처리를 위해 Nginx Ingress Controller 같은 구현체가 필요하다.
  * **ConfigMap / Secret** : 설정값(ConfigMap)과 민감 정보(Secret)를 컨테이너 이미지와 분리해 주입. Secret은 기본적으로 Base64 인코딩이므로, etcd 암호화·RBAC·외부 Secret Manager를 함께 검토한다.
  * **Volume / PV / PVC** : PV(PersistentVolume)는 Cluster에서 제공하는 실제 저장소 리소스이고, PVC(PersistentVolumeClaim)는 Namespace 안의 Pod가 필요한 저장 용량과 조건을 요청하는 리소스다. PVC가 적합한 PV와 연결되면 Pod가 PVC를 Volume으로 마운트한다.


* **배포 도구와 레지스트리**
  * **Helm** : 여러 Kubernetes 리소스를 하나의 패키지로 설치·업그레이드·롤백하는 도구다.
  * **Helm Chart** : 리소스 템플릿과 환경별 설정값(`values`)을 묶은 Helm 패키지다.
  * **Harbor** : 이미지 저장, 접근 제어와 취약점 스캔 등을 제공하는 사설 컨테이너 이미지 레지스트리다.


* **K8s 아키텍처**
  * **Control Plane** : 클러스터의 상태와 제어 요청을 관리하는 영역
    * **API Server** : 모든 요청의 단일 진입점, 클러스터와의 통신 창구
    * **etcd** : 클러스터의 모든 상태/설정을 저장하는 분산 Key-Value 저장소
    * **Scheduler** : 새로운 Pod를 어느 Node에 배치할지 결정
    * **Controller Manager** : 현재 상태를 원하는 상태로 맞추는 컨트롤러들을 실행
  * **Worker Node** : 실제 컨테이너(Pod)가 실행되는 서버
    * **Kubelet** : 노드에서 Pod가 정상 동작하도록 관리하는 에이전트
    * **Kube-proxy** : Pod 간/외부 네트워크 통신 및 로드밸런싱 처리
    * **Container Runtime** : 실제 컨테이너를 실행 (containerd 등)

![Kubernetes Control Plane과 Worker Node, Deployment, Service 및 Pod의 전체 구조](/images/it/kubernetes-architecture.png)


* **K8s 운영 기능**
  * **HPA (Horizontal Pod Autoscaler)** : CPU/메모리 등 메트릭에 따라 Pod 수를 자동으로 늘리고 줄임(수평 확장)
  * **Self-Healing** : 컨테이너가 죽으면 자동 재시작, 노드 장애 시 다른 노드로 재배치
  * **Probe(상태 검사)**
    * **Liveness Probe** : 컨테이너가 살아있는지 검사, 실패 시 재시작
    * **Readiness Probe** : 트래픽을 받을 준비가 됐는지 검사, 실패 시 Service에서 제외
    * **Startup Probe** : 기동이 느린 앱의 초기 구동 완료 여부를 검사


* **Probe와 리소스 설정의 구분** : Liveness Probe는 회복 불가능하게 멈춘 컨테이너를 재시작하기 위한 것이며,  
  DB가 잠시 느리다는 이유만으로 실패하게 만들면 정상 Pod를 반복 재시작할 수 있다. Readiness Probe는 트래픽을 받을 준비가 됐는지 판단해 실패 시 Service 엔드포인트에서 제외한다. 시작이 오래 걸리는 애플리케이션은 Startup Probe로 초기화 동안 Liveness 검사를 유예한다. `requests`는 스케줄링의 최소 보장 자원, `limits`는 최대 사용량이며, 메모리 limit 초과는 OOMKilled로 이어질 수 있으므로 JVM heap·메타스페이스·native memory를 포함해 산정한다.


* **K8s 배포 전략**
  * **Rolling Update** : Pod를 하나씩 점진적으로 교체. 무중단 배포가 가능하나 신/구 버전이 잠시 공존한다. (K8s 기본값)
  * **Blue-Green** : 신(Green)/구(Blue) 환경을 동시에 띄우고 트래픽을 한 번에 전환. 빠른 롤백이 가능하나 자원이 두 배 필요.
  * **Canary** : 일부 트래픽만 신버전으로 보내 검증한 뒤 점진적으로 확대

# 용어정리 – AI와 Spring AI

## AI 전반 핵심 개념

* **AI(Artificial Intelligence, 인공지능)** : 사람이 수행하던 인식, 예측, 추론, 의사결정 같은 작업을 컴퓨터가 수행하도록 만드는 기술의 전체 범주다.
  * **Machine Learning(머신러닝)** : 규칙을 모두 직접 작성하지 않고 데이터에서 패턴을 학습해 예측하거나 분류하는 AI 방식이다.
  * **Deep Learning(딥러닝)** : 여러 층의 신경망을 이용하는 머신러닝의 한 분야다. 이미지, 음성, 자연어 처리와 생성형 AI 발전의 기반이 됐다.
  * **Generative AI(생성형 AI)** : 학습 데이터의 패턴을 바탕으로 텍스트, 이미지, 음성, 코드 같은 새로운 결과물을 생성하는 AI다.
  * **Foundation Model(기반 모델)** : 대규모 데이터로 사전 학습해 여러 작업에 적용할 수 있는 범용 모델이다. LLM은 언어를 중심으로 학습한 기반 모델의 한 종류다.


* **LLM(Large Language Model, 대규모 언어 모델)** : 많은 텍스트와 코드를 학습해 주어진 문맥에서 다음 토큰의 확률을 예측하는 방식으로 문장을 생성한다. 자연스러운 답변을 만들 수 있지만 사실을 데이터베이스처럼 저장·조회하는 시스템은 아니므로, 그럴듯하지만 틀린 답인 환각(Hallucination)이 발생할 수 있다.
  * **Token(토큰)** : 모델이 입력과 출력을 처리하는 기본 단위다. 글자나 단어와 정확히 일치하지 않으며 토큰 수는 지연 시간과 비용에 영향을 준다.
  * **Context Window(컨텍스트 윈도우)** : 한 번의 요청에서 모델이 참고할 수 있는 입력과 출력 토큰의 최대 범위다. 범위가 크더라도 중요한 정보가 항상 동일하게 활용되는 것은 아니다.
  * **Inference(추론)** : 학습이 끝난 모델에 입력을 보내 결과를 생성하는 과정이다. 모델 크기, 입력·출력 토큰 수, 추론 강도 등에 따라 속도와 비용이 달라진다.
  * **Temperature** : 다음 토큰 선택의 무작위성을 조절하는 값이다. 낮으면 결과가 비교적 일관되고, 높으면 다양성이 커지지만 정확성이 반드시 높아지는 것은 아니다.

## LLM 애플리케이션 구성

* **Prompt Engineering(프롬프트 엔지니어링)** : 모델이 수행할 역할, 입력, 제약 조건, 출력 형식과 예시를 명확하게 작성하는 작업이다. 프롬프트만으로 신뢰성을 보장할 수는 없으므로 구조화된 출력 검증, 도구 권한, 평가와 함께 설계한다.


* **Context Engineering(컨텍스트 엔지니어링)** : 모델이 작업하는 순간에 필요한 지시, 대화 기록, 검색 문서, 도구 설명, 사용자 상태를 선택하고 배치하는 작업이다. 모든 정보를 무조건 넣으면 토큰 비용과 잡음이 커지므로 관련성, 최신성, 신뢰도를 기준으로 컨텍스트를 구성한다.


* **RAG (Retrieval-Augmented Generation, 검색 증강 생성)** :
  LLM이 학습하지 않은 최신·사내 데이터를 외부 저장소에서 검색해 프롬프트에 함께 제공하는 기법이다. 문서 수집·분할 → 임베딩·저장 → 질문과 관련된 문서 검색 → 검색 결과를 컨텍스트로 전달하는 흐름이다. 근거를 제공해 환각을 줄일 수 있지만 검색 실패, 오래된 문서, 부적절한 분할 때문에 틀린 답을 만들 수도 있다.

![문서 분할과 임베딩을 저장하는 오프라인 인덱싱부터 질문과 관련 문서를 검색해 답변 근거로 제공하는 RAG 흐름](/images/it/ai-rag-pipeline.png)


* **Embedding(임베딩)** : 텍스트, 이미지 등의 의미적 특징을 벡터로 변환한 값이다. 벡터 간 거리를 이용해 유사한 문서를 검색할 수 있지만, 유사도가 사실의 정확성이나 업무상 정답을 보장하지는 않는다.


* **Structured Output(구조화된 출력)** : 모델 응답을 정해진 JSON Schema나 애플리케이션 DTO 형태로 받는 방식이다. 파싱 안정성을 높이지만 모델 출력은 외부 입력이므로 스키마와 업무 규칙을 서버에서 다시 검증해야 한다.

## AI Agent와 Harness Engineering

* **AI Agent** : 목표를 받아 모델이 계획을 세우고, 도구를 선택·실행하며, 실행 결과를 다시 관찰해 다음 행동을 결정하는 시스템이다. 일반적인 챗봇의 한 번짜리 응답과 달리 `모델 판단 → 도구 실행 → 결과 관찰` 루프를 여러 번 수행할 수 있다.


* **Agent Orchestration(에이전트 오케스트레이션)** : 하나 이상의 에이전트와 도구가 협력해 작업을 완료하도록 실행 순서와 상태를 조정하는 제어 방식이다. 상위 오케스트레이터가 요청을 분석해 하위 에이전트에 작업을 배분하고, 의존관계와 병렬 실행을 관리하며, 결과를 검증·통합해 다음 단계를 결정한다.
  * **Routing(라우팅)** : 요청의 종류나 난이도에 따라 적절한 모델, 에이전트 또는 도구를 선택한다.
  * **Task Decomposition(작업 분해)** : 큰 목표를 검색, 구현, 검증처럼 실행 가능한 하위 작업으로 나누고 의존관계를 정한다.
  * **Coordination(조정)** : 독립 작업은 병렬로 실행하고, 선행 결과가 필요한 작업은 순차로 실행한다. 공유 상태와 중복 작업도 관리한다.
  * **Aggregation(결과 통합)** : 여러 에이전트의 결과가 서로 충돌하거나 품질이 다를 수 있으므로 검증, 우선순위 결정, 병합 과정을 거쳐 최종 결과를 만든다.
  * **Failure Handling(실패 처리)** : timeout, 재시도, 대체 에이전트, 부분 실패 허용, 전체 중단 조건을 명시한다.


* **오케스트레이션 선택 기준** : 역할이 분명하고 병렬화 효과가 있거나 서로 다른 권한·도구가 필요한 작업에는 여러 에이전트가 유용할 수 있다. 하지만 에이전트 수가 늘면 호출 비용, 지연 시간, 상태 동기화, 결과 충돌과 장애 지점도 증가한다. 하나의 에이전트와 명확한 도구만으로 해결할 수 있는 작업이라면 단일 에이전트 구성이 더 단순하고 예측 가능하다.


* **Function Calling / Tool Calling** : 모델이 직접 실행할 수 없는 DB 조회, API 호출, 파일 수정 같은 작업을 애플리케이션의 도구에 요청하는 방식이다. 모델은 도구 이름과 인자를 제안하고 실제 권한 확인과 실행은 애플리케이션이 담당해야 한다. 입력 검증, timeout, 재시도, 멱등성, 최소 권한, 실행 횟수 제한을 함께 적용한다.


* **Agent Harness(에이전트 하네스)** : 모델을 둘러싸고 작업을 실제로 수행하게 만드는 **실행 시스템과 제어 계층**이다. 시스템 지시, 도구, 권한, 컨텍스트 관리, 상태 저장, 작업 반복 한도, 오류 복구, 로그와 평가 체계를 포함한다. 모델이 판단을 담당한다면 하네스는 모델이 어떤 정보와 도구를 사용하고, 어디까지 실행하며, 결과를 어떻게 검증할지를 통제한다. 같은 모델도 하네스 설계에 따라 작업 성공률과 안전성이 크게 달라질 수 있다.


* **Agent Orchestration과 Agent Harness의 관계** : 오케스트레이션은 여러 작업 주체의 **실행 흐름과 협업 방식**에 초점을 두고, Agent Harness는 에이전트가 사용하는 지시, 도구, 권한, 상태, 검증과 관측을 포함한 **전체 실행 환경**을 다룬다. 오케스트레이터는 Agent Harness를 구성하는 핵심 요소가 될 수 있지만 두 용어가 같은 뜻은 아니다.


* **Harness Engineering(하네스 엔지니어링)** : Agent Harness를 만들고 운영하며 지속적으로 개선하는 **엔지니어링 활동**이다. 에이전트에게 코드 작성을 요청하는 데서 끝나지 않고, 실패 원인을 분석해 작업 규칙, 도구, 권한, 컨텍스트와 검증 피드백을 조정한다. OpenAI는 이를 환경 구성, 의도 명세, 피드백 루프 설계 중심의 엔지니어링으로 설명한다. ([OpenAI Harness Engineering](https://openai.com/index/harness-engineering/))
  * **명확한 작업 계약** : 목표, 완료 조건, 금지 사항, 변경 가능한 범위와 검증 방법을 저장소 안의 문서와 자동화된 규칙으로 제공한다.
  * **도구와 환경의 표준화** : 빌드, 테스트, 린트, 검색, 브라우저 같은 도구를 에이전트가 반복 가능하고 예측 가능한 방식으로 실행할 수 있게 한다.
  * **짧은 피드백 루프** : 작은 단위로 수정하고 테스트·정적 분석·리뷰 결과를 즉시 돌려줘 잘못된 방향이 누적되지 않게 한다.
  * **상태와 컨텍스트 관리** : 긴 작업은 한 컨텍스트에서 끝나지 않을 수 있으므로 계획, 진행 상황, 결정 사항과 남은 작업을 파일이나 체크포인트로 남긴다. Anthropic도 장기 실행 에이전트에서 세션 간 진행 상황을 명확한 산출물로 인계하는 방식을 제안한다. ([Anthropic Long-running Agent Harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
  * **안전한 자율성** : 읽기와 쓰기, 내부 작업과 외부 반영을 구분하고, 위험한 명령이나 배포·결제 같은 작업에는 승인 경계를 둔다.


* **Agent Harness와 Harness Engineering의 차이** : Agent Harness는 에이전트가 동작하는 **시스템 또는 결과물**이고, Harness Engineering은 그 시스템을 설계·검증·개선하는 **활동**이다. CI/CD 파이프라인과 이를 구축·개선하는 DevOps 활동의 관계와 비슷하다.
  * 예를 들어 코딩 에이전트에 저장소 읽기·수정 도구, 테스트 명령, 권한 경계, 작업 기록 파일을 제공하는 환경은 Agent Harness다.
  * 테스트 실패를 분석해 검증 명령을 추가하고, 과도한 파일 수정을 막도록 권한과 작업 규칙을 개선하는 일은 Harness Engineering이다.


* **Harness Engineering의 핵심 이슈** : 모델 성능만 높이는 것으로는 실제 시스템의 신뢰성을 보장하기 어렵다. 잘못된 도구 선택, 과도한 권한, 컨텍스트 오염, 무한 반복, 비용 증가, 장기 작업 중 목표 이탈을 하네스에서 통제해야 한다. 반대로 규칙이 지나치게 많거나 도구 설명을 모두 컨텍스트에 넣으면 모델의 선택 정확도와 효율이 떨어질 수 있으므로, 필요한 도구를 동적으로 노출하고 피드백을 자동화하는 균형이 필요하다.

## Spring AI

* **Spring AI** : 스프링 진영에서 제공하는 AI 애플리케이션 개발 프레임워크. LLM(OpenAI, Anthropic Claude, Azure,  
  Vertex AI 등) 연동에 공통 추상화를 제공해 구현체 교체에 필요한 코드 변경을 줄인다. 다만 모델별 기능과 설정 차이까지 완전히 제거하는 것은 아니다. (Python의 LangChain과 유사한 역할)


* **Spring AI 핵심 개념**
  * **ChatClient / ChatModel** : LLM과 대화(프롬프트 요청/응답)하기 위한 추상화 인터페이스. 모델 구현체만 바꿔 끼우면 된다.
  * **Prompt / PromptTemplate** : 모델에 보내는 입력. 템플릿에 변수를 주입해 동적으로 프롬프트를 구성한다.
  * **Advisor** : ChatClient 요청·응답 흐름에 메모리, RAG, 로깅, 도구 호출 같은 공통 처리를 체인 형태로 적용하는 인터셉터다.
  * **Structured Output** : LLM의 응답을 자바 객체나 JSON 등 구조화된 형태로 변환하는 기능이다. (OutputConverter)
  * **EmbeddingModel** : 입력 데이터를 임베딩 벡터로 변환하는 모델 추상화다.
  * **Vector Store(벡터 저장소)** : 임베딩된 벡터를 저장하고 유사도 기반으로 검색하는 저장소 (Redis, PGVector, Chroma 등)


* **Spring AI Tool Calling** : 자바 메서드나 함수를 Tool로 등록하면 모델이 이름과 입력 스키마를 보고 호출을 요청한다. Spring AI 애플리케이션이 실제 도구를 실행하고 결과를 모델에 돌려주는 생명주기를 관리한다. ([Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html))


* **MCP (Model Context Protocol)** : LLM 애플리케이션이 외부 데이터/도구와 표준화된 방식으로 연동하기 위한 프로토콜.  
  Spring AI도 MCP 클라이언트/서버를 지원한다.

## AI 품질과 운영

* **Evaluation(Eval, 평가)** : 모델이나 에이전트가 실제 요구사항을 얼마나 만족하는지 반복 측정하는 과정이다. 정답이 명확한 항목은 코드·스키마·테스트로 평가하고, 의미 품질은 규칙 기반 점수, 사람 평가, 별도 모델 평가를 조합한다. 모델·프롬프트·도구·검색 설정을 변경할 때 같은 평가 세트로 회귀를 확인해야 한다.


* **Evaluation Harness(평가 하네스)** : 테스트 데이터 준비, 실행 환경 구성, 모델·도구 호출, 결과 수집, 채점과 리포트를 자동화하는 인프라다. 에이전트 평가는 최종 답변뿐 아니라 도구 선택, 중간 상태, 부수 효과, 비용과 완료 시간도 함께 측정해야 한다. ([Anthropic Agent Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents))


* **Guardrail(가드레일)** : 입력과 출력, 도구 실행을 정책에 맞게 제한하는 검증 계층이다. 금칙어 필터만 의미하는 것이 아니라 개인정보 제거, 출력 스키마 검증, 권한 검사, 허용 도구 목록, 위험 작업 승인과 실행 한도 등을 포함한다. 가드레일도 우회나 오탐이 가능하므로 단독 보안 경계로 간주하면 안 된다.


* **Prompt Injection(프롬프트 인젝션)** : 사용자 입력이나 검색 문서에 숨겨진 지시가 기존 시스템 지시를 무시하게 만들거나 도구 오용을 유도하는 공격이다. 외부 콘텐츠를 명령이 아닌 데이터로 취급하고, 모델 판단과 관계없이 애플리케이션에서 권한과 인자를 검증하며, 민감한 도구와 데이터를 최소한으로 노출한다.


* **AI Observability(관측 가능성)** : 모델 호출 지연, 입력·출력 토큰, 비용, 오류율, 검색 결과, 도구 호출, 평가 점수를 추적해 품질과 장애 원인을 분석하는 체계다. 프롬프트와 도구 인자에는 개인정보나 비밀값이 포함될 수 있으므로 기본 로그에 원문을 남기지 않고 마스킹과 보존 정책을 적용한다. Spring AI도 ChatClient, Model, Advisor, Tool Calling, Vector Store에 대한 메트릭과 트레이싱을 제공한다. ([Spring AI Observability](https://docs.spring.io/spring-ai/reference/observability/index.html))


* **비결정성과 운영 기준** : 같은 입력도 모델 버전과 샘플링 설정에 따라 결과가 달라질 수 있다. 모델 이름만 기록하지 말고 모델 버전, 프롬프트 버전, 검색·도구 설정을 함께 관리하며 timeout, 재시도, fallback, 토큰·비용 한도와 응답 캐시 적용 여부를 명시한다.
