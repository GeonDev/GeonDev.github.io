---
layout: post
title: 트러블슈팅 - 트래픽이 급격하게 늘어났을때 해결방법(JPA + MSSQL) 
date: 2023-04-16
Author: Geon Son
categories: Project
tags: [JPA, MSSQL, MySQL, NOLOCK, Transaction, HikariCP, Isolation]
comments: true
toc: true
---

아이돌에 투표하는 이벤트 방송의 투표 시스템을 만들게 되었다. 기존에는 메인 프로젝트 안에서 컨트롤러를 추가해서 개발했는데 이번에는 작은 시스템이기도 하고 제작진에서 시스템분리를 적극적으로 원해서 아예 별도의 마이크로 시스템으로 시스템을 변경하게 되었다.  

간단한 거라고 생각했던 시스템에서 여러가지 문제가 생겼는데 매크로를 사용해서 1ms 차이로 투표를 해버리거나 계정 시스템을 악용해서 혼자 3000개의 계정을 만들어 중복 투표를 하거나 4주동안 브라우저를 계속 켜놓아서 캐싱 이상이 발생하는 등 다양한 문제가 있었다.
그중에서 가장 큰 문제는 **방송 직후 한번에 몰려오는 트래픽 이슈** 였다. 

# 투표 시스템 개요

간단하게 투표 시스템을 어떻게 구현했는지 확인을 해보면 다음 그림과 같은 순서로 진행된다. 
각 칸에 색상은 조회/저장시 사용하는 테이블이 같은 경우를 표시한다. 

![투표 처리 순서도](/images/spring/asdf78524nopgqg.png)

투표 기간 중 투표를 하게 되면 해당 투표의 정보를 불러와서 현재 투표 기간, 투표 조건 등을 체크 하고 
투표 내역이 저장된 리스트에서 내역을 불러와서 중복으로 들어온 투표 인지 확인한다. 
중복투표가 아니라면 들어온 정보가 유효한 투표 항목인지 체크를 하고 최종적으로 투표를 저장한다.

로직상 특별한 것은 크게 보이지 않는다. 같은 테이블을 사용하였다고는 하지만 보통의 경우는 select와 insert가
서로 겹치는 일은 거의 없어 보인다. select를 하면서 lock이 걸리는 경우가 발생하지도 않을 것 같고 연산 속도가 느려서 락이 발생하는 경우는 거의 없어 보이긴 한다. 실제로 대부분의 상황에서는 문제가 없었다  

![투표 조회와 저장에서 같은 테이블을 사용하는 구조](/images/spring/38hgd496mlhdegf.png)

문제는 항상 공통적으로 발생했다. 멤버십의 토큰을 갱신하는 시기와 메인 서버에서 방송 시스템을 집계하는 시기와 방송에서 투표를 시작하는 시기가 모두 겹친다. 이 시스템들이 사용하는 DB는 물리적으로 분리되어 있지 않고 집계와 투표는 모두 동일한 DB를 사용하고 있었다. 순간적으로 DB가 느려지고 트래픽이 순간 몰리면서 락이 발생하게 되었다.

# 트러블 슈팅 과정

## MSSQL with(nolock) 설정 

MSSQL은 기본 격리 수준인 READ COMMITTED에서 select를 수행할때도 공유락(shared lock)을 잡는다. 이건 모든 DBMS의 공통 동작이 아니다. 같은 READ COMMITTED라도 MySQL(InnoDB)은 일반 SELECT가 락을 잡지 않고 언두 로그 기반의 스냅샷을 읽는 MVCC(consistent nonlocking read) 방식이라, 읽기와 쓰기가 서로를 막지 않는다. InnoDB에서 락을 잡는 읽기는 `SELECT ... FOR UPDATE / FOR SHARE`로 명시했을 때뿐이다.

이 차이 때문에 MySQL에서는 아무 문제 없던 "조회 → 검증 → 저장" 패턴이 MSSQL로 오면 트래픽이 몰릴 때 읽기가 쓰기에 막히는 락 경합으로 나타난다. 반대로 말하면 이 글의 NOLOCK·격리 수준 튜닝은 MSSQL 특화 이야기라 MySQL에서는 따라할 이유가 없다.

