---
title:  "Springboot + Spring Date JPA+ QueryDsl 적용하기(Maven) 1"
toc: true
toc_sticky: true
categories:
  - Spring
tags:  
  - Web
  - Java
  - SpringBoot
  - JPA
  - Database
  - QueryDsl
---

>전체 코드 :  https://github.com/GeonDev/Proptech


단일 조건을 조회하거나 간단한 조건들을 이용하여 데이터를 조회할때는 JPA만 사용하더라도 쉽게 조회가 가능하지만 검색 조건을 여러개 사용하게 되면 검색조건의 조합에 따라 어떤 값을 이용해서 조회할지 분기가 필요하고 분기가 많아지면 코드가 깔끔해지지 않기 때문에 동적쿼리를 적용해보기 위하여 QueryDsl을 적용해 보았다.

# 1. 라이브러리 추가
나는 maven으로 프로젝트를 생성하였기 때문에 pom.xml에 값을 추가하였다. 여러 블로그를 보면서 그래들을 이용한 세팅을 확인해 봤는데 개인적으로는 maven이 비교적 깔끔한 것 같다

```
<!--  Querydsl 적용-->
<dependency>
	<groupId>com.querydsl</groupId>
	<artifactId>querydsl-jpa</artifactId>
</dependency>

<dependency>
	<groupId>com.querydsl</groupId>
	<artifactId>querydsl-apt</artifactId>
	<scope>provided</scope>
</dependency>
```
우선 Querydsl을 사용하기 위해 라이브러리를 추가한다. Spring boot 2.4.2 기준으로는 4.4.0 버전이 자동으로 관리 되기 떄문에 버전은 입력하지 않는다. (오히려 버전을 입력하면 충돌이 일어나기도 해서 메이븐을 다시 세팅해야한다.)

이후에 Querydsl에서 사용하는 Q클래스를 생성하기 위한 플러그인을 build 아래에 추가 한다. 

```
			<!--  Querydsl 적용-->
			<plugin>
				<groupId>com.mysema.maven</groupId>
				<artifactId>apt-maven-plugin</artifactId>
				<version>1.1.3</version>
				<executions>
					<execution>
						<goals>
							<goal>process</goal>
						</goals>
						<configuration>
							<outputDirectory>target/generated-sources/java</outputDirectory>
							<processor>com.querydsl.apt.jpa.JPAAnnotationProcessor</processor>
							<options>
								<querydsl.entityAccessors>true</querydsl.entityAccessors>
							</options>
						</configuration>
					</execution>
				</executions>
			</plugin>
```

그리고 메이븐 컴파일을 하면 위에 입력한 경로 target/generated-sources/java에 클래스들이 생성된 것을 확인할 수 있다. 만약 Q클래스가 생성되지 않는다면 경로를 잘못 하였거나 라이브러리에 문제가 있는 것이기 떄문에 확인이 필요하다.

![](/assets/images/spring/6be17f96915a-image1.png)


# 2. config 세팅

Querydsl로 쿼리를 만들고 사용하기 위해서는 JPAQueryFactory를 주입 받아야 한다. 여러가지 방법이 있겠지만 config를 추가하는 방법이 가장 깔끔하게 세팅하는 법이라고 생각한다.

```
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

@Configuration
public class QuerydslConfiguration {

    @PersistenceContext
    private EntityManager entityManager;

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }
}
```

이렇게 config를 만들게 되면 프로젝트 내부에서 어디서든 JPAQueryFactory를 주입 받을 수 있다. 

# 3. RepositorySupport 생성
기존에 JPA에서 사용하던 Repository 인터페이스와 다르게 Querydsl을 이용하여 쿼리를 생성하는 QuerydslRepositorySupport를 상속받는 별도의 클래스를 만든다. 
이름은 중요하지 않지만 QuerydslRepositorySupport를 상속받아 만들었기 때문에 RepositorySupport라고 지정하였고 패키지는 Repository 패키지 하위에 support라는 위치에 새로 생성하였다. 당연히 위치도 중요한 것은 아니다.


```
import com.apt.proptech.domain.User;

import com.apt.proptech.domain.enums.UserRole;
import com.apt.proptech.util.CommonUtil;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;


//중요!  QueryDsl에서 QUser에서 추출된 user 클래스를 생성해야 한다.
import static com.apt.proptech.domain.QUser.user;


@Repository
public class UserRepositorySupport extends QuerydslRepositorySupport {

    @Autowired
    private final JPAQueryFactory queryFactory;

    public UserRepositorySupport(JPAQueryFactory queryFactory){
        super(User.class);
        this.queryFactory = queryFactory;
    }


    public User findOneByName(String name){
        return queryFactory.selectFrom(user).where(user.name.eq(name))
                .fetchOne();
    }


    public List<User> findUserNameAndDate(String value, String startDate, String endDate ){
        return  return  queryFactory.selectFrom(user).where(containsName(value), betweenDate(startDate,endDate) ,lessThenDate(startDate, endDate)).fetch();
    }

    private BooleanExpression containsName(String value){
        if(CommonUtil.null2str(value).equals("") ) {
            return  null;
        }
        return user.name.contains(value);
    }


    private BooleanExpression betweenDate(String startDate, String endDate){

        if(!CommonUtil.null2str(startDate).equals("") &&  !CommonUtil.null2str(endDate).equals("") ){
            LocalDateTime start = CommonUtil.toStringLocalDateTime(startDate);
            LocalDateTime end = CommonUtil.toStringLocalDateTime(endDate);

            return  user.regDate.between(start,end);
        }else{
            return  null;
        }
    }

    private  BooleanExpression lessThenDate(String startDate, String endDate){

        if(CommonUtil.null2str(startDate).equals("") && !CommonUtil.null2str(startDate).equals("")){
            LocalDateTime end = CommonUtil.toStringLocalDateTime(endDate);
            return  user.regDate.before(end);

        }else{
            return  null;
        }
    }
}
```
내가 만든 UserRepositorySupport의 목적은 주어진 이름, 시작일, 종료일에 따라서 등록일을 기준으로 해당 이름을 포함하고 있는 between 또는 lessThen을 구하는 것이다. 이 과정에서 스트링으로 전달받은 값을 다른 형태로 변경하거나 특정 값이 있으면, 없으면 같은 조건을 분기로 나누어야 하는데 이때 QueryDsl로 만들어진 쿼리 where()에 원하는 조건을 생성하는 함수를 만들면 된다. 

