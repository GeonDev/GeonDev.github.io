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
>   - [데이터 모델링과 DB 선택](#데이터-모델링과-db-선택)
>   - [DB 확장과 운영](#db-확장과-운영)
>   - [DB 설계의 검증 기준](#db-설계의-검증-기준)
> - [JPA](#용어정리--jpa)
>   - [영속성 컨텍스트와 엔티티 생명주기](#영속성-컨텍스트와-엔티티-생명주기)
>   - [N+1과 조회 최적화](#n1과-조회-최적화)
> - [Spring](#용어정리--spring)
>   - [트랜잭션과 AOP](#트랜잭션과-aop)
>   - [Spring 핵심 원리](#spring-핵심-원리)
>   - [Spring MVC와 요청 처리](#spring-mvc와-요청-처리)
>   - [Spring Security와 인증](#spring-security와-인증)
>   - [외부 연동 안정성](#외부-연동-안정성)
> - [Java](#용어정리--java)
>   - [Java 동시성과 예외](#java-동시성과-예외)
>   - [JVM과 메모리](#jvm과-메모리)
>   - [Java 객체와 컬렉션](#java-객체와-컬렉션)
>   - [Java 언어 기능과 버전 변화](#java-언어-기능과-버전-변화)
> - [성능 및 운영](#용어정리--성능-및-운영)
>   - [커넥션 풀과 스레드 풀](#커넥션-풀과-스레드-풀)
>   - [Redis와 캐시 전략](#redis와-캐시-전략)
>   - [장애 분석과 관측 가능성](#장애-분석과-관측-가능성)
> - [아키텍처 및 분산 시스템](#용어정리--아키텍처-및-분산-시스템)
>   - [MSA와 분산 시스템](#msa와-분산-시스템)
>   - [멀티테넌시](#멀티테넌시)
>   - [분산 트랜잭션과 일관성](#분산-트랜잭션과-일관성)
>   - [장애 대응 패턴](#장애-대응-패턴)
>   - [이벤트 기반 설계](#이벤트-기반-설계)
>   - [아키텍처 경계와 의존성](#아키텍처-경계와-의존성)
> - [메시지 브로커 및 이벤트 기반](#용어정리--메시지-브로커-및-이벤트-기반)
>   - [Kafka](#kafka)
>   - [메시지 전달 보장과 이벤트 처리](#메시지-전달-보장과-이벤트-처리)
> - [기타](#용어정리--기타)
>   - [API 설계와 HTTP](#api-설계와-http)
>   - [테스트 전략](#테스트-전략)
>   - [객체지향과 디자인 패턴](#객체지향과-디자인-패턴)
> - [운영체제](#용어정리--운영체제)
> - [컨테이너 및 오케스트레이션](#용어정리--컨테이너-및-오케스트레이션)
>   - [Docker](#docker)
>   - [Kubernetes](#kubernetes)
> - [Spring AI](#용어정리--spring-ai)

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
  * **SERIALIZABLE**: 가장 강력한 격리수준으로, 동시에 실행한 결과가 직렬 실행과 같도록 보장한다.
    DBMS에 따라 잠금, predicate lock, 직렬화 실패 검출 등 구현 방식이 다르며 동시처리 성능이 낮아질 수 있다.
  * **REPEATABLE READ**: 같은 트랜잭션에서 같은 행을 다시 읽을 때 일관된 결과를 보장하는 격리 수준이다.
    스냅샷 생성 시점과 Phantom Read 처리 방식은 DBMS마다 다르며, MySQL InnoDB는 일반 읽기에 MVCC를, 잠금 읽기에 Next-Key Lock을 활용한다.
  * **READ COMMITTED**: 어떤 트랜잭션의 변경내용이 COMMIT되어야만 다른 트랜잭션에서 조회할 수 있다. Non-Repeatable Read가 발생한다.
  * **READ UNCOMMITTED**: 어떤 트랜잭션의 변경내용이 COMMIT이나 ROLLBACK에 상관없이 모두 노출된다. Dirty Read가 발생할 수 있다.


* **트랜잭션 부정합 종류**:
  * **Phantom Read(유령 읽기)** : 트랜잭션이 끝나기 전에 다른 트랜잭션에 의해 추가된 레코드가 조회됨
  * **Non-Repeatable Read(반복 읽기 불가능)** : 서로 다른 트랜잭션이 동일한 행을 업데이트하고 커밋할 때 행을 다시 읽을 때 다른 값을 가져오는 경우
  * **Dirty Read** : 트랜잭션의 작업이 완료되지 않았는데도 다른 트랜잭션에서 해당 데이터를 읽는 현상


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
  * **배타 락(Exclusive Lock, X Lock, 쓰기 락)** : 한 트랜잭션이 독점하며 다른 트랜잭션의 읽기/쓰기를 모두 막는다.
  * **비관적 락(Pessimistic Lock)** : 충돌이 자주 발생한다고 가정하고,  
    데이터를 읽는 시점에 미리 DB 락(`SELECT ... FOR UPDATE`)을 건다. 충돌이 잦은 환경에 적합하나 동시성이 떨어지고 데드락 위험이 있다.
  * **낙관적 락(Optimistic Lock)** : 충돌이 드물다고 가정하고 락을 걸지 않으며,  
    보통 **버전(version) 컬럼**으로 갱신 시점에 충돌 여부를 검사한다. 변경 전후 버전이 다르면 예외를 던져 재시도한다. 동시성은 좋으나 충돌이 잦으면 재시도 비용이 크다.


* **MVCC(Multi-Version Concurrency Control, 다중 버전 동시성 제어)** : 데이터를 변경할 때 이전 버전(스냅샷)을 함께 보관해, **읽기 작업이 쓰기 락을 기다리지 않도록** 하는 동시성 제어 기법.  
  읽는 트랜잭션은 자신의 시점에 맞는 스냅샷을 보고, 쓰는 트랜잭션은 새로운 버전을 만든다. 이로써 읽기-쓰기 간 블로킹을 줄여 동시성을 높인다. (MySQL InnoDB, PostgreSQL, Oracle 등이 사용)


* **동시 주문/재고 차감 판단 기준** : 충돌이 많고 반드시 직렬화가 필요하면 DB의 비관적 락(`SELECT ... FOR UPDATE`)이나 원자적 조건 업데이트(`UPDATE stock SET qty = qty - 1 WHERE qty > 0`)가 단순하고 안전하다. 충돌이 적으면 버전 컬럼 기반 낙관적 락으로 재시도한다. Redis 분산 락도 사용할 수 있지만 락 만료, 락 소유자 검증, 네트워크 장애를 함께 고려해야 하므로 강한 정합성이 필요하면 DB 락을 우선 검토한다.

## 인덱스

* **인덱스(Index)** : 테이블 검색 속도를 높이기 위한 자료구조다. 조건에 맞는 데이터를 찾을 때 전체 테이블을 스캔하지 않고 정렬된 구조를 탐색하므로 조회 성능을 높일 수 있지만, 쓰기 시 인덱스 갱신 비용과 저장 공간이 추가로 든다.


* **B-Tree / B+Tree 인덱스 구조** : 대부분의 RDBMS 인덱스는 B+Tree 기반이다.  
  루트에서 리프까지의 깊이가 일정한 균형 트리라 일반적으로 O(log n) 수준의 검색 성능을 내며, 리프 노드가 정렬되어 있어 범위 검색과 정렬에도 유리하다.
  * **리프 노드 연결 리스트** : B+Tree는 실제 데이터(또는 PK)를 리프 노드에만 저장하고, 리프 노드끼리 연결 리스트(Linked List)로 이어져 있다.  
    덕분에 한 지점을 찾은 뒤 옆으로 순차 이동하며 읽을 수 있어 **범위 검색(BETWEEN, 부등호)과 정렬(ORDER BY)에 매우 유리**하다.
  * **왜 빠른가** : 정렬된 상태로 유지되므로 이진 탐색처럼 범위를 좁혀가며 찾고, 디스크 I/O 횟수(트리 깊이)가 적기 때문이다.


* **인덱스가 동작하지 않는 경우 / 주의점** : 인덱스를 걸어도 옵티마이저가 사용하지 않거나 효율이 떨어지는 대표 케이스
  * **선두 컬럼 미사용** : 복합 인덱스 (A, B)에서 선두 컬럼 A가 조건절에 없으면 인덱스를 제대로 타기 어렵다.
  * **인덱스 컬럼에 함수/연산 사용** : `WHERE SUBSTR(col,1,3)='abc'`, `WHERE col+1 = 10`처럼 컬럼을 가공하면 인덱스를 타지 못한다. (함수 기반 인덱스를 따로 만들면 가능)
  * **LIKE '%xx'** : 와일드카드가 앞에 오는 중간/후방 일치는 인덱스를 사용하지 못한다. `LIKE 'xx%'` (전방 일치)는 사용 가능.
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
    `WHERE id < lastId ORDER BY id DESC LIMIT n` 인덱스를 그대로 타므로 깊은 페이지에서도 성능이 일정하다. 무한 스크롤에는 적합하지만 임의 페이지 이동은 어렵다.
 * **페이징 방식 선택 기준** : 관리자 화면처럼 특정 페이지로 바로 이동해야 하면 OFFSET 방식을 유지하되 검색 조건과 인덱스를 함께 튜닝한다. 최신순 목록,  
   무한 스크롤, 대용량 타임라인처럼 깊은 페이지 조회가 잦고 데이터 변경이 많은 화면은 커서 기반 페이징이 유리하다. 커서 방식은 앞의 행을 버리는 비용이 없고 데이터 추가/삭제 중 중복이나 누락 가능성도 줄일 수 있다.


* **클러스터링(Clustering)** : 연관된 데이터를 물리적으로 가깝게 배치해 디스크 I/O를 줄이는 기법이다. 구현 방식은 DBMS마다 다르며, 대표적으로 클러스터 인덱스는 인덱스 키 순서에 따라 테이블 데이터를 저장한다. 조회에는 유리할 수 있지만 쓰기·페이지 분할 비용을 함께 고려해야 한다.


* **Clustered Index와 Non-Clustered Index**
  * **클러스터 인덱스(Clustered Index)**: 테이블 데이터가 인덱스 키 순서에 가깝게 저장되는 구조. 테이블당 하나만 가능하다.  
    MySQL InnoDB에서는 Primary Key가 클러스터 인덱스가 되며, PK가 없으면 내부적으로 대체 키를 사용한다.
  * **논클러스터 인덱스(Non-Clustered Index, Secondary Index)**: 데이터 자체와 별도의 인덱스 구조를 가진다.  
    인덱스에서 원하는 키를 찾은 뒤 실제 행을 다시 찾아가야 할 수 있다. InnoDB의 보조 인덱스는 리프 노드에 Primary Key 값을 저장한다.


* **Index 설정 기준**
  * **카디널리티 (Cardinality) 높음** : 중복도가 낮은 컬럼
  * **선택도 (Selectivity) 낮음** : 한 컬럼으로 적은 ROW가 찾아진다


* **INDEX SCAN 종류**
  * **INDEX RANGE SCAN** : B*Tree인덱스의 가장 일반적이고 정상적인 형태, 필요한 범위만 스캔
  * **INDEX FULL SCAN** : 처음부터 끝까지 수평적으로 탐색하는 방식, 최적의 인덱스가 없을 때 차선으로 선택
  * **INDEX UNIQUE SCAN** : 수직적 탐색만으로 데이터를 찾는 방식, 등치(=)조건으로 탐색하는 경우에 작동
  * **INDEX SKIP SCAN** : 인덱스 선두 컬럼이 조건절에 없어도 인덱스를 활용하는 방식,  
    조건절에 빠진 인덱스 선두 컬럼의 중복값이 많고 후행 컬럼의 중복값이 적을때 활용


* **인덱스 추가 후에도 느릴 때 점검 순서** : `EXPLAIN` 또는 `EXPLAIN ANALYZE`로 실행 계획을 먼저 본다. 인덱스가 실제 사용되는지,  
  예상 row 수와 실제 row 수가 크게 다른지, 풀 스캔이나 filesort가 발생하는지 확인한다. 이후 조건절이 인덱스 선두 컬럼을 사용하는지, 컬럼에 함수/형변환이 걸려 있는지, 카디널리티가 낮아 옵티마이저가 인덱스를 포기했는지 점검하고, 필요하면 복합 인덱스 순서나 커버링 인덱스를 검토한다.


* **인덱스(Index) 유형**
  * **Filtered Index** : 비 클러스터형 인덱스를 만들 때 WHERE 절을 사용해 거의 선택되지 않는 데이터를 제외하고 인덱스를 생성하는 방법,  
    필터 인덱스는 전체 테이블 인덱스에 비해 쿼리 성능을 개선하고 인덱스 유지관리 비용과 인덱스 저장소 비용을 줄일 수 있다는 장점이 있다. (SQL Server에서 사용가능)
  * **Unique Index** : Unique Index로 컬럼이 잡혀 있으면 해당 컬럼에는 중복된 데이터가 들어가지 않는다. 단,  
    `NULL` 허용 방식은 DBMS마다 다르다. MySQL, PostgreSQL, SQL Server는 Unique Index에서 여러 `NULL`을 허용할 수 있지만, Oracle은 `NULL`을 인덱스에 저장하지 않는 등 구현 차이가 있다. Primary Key는 `NULL`을 허용하지 않는다는 점이 핵심 차이다.


* **데이터 무결성**: 데이터의 정확성, 일관성, 유효성을 유지하는 것, RDBMS의 중요한 기능으로 주로 데이터에 적용하는 연산을 제한하여 무결성을 유지한다.
  * **개체 무결성(Entity integrity)**: 모든 테이블이 기본키로 선택된 필드를 가지고 있어야 한다. 기본키로 선택된 필드는 NULL을 허용하지 않는다.
  * **참조 무결성(Referential integrity)**: 참조관계에 있는 두 테이블의 데이터가 항상 일관된 값을 갖도록 유지하는 것


* **데이터베이스 파티셔닝**: 큰 테이블을 파티션(Partition)이라는 작은 단위로 나누어 관리하는 기법이다. 파티션 제거(Partition Pruning)가 가능한 쿼리는 성능과 관리성을 높일 수 있지만, 파티션 키와 맞지 않는 조인·조회는 오히려 비용이 커질 수 있다.



## 데이터 모델링과 DB 선택

* **정규화**: 데이터 중복을 줄이고 무결성을 높이기 위해 테이블을 체계적으로 분리하는 과정. 중복 설계는 삽입/삭제/갱신 이상을 만들 수 있다.
  * **제 1 정규형 (1NF: First Normal Form)** : 각 필드는 하나의 값만 가져야 한다.
  * **제 2 정규형 (2NF: Second Normal Form)** : 기본 키의 부분 집합에 종속된 모든 속성이 없어야 한다.
  * **제 3 정규형 (3NF: Third Normal Form)** : 기본 키에 비이행적으로 종속된 모든 속성이 없어야 한다
  * **보이스-코드 정규형 (BCNF: Boyce-Codd Normal Form)** : 모든 결정자가 후보 키(candidate key)이어야 한다.
  * **제 4 정규형 (4NF: Fourth Normal Form)** : 다치 종속성(Multi-Valued Dependency)을 제거
  * **제 5 정규형 (5NF: Fifth Normal Form)** : 조인 종속성(Join Dependency)을 제거


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


* **DB Migration** : 스키마 변경을 버전으로 관리하는 방식. 운영에서는 하위 호환 가능한 변경을 먼저 배포하고,  
  애플리케이션 배포 후 불필요한 컬럼/인덱스를 제거하는 식으로 단계적으로 진행하는 것이 안전하다. (Flyway, Liquibase)

## DB 설계의 검증 기준

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

# 용어정리 – JPA

## 영속성 컨텍스트와 엔티티 생명주기

* **영속성 컨텍스트** : 엔티티를 관리하는 JPA의 1차 캐시 공간. 엔티티 조회, 변경 감지, 쓰기 지연, 동일성 보장을 제공한다.


* **영속성 컨텍스트의 이점**
  * **1차 캐시** : 조회가 가능하며 1차 캐시에 없으면 DB에서 조회하여 1차 캐시에 올려 놓는다.
  * **동일성 보장** : 같은 트랜잭션/영속성 컨텍스트 안에서는 같은 식별자의 엔티티에 대해 동일성 비교(`==`)가 가능하다.
  * **쓰기 지연** : 트랜잭션 커밋하기 전까지 SQL을 바로 보내지 않고 모아서 보낼 수 있다.
  * **변경 감지** : commit 되는 시점에 Entity와 스냅샷을 비교하여 update SQL을 생성한다.
  * **지연 로딩** : 연관 엔티티를 실제 사용하는 시점에 SQL을 실행하여 데이터를 가져온다.


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


* **JPA / Hibernate / Spring Data JPA** : **JPA**는 자바의 ORM 표준 명세(인터페이스),  
  **Hibernate**는 JPA를 구현한 대표적인 구현체, **Spring Data JPA**는 JPA를 더 쉽게 쓰도록 Repository 인터페이스만 정의하면 구현체를 자동 생성해주는 스프링 모듈이다.
  * **ORM(Object-Relational Mapping)** : 객체와 관계형 DB의 테이블을 매핑해,  
    SQL을 직접 작성하지 않고 객체 중심으로 데이터를 다루게 해주는 기술. 객체-테이블 간 패러다임 불일치를 해결한다.


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
  * **즉시 로딩에서 발생** : JPQL을 사용하는 경우 전체 조회를 했을 때,  
    영속성 컨텍스트가 아닌 데이터베이스에서 직접 데이터를 조회한 다음 즉시로딩 전략이 동작하기 때문.
  * **지연 로딩에서 발생** : 지연로딩 전략을 사용한 하위 엔티티를 로드할 때,  
    JPA에서 프록시 엔티티를 unproxy 할 때 해당 엔티티를 조회하기 위한 추가적인 쿼리가 실행되어 발생.


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

# 용어정리 – SPRING

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
* **Spring DI/IoC**
  * **IoC(제어의 역전)** : 프로그램의 제어 흐름을 직접 제어하는 것이 아니라 외부에서 관리하는 것으로 코드의 최종호출은 개발자가 제어하는 것이 아닌 프레임워크의 내부에서 결정된 대로 이루어진다.
  * **DI(의존관계 주입)** : Spring 프레임워크에서 지원하는 IoC의 형태로, 클래스 사이의 의존관계를 빈 설정 정보를 바탕으로 컨테이너가 자동으로 연결하는 것
    * **생성자 주입** : 생성자 호출시점에 딱 1번만 호출되는 것을 보장하며 불변, 필수 의존관계에 사용한다. 불변 보장, 컴파일중 오류 확인 가능,  
      순환 참조 에러 방지 등 이점이 있어 스프링에서 권장한다.
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
  * **BeanFactory** : 스프링 빈을 관리하고 조회하는 역할, Bean을 미리 생성하지 않고 호출 시점에 생성
  * **ApplicationContext** : BeanFactory를 상속받고 추가 기능(프로파일 처리, 리소스 읽기 등)을 포함,  
    Application을 시작할때 미리 Bean 생성


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


* **Servlet Filter** : 서블릿 실행 전, 후에 어떤 작업을 하고자 할때 사용한다.  
  이 필터가 있음으로써 WAS에서 설정을 변경하지 않고도 모든 서블릿에 영향을 준다.
  * **Filter 에러 처리** : Filter 예외는 `@ControllerAdvice`가 직접 처리하지 않는다. Filter에서 직접 응답을 만들거나 error dispatch를 통해 `ErrorController`로 전달하도록 구성한다.


* **Spring Interceptor** : DispatcherServlet 내부에서 컨트롤러 실행 전후에 공통 로직을 처리한다. 인증, 로깅,  
  권한 체크처럼 Spring MVC 핸들러 정보가 필요한 작업에 적합하다.
  * **Interceptor 에러 처리** : DispatcherServlet의 예외 처리 흐름을 타는 예외는 `@ControllerAdvice`로 처리할 수 있다.


* **Spring의 레이어드 아키텍처**
하나의 레이어는 자신의 고유 역할을 수행하고, 인접한 다른 레이어에 무언가를 요청하거나 응답한다.  
  각 레이어는 다른 레이어를 신경 쓸 필요가 없기 때문에 자신의 역할에 충실할 수 있다. (특정한 레이어의 기능을 개선하거나 교체할 수 있기 때문에 재사용성과 유지 보수에 유리)
  * **Persistence Layer** : 데이터 관련 처리를 담당하는 부분, repository
  * **Application Layer** : 비즈니스 핵심 로직을 처리하는 부분, service
  * **Presentation Layer** : view를 담당하는 부분, controller


* **@Async** : Spring AOP를 통해 구현되어 있다. `@Async`가 선언되면 스프링이 프록시 객체를 만들어 비동기 실행을 위임한다.  
  프록시 기반이기 때문에 `private 메서드`, `final 메서드`, self-invocation(같은 클래스 내부 호출)에서는 동작하지 않는다. 반드시 `@EnableAsync`가 필요하며, 운영 환경에서는 명시적인 Executor 설정이 권장된다.


* **@Async의 Thread Pool**
  * **SimpleAsyncTaskExecutor** : 작업마다 새로운 스레드를 생성하고 비동기 방식으로 동작한다. 스레드 풀 방식이 아니므로 스레드를 재사용하지 않으며,  
    요청이 많으면 스레드가 과도하게 늘어날 수 있다.
  * **ThreadPoolTaskExecutor** : 스레드 풀 기반의 TaskExecutor. 운영 환경에서는 `corePoolSize`, `maxPoolSize`,  
    `queueCapacity`, `RejectedExecutionHandler`를 명시적으로 설정하는 것이 좋다.
    * **ThreadPoolTaskExecutor 옵션**
      * corePoolSize : 기본적으로 유지할 스레드 개수
      * maxPoolSize : 스레드 풀에 살아있는 최대 개수
      * queueCapacity : 모든 core 스레드가 작업 중일 때 대기열에 쌓을 수 있는 작업 개수
      * keepAliveSeconds : 스레드 풀 내 스레드 개수가 corePoolSize 초과인 상태에서, 대기 상태의 스레드가 종료되는 시간
    * **ThreadPool 작동방식**
      * 스레드 수가 corePoolSize보다 작으면 새 스레드를 만들어 작업을 실행한다.
      * core 스레드가 모두 작업 중이면 queueCapacity만큼 큐에 작업을 쌓는다.
      * 큐가 가득 차고 스레드 수가 maxPoolSize보다 작으면 추가 스레드를 만든다.
      * 큐도 가득 차고 maxPoolSize에도 도달하면 거부 정책이 동작한다.


* **@Async의 return** : `void`, `Future`, `CompletableFuture` 타입을 리턴 타입으로 사용할 수 있다.
  * **Future** : `future.get()`은 블로킹을 통해 요청 결과가 올 때까지 기다리는 역할을 한다. 그래서 비동기 블로킹 방식이 되어버려 성능이 좋지 않다.
  * **CompletableFuture** : Java 8에서 추가된 방식. 여러 연산을 결합할 수 있고,  
    연산이 완료되면 다음 단계의 작업을 수행하거나 예외를 처리할 수 있다. 최근 코드에서는 `ListenableFuture`보다 `CompletableFuture`를 주로 사용한다.

## Spring Security와 인증

* **Spring Security 인증 과정** 인증 요청 → AuthenticationFilter → UsernamePasswordAuthenticationToken 생성 → AuthenticationManager 인증 → UserDetailsService 조회 → SecurityContext 저장 이후 UserDetailsService 구현체를 통해 DB에 저장된 정보와 비교해 일치하면 UserDetails 구현 객체를 반환해 SecurityContext에 저장한다.


* **인증(Authentication)과 인가(Authorization)** : **인증**은 "누구인지"를 확인하는 것(로그인),  
  **인가**는 "무엇을 할 수 있는지" 권한을 확인하는 것(접근 제어).


* **Spring Security 구조**
  * **SecurityFilterChain** : 여러 보안 필터(Filter)들의 모음. 요청은 이 필터 체인을 거쳐 인증/인가가 처리된다.  
    (과거 `WebSecurityConfigurerAdapter`는 deprecated → 현재는 `SecurityFilterChain` 빈으로 설정)
  * **SecurityContextHolder** : 인증된 사용자 정보(Authentication)를 보관하는 곳. 기본적으로 ThreadLocal에 저장된다.
  * **PasswordEncoder** : 비밀번호를 단방향 해시로 암호화 (BCrypt 권장)


* **JWT(Json Web Token)** : 인증/인가에 필요한 클레임을 담고 서명한 토큰이다.  
  서버가 세션 상태를 저장하지 않아도 요청마다 토큰 검증으로 사용자를 식별할 수 있어 Stateless 구조에 자주 사용된다.
  * **Header(헤더)** : 서명 시 사용하는 키(kid), 사용할 타입(typ), 서명 암호화 알고리즘(alg)의 정보가 담겨 있다.
  * **Payload(페이로드)** : 토큰에서 사용할 정보의 조각들인 클레임(Claim)이 담겨 있다. 클레임(Claim)은 Key/Value 형태로 된 값을 갖는다.
  * **Signature(서명)** : Header(헤더) 에서 정의한 알고리즘 방식(alg)을 활용하여 Header(헤더)+ 페이로드(Payload)와 서버가 갖고 있는 유일한 key 값을 합친 것을 헤더에서 정의한 알고리즘으로 암호화한다.


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

## 외부 연동 안정성

* **Timeout** : 외부 API, DB, Redis, Kafka 등 원격 호출에는 반드시 연결 시간(connect timeout)과 응답 대기 시간(read timeout)을 설정해야 한다. timeout이 없으면 장애가 난 외부 시스템 때문에 애플리케이션 스레드가 고갈될 수 있다.


* **Retry** : 일시적인 네트워크 오류에는 재시도가 도움이 되지만, 무조건 재시도하면 장애 시스템에 부하를 더 줄 수 있다. 재시도 횟수 제한, 지수 백오프,  
  jitter, 멱등성 보장이 필요하다.


* **Rate Limiting** : 특정 사용자나 클라이언트의 과도한 요청을 제한해 시스템을 보호하는 방법. API Gateway, Nginx,  
  Redis 카운터 등을 이용해 구현하며, 인증/결제/검색 API처럼 비용이 큰 엔드포인트에 특히 중요하다.

# 용어정리 – Java

## Java 동시성과 예외

* **동시성 키워드: synchronized / volatile / atomic** : 멀티스레드 환경에서 가시성(Visibility)과 원자성(Atomicity)을 다룬다.
  * **synchronized** : 임계 영역에 한 번에 하나의 스레드만 진입하도록 락(lock)을 거는 키워드.  
    **원자성과 가시성을 모두 보장**하지만 락 경합으로 성능 비용이 있다.
  * **volatile** : 변수를 메인 메모리에서 직접 읽고 쓰도록 강제해 **가시성만 보장**한다(스레드 간 변경 즉시 반영).  
    그러나 `count++`처럼 읽기-수정-쓰기 복합 연산의 **원자성은 보장하지 못한다.**
  * **atomic (java.util.concurrent.atomic)** :  
    `AtomicInteger` 등은 CAS(Compare-And-Swap) 연산을 이용해 **락 없이(lock-free) 원자성과 가시성을 모두 보장**한다. 단순 카운터 등에 적합하다.


* **동시성 제어 선택 기준** : 단순 상태 변경 전파처럼 가시성만 필요하면 `volatile`을 사용할 수 있지만, `count++` 같은 복합 연산에는 적합하지 않다.  
  임계 영역 전체의 원자성과 가시성이 필요하면 `synchronized`가 명확하고, 단순 카운터나 누적값처럼 짧은 원자 연산은 `AtomicInteger` 같은 atomic 계열이 락 경합을 줄이는 데 유리하다.


* **CAS와 ABA 문제** : CAS는 값이 예상값과 같을 때만 변경하는 낙관적 방식이다.  
  값이 `A → B → A`로 바뀌면 CAS는 값이 처음부터 `A`였다고 오인할 수 있는데, 이를 ABA 문제라고 한다. 단순 카운터에는 보통 문제가 없지만 상태 전이가 중요한 자료구조에서는 버전 번호를 함께 비교하는 `AtomicStampedReference` 같은 방법을 검토한다. 또한 CAS는 경합이 심하면 반복 재시도로 CPU를 소모할 수 있어, 항상 락보다 빠른 것은 아니다.


* **가시성과 안전한 공개** : 불변 객체는 생성자에서 완전히 초기화한 뒤 `final` 필드로 보관하면 다른 스레드에 안전하게 공개하기 쉽다.  
  반면 일반 컬렉션을 여러 스레드가 동시에 수정하면 `volatile` 참조만으로는 안전하지 않으며, 동기화·동시성 컬렉션·메시지 전달 중 하나로 변경 범위를 보호해야 한다. `ConcurrentHashMap`도 개별 연산은 안전하지만 여러 연산을 묶은 업무 규칙까지 원자적으로 만들어 주지는 않는다.


* **Error와 Exception**
  * **Error** : 실행 중 일어날 수 있는 치명적 오류. 컴파일 시점에 체크할 수 없고, 오류가 발생하면 프로그램은 비정상 종료 한다.
  * **Exception** : Error보다 비교적 경미한 오류이며, try-catch를 이용해 프로그램의 비정상 종료를 막을 수 있다.
    * **Checked Exception과 Unchecked Exception**
      * **Checked Exception** : RuntimeException을 상속하지 않고 반드시 에러 처리(try/catch or throw)를 해야한다.  
        (대표적으로 FileNotFoundException)
      * **UncheckedException** : RuntimeException을 상속하면 UncheckedException.  
        체크 예외와는 달리 에러 처리를 강제하지 않음 (대표적으로 NullPointerException)

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


* **GC(Garbage Collector)** : Heap에서 더 이상 참조되지 않는 객체를 제거하는 JVM 메모리 관리 기능. Young 영역에서는 Minor GC,  
  Old 영역에서는 Major/Full GC가 발생하며, 일부 구간에서는 Stop-the-world가 생긴다.
  * **Minor GC** : Young 영역은 Eden / Survivor 이라는 두 영역으로 나뉨,  
    Eden 영역에서 참조가 남아있는 객체를 mark하고 survivor 영역으로 복사한다. 그리고 Eden 영역을 비운다. Survivor 영역도 가득차면 같은 방식으로 다른 Survivor 영역에 복사하고 비운다. 이를 반복하다 계속 해서 살아남는 객체는 old 영역으로 이동
  * **Major GC(Full GC)** : Old 영역의 메모리가 부족해지면 발생, 삭제되어야 하는 객체를 mark한다. 그리고 제거(sweep)한다.  
    메모리는 단편화 된 상태이므로 이를 한 군데에 모아주는 것을 Compaction이라 하며 compact라고 한다.


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
  * **동일성(identity)** : 객체의 주소를 비교 , `==` 연산자 사용
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
    LinkedList는 노드 연결 기반이라 앞뒤 삽입/삭제가 빠르지만 인덱스 조회가 O(n)으로 느리다.
  * **HashMap 내부 동작** : Key의 `hashCode()`로 **버킷(bucket)** 위치를 정하고 그 안에 저장한다.  
    서로 다른 Key가 같은 버킷에 들어가는 **해시 충돌(Collision)** 시에는 같은 버킷을 연결 리스트(LinkedList)로 연결한다. **Java 8부터는 한 버킷의 충돌이 일정 개수(기본 8개)를 넘으면 연결 리스트를 레드-블랙 트리로 전환(Treeify)** 하여 최악의 조회 성능을 O(n)에서 O(log n)으로 개선했다.

## Java 언어 기능과 버전 변화

* **Stream API** : 컬렉션 등의 데이터를 내부 반복으로 정렬·필터링·변환하는 API. Stream 연산 자체는 원본 컬렉션을 변경하지 않지만, 람다 내부의 부작용으로 요소 객체나 외부 상태를 변경하지 않도록 주의해야 한다. `parallel()`로 병렬 처리도 가능하다.
  * **Mutable 객체** : 생성된 이후 수정 가능, 이미 존재하는 객체에 재할당할 수 있다. 값을 변경할 수 있는 메서드를 제공한다(setter).
  * **Immutable 객체** : 생성된 이후 수정 불가능하며, 변경이 필요하면 새 객체를 만든다. 내부에 가변 객체를 노출하지 않고 안전하게 공개하면 스레드 안전성에 유리하다. 자바의 대표적인 불변 객체는 `String`이다.


* **함수형 인터페이스와 람다**
  * **함수형 인터페이스(Functional Interface)** : 추상 메서드가 하나인 인터페이스다. `@FunctionalInterface`로 명시할 수 있다.  
    (대표적으로 `Runnable`, `Comparator`, `Function`, `Supplier`, `Consumer`, `Predicate`)
  * **람다 표현식(Lambda)** : 함수형 인터페이스의 구현을 익명 함수 형태(`(x) -> x + 1`)로 간결하게 표현하는 문법.
  * **메서드 레퍼런스(Method Reference)** : 람다가 단순히 기존 메서드를 호출하기만 할 때 더 간결하게 표현하는 문법.  
    (`System.out::println`, `String::valueOf`, `User::getName`)


* **제네릭(Generics)** : 클래스 내부에서 사용할 데이터 타입을 외부에서 지정하는 기법,  
  객체의 타입을 컴파일 시에 체크하기 때문에 객체의 타입 안정성을 높이고 형변환의 번거로움을 줄여주며 재사용성을 높인다.
제네릭은 참조 타입에서만 사용할 수 있으며 원시 타입에서 사용하고 싶다면 레퍼 클래스를 사용하여야 한다.
  * **와일드카드** : 와일드카드는 ? 문자를 사용하여 불특정 타입을 나타낼 때 사용되며 주로 메서드 파라미터에 적용한다.
    * **무제한 와일드카드** : 어떤 타입이라도 허용 (List<?> list)
    * **상한 경계 와일드카드 (Upper Bounded Wildcard)** : 특정 타입의 하위 클래스만 허용 (List<? extends Number> list)
    * **하한 경계 와일드카드 (Lower Bounded Wildcard)** : 특정 타입의 상위 클래스만 허용 (List<? super Integer> list)


* **리플렉션(Reflection)** : 런타임 시에 자바 클래스의 메타데이터(metadata)를 검사하고 조작할 수 있게 해주는 기능, 이를 통해 클래스, 인터페이스, 필드,  
  메서드 등의 정보를 얻고, 해당 객체의 메서드를 호출하거나 필드 값을 수정할 수 있다.
  * **클래스 로딩 및 인스턴스화** : 런타임 시에 클래스 이름을 통해 클래스를 로딩하고, 인스턴스를 생성
  * **메타데이터 접근** : 클래스의 필드, 메서드, 생성자 등의 메타데이터에 접근
  * **필드 및 메서드 조작:** : 객체의 필드 값을 읽거나 수정 또는 메서드를 호출
  * **런타임 동적 바인딩** : 런타임에 동적으로 메서드나 필드를 바인딩하여 호출. (주로 플러그인 시스템, 의존성 주입, 프레임워크 개발 등에 사용)


* **직렬화(Serialization)과 역직렬화(Deserialization)**
  * **직렬화(Serialization)** : 객체들의 데이터를 연속적인 데이터(스트림)로 변형하여 전송 가능한 형태로 만드는 것 (객체 데이터를 JSON으로 바꾼다.)
  * **역직렬화(Deserialization)** : 직렬화된 데이터를 다시 객체의 형태로 만드는 것 (JSON 데이터를 객체로 바꾼다)


* **record / Optional 사용 의도**
  * **record (Java 16+)** : 불변 데이터 전달용 객체(DTO/VO)를 간결하게 정의하기 위한 타입. 필드 선언만으로 생성자, getter,  
    `equals()`/`hashCode()`/`toString()`이 자동 생성된다. **불변 데이터를 보일러플레이트 없이 표현**하려는 의도.
  * **Optional** : 값이 없을 수 있음(null 가능성)을 타입으로 명시해 **NullPointerException을 예방**하려는 의도.  
    주로 메서드 반환 타입에 사용하며, 필드/파라미터로 남용하는 것은 권장되지 않는다.


* **Final** : final 키워드는 변수(variable), 메서드(method), 또는 클래스(class)에 사용될 수 있으며 프로그램 실행 도중에 수정할 수 없다.
  * **final 변수** : 한 번 초기화되면 그 이후에 변경할 수 없다.
  * **final 메서드** : 오버라이딩을 금지한다.
  * **final 클래스** : 다른 클래스에서 상속할 수 없다.


* **static final** : 클래스에 하나만 존재하며 한 번만 초기화할 수 있는 필드다. 선언 시 또는 static initializer에서 초기화할 수 있다.


* **자바 원시타입** : `boolean`, `char(2byte)`, `byte(1byte)`, `short(2byte)`, `int(4byte)`,  
  `long(8byte)`, `float(4byte)`, `double(8byte)`. `boolean`은 JVM 명세상 정확한 크기가 고정되어 있지 않고 구현에 따라 달라질 수 있다.


* **JDK와 JRE** : JDK는 Java Development Kit의 약자로 개발에 필요한 도구(`javac`, `javadoc`, 디버깅 도구 등)와 런타임을 포함한다.  
  JRE는 Java Runtime Environment의 약자로 자바 프로그램 실행에 필요한 런타임 환경이다. Java 11 이후에는 별도 JRE 배포보다 JDK 배포와 `jlink`를 통한 커스텀 런타임 구성이 일반적이다.


* **Java의 실행방식**
  * 자바 컴파일러(javac)가 자바 소스코드(.java)를 읽어 자바 바이트코드(.class)로 변환
  * Class Loader를 통해 class 파일들을 JVM으로 로딩.
  * 로딩된 class파일들은 Execution engine을 통해 해석
  * 해석된 바이트코드는 Runtime Data Areas 에 배치되어 수행


* **Java 버전별 특징**
  * **Java 8** : Lambda, Stream API, Optional, 새로운 날짜/시간 API(`java.time`) 추가
  * **Java 11 (LTS)** : HTTP Client 표준화, `var`를 람다 파라미터에 사용 가능, `javac`로 컴파일하지 않고 단일 소스 파일 실행 가능.  
    Java 9부터 G1 GC가 기본 GC가 되었고, Java 11은 장기 지원 버전으로 많이 사용된다.
  * **Java 17 (LTS)** : Sealed Class, Pattern Matching for `instanceof`, Text Blocks 등 추가.  
    Spring Boot 3의 최소 요구 버전이 Java 17이다.
  * **Java 21 (LTS)** : **Virtual Threads (Project Loom)**, Sequenced Collections,  
    Pattern Matching for `switch`, Record Patterns 추가
  * **Virtual Threads** : 운영체제 스레드와 1:1 매칭되지 않는 경량 스레드로,  
    수백만 개의 스레드를 생성하여 I/O 블로킹 상황에서 효율적인 리소스 사용 가능

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
  * 캐시 재생성과 재고·결제처럼 중복이 치명적인 작업을 구분해야 한다.

* **락 만료와 소유권**
  * 작업 시간이 TTL보다 길면, 만료 후 다른 요청이 진입할 수 있다.
  * TTL은 작업 시간의 상한과 네트워크 지연을 고려해 정한다.
  * 연장 시에는 소유 토큰을 검증하고, 실패하면 락을 잃었을 수 있다고 판단한다.
  * 중요한 쓰기는 DB 트랜잭션 또는 조건부 갱신으로 최종 무결성을 보장한다.

* **Redlock의 선택 기준**
  * 독립 Redis 노드의 과반수(quorum)에서 제한 시간 안에 락을 얻어야 성공이다.
  * 획득에 실패하거나 시간이 TTL을 넘기면 이미 얻은 락을 해제한다.
  * 노드별 짧은 timeout, 재시도 제한, 지수 백오프와 jitter를 적용한다.
  * 네트워크 분할, 긴 GC pause, 지연된 패킷의 위험은 남는다.
  * 강한 정합성이 필요하면 DB 락, ZooKeeper, etcd 또는 fencing token을 검토한다.

* **Fencing Token(펜싱 토큰)**
  * 락을 얻을 때 단조 증가하는 번호를 함께 받는다.
  * 보호 대상 저장소는 이전 번호의 쓰기를 거부한다.
  * TTL 만료 후 늦게 도착한 이전 보유자의 요청도 차단할 수 있다.
  * 대상 저장소가 토큰 비교를 지원해야 하며, Redis 락만으로 자동 제공되지는 않는다.


* **Redis 영속성(Persistence)** : 인메모리지만 재시작 시 데이터 복구를 위해 디스크 저장 옵션을 제공한다.
  * **RDB (Snapshot)** : 특정 시점의 메모리 전체를 스냅샷으로 저장. 파일이 작고 복구가 빠르지만, 스냅샷 사이의 데이터는 유실될 수 있다.
  * **AOF (Append Only File)** : 모든 쓰기 명령을 로그로 기록. 유실이 적고 안정적이지만 파일이 크고 복구가 상대적으로 느리다.  
    (실무에서는 RDB + AOF 혼용)


* **Redis 고가용성 / 확장**
  * **Replication(복제)** : Master-Replica 구조로 데이터를 복제해 읽기 분산과 장애 대비
  * **Sentinel(센티넬)** : Master 장애를 감지해 Replica를 자동으로 승격(Failover)시켜 고가용성을 확보.  
    비동기 복제 기반이므로 장애 시 일부 데이터 유실 가능성이 있다.
  * **Cluster(클러스터)** : 데이터를 16384개의 해시 슬롯으로 **샤딩(Sharding)**하여 여러 노드에 분산 저장 → 수평 확장

## 장애 분석과 관측 가능성

* **JVM 튜닝 및 장애 대응**
  * **Heap Dump** : 특정 시점의 JVM 메모리 상태를 기록한 파일. 메모리 누수(Memory Leak) 분석 시 사용.
  * **Thread Dump** : 특정 시점의 모든 스레드 상태를 기록한 파일. 데드락(Deadlock)이나 CPU 점유율 이상 분석 시 사용.


* **Observability (관측 가능성)**
  * **Logging** : 발생한 이벤트 기록 (ELK 스택 등)
  * **Metrics** : 수치화된 데이터 기록 (Prometheus, Grafana)
  * **Tracing** : 분산 환경에서 요청의 흐름 추적 (Micrometer Tracing, Jaeger, Zipkin)


* **성능 수치 해석 원칙** : 평균 응답 시간은 일부 매우 느린 요청을 가릴 수 있으므로 p50·p95·p99를 함께 본다. 처리량(TPS)이 높아져도 오류율, 타임아웃,  
  큐 대기 시간, DB 커넥션 대기가 증가했다면 실제 개선이 아닐 수 있다. 변경 전후 비교는 데이터 규모, 동시 사용자 수, 워밍업 여부, 캐시 상태, 요청 분포를 같게 맞추고 측정 기간과 환경을 함께 남긴다.


* **장애 분석의 최소 증거** : 장애 시각을 기준으로 애플리케이션 로그의 요청 ID/trace ID, 오류율·지연 그래프, JVM/커넥션 풀/스레드 풀 지표,  
  DB의 느린 쿼리와 락 대기, 외부 의존성의 timeout을 함께 대조한다. 증상만으로 원인을 단정하지 않고, 병목 구간을 재현하거나 관련 지표로 반증해 좁힌다.

# 용어정리 – 아키텍처 및 분산 시스템

## MSA와 분산 시스템

* **Monolithic vs MSA** : 모놀리식은 하나의 배포 단위에 모든 기능이 포함되어 초기 개발과 운영이 단순하지만,  
  규모가 커질수록 빌드/배포가 무겁고 일부 기능의 장애가 전체로 전파된다. MSA는 기능별로 독립 배포가 가능해 부분 확장과 장애 격리에 유리하지만 분산 시스템의 복잡성이 증가한다.


* **MSA (Microservices Architecture)** : 애플리케이션을 작은 독립적인 서비스 단위로 나누어 개발하고 배포하는 아키텍처. 서비스 간 독립성, 확장성,  
  배포 속도 면에서 유리하지만 분산 시스템의 복잡성(데이터 일관성, 네트워크 지연, 분산 트랜잭션, 디버깅 난이도 등)이 증가한다.
  * **장점** : 서비스별 독립 배포/확장, 장애 격리, 기술 스택의 다양성(Polyglot), 팀별 독립 개발
  * **단점** : 네트워크 통신 비용, 데이터 정합성 보장의 어려움, 통합 테스트/운영 복잡도, 분산 트랜잭션

## 멀티테넌시

* **멀티테넌시(Multi-tenancy)** : 하나의 애플리케이션을 여러 고객 조직(테넌트)이 함께 사용하되, 각 테넌트의 데이터·권한·설정을 분리하는 SaaS 설계 방식이다.


* **테넌트 격리 모델**
  * **공유 DB·공유 스키마** : 같은 테이블에 `tenant_id`를 둔다. 비용은 낮지만 모든 쿼리의 테넌트 조건을 강제해야 한다.
  * **테넌트별 스키마/DB** : 테넌트별로 스키마 또는 DB를 분리한다. 격리는 강하지만 비용과 운영 복잡도가 증가한다.


* **테넌트 컨텍스트(Tenant Context)** : 인증된 요청에서 확정한 테넌트 ID를 서비스·비동기 작업·캐시 키 등에 전달하는 정보다. 임의 요청값이 아닌 인증 정보로 식별해야 한다.


* **주의점** : DB뿐 아니라 캐시·파일·메시지·검색 인덱스에도 테넌트 식별자를 포함해 교차 노출을 막아야 한다.

## 분산 트랜잭션과 일관성

* **CAP 이론** : 분산 시스템에서 **Consistency(일관성), Availability(가용성),  
  Partition Tolerance(분할 내성)** 세 가지를 동시에 모두 만족할 수 없다는 이론. 네트워크 분할(Partition)이 발생했을 때는 요청을 거부하거나 대기해서 일관성을 지킬지(CP), 오래된 데이터라도 응답해서 가용성을 지킬지(AP)를 선택해야 한다.
  * **CP 시스템 성향** : 일관성을 위해 일부 요청을 거부하거나 대기 (예: ZooKeeper, etcd, HBase)
  * **AP 시스템 성향** : 가용성을 위해 오래된 데이터라도 응답 (예: Cassandra, DynamoDB)
  * **주의점** : 실제 제품을 단순히 CP/AP로 고정 분류하기는 어렵다. 설정, 쿼럼, 복제 방식, 읽기/쓰기 옵션에 따라 일관성과 가용성의 균형이 달라진다.


* **PACELC 이론** : CAP 이론의 확장으로, 네트워크 분할(P)이 있을 때는 A와 C를 트레이드오프하고,  
  분할이 없을 때(Else)는 지연 시간(Latency)과 일관성(Consistency) 사이의 트레이드오프가 존재함을 설명한다.


* **분산 트랜잭션과 데이터 정합성**
  * **2PC (Two-Phase Commit)** : 코디네이터가 Prepare(준비) → Commit(확정) 두 단계로 모든 참여 노드의 커밋을 동기적으로 보장.  
    강한 일관성을 제공하지만 코디네이터 장애 시 블로킹이 발생하고, 모든 참여자가 락을 유지해야 해 성능과 가용성이 떨어진다. MSA에서는 잘 사용하지 않음.
  * **Saga 패턴** : MSA 환경에서 여러 서비스에 걸친 분산 트랜잭션을 관리하는 패턴. 각 서비스의 로컬 트랜잭션을 순차적으로 실행하며,  
    중간에 실패하면 **보상 트랜잭션(Compensating Transaction)**으로 이전 작업을 되돌려 데이터 일관성(최종적 일관성)을 맞춘다.
    * **Choreography(코레오그래피)** : 중앙 조정자 없이 각 서비스가 이벤트를 발행/구독하며 다음 단계를 진행.  
      구현이 단순하지만 흐름 파악이 어렵고 서비스 간 결합이 생길 수 있다.
    * **Orchestration(오케스트레이션)** : 중앙 오케스트레이터가 각 서비스를 순서대로 호출하고 보상 로직을 관리.  
      흐름이 명확하지만 오케스트레이터에 로직이 집중된다.
  * **최종적 일관성(Eventual Consistency)** : 일정 시간이 지나면 모든 노드가 동일한 상태로 수렴한다는 개념.  
    MSA에서는 강한 일관성 대신 최종적 일관성을 받아들이는 경우가 많다.


* **분산 트랜잭션 처리 판단 기준** : 2PC는 강한 일관성을 제공하지만 락 유지, 코디네이터 장애, 가용성 저하 부담이 크다.  
  일반적인 MSA에서는 각 서비스의 로컬 트랜잭션과 이벤트를 조합하고, 실패 시 보상 트랜잭션을 수행하는 Saga 패턴을 더 자주 사용한다. DB 변경과 이벤트 발행의 이중 쓰기 문제는 Transactional Outbox로 줄인다.


* **멱등성 키(Idempotency Key)** : 네트워크 timeout 뒤 클라이언트나 서버가 같은 요청을 재시도하면, 실제로는 이전 요청이 성공했을 수 있다.  
  생성·결제처럼 중복 실행이 위험한 API는 클라이언트가 보낸 멱등성 키를 요청 본문 해시·처리 결과와 함께 저장하고, 같은 키의 재요청에는 기존 결과를 반환한다. 키의 유효기간, 동시 요청 시 유니크 제약 또는 원자적 선점, 요청 내용이 다른 경우의 오류 처리를 정해야 한다.


* **Saga 보상의 한계** : 보상 트랜잭션은 DB rollback처럼 시간을 되돌리는 기능이 아니라 이미 완료된 상태를 새 작업으로 상쇄하는 것이다.  
  외부 결제 취소가 실패하거나 알림이 이미 발송된 경우처럼 완전히 되돌릴 수 없는 작업이 있으므로, 각 단계의 멱등성·재시도·수동 복구 절차와 중간 상태의 사용자 노출 방식을 설계해야 한다.


* **일관성 경계의 명시** : 어떤 데이터가 즉시 일관되어야 하는지와, 이벤트 전달 지연 동안 최종 일관성을 허용할 수 있는지를 구분한다.  
  예를 들어 재고 확정은 조건부 갱신·트랜잭션으로 보호할 수 있지만, 알림 발송이나 통계 집계는 이벤트 기반 비동기 처리가 적합할 수 있다. 설계의 핵심은 사용 기술의 이름보다 실패 시 허용되는 상태와 복구 절차를 정하는 것이다.


* **MSA 핵심 구성요소**
  * **API Gateway** : 클라이언트의 단일 진입점(Single Entry Point). 라우팅, 인증/인가, 로드밸런싱,  
    Rate Limiting 등 공통 관심사를 처리 (Spring Cloud Gateway)
  * **Service Discovery** : 동적으로 변하는 서비스 인스턴스의 위치(IP/Port)를 등록/조회하는 메커니즘 (Eureka, Consul)
  * **Config Server** : 여러 서비스의 설정을 중앙에서 관리 (Spring Cloud Config)
  * **분산 추적(Distributed Tracing)** : 여러 서비스를 거치는 요청에 TraceId를 부여해 흐름을 추적

## 장애 대응 패턴

* **장애 대응 패턴 (Resilience)**
  * **Circuit Breaker(서킷 브레이커)** : 특정 서비스 호출의 실패율이 임계치를 넘으면 회로를 열어(Open) 호출을 즉시 차단하고,  
    장애가 연쇄적으로 전파되는 것을 막는 패턴. Closed → Open → Half-Open 상태로 동작한다 (Resilience4j, Hystrix)
  * **Bulkhead(벌크헤드)** : 자원(스레드 풀, 커넥션 등)을 격리해 한 서비스의 장애가 전체 자원을 고갈시키지 않도록 막는 패턴
  * **Retry / Timeout / Fallback** : 일시적 오류에 대한 재시도, 무한 대기를 막는 타임아웃, 실패 시 대체 응답 제공

## 이벤트 기반 설계

* **CQRS (Command Query Responsibility Segregation)** : 명령(CUD)과 조회(Read)의 모델을 분리하는 패턴.  
  쓰기 모델과 읽기 모델을 분리해 각각 독립적으로 최적화/확장할 수 있다. 조회 성능 극대화를 위해 별도의 읽기 전용 저장소나 뷰 모델을 두기도 한다. 흔히 **Event Sourcing**과 함께 사용된다.
  * **Event Sourcing** : 현재 상태가 아니라 상태를 변경시킨 이벤트(사건)들을 순서대로 저장하고, 이벤트를 재생(Replay)하여 상태를 복원하는 방식.  
    이력 추적과 감사(Audit)에 유리하다.


* **Transactional Outbox 패턴** : DB 업데이트와 메시지 발행을 하나의 로컬 트랜잭션으로 묶어 처리하는 패턴.  
  비즈니스 데이터와 함께 Outbox 테이블에 메시지를 저장하고, 별도의 릴레이 프로세스(또는 CDC)가 Outbox 테이블을 읽어 메시지 브로커로 전달한다. "DB 커밋은 됐는데 메시지 발행은 실패"하는 이중 쓰기(Dual Write) 문제와 메시지 유실을 방지한다.
  * **CDC (Change Data Capture)** : DB의 변경 로그(예: MySQL binlog)를 캡처해 이벤트로 전파하는 기법 (Debezium)

## 아키텍처 경계와 의존성

* **헥사고날 아키텍처 (Ports and Adapters)** : 비즈니스 로직을 외부 환경(DB, UI,  
  외부 API)으로부터 독립시키기 위해 인터페이스(Port)와 구현체(Adapter)를 사용하는 아키텍처. 의존성이 외부 → 도메인 방향으로만 향하도록 하여, 테스트 용이성과 기술 스택 교체에 유연하다. (클린 아키텍처와 유사한 지향점)

# 용어정리 – 메시지 브로커 및 이벤트 기반

## Kafka

* **메시지 브로커(Message Broker)** : 시스템 간 메시지를 비동기적으로 중계해주는 미들웨어.  
  생산자(Producer)와 소비자(Consumer)를 분리하여 **결합도를 낮추고(Decoupling)**, 일시적 부하를 완충(Buffering)하며, 트래픽 급증을 받아내는 역할을 한다.
  * **동기 통신 vs 비동기 메시징** : REST 같은 동기 호출은 응답을 기다리며 강하게 결합되지만,  
    메시징은 발행 후 즉시 반환되어 느슨하게 결합되고 장애 격리에 유리하다.


* **Kafka (Apache Kafka)** : 대용량 실시간 데이터 스트리밍을 위한 **분산 이벤트 스트리밍 플랫폼**.  
  메시지를 디스크에 로그(Append-only Log) 형태로 영구 저장하고, 높은 처리량(High Throughput)과 수평 확장에 강점이 있다. 단순 큐를 넘어 이벤트 소싱/로그 수집/스트림 처리에 널리 쓰인다.


* **Kafka 핵심 개념**
  * **Producer / Consumer** : 메시지를 발행하는 주체 / 구독하여 소비하는 주체
  * **Topic(토픽)** : 메시지가 저장되는 논리적 채널(카테고리)
  * **Partition(파티션)** : 토픽을 나눈 물리적 단위. 파티션 수만큼 병렬 처리가 가능해 처리량과 확장성의 핵심이다. **파티션 내에서는 순서가 보장**되지만,  
    토픽 전체의 순서는 보장되지 않는다.
  * **Offset(오프셋)** : 파티션 내 각 메시지의 고유한 순번. 소비자는 어디까지 읽었는지를 오프셋으로 관리(커밋)한다.
  * **Consumer Group(컨슈머 그룹)** : 같은 그룹의 컨슈머들이 파티션을 나눠 병렬 소비. 한 파티션은 그룹 내 하나의 컨슈머에만 할당된다.  
    (컨슈머 수 ≤ 파티션 수일 때 효율적)
  * **Broker / Cluster** : 메시지를 저장/전달하는 Kafka 서버 / 그 서버들의 집합
  * **Replication(복제)** : 파티션을 여러 브로커에 복제(Leader-Follower)하여 장애에 대비.  
    Leader가 읽기/쓰기를 담당하고 장애 시 Follower가 승격된다.
  * **ISR(In-Sync Replicas)** : Leader와 동기화 상태를 유지하는 Replica 목록.  
    `acks=all`은 ISR에 있는 Replica들이 기록을 확인해야 성공으로 응답한다.
  * **Zookeeper / KRaft** : 기존에는 Zookeeper가 메타데이터/리더 선출을 관리했으나, 최신 버전은 이를 제거한 **KRaft** 모드로 전환되고 있다.

## 메시지 전달 보장과 이벤트 처리

* **메시지 전달 보장(Delivery Semantics)**
  * **At-Most-Once** : 최대 한 번. 유실 가능성은 있으나 중복은 없음 (성능 우선)
  * **At-Least-Once** : 최소 한 번. 유실은 없으나 중복 가능 → **소비자의 멱등성(Idempotency) 처리 필요**. (가장 일반적)
  * **Exactly-Once** : 정확히 한 번. Kafka는 멱등 프로듀서와 트랜잭션으로 Kafka 내부의 consume-process-produce 흐름에서 정확히 한 번 처리를 지원할 수 있다. 단, 외부 DB/API까지 포함하면 별도의 멱등 처리나 트랜잭션 아웃박스 같은 패턴이 필요하다.


* **Kafka Producer 주요 설정**
  * **acks** : 브로커가 메시지를 저장했다고 응답하는 기준. `acks=0`은 빠르지만 유실 위험이 크고, `acks=all`은 ISR 복제까지 기다려 안정성이 높다.
  * **enable.idempotence** : 프로듀서 재시도 과정에서 중복 기록을 방지하는 옵션.
  * **key** : 같은 key를 가진 메시지는 같은 파티션으로 전송되어 해당 파티션 안에서 순서가 보장된다.


* **멱등성(Idempotency)** : 같은 메시지를 여러 번 처리해도 결과가 동일하도록 보장하는 것. At-Least-Once 환경에서 중복 소비에 대비해 필수적이며,  
  메시지 고유 ID 기반 중복 체크나 Upsert 등으로 구현한다.


* **순서 보장** : 순서가 중요한 메시지는 동일한 Key를 사용해 같은 파티션으로 보내면 순서가 보장된다. (예: 주문ID를 Key로 사용)


* **중복과 순서 처리 기준** : Kafka는 보통 At-Least-Once로 운영하므로 중복 소비를 전제로 소비자를 멱등하게 만들어야 한다.  
  메시지 ID로 처리 이력을 저장하거나 upsert를 사용해 같은 메시지를 여러 번 처리해도 결과가 같게 만든다. 순서가 중요한 이벤트는 같은 key를 사용해 같은 파티션으로 보내야 하며, 순서는 파티션 내부에서만 보장된다.


* **Offset 커밋과 재처리** : DB 저장 같은 부수 효과를 먼저 완료하고 offset을 커밋하면,  
  커밋 전 장애 시 메시지가 재전달될 수 있으므로 소비자는 멱등해야 한다. 반대로 offset을 먼저 커밋하면 처리 전 장애에서 메시지가 유실될 수 있다. 실패한 이벤트를 재처리할 때는 원본 토픽을 무작정 되감기보다, 처리 이력·재처리 범위·순서 영향·DLQ 복구 절차를 정하고 별도 consumer group 또는 재처리 토픽을 사용하는 편이 안전하다.


* **파티션 수와 순서의 트레이드오프** : 같은 key는 한 파티션에서 순서가 보장되지만, 특정 key에 트래픽이 몰리면 해당 파티션 하나가 병목이 된다.  
  파티션을 늘리면 병렬성은 증가하지만 key의 파티션 매핑이 바뀔 수 있어, 기존·신규 이벤트 사이의 전역 순서를 기대해서는 안 된다. 순서가 필요한 범위를 주문 ID처럼 최소 단위로 정하고, 순서가 필요 없는 이벤트는 분산 가능한 key를 사용한다.


* **메시징 모델**
  * **Point-to-Point (Queue)** : 하나의 메시지를 하나의 소비자만 처리. 작업 분산(Work Queue)에 적합.
  * **Publish-Subscribe (Topic)** : 하나의 메시지를 구독한 모든 소비자가 수신. 이벤트 브로드캐스트에 적합.


* **Kafka vs RabbitMQ** : 둘 다 대표적인 메시지 브로커지만 지향점이 다르다.
  * **Kafka** : 로그 기반, 높은 처리량과 데이터 보존(재처리 가능)에 강점. 대용량 스트리밍/이벤트 소싱에 적합.  
    Consumer가 offset을 관리하며 Pull 방식으로 가져간다.
  * **RabbitMQ** : 전통적인 메시지 큐(AMQP). 복잡한 라우팅과 낮은 지연, 메시지 단위 처리에 강점.  
    메시지는 consumer ack 이후 큐에서 제거되는 것이 일반적이며, prefetch/QoS로 소비 속도를 제어한다.


* **DLQ (Dead Letter Queue)** : 정해진 횟수만큼 재시도해도 처리에 실패한 메시지를 별도 큐로 보내 격리/분석하는 메커니즘.  
  실패 메시지가 전체 처리를 막는 것을 방지한다.


* **이벤트 기반 아키텍처(EDA, Event-Driven Architecture)** : 서비스 간 상태 변화를 **이벤트**로 발행/구독하여 통신하는 아키텍처.  
  MSA에서 서비스 간 결합도를 낮추고 비동기 확장성을 확보하는 데 활용되며, 앞서 다룬 [Saga, Transactional Outbox, CQRS](#용어정리--아키텍처-및-분산-시스템)와 함께 자주 등장한다.

# 용어정리 – 기타

## API 설계와 HTTP

* **REST API** : 자원(Resource)을 URI로 식별하고, HTTP 메서드로 자원에 대한 행위를 표현하는 API 설계 스타일.  
  핵심은 URI를 동사보다 **명사 중심**으로 잡고, 행위는 GET/POST/PUT/PATCH/DELETE 같은 메서드 의미에 맡기는 것이다.


* **REST API 주요 요소**
  * **자원(Resource)** : `/users`, `/orders/1`처럼 URI로 식별되는 대상
  * **표현(Representation)** : JSON, XML, HTML 등 클라이언트와 서버가 주고받는 자원의 형태
  * **무상태성(Stateless)** : 서버가 요청 간 클라이언트 상태를 저장하지 않고, 각 요청이 필요한 정보를 포함해야 한다.
  * **HATEOAS** : 응답에 다음 행동 링크를 포함해 클라이언트가 상태 전이를 따라가게 하는 제약. 실무 API에서는 필수로 적용하지 않는 경우도 많다.


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


* **재시도 가능한 명령 API** : 네트워크 timeout은 서버 처리 실패를 의미하지 않는다.  
  생성·결제 같은 `POST` 명령에는 멱등성 키를 받아 요청 상태와 결과를 저장하고, 같은 키로 재시도되면 동일 결과를 반환한다. 키가 같지만 본문이 다르면 오류로 처리하며, 저장 기간과 정리 정책을 정한다. HTTP 메서드의 멱등성만으로 업무 동작의 중복 실행이 방지되는 것은 아니다.


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


* **REST 성숙도 모델(Richardson Maturity Model)** : REST 스타일을 어느 정도 따르는지 단계로 나눈 모델
  * **Level 0** : HTTP를 단순 전송 통로로만 사용 (단일 URI, POST 위주)
  * **Level 1** : 자원(Resource)별로 URI를 분리
  * **Level 2** : HTTP 메서드(GET/POST/PUT/DELETE)와 상태 코드를 규약대로 사용 (대부분의 현실 REST API가 이 단계)
  * **Level 3** : HATEOAS까지 적용해 응답에 다음 행동 링크를 포함

## 테스트 전략

* **단위 테스트(Unit Test)** : 하나의 클래스나 함수 단위로 빠르게 검증한다. 외부 의존성은 mock/fake로 대체하고,  
  비즈니스 규칙과 예외 케이스를 촘촘히 확인하는 데 적합하다.


* **통합 테스트(Integration Test)** : Spring Context, DB, 외부 인프라 연동까지 포함해 실제 동작을 검증한다. Repository,  
  Transaction, Serialization, Security 설정처럼 단위 테스트로 놓치기 쉬운 부분을 확인한다.


* **테스트 대역(Test Double)** : Mock은 호출 여부와 상호작용 검증에, Fake는 간단한 동작 구현체로 상태 기반 검증에 적합하다.  
  과도한 mock은 리팩터링에 취약하므로 핵심 도메인 로직은 가능하면 상태 기반 테스트로 검증하는 편이 좋다.


* **Testcontainers** : 실제 DB, Redis, Kafka 등을 컨테이너로 띄워 테스트하는 방식. 운영과 유사한 환경에서 검증할 수 있어 신뢰도가 높지만,  
  실행 시간이 길어질 수 있으므로 핵심 통합 테스트에 선별적으로 사용한다.

## 객체지향과 디자인 패턴

* **SOLID(객체지향 5대원칙)**
  * **SRP(단일책임원칙)** 모든 클래스는 하나의 책임을 갖는다. 클래스는 그 책임을 완전히 캡슐화해야 한다.
  * **OCP(개방-폐쇄 원칙)** 확장에는 열려 있어야 하고, 수정에 대해서는 닫혀 있어야 한다.
  * **LSP(리스코프 치환 원칙)** 상위 타입의 객체를 하위 타입의 객체로 치환해도 상위 타입을 사용하는 프로그램은 정상적으로 동작해야 한다.
  * **ISP(인터페이스 분리 원칙)** 큰 덩어리의 인터페이스를 구체적으로 작은 단위로 분리시켜, 꼭 필요한 메서드만 사용하게 한다.
  * **DIP(의존관계 역전 원칙)** 상위 모듈은 하위 모듈에 의존하지 않고, 상위 모듈과 하위 모듈 모두 추상화에 의존해야 한다.


* **디자인 패턴**
  * **생성 패턴(Creational Pattern)**
    * **Singleton(싱글톤 패턴)** : 하나의 클래스 인스턴스를 전역에서 접근 가능하게 하면서 해당 인스턴스가 한 번만 생성되도록 보장하는 패턴
    * **Factory Method(팩토리 메서드 패턴)** : 객체를 생성하기 위한 인터페이스를 정의하고, 서브클래스에서 어떤 클래스의 인스턴스를 생성할지 결정하는 패턴
    * **Abstract Factory(추상 팩토리 패턴)** : 관련된 객체들의 집합을 생성하는 인터페이스를 제공하며,  
      구체적인 팩토리 클래스를 통해 객체 생성을 추상화하는 패턴
    * **Builder(빌더 패턴)** : 복잡한 객체의 생성 과정을 단순화하고, 객체를 단계적으로 생성하며 구성하는 패턴
    * **Prototype(프로토타입 패턴)** : 객체를 복제하여 새로운 객체를 생성하는 패턴으로, 기존 객체를 템플릿으로 사용하는 패턴

  * **구조 패턴(Structural Pattern)**
    * **Adapter(어댑터 패턴)** : 인터페이스 호환성을 제공하지 않는 클래스를 사용하기 위해 래퍼(Wrapper)를 제공하는 패턴
    * **Bridge(브릿지 패턴)** : 추상화와 구현을 분리하여 두 가지를 독립적으로 확장할 수 있는 패턴
    * **Composite(컴포지트 패턴)** : 개별 객체와 복합 객체를 동일하게 다루어, 트리 구조의 객체를 구성하는 패턴
    * **Decorator(데코레이터 패턴)** : 객체에 동적으로 새로운 기능을 추가하여 객체를 확장할 수 있는 패턴
    * **Facade(퍼사드 패턴)** : 서브시스템을 더 쉽게 사용할 수 있도록 단순한 인터페이스를 제공하는 패턴
    * **Flyweight(플라이웨이트 패턴)** : 공유 가능한 객체를 통해 메모리 사용을 최적화하는 패턴
    * **Proxy(프록시 패턴)** : 다른 객체에 대한 대리자(Proxy)를 제공하여 접근 제어, 지연 로딩 등을 구현하는 패턴

  * **행위 패턴(Behavioral Pattern)**
    * **Observer(옵저버 패턴)** : 객체 간의 일대다 종속 관계를 정의하여 한 객체의 상태 변경이 다른 객체들에게 알려지도록 한다.
    * **Strategy(전략 패턴)** : 알고리즘을 정의하고, 실행 중에 선택할 수 있게 한다.
    * **Command(커맨드 패턴)** : 요청을 객체로 캡슐화하여 요청을 매개변수화 하고, 요청을 큐에 저장하거나 로깅하고 실행을 지연시킨다.
    * **State(상태 패턴)** : 객체의 상태를 캡슐화하고, 상태 전환을 관리한다.
    * **Chain of Responsibility(책임 연쇄 패턴)** : 요청을 보내는 객체와 이를 처리하는 객체를 분리하여, 다양한 처리자 중 하나가 요청을 처리한다.
    * **Visitor(방문자 패턴)** : 객체 구조를 순회하면서 다양한 연산을 수행할 수 있게 한다.
    * **Interpreter(인터프리터 패턴)** : 언어나 문법에 대한 해석기를 제공하여, 주어진 언어로 표현된 문제를 해결하는 패턴
    * **Memento(메멘토 패턴)** : 객체의 내부 상태를 저장하고 복원할 수 있는 기능을 제공하는 패턴
    * **Mediator(중재자 패턴)** : 객체 간의 상호 작용을 캡슐화하여, 객체 간의 직접적인 통신을 방지하는 패턴
    * **Template Method(템플릿 메서드 패턴)** : 알고리즘의 구조를 정의하면서 하위 클래스에서 각 단계의 구현을 제공하는 디자인 패턴
    * **Iterator(이터레이터 패턴)** : 컬렉션 내의 요소들에 접근하는 방법을 표준화하여 컬렉션의 내부 구조에 독립적으로 접근할 수 있는 패턴

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


* **컨텍스트 스위칭(Context Switching)** : CPU가 현재 실행 중인 프로세스/스레드를 잠시 멈추고 다른 것을 실행하기 위해 상태를 교체하는 작업.
  * **과정** : 실행 중이던 작업의 상태(레지스터, 프로그램 카운터 등)를 PCB(Process Control Block)에 저장하고,  
    다음에 실행할 작업의 상태를 PCB에서 복원한다.
  * **비용** : 상태 저장/복원 자체의 오버헤드에 더해, 프로세스 전환 시 주소 공간 변경으로 캐시·TLB 미스가 늘 수 있다. 최신 CPU의 ASID/PCID 같은 기능은 TLB flush 비용을 줄일 수 있다.
    같은 프로세스 내 스레드 전환은 메모리 공간(주소 공간)을 공유하므로 상대적으로 비용이 적다.


* **선점 스케줄링** : 하나의 프로세스가 CPU를 차지하고 있을 때, 우선순위가 높은 다른 프로세스가 현재 프로세스를 중단시키고 CPU를 점유하는 스케줄링 방식
  * **라운드로빈(RR)**: 각 프로세스는 같은 크기의 CPU를 할당 받고 선입선출에 의해 실행된다. 할당시간이 너무 크면 선입선출처럼 동작하고 너무 짧으면 오버헤드가 발생
  * **SRT** : 짧은 시간동안 순서대로 프로세스를 수행한다. 남은 처리시간이 더 짧은 프로세스가 들어오면 해당 프로세스가 바로 선점된다.
  * **다단계 큐**: Ready큐를 여러 개 사용하는 기법, 각 큐는 자신의 스케줄링 알고리즘을 수행하며 큐와 큐 사이에도 우선순위가 있다.


* **비선점 스케줄링** : 프로세스가 CPU를 할당 받으면 해당 프로세스가 완료될 때까지 CPU를 사용한다. 프로세스 응답 시간 예측이 용이하며, 일괄 처리 방식에 적합
  * **우선순위** : 각 프로세스 별로 우선순위가 주어지고, 우선순위에 따라 CPU를 할당
  * **FIFO** : 프로세스들은 Ready 큐에 도착한 순서대로 CPU를 할당 받는다. 작업 완료 예측이 용이.
  * **SJF** : 큐 안에 있는 프로세스 중 수행 시간이 짧은 것을 먼저 수행, 평균 대기시간을 감소
  * **HRN** : 긴 작업 시간과 짧은 작업시간의 불평등을 어느정도 보장, 수행시간의 길이와 대기시간을 모두 고려하여 우선순위를 정함


* **가상 메모리(Virtual Memory)** : 실제 물리 메모리(RAM)보다 큰 메모리를 사용할 수 있도록, 각 프로세스에 독립적인 논리 주소 공간을 제공하는 기법.  
  당장 필요한 부분만 물리 메모리에 올리고 나머지는 디스크(Swap 영역)에 두어, 메모리를 효율적으로 활용하고 프로세스 간 메모리를 격리한다.
  * **페이징(Paging)** : 논리 메모리를 고정 크기의 **페이지(Page)**, 물리 메모리를 같은 크기의 **프레임(Frame)**으로 나누어 매핑하는 방식.  
    외부 단편화가 없으나 내부 단편화가 발생할 수 있다. (주소 변환은 페이지 테이블, 가속은 TLB가 담당)
  * **세그멘테이션(Segmentation)** : 메모리를 코드/데이터/스택 등 **논리적 의미 단위(가변 크기 세그먼트)**로 나누는 방식.  
    논리적 분할에 유리하나 외부 단편화가 발생한다.
  * **페이지 폴트(Page Fault)** : 접근하려는 페이지가 물리 메모리에 없을 때 발생하는 인터럽트.  
    운영체제가 디스크(Swap)에서 해당 페이지를 메모리로 적재(Page-in)한 뒤 다시 실행한다. 페이지 폴트가 너무 잦아 디스크 I/O에만 시간을 쏟는 상황을 **스래싱(Thrashing)**이라 한다.


* **동기/비동기, 블로킹/논블로킹** : 두 기준은 다른 관점이다. 동기/비동기는 **작업 완료(결과)를 누가 확인/처리하는가(관심사·순서)**,  
  블로킹/논블로킹은 **호출한 쪽이 제어권을 돌려받는가(대기 여부)** 를 따진다. 네 가지 조합이 가능하다.
  * **동기 + 블로킹** : 호출 후 결과가 나올 때까지 대기하고, 결과를 직접 받아 처리한다. (일반적인 함수 호출, `Future.get()`)
  * **동기 + 논블로킹** : 호출은 바로 반환되지만(제어권 회수), 호출한 쪽이 완료 여부를 계속 확인(polling)하며 결과를 직접 챙긴다.
  * **비동기 + 블로킹** : 작업 처리는 다른 곳에 맡기지만 결과를 기다리며 대기. (잘 쓰이지 않는 비효율적 조합)
  * **비동기 + 논블로킹** : 호출은 바로 반환되고, 작업이 끝나면 콜백/이벤트로 결과를 통지받는다. I/O 대기가 많은 작업에 유리하지만, 작업 특성과 코드 복잡도를 함께 고려해야 한다. (CompletableFuture 콜백,
    Node.js, NIO 등)


* **스레드 안전(Thread-Safety)** : 여러 스레드가 동시에 접근할 수 있는 자원이나 코드 블록이 안전하게 동작할 수 있도록 하는 개념입니다.  
  스레드 안전성을 확보하지 않으면, 데이터의 일관성이 깨지거나 예상치 못한 결과가 발생할 수 있다.
  * **Critical Section (임계 구역)** : 여러 스레드가 동시에 접근하면 문제가 발생할 수 있는 코드 블록이나 자원, 이 부분에서는 스레드 간의 동기화가 필요
  * **Race Condition (경쟁 상태)** : 두 개 이상의 스레드가 동시에 자원에 접근하려고 할 때, 결과가 스레드의 실행 순서에 따라 달라지는 상태,  
    이로 인해 예기치 않은 동작이 발생할 수 있다.
  * **Mutual Exclusion (상호 배제)** : 임계 구역에 동시에 여러 스레드가 접근하지 못하도록 하는 메커니즘, 이를 위해 주로 락(Lock)을 사용


* **Thread-Safety를 위한 주요 기법**
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


* **인터럽트(Interrupt)** : CPU가 현재 작업을 잠시 중단하고 특정 이벤트를 먼저 처리하도록 알리는 신호. 처리 후에는 원래 작업으로 복귀한다.
  * **하드웨어 인터럽트** : 입출력 장치, 타이머 등 외부 하드웨어가 발생시키는 비동기 신호 (키보드 입력, 디스크 완료 등)
  * **소프트웨어 인터럽트(트랩, Trap)** : 프로그램 실행 중 내부에서 발생 (시스템 콜, 0으로 나누기 같은 예외 등)
  * **ISR(Interrupt Service Routine)** : 인터럽트가 발생했을 때 실행되는 처리 루틴(핸들러)

# 용어정리 – 컨테이너 및 오케스트레이션

## Docker

* **Docker** : 애플리케이션과 실행 환경을 컨테이너로 패키징해 어디서나 동일하게 실행하도록 돕는 플랫폼이다.


* **컨테이너 vs 가상머신(VM)** : VM은 Hypervisor 위에 Guest OS 전체를 띄우는 반면,  
  컨테이너는 **호스트 OS의 커널을 공유**하고 프로세스 수준으로 격리한다. 따라서 컨테이너는 OS를 포함하지 않아 가볍고, 부팅이 빠르며, 자원 효율이 높다.
  * 리눅스 커널의 **namespace(자원 격리)**와 **cgroup(자원 제한)** 기술을 기반으로 격리를 구현한다.


* **Docker 핵심 개념**
  * **Image(이미지)** : 컨테이너 실행에 필요한 파일과 설정을 담은 읽기 전용 템플릿. 변경 불가능(Immutable)하다.
  * **Container(컨테이너)** : 이미지를 실행한 인스턴스. 이미지 위에 쓰기 가능한 레이어가 올라간 상태.
  * **Dockerfile** : 이미지를 만드는 빌드 절차를 코드로 정의한 파일 (FROM, RUN, COPY, CMD, ENTRYPOINT 등)
  * **Layer(레이어)** : 이미지는 여러 읽기 전용 레이어로 구성되며, 변경된 레이어만 다시 빌드/전송하므로 캐싱과 재사용에 효율적이다.
  * **Registry(레지스트리)** : 이미지를 저장/공유하는 저장소 (Docker Hub, ECR, Harbor)
  * **Volume(볼륨)** : 컨테이너는 삭제되면 데이터가 사라지므로(Ephemeral), 데이터를 영속적으로 보관하기 위해 호스트나 별도 저장소에 마운트하는 메커니즘

## Kubernetes

* **Kubernetes (K8s)** : 컨테이너 오케스트레이션 플랫폼. 원하는 상태를 선언하면 컨트롤러가 현재 상태를 조정해 배포, 스케일링, 복구를 자동화한다.


* **컨테이너 오케스트레이션(Orchestration)** : 다수의 컨테이너를 여러 서버에 걸쳐 배포/확장/관리/복구하는 것을 자동화하는 것.  
  컨테이너 수가 많아지면 수동 관리가 불가능하기 때문에 필요하다. 대표 도구가 **Kubernetes(K8s)**.


* **K8s 핵심 오브젝트**
  * **Pod(파드)** : 배포의 최소 단위. 하나 이상의 컨테이너를 묶은 그룹으로, 같은 Pod 내 컨테이너는 네트워크(IP)와 볼륨을 공유한다.  
    Pod는 언제든 죽고 재생성될 수 있어 IP가 고정되지 않는다(그래서 Service가 필요).
  * **ReplicaSet** : 지정한 수의 Pod 복제본이 항상 유지되도록 관리
  * **Deployment** : ReplicaSet을 관리하며 **롤링 업데이트/롤백** 등 배포 전략을 제공하는 상위 오브젝트
  * **Service** : 동적으로 변하는 Pod들에 대한 **고정된 접근 지점(가상 IP)**과 로드밸런싱을 제공
    * **ClusterIP** : 클러스터 내부 통신용 (기본값)
    * **NodePort** : 각 노드의 특정 포트로 외부 노출
    * **LoadBalancer** : 클라우드 로드밸런서와 연동해 외부 노출
  * **Ingress** : L7(HTTP/HTTPS) 레벨에서 도메인/경로 기반 라우팅을 제공하는 외부 진입점
  * **ConfigMap / Secret** : 설정값(ConfigMap)과 민감 정보(Secret)를 컨테이너 이미지와 분리해 주입. Secret은 기본적으로 Base64 인코딩이므로, etcd 암호화·RBAC·외부 Secret Manager를 함께 검토한다.
  * **Namespace** : 클러스터 내 자원을 논리적으로 분리하는 단위
  * **Volume / PV / PVC** : 영속 스토리지. **PV(PersistentVolume)**는 실제 저장소,  
    **PVC(PersistentVolumeClaim)**는 사용자가 요청하는 스토리지 요청서


* **K8s 아키텍처**
  * **Control Plane (Master)** : 클러스터를 관리/제어하는 두뇌
    * **API Server** : 모든 요청의 단일 진입점, 클러스터와의 통신 창구
    * **etcd** : 클러스터의 모든 상태/설정을 저장하는 분산 Key-Value 저장소
    * **Scheduler** : 새로운 Pod를 어느 Node에 배치할지 결정
    * **Controller Manager** : 현재 상태를 원하는 상태로 맞추는 컨트롤러들을 실행
  * **Worker Node** : 실제 컨테이너(Pod)가 실행되는 서버
    * **Kubelet** : 노드에서 Pod가 정상 동작하도록 관리하는 에이전트
    * **Kube-proxy** : Pod 간/외부 네트워크 통신 및 로드밸런싱 처리
    * **Container Runtime** : 실제 컨테이너를 실행 (containerd 등)


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


* **이미지 최적화**
  * **Multi-stage Build** : 빌드 단계와 실행 단계를 분리해, 최종 이미지에는 실행에 필요한 산출물만 포함시켜 이미지 크기를 줄이는 기법
  * **경량 베이스 이미지** : alpine, distroless 등 작은 베이스 이미지를 사용해 용량과 공격 표면을 줄임
  * **레이어 캐시 활용** : 자주 바뀌지 않는 의존성 설치를 앞 레이어에 두어 캐시 적중률을 높임 (예:  
    `COPY pom.xml` → 의존성 다운로드 → `COPY src`)


* **Docker Compose** : 여러 컨테이너로 구성된 애플리케이션을 하나의 YAML 파일(`docker-compose.yml`)로 정의하고 한 번에 실행/관리하는 도구.  
  주로 로컬 개발 환경 구성에 사용된다.

# 용어정리 – Spring AI

* **Spring AI** : 스프링 진영에서 제공하는 AI 애플리케이션 개발 프레임워크. LLM(OpenAI, Anthropic Claude, Azure,  
  Vertex AI 등) 연동을 **PSA(추상화)** 방식으로 일관되게 제공하여, 특정 벤더에 종속되지 않고(Portable) 모델을 교체할 수 있게 한다. (Python의 LangChain과 유사한 역할)


* **Spring AI 핵심 개념**
  * **ChatClient / ChatModel** : LLM과 대화(프롬프트 요청/응답)하기 위한 추상화 인터페이스. 모델 구현체만 바꿔 끼우면 된다.
  * **Prompt / PromptTemplate** : 모델에 보내는 입력. 템플릿에 변수를 주입해 동적으로 프롬프트를 구성한다.
  * **Structured Output** : LLM의 응답(텍스트)을 자바 객체(POJO)나 JSON 등 구조화된 형태로 변환해주는 기능. (OutputConverter)
  * **Embedding** : 텍스트를 의미를 담은 벡터(숫자 배열)로 변환하는 것. 유사도 검색의 기반이 된다.
  * **Vector Store(벡터 저장소)** : 임베딩된 벡터를 저장하고 유사도 기반으로 검색하는 저장소 (Redis, PGVector, Chroma 등)


* **RAG (Retrieval-Augmented Generation, 검색 증강 생성)** :  
  LLM이 학습하지 않은 최신/사내 데이터를 외부 저장소(Vector Store)에서 검색해 프롬프트에 함께 제공함으로써, 환각(Hallucination)을 줄이고 정확도를 높이는 기법. 문서를 임베딩해 저장 → 질문과 유사한 문서 검색 → 검색 결과를 컨텍스트로 LLM에 전달하는 흐름이다.


* **Function Calling (Tool Calling)** : LLM이 직접 처리할 수 없는 작업(DB 조회, 외부 API 호출 등)을,  
  미리 등록한 함수(Tool)를 호출하도록 위임하는 기능. Spring AI에서는 빈으로 등록한 함수를 모델이 필요 시 호출하게 할 수 있다.


* **MCP (Model Context Protocol)** : LLM 애플리케이션이 외부 데이터/도구와 표준화된 방식으로 연동하기 위한 프로토콜.  
  Spring AI도 MCP 클라이언트/서버를 지원한다.