그래서 select를 할때마다 with(nolock)를 설정하는 방법을 검토했다. 문제는 **JPA에서는 어떻게 설정해야 되느냐** 하는 것이었다. jpa에도 DB마다 방언을 설정하는 옵션이 존재하긴 하지만 그렇다고 모든 옵션을 제공하지 않는다.
with(nolock)을 대신하는 옵션으로
~~~java
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
~~~
이라는 설정을 걸수 있다. 트랜잭션 격리 레벨을 낮추어서 with(nolock)과 비슷한 효과를 나타나게 하는 방법이다.

하지만 해당 설정을 아무리 걸어도 **실제 수행되는 쿼리에는 with(nolock)이 출력되지 않는다.** 효과가 없다고 단언할수는 없지만 위에 설정을 추가하는 정도로는 개선되는 포인트가 없었다. READ_UNCOMMITTED 격리 수준은 SQL Server에서 NOLOCK과 유사한 동작을 하긴 하지만, 쿼리에 `WITH (NOLOCK)` 힌트를 직접 붙이는 것과 동일하지는 않다.

처음에는 레포지토리 메서드에 `@Lock(LockModeType.READ_UNCOMMITTED)`를 걸면 되지 않을까 생각했는데, 이건 애초에 컴파일이 되지 않는다. JPA `LockModeType` enum에는 `NONE`, `READ`/`WRITE`, `OPTIMISTIC*`, `PESSIMISTIC_READ/WRITE/FORCE_INCREMENT` 만 있고 `READ_UNCOMMITTED`라는 값은 없다.

 `READ_UNCOMMITTED`는 락 모드가 아니라 트랜잭션 격리 수준(`Isolation`)이기 때문이다. 따라서 메서드 단위로 NOLOCK 효과를 주려면 `@Lock`이 아니라, 네이티브 쿼리에 `WITH (NOLOCK)`을 직접 명시하거나 서비스 메서드에 `@Transactional(isolation = Isolation.READ_UNCOMMITTED)`를 거는 방식을 써야 한다. 이 프로젝트에서는 결국 뒤에 나오는 것처럼 네이티브 쿼리에 `WITH (NOLOCK)`을 붙이는 방식으로 해결했다.

NOLOCK이나 READ_UNCOMMITTED를 쓸 때는 dirty read라는 점을 반드시 알고 써야 한다. 아직 커밋되지 않은 데이터를 읽을 수 있고, 스캔 도중 page split이 일어나면 같은 행을 중복으로 읽거나 있어야 할 행을 건너뛸 수도 있다. 그래서 투표 집계나 중복투표 체크처럼 정확성이 핵심인 쿼리에 NOLOCK을 쓰면 카운트가 틀리거나 중복 투표가 허용될 수 있다. NOLOCK은 정확히 안 맞아도 되는 조회나 통계 표시용 쿼리에만 제한적으로 쓰고, 정합성이 중요한 경로에는 쓰지 않는 편이 안전하다.

### 더 나은 대안 — READ_COMMITTED_SNAPSHOT (RCSI)

SELECT가 공유락을 잡아 쓰기와 충돌하는 문제는, NOLOCK을 곳곳에 흩뿌리는 것보다 DB 레벨에서 RCSI(행 버전 관리)를 켜는 것으로 해결하는 편이 낫다.

RCSI를 켜면 읽기 시 공유락 대신 행의 스냅샷(버전)을 읽는다. 읽기와 쓰기가 서로를 막지 않으며, 커밋된 버전을 읽기 때문에 dirty read도 발생하지 않는다.

Oracle, PostgreSQL, MySQL(InnoDB)이 기본으로 쓰는 MVCC와 같은 계열의 방식이다. RCSI는 MSSQL의 `READ COMMITTED` 읽기를 행 버전 기반으로 바꿔 MSSQL과 MySQL의 락 방식 차이를 줄인다.

| 구분 | MVCC | SQL Server RCSI |
|---|---|---|
| 의미 | 여러 버전의 행을 이용하는 동시성 제어 방식 | MVCC 방식의 행 버전 관리를 `READ COMMITTED`에 적용하는 SQL Server 옵션 |
| 적용 범위 | DBMS 구현과 격리 수준에 따라 다름 | 해당 데이터베이스의 `READ COMMITTED` 트랜잭션 |
| 읽기 기준 시점 | DBMS와 격리 수준에 따라 문장 또는 트랜잭션 시작 시점 | 각 SQL 문이 시작된 시점 |
| 읽기·쓰기 충돌 | 일반 조회는 과거 버전을 읽어 쓰기와의 충돌을 줄임 | 일반 조회의 공유락을 행 버전 읽기로 대체 |
| 활성화 | MySQL InnoDB, PostgreSQL 등은 기본 동시성 제어 구조로 사용 | `READ_COMMITTED_SNAPSHOT ON`을 명시적으로 설정 |
| 버전 저장 비용 | DBMS별 undo 영역이나 별도 버전 저장 공간을 사용 | `tempdb`의 version store를 사용하므로 공간과 I/O 모니터링 필요 |
| dirty read | 격리 수준에 따라 달라지며 MVCC 자체가 격리 수준을 뜻하지는 않음 | 커밋된 버전만 읽으므로 dirty read가 발생하지 않음 |

~~~sql
ALTER DATABASE [DB명] SET READ_COMMITTED_SNAPSHOT ON;
~~~

RCSI는 해당 데이터베이스 전체에 영향을 주는 데이터베이스 레벨 설정이다. 당시에는 DB 설정을 바꿀 권한이 없어 애플리케이션에서 NOLOCK과 네이티브 쿼리로 대응했다.

DB 설정을 바꿀 수 있다면 쿼리마다 NOLOCK을 붙이기 전에 RCSI 적용을 DBA와 논의하는 편이 근본적인 해결에 가깝다.

레파지토리를 사용하는 모든 서비스에 트랜잭션을 선언하는 것은 비효율적인 일이기 때문에, 정합성이 중요하지 않은 조회라면 서비스 메서드 단위로 격리 수준을 지정할 수도 있다.

~~~java
@Transactional(isolation = Isolation.READ_UNCOMMITTED, readOnly = true)
public List<Entity> findAllForDisplay() {
    return entityRepository.findAll();
}
~~~



## 커넥션풀 개수 증가
스프링 프로젝트를 처음 생성하면 커넥션 풀의 개수는 10개이다. 트랜잭션 락이 처음 발생했을때 고려해볼 방법으로 커넥션 풀 개수를 늘려 처리하는 총량을 늘리는 방법이다. 

커넥션 풀을 결정하는 공식은 다음과 같다

**connections = (core_count * 2) + effective_spindle_count**

정확하지는 않지만 core_count는 CPU의 개수, effective_spindle_count는 하드디스크 개수(I/O 요청 수)라고 생각하면 된다. 커넥션풀 개수는 처음에 20개로 늘렸다가 추후에 100개로 올렸다.

사실 위 공식대로면 보통 10~20개 정도의 작은 값이 나온다. HikariCP 공식 문서도 풀은 작게 유지하라는 입장인데, 커넥션을 무작정 늘리면 DB 쪽 컨텍스트 스위칭과 락 경합이 오히려 커져 역효과가 날 수 있기 때문이다. 100개는 꽤 큰 편이고, 이 프로젝트의 순간 폭주 트래픽이라는 특수 상황에 맞춘 값이지 일반적인 권장치는 아니다. 결국 이런 수치는 환경마다 부하 테스트로 맞추는 것이 정석이다.

이후 풀이 이미 100개인 다른 시스템에서 같은 유형의 장애를 다시 겪었다. 풀 크기보다 **요청 1건이 커넥션을 몇 번 획득하는지**를 먼저 세어야 했다.

그 장애의 병목은 느린 쿼리가 아니었다. 요청마다 반복되는 검증·메타 조회 때문에 커넥션을 4~6회 순차 획득하는 구조가 문제였다. 성공한 쿼리 자체는 수 ms였지만, 풀이 마르면 획득 1회당 최대 30초(기본 connectionTimeout)를 기다렸다. 획득 6회짜리 요청은 두 번만 대기해도 60초가 걸린다.

응답 지연이 커넥션 체류시간을 늘리고, 풀 고갈이 사용자 재시도를 부르는 악순환이 시작됐다. 트래픽이 평시 수준으로 떨어진 뒤에도 실패가 한동안 지속되는 "붕괴" 상태는 풀 크기만으로 막을 수 없다.

풀을 더 늘리는 대신 반복 조회에 캐시를 붙여 획득 횟수를 줄였다. connectionTimeout도 30초에서 10초로 줄여 풀 소진 시 500 대신 503과 `Retry-After`를 반환하도록 바꿨다.

### 커넥션풀 개수 설정 및 확인

~~~yaml
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  hikari:  
    maximum-pool-size: 20
~~~
보통은 커넥션 풀을 설정할때 이렇게 hikari 아래에 설정한다. 문제는 이 프로젝트에서는 아무리 설정을 해도 커넥션 풀 개수가 늘어나지 않았다. 여러가지 시도를 해보다가 아래와 같이 hikari를 제거하고 직접 넣은 설정을 바꿨더니 문제를 해결할 수 있었다. 아마 멀티 DB를 사용하고 있어 발생한 일이 아닌가 싶다. 멀티 DB라서 DataSource 빈을 직접 만들고 `@ConfigurationProperties("...datasource")`로 바인딩했기 때문에, 그 prefix가 곧바로 `HikariDataSource`에 바인딩된다. 그래서 속성을 `maximum-pool-size`처럼 datasource 바로 아래에 두어야 했다. `spring.datasource.hikari.*` 라는 중첩 경로는 Spring Boot 자동 구성이 DataSource를 만들어줄 때만 동작한다.

~~~yaml
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  maximum-pool-size: 100
~~~

커넥션 풀의 개수를 확인하기 위해서는 로그 설정에 아래 내용을 추가한다. 
커넥션 풀 설정을 변경하였으면 1번은 체크 해보는 것을 추천한다.

~~~yaml
logging: 
	level: 
		com.zaxxer.hikari: TRACE 
		com.zaxxer.hikari.HikariConfig: DEBUG
~~~

위에 설정을 추가하고 커넥션풀 로그를 보면 

![](/images/spring/gbakdlu58nlfdgqe.png)

커넥션 풀의 총 개수가 설정한 것 처럼 변경되었다는 것을 확인할 수 있다. 커넥션의 개수를 늘려주니 트랜잭션 락이 발생했다는 경고는 출력되지 않았다.(첫번째 보다 트래픽이 줄어든 영향도 있었다.) 다만 처음처럼 여전히 API 속도는 튀어 올라서 API 로직을 테스트 하면서 변경하기 시작했다.

![](/images/spring/3gds05lkdg5gdh5.png)



### 타임아웃도 계층으로 걸어야 한다

붕괴 상태에서 빨리 회복하려면 "빨리 실패"가 전제인데, 돌아보니 문제가 됐던 시스템에는 풀 대기 30초(connectionTimeout 기본값) 말고는 시간 상한이 하나도 없었다. 커넥션을 잡은 요청이 몇 분씩 물고 있어도 끊어줄 장치가 없는 것이다. 그래서 요청이 거치는 각 구간마다 타임아웃을 계층으로 걸었다.

| 계층 | 설정 | 초과 시 |
|---|---|---|
| 풀 대기 | HikariCP `connectionTimeout` (30초 → 10초) | 예외 → 503 응답 |
| 물리 연결 | JDBC `loginTimeout` | 연결 실패 |
| 트랜잭션 전체 | `TransactionManager.setDefaultTimeout()` | 롤백 + 커넥션 반환 |
| 단일 쿼리 | JDBC `queryTimeout` | 쿼리 취소 |
| 소켓 read | JDBC `socketTimeout` | 커넥션 폐기 |

바깥 계층(풀 대기)은 짧게, 안쪽 계층(소켓)은 길게 잡는다. 핵심은 어떤 계층이 터지든 **커넥션이 풀로 돌아온다**는 보장이다. 특히 트랜잭션 타임아웃은 초과 시 롤백과 함께 커넥션을 반환하므로, 붕괴 구간에서 커넥션을 물고 늘어지는 요청을 강제로 정리해준다.

트랜잭션 타임아웃을 yml에 설정해 두고 적용되고 있다고 믿었지만 실제로는 죽은 키였다. DataSource 빈을 직접 만드는 구조에서는 `spring.datasource` 하위에 넣은 비-Hikari 속성이 조용히 무시됐다.

결국 `TransactionManager` 빈을 만들 때 `setDefaultTimeout()`으로 명시했다. 설정값은 파일에 존재하는지만 볼 것이 아니라 실제 바인딩 여부까지 확인해야 한다.

## AUTOCOMMIT 정지
autocommit의 디폴트 설정은 true이다. 오토커밋이 설정되어 있으면 select를 수행하는 과정에서 커밋 체크를 하는 과정이 발생하였다. 물론 수행시간은  길어도 100ms미만으로 실행되지만 트래픽이 몰리는 순간에서는 해당 설정도 제거하는 편이 좋다고 생각하였다. 

~~~yaml
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  maximum-pool-size: 100
  auto-commit : false
~~~

auto commit을 제거할때는 당연히 주의 사항이 생긴다. 커밋을 조절하지 않겠다는 것이기 때문에 별도로 커밋 명령어를 주어야 할것 같지만 실제 실행시에는 
~~~properties
hibernate.connection.provider_disables_autocommit=true
~~~
과 같은 하이버네이트의 별도 설정을 가지고 있기도 하고 save() 메소드 내부에 @Transactional이 선언되어 있고 persist 또는 merge를 수행한다. 물론 실제 적용시에는 테스트가 필요하다. 

~~~java
    @Transactional
    public <S extends T> S save(S entity) {
        if (this.entityInformation.isNew(entity)) {
            this.em.persist(entity);
            return entity;
        } else {
            return this.em.merge(entity);
        }
    }
~~~


### SAVE() /  SAVEALL() 메소드 속도

투표를 저장할때 1개만 저장하는 것이 아니기 때문에 두개 메소드를 고려해 봤다. 쿼리를 보면 둘다 개수만큼 insert를 수행하지만 속도를 테스트 해보면 **saveAll()** 메소드가 더 빠르다.
둘의 차이는 트랜잭션 경계에 있다. saveAll()은 메소드 자체에 @Transactional이 붙어 있어서 하나의 트랜잭션을 열고 그 안에서 save()를 반복 호출한다. 이때 내부의 save()는 새 트랜잭션을 만드는 것이 아니라 기본 전파 옵션(REQUIRED)에 따라 이미 열려 있는 트랜잭션에 그대로 참여한다. 반면 개별 save()를 각각 따로 호출하면, 바깥에 트랜잭션 경계가 없는 한 호출마다 트랜잭션이 새로 열리고 닫히기 때문에 그 오버헤드만큼 느려진다.

~~~java
    @Transactional
    public <S extends T> List<S> saveAll(Iterable <S> entities) {
	    Assert.notNull(entities, "Entities must not be null");

		List<S> result = new ArrayList<S>();

		for(S entity : entities){
				result.add(save(entity));
		}
		
		return result;
    }
~~~

이게 차이가 날까 싶기는 하지만 초당 500번 10분간 수행했을때  4000ms 정도 더 빠르게 수행되는 경우도 있었다.

### RESULT-SET-FETCH 최적화

스카우터로 쿼리를 보면서 이상한 점을 발견했다.

![](/images/spring/085ndfg3062.png)