BooleanExpression 을 이용하여 주어진 조건이 내가 원하는 경우 일때 (ex 시작일 종료일이 모두 다 주어졌을떄) 연산을 수행하고 아니라면 null을 리턴하게 만든다. 이렇게 null이 리턴되면 해당조건을 체크하지 않고 넘어가게 되기 때문에 분기 처리를 하지 않아도 동적으로 쿼리를 생성해 준다. 

```
    private BooleanExpression betweenDate(String startDate, String endDate){

        if(!CommonUtil.null2str(startDate).equals("") &&  !CommonUtil.null2str(endDate).equals("") ){
            LocalDateTime start = CommonUtil.toStringLocalDateTime(startDate);
            LocalDateTime end = CommonUtil.toStringLocalDateTime(endDate);

            return  user.regDate.between(start,end);
        }else{
            return  null;
        }
    }
```
위에 코드에서 보면 String startDate, String endDate의 값이 모두 있을때만 데이터 값을 정의 할수 있다. 또한 데이터를 조회하기 위해서 String 형이 아닌 LocalDateTime으로 값을 변경하는 것을 알수 있다. (CommonUtil은 따로 만든 클래스 이다.)
이런 식으로 별도 함수에 여러 조건을 주면서 동적쿼리를 생성한다. 


개인적으로 쿼리를 생성하는 것보다 특이하다고 생각했던 것은 이부분이다. 
**import static com.apt.proptech.domain.QUser.user;**

이부분은 수동으로 내가 사용할 QUser를 static으로 선언하는 부분으로 이부분이 없으면 where절에서 계산을 해줄 클래스가 없기 떄문에 에러가 발생한다. 자동으로 추가 되지 않기 때문에 꼭 별도로 선언해 주어야 한다. 




# 3. 테스트 코드 작성
```
    @Test
    void userSupport(){

        String name ="관리자";
        String startDate = "2003-01-04";
        String endDate = "";

        List<User> list = userRepositorySupport.findUserNameAndDate(name, startDate, endDate);

        list.forEach( o->{
            System.out.println(o.getName());
            System.out.println(o.getRegDate());
        });
    }
```
테스트 코드는 특별하게 작성하지는 않았다. 값을 넣고 빼보면서 실행시켜보면 정상적으로 값을 조회하는 것을 알수 있다. 



# 4. 의문점 (더 복잡한 과정도 생긴다.)

이렇게 동적쿼리를 생성하게 되었지만 반대로 기존 JPA에서 지원하는 Pageable을 활용한 기능을 구현하기 위해서는 꽤나 복잡한 과정이 필요하다. 가뜩이나 mustache을 이용해서 화면을 구현하였는데 페이징을 위해서 넘겨야 하는 데이터는 대략 이정도 이다.

```
public class Pagination<Entity>{

    private Integer totalPages;
    private Long totalElements;

    private Integer pageSize;

    private Integer currentPage;
    private Integer currentElements;

    //첫번째 페이지 여부
    private boolean isFirstPage;

    //마지막 페이지 여부
    private boolean isLastPage;

    //화면에 표시할 페이지 번호
    private List<Integer> pageNumbers;

    //이전번호 - 머스테지는 연산이 안되서 추가
    private Integer prePageNum;

    //이전번호 - 머스테지는 연산이 안되서 추가
    private  Integer nextPageNum;

    //검색 타입
    private List<String> searchType;

    //컬럼 이름 정보 - > 일부 컬럼을 지울떄 사용
    private List<ColumnTitle> columnTitles;

    //칼럼의 총 개수 -> 선탯되지 않은 칼럼을 찾을때 사영
    private Integer totalColumnCount;

    //콘텐츠 정보
    private List<Entity> contents;

}
```


이 데이터를 한번에 조회하기는 어려울 것으로 보이고 Pageable내부의 값에 따라 데이터를 조회하면서 값을 하나씩 넣어주어야 할것 같은데... 생각보다 복잡한 과정일 것이라고 생각한다.
(이 부분은 나중에 다시 구현해보려고 한다.)


또 특정 테그에 따라 분기를 태우면서 데이터를 조회하는 과정이 있을수도 있다 (ex 타입이 1이면 이름 조회, 타입이 2면 권한 조회) 이러는 경우 하나의 파라미터로 값을 분리하기 때문에 결국에 where절 내부의 함수안에서는 많은 분기가 필요할 수도 있다.

이런 식으로 구성이 되면 컨트롤러에서는 깔끔하지만 내부로 들어가면 분기 때문에 더러워지는 건 동일한 것이 아닐까? 하는 생각이 들었다.