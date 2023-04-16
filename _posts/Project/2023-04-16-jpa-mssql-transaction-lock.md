---
layout: post
title: 트러블슈팅 - 트래픽이 급격하게 늘어났을때 해결방법(JPA + MSSQL) 
date: 2023-04-16
Author: Geon Son
categories: Project
tags: [Springboot, JPA, mssql]
comments: true
toc: true
---

아이돌에 투표하는 이벤트 방송의 투표 시스템을 만들게 되었다. 기존에는 메인 프로젝트 안에서 컨트롤러를 추가해서 개발했는데 이번에는 작은 시스템이기도 하고 제작진에서 시스템분리를 적극적으로 원해서 아예 별도의 마이크로 시스템으로 시스템을 변경하게 되었다.  

간단한 거라고 생각했던 시스템에서 여러가지 문제가 생겼는데 메크로를 사용해서 1ms 차이로 투표를 해버리거나 계정 시스템을 악용해서 혼자 3000개의 계정을 만들어 중복 투표를 하거나 4주동안 브라우저를 계속 켜놓아서 캐싱 이상이 발생하는 등 다양한 문제가 있었다.
그중에서 가장 큰 문제는 **방송 직후 한번에 몰려오는 트래픽 이슈** 였다. 

# 투표 시스템 개요

간단하게 투표 시스템을 어떻게 구현했는지 확인을 해보면 다름 그림과 같은 순서로 진행된다. 
각 칸에 색상은 조회/저장시 사용하는 테이블이 같은 경우를 표시한다. 

![ Zip FILE 전달](/images/spring/asdf78524nopgqg.png)

투표 기간 중 투표를 하게 되면 해당 투표의 정보를 불러와서 현재 투표 기간, 투표 조건 등을 체크 하고 
투표 내역이 저장된 리스트에서 내역을 불러와서 중복으로 들어온 투표 인지 확인한다. 
중복투표가 아니라면 들어온 정보가 유효한 투표 항목인지 체크를 하고 최종적으로 투표를 저장한다.

로직상 특별한 것은 크게 보이지 않는다. 같은 테이블을 사용하였다고는 하지만 보통의 경우는 select와 insert가
서로 겹치는 일은 거의 없어 보인다. select를 하면서 lock이 걸리는 경우가 발생하지도 않을 것 같고 연산 속도가 느려서 락이 발생하는 경우는 거의 없어 보이긴 한다. 실제로 대부분의 상황에서는 문제가 없었다  

![ Zip FILE 전달](/images/spring/38hgd496mlhdegf.png)

문제는 항상 공통적으로 발생했다. 맴버쉽의 토큰을 갱신하는 시기와 메인 서버에서 방송 시스템을 집계하는 시기와 방송에서 투표를 시작하는 시기가 모두 겹친다. 이 시스템들이 사용하는 DB는 물리적으로 분리되어 있지 않고 집계와 투표는 모두 동일한 DB를 사용하고 있었다. 순간적으로 DB가 느려지고 트래픽이 순각 몰리면서 락이 발생하게 되었다.

# 트러블 슈팅 과정

## MSSQL with(nolock) 설정 

mssql은 다른 DB와 다르게 select를 수행할때도 lock이 발생한다. 물론 이러한 문제는 10버전이후에는 대부분 해결되었다고 한다. 하지만 지금 회사에서 사용하는 있는 mssql 버전은 9버전 이하 이고 업데이트 계획도 없다. 

어떨수 없이 select를 할때마다 with(nolock)를 설정해야 한다. 문제는 **JPA에서는 어떻게 설정해야 되느냐** 하는 것이였다. jpa에도 DB마다 방언을 설정하는 옵션이 존재하긴 하지만 그렇다고 모든 옵션을 제공하지 않는다.
with(nolock)을 대신하는 옵션으로
~~~
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
~~~
이라는 설정을 걸수 있다.  트랜젝션 격리 레벨을 낮추어서 with(nolock)과 비슷한 효과를 나타나게 하는 방법이다. 하지만 해당 설정을 아무리 걸어도 **실제 수행되는 쿼리에는 with(nolock)이 출력되지 않는다.**  효과가 없다고 단언할수는 없지만 위에 설정을 추가하는 정도로는 개선되는 포인트가 없었다.

## 커넥션풀 개수 증가
스프링 프로젝트를 처음 생성하면 커넥션 풀의 개수는 10개이다. 트랜젝션 락이 처음 발생했을때 고려해볼 방법으로 커넥션 풀 개수를 늘려 처리하는 총량을 늘리는 방법이다. 

커넥션 풀을 결정하는 공식은 다음과 같다

**connections = ((core_count) * 2) + effective_spindle_count)**

정확하지는 않지만 core_count는 CPU의 개수 effective_spindle_count는 하드디스크 개수(I/O요청 수)라고 생각하면 된다. 커넥션풀 개수는 처음에 20개로 늘렸다가 추후에 100개로 올렸다. 

### 커넥션풀 개수 설정 및 확인

~~~
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  hikari:  
    maximum-pool-size: 20
~~~
보통은 커넥션 풀을 설정할때 이렇게 hikari 아래에 설정한다. 문제는 이 프로젝트에서는 아무리 설정을 해도 커넥션 풀 개수가 늘어나지 않았다.  여러가지 시도를 해보다가  아래와 같이 hikari를 제거하고 직접 넣은 설정을 바꿨더니 문제를 해결할 수 있었다. (아마 멀티 DB를 사용하고 있어 발생한 것이 아닌가 생각한다.)

~~~
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  maximum-pool-size: 100
~~~

커넥션 풀의 개수를 확인하기 위해서는 로그 설정에 아래 내용을 추가한다. 
커넥션 풀 설정을 변경하였으면 1번은 체크 해보는 것을 추천한다.

~~~
logging: 
	level: 
		com.zaxxer.hikari: TRACE 
		com.zaxxer.hikari.HikariConfig: DEBUG
~~~

위에 설정을 추가하고 커넥션풀 로그를 보면 

![](/images/spring/gbakdlu58nlfdgqe.png)

커넥션 풀의 총 개수가 설정한 것 처럼 변경되었다는 것을 확인할 수 있다. 커넥션의 개수를 늘려주니 트랜젝션락 이 발생했다는 경고는 출력되지 않았다.(첫번째 보다 트래픽이 줄어든 영향도 있었다.) 다만 처음처럼 여전히 API 속도는 튀어 올라서 API 로직을 테스트 하면서 변경하기 시작했다.

![](/images/spring/3gds05lkdg5gdh5.png)



## AUTOCOMMIT 정지
autocommit의 디폴트 설정은 true이다. 오토커밋이 설정되어 있으면 select를 수행하는 과정에서 커밋 체크를 하는 과정이 발생하였다. 물론 수행시간은  길어도 100ms미만으로 실행되지만 트래픽이 몰리는 순간에서는 해당 설정도 제거하는 편이 좋다고 생각하였다. 

~~~
datasource:  
  jdbc-url: XXXXXX 
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver  
  username: XXXXXXXXXXXX 
  password: XXXXXXXXXXXX 
  maximum-pool-size: 100
  auto-commit : false
~~~

auto commit을 제거할때는 당연히 주의 사항이 생긴다. 커밋을 조절하지 않겠다는 것이기 때문에 별도로 커밋 명령어를 주어야 할것 같지만 실제 실행시에는 
~~~
hibernate.connection.provider_disables_autocommit=true
~~~
과 같은 하이버네이트의 별도 설정을 가지고 있기도 하고 save() 메소드 내부에 @Transactional이 선언되어 있고 persist 또는 merge를 수행한다. 물론 실제 적용시에는 테스트가 필요하다. 

~~~
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
둘의 가장 큰 차이점은 saveAll은 하나의 Transaction 내부에서 수행하고  save()은 연산마다 Transaction을 새로 생성하는 것이다. 

~~~
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

쿼리 수행속도는 빠르게 수행되는데 RESULT-SET-FETCH 라는 부분에서 수행시간을 잡아먹는다.  일단 이건 뭔가...? 쿼리를 받아오고 이후에 객체에 저장하는 과정에서 연산이 오래걸린 것으로 생각된다. GPT에 믈어보면 다음과 같이 답변해 준다.  내가 문제로 생각했던 이슈는 2번 필요한 데이터만 선택하는 것이다. 


~~~
`RESULT-SET-FETCH` 시간을 줄이는 방법은 다음과 같습니다.

1. 인덱스 생성: `RESULT-SET-FETCH` 쿼리가 자주 수행되는 경우, 데이터베이스 테이블에 인덱스를 생성하여 쿼리 성능을 향상시킬 수 있습니다.

2. 필요한 데이터만 선택: `SELECT *` 대신 필요한 열만 선택하여 쿼리를 수행하면 불필요한 데이터를 가져오지 않아 `RESULT-SET-FETCH` 시간을 줄일 수 있습니다.

3. 쿼리 튜닝: 쿼리를 최적화하여 `RESULT-SET-FETCH` 시간을 줄일 수 있습니다. 쿼리 실행 계획을 확인하고, 성능 저하를 일으키는 쿼리를 수정하여 최적화합니다.

4. 커넥션 풀링: 커넥션 풀링을 사용하여 데이터베이스 연결을 재사용할 수 있습니다. 이를 통해 새로운 연결을 매번 만들 필요 없이 기존 연결을 재사용하여 `RESULT-SET-FETCH` 시간을 줄일 수 있습니다.

5. 캐싱: 캐싱을 사용하여 데이터를 미리 로드하여 `RESULT-SET-FETCH` 시간을 줄일 수 있습니다. 예를 들어, 데이터를 메모리에 캐시하고, 이를 사용하여 `RESULT-SET-FETCH` 쿼리를 수행하면 빠른 응답 시간을 제공할 수 있습니다.
~~~


투표 이력을 체크할때 필요한 데이터는 최근 투표이력만 있으면 되지만 JPA로 수행을 하다보면 필요하지 않는 정보를 조회해야 한다. 이 쿼리를 네이티브 쿼리로 변경하였다.  

네이티브 쿼리로 변경 할때 위에서 추가한 **with(nolock)** 도 추가 하였다. 쿼리 변경후 초당 1000회 테스트 코드를 돌렸을떄 결과는 다음과 같다.

![](/images/spring/dsfno458pdfg5.png)


약 40만건의 insert를 수행하였는데 대부분 1초 내외로 수행되었다. 간혹 튀는 경우는 I/O block이 발생했을 경우로 DBA의 조언에 따라 서비스를 유지하는데는 문제가 없다고 판단했다. 


## 결론
트래픽으로 인한 트러블이 발생했을때 사용하는 DBMS에 특징에 따라 튜닝을 다르게 수행해야 했고 적절한 커넥션 개수를 세팅하고 테스트 보고 쿼리의 수행시간을 확인하여 select 시 불필요한 컬럼의 조회를 줄여주는 것으로 속도를 개선할수 있다.