(이 사진은 예시일뿐 실제 상황과는 다르다.  쿼리 순서와 수행내역만 동일한 예시이다)

쿼리 자체는 빠르게 끝났지만 `RESULT-SET-FETCH` 구간에서 시간이 늘어났다. DB에서 결과를 받은 뒤 애플리케이션 객체로 매핑하는 과정까지 포함된 시간으로 추정했다. 여기서 확인한 원인은 투표 이력 조회에 필요하지 않은 컬럼과 엔티티까지 함께 읽는 구조였다. 인덱스나 커넥션 풀 크기는 이 측정의 직접적인 대상이 아니었기 때문에, 조회 범위를 줄이는 것부터 시작했다.

투표 이력 확인에는 최근 이력의 존재 여부와 비교에 필요한 값만 있으면 됐다. 기존 JPA 조회는 엔티티 전체를 읽었기 때문에 네이티브 쿼리로 필요한 컬럼만 조회하도록 바꿨다.

JPA 환경에서 RESULT-SET-FETCH 시간을 줄이려고 먼저 DTO 프로젝션을 확인했다. 필요한 컬럼만 DTO로 조회하면 매핑 비용과 영속성 컨텍스트 적재 부담이 줄어든다. 네이티브 쿼리로 바꾼 것도 같은 맥락이다.

연관 엔티티의 지연 로딩 때문에 fetch 단계에 N+1 쿼리가 숨어 있을 수도 있다. 이 경우 fetch join이나 `@EntityGraph`로 조회 범위를 명시해야 한다.

대량 조회라면 `hibernate.jdbc.fetch_size`를 조정해 네트워크 왕복 횟수를 줄일 수 있다. 변경이 없는 조회에는 `readOnly = true`를 적용해 더티 체킹 스냅샷 생성 비용을 줄였다.

네이티브 쿼리로 변경할 때 위에서 사용한 **with(nolock)**도 함께 적용했다. `WITH (NOLOCK)` 같은 DB 힌트는 JPA가 생성하는 쿼리에 직접 붙이기 어렵다.

리포지토리 메서드에 격리 수준을 걸어도 지연 로딩 쿼리는 프록시를 터치하는 시점의 트랜잭션에서 실행된다. 이 때문에 의도한 설정을 비껴갈 수 있다. 힌트가 꼭 필요한 조회는 쿼리를 직접 제어하는 네이티브 쿼리로 작성했다.

정리하면 이 변경이 효과가 있었던 이유는 세 가지가 겹친 것이다. 필요한 컬럼만 읽어 전송·매핑 비용이 줄었고, 엔티티가 아니라서 영속성 컨텍스트 적재와 더티 체킹용 스냅샷 생성이 사라졌으며(지연 로딩 프록시가 안 생기니 숨은 N+1도 원천 차단), NOLOCK 힌트가 쿼리에 확실하게 박혔다.

쿼리 변경후 초당 1000회 테스트 코드를 돌렸을떄 결과는 다음과 같다.

![](/images/spring/dsfno458pdfg5.png)


약 40만건의 insert를 수행하였는데 대부분 1초 내외로 수행되었다. 간혹 튀는 경우는 I/O block이 발생했을 경우로 DBA의 조언에 따라 서비스를 유지하는데는 문제가 없다고 판단했다. 


## 결론
트래픽으로 인한 트러블이 발생했을때 사용하는 DBMS에 특징에 따라 튜닝을 다르게 수행해야 했고 적절한 커넥션 개수를 세팅하고 테스트 보고 쿼리의 수행시간을 확인하여 select 시 불필요한 컬럼의 조회를 줄여주는 것으로 속도를 개선할수 있다.

결국 같은 JPA 코드라도 DB가 MVCC 계열(MySQL, PostgreSQL, Oracle)이냐 락 기반(MSSQL 기본 설정)이냐에 따라 겪는 문제가 완전히 달라진다. 그리고 커넥션 풀은 개수를 늘리기 전에 요청 1건이 커넥션을 몇 번 획득하는지부터 세어보는 것이 순서다.
