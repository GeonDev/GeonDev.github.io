---
layout: post
title: Springboot JPA 적용해 보기
date: 2021-11-02
Author: Geon Son
categories: Spring
tags: [Spring Boot, JPA, Entity, Hibernate, MyBatis, MSSQL, Index]
comments: true
toc: true  
---

## 관련 글
- [Springboot JPA 적용해 보기]({% post_url 2021-11-02-Spring-boot-jpa-set-model %})
- [Springboot + Spring Data JPA + QueryDsl 적용하기(Maven)]({% post_url 2021-11-09-Spring-boot-jpa-querydsl-set %})

Mybatis 로 제작되었던 프로젝트에 JPA를 적용하는 과정을 정리하려고 한다.
가급적 데이터는 기존에 사용하던 테이블과 데이터 베이스를 그대로 사용하려고 한다.


## 1. 의존성 주입

```xml
<!-- spring-boot-starter-data-jpa 내부에 JDBC를 포함하고 있다. -->
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!--
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.1.4</version>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
    <version>2.4.5</version>
</dependency>
-->        

```
기존에 사용하던 mybatis와 jdbc를 pom.xml에서 제거하였다. spring-boot-starter-data-jpa 내부에 이미 jdbc를 가지고 있기 때문에 추가적인 의존성 주입을 하지 않아도 된다.


```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAspectJAutoProxy
@EnableScheduling
@SpringBootApplication
@PropertySource("classpath:common.properties")
public class VigApplication {


	public static void main(String[] args) {
		SpringApplication.run(VigApplication.class, args);
	}

}
```
또 Application 클래스에 있던 @MapperScan 어노테이션도 제거했다.



## 2. 도메인 객체 변경

mybatis 로 프로젝트를 제작할 때 select 매핑을 많이 해둔 편이라 도메인 객체에서 ID를 받아오는 경우가 많지 않을 것이라고 생각하였는데 착각이었다.

JPA에서는 mybatis와 달리 테이블과 테이블을 연결할때 객체의 관계를 통하여 조인을 실행하기 때문에 int CodeId 와 같은 형태로 정의되어 있는 도메인 내부 값들은 모두 변경이 필요했다.


```java
@Data
public class ImageKeyword implements Serializable{

	private static final long serialVersionUID = 8067729718531214955L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long keywordId;

	private Image image;


 	private int isTag;
        // 문제의 코드
	private String userCode;
	private String keywordEn;
	private String keywordOrigin;
	private float score;

}
```

이런 식으로 객체 전체보다 특정 칼럼 값을 불러오는 경우가 더 많아서, 클래스 변수들도 그에 맞게 모두 수정했다.


```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name="keyword")
public class ImageKeyword implements Serializable{

	private static final long serialVersionUID = 8067729718531214955L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long keywordId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "image_id")
	private Image image;

 	private int isTag;
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_code")
	private User user;
	private String keywordEn;
	private String keywordOrigin;
	private float score;

}
```

**@Entity**는 해당 클래스가 데이터 베이스에 매핑된다는 것을 알려준다.

**@Table(name="keyword")** 는 해당 객체가 어떤 테이블에 매핑되는지 알려준다. 객체와 테이블의 이름이 같다면 사용하지 않아도 되지만 나는 객체이름과 테이블 이름이 달랐다.

**@Id**	해당 변수가 데이터 베이스의 기본키라는 의미를 가진 어노테이션이다.

**@GeneratedValue** 주로 ID와 같이 사용된다. 기본키의 값을 자동으로 생성해주는 기능을 한다. JPA는 DBMS에 유연하게 변경이 가능하다고 알고 있는데 GeneratedValue같은 기능을 사용하기 위해서는 DBMS마다 다른 설정이 필요하다. 이런 것을 방언(?)이라고 한다고 한다.

**@Column(name = "alarm_Id")** 위에 설명했던 테이블과 비슷한 기능으로 매핑하려는 칼럼의 이름과 클래스 변수의 이름이 다를 때 사용한다.

**@Enumerated(EnumType.STRING)** Enum 타입을 매핑한다. 플래그로 사용한다.

**@ManyToOne / @OneToMany**
객체와 객체의 연관관계를 매핑할때 사용한다. 조인을 할 객체도 @Entity가 선언되어 있어야 하고, 보통은 `@JoinColumn`으로 현재 테이블의 FK 컬럼을 같이 지정한다. 참조되는 상대 테이블의 컬럼은 기본적으로 상대 엔티티의 @Id이다.

나는 이부분에서 많은 혼란을 겪었는데  @JoinColumn(name = XXX)의 name은 **현재(소유) 엔티티 테이블에 생기는 외래키(FK) 컬럼명**이다. 참조되는 상대 테이블의 PK 컬럼은 기본적으로 상대 엔티티의 @Id로 매핑되며, 필요하면 `referencedColumnName`으로 바꿀 수 있다.

### 타입 매핑이 인덱스를 좌우한다 (nvarchar 암시적 변환)

엔티티 매핑에서는 String 필드가 DB에 **어떤 문자 타입으로 바인딩되는지** 확인해야 한다. SQL Server JDBC Driver의 `sendStringParametersAsUnicode` 기본값은 `true`다. 이 상태에서는 `PreparedStatement.setString()`이나 JDBC `VARCHAR` 타입으로 지정한 String 파라미터도 드라이버가 서버에 보낼 때 Unicode 타입으로 변환한다. `CHAR`, `VARCHAR`, `LONGVARCHAR`가 각각 `NCHAR`, `NVARCHAR`, `LONGNVARCHAR`로 전송된다.

여기서 SQL Server의 데이터 형식 우선순위가 문제를 만든다. `nvarchar`의 우선순위가 `varchar`보다 높기 때문에 nvarchar 파라미터와 varchar 컬럼을 비교하면 **컬럼 쪽이** nvarchar로 묵시적 변환된다. 실행계획에는 `CONVERT_IMPLICIT`로 표시된다.

컬럼 변환은 컬럼에 함수를 적용한 것과 같아서 **인덱스 seek을 막는다.** 쿼리와 인덱스가 정상인데 실행계획이 스캔으로 나온다면 바인딩 타입을 확인해야 한다. 실제로 바인딩을 varchar로 맞추자 논리 I/O가 2,403페이지에서 38페이지로 줄었다.

이 동작은 [Microsoft의 `sendStringParametersAsUnicode` 문서](https://learn.microsoft.com/en-us/sql/connect/jdbc/reference/setsendstringparametersasunicode-method-sqlserverdatasource)와 [SQL Server 데이터 형식 우선순위](https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-type-precedence-transact-sql)에서 확인할 수 있다.

MySQL은 varchar와 nvarchar 타입을 구분하지 않고 컬럼별 문자셋·콜레이션으로 처리한다. 바인딩 파라미터는 콜레이션 강제성(coercibility)이 낮아 비교 시 컬럼 쪽 콜레이션을 따라간다. 변환이 필요하면 컬럼이 아니라 파라미터 쪽이 바뀌므로 인덱스를 사용할 수 있다.

단, 조인하는 두 컬럼의 문자셋이 utf8mb4와 latin1처럼 서로 다르면 MySQL에서도 인덱스를 사용하지 못할 수 있다. 같은 JPA 코드라도 DB와 컬럼 타입에 따라 실행계획이 달라진다.

실제 적용에서는 JDBC URL에 `sendStringParametersAsUnicode=false`를 추가했다. 드라이버가 일반 String 파라미터를 varchar로 전송하므로 varchar 컬럼 조회에서 불필요한 암시적 변환이 사라진다.

```yaml
spring:
  datasource:
    jdbc-url: jdbc:sqlserver://DB_HOST:1433;databaseName=DB_NAME;sendStringParametersAsUnicode=false
```

이 설정은 모든 일반 String 바인딩에 적용된다. 실제 DB 컬럼이 nvarchar인 필드에는 Hibernate의 `@Nationalized`를 붙여 nationalized string으로 매핑했다.

```java
import org.hibernate.annotations.Nationalized;

// DB 컬럼: varchar
private String boardCode;

// DB 컬럼: nvarchar
@Nationalized
private String boardName;
```

`@Nationalized`를 빠뜨린 nvarchar 필드는 varchar로 바인딩될 수 있다. 특히 한글 같은 유니코드 값을 저장하거나 조회하는 필드는 DB 컬럼 타입과 엔티티 매핑을 함께 확인해야 한다.

네이티브 쿼리 파라미터는 엔티티 필드 매핑 정보를 사용하지 않을 수 있다. nvarchar 파라미터가 필요한 네이티브 쿼리는 실제 JDBC 바인딩 타입과 실행계획을 별도로 확인했다.

그리고 이렇게 연관관계 매핑을 하면서 상당히 삐그덕 거리는 일이 발생했다.


## 3. DB/도메인 재설계
JPA로 매핑을 하면 할수록 DB를 고치고 싶은 생각이 들었다. 기존에 플래그를 설정했던 부분을 조금더 직관적으로 바꾸고 싶었고 어떤 객체는 연관관계가 있고 어떤 객체는 연관관계가 없는 것이 마음에 들지 않았다.
또한 플래그를 단순 숫자로 정하였기 때문에 여러 단계를 추가하거나 변경했을 경우 처리하기가 까다롭다는 점(JPA로 변경하니까 @Enumerated을 사용해보겠다는 목적은 덤) 등 DB를 변경해보면 어떨까 하는 생각을 갖게 되었다.

현재 DB를 변경하게 되면 생길 문제는
1. 이미 데이터가 있다. (GeneratedValue가 잘 돌아갈까?)
2. 일부 값들은 boolean 역할을 하고 있다. (코드상 변경되는 곳을 다 찾아야한다)

음... 결국 mybatis에서 jpa로 변경하기 위해서는 대공사가 필요한... 재미있는 일이 펼쳐질 것 같다...


## 4. LazyInitializationException

![](/images/spring/r43hjolfl_1.png)
아무 생각 없이 개발하다가 객체를 불러올 수 없다는 오류가 출력되는 것을 보게 되었다.
**org.hibernate.LazyInitializationException: could not initialize proxy** 가 발생하는 이유는 영속성 컨텍스트가 닫힌 뒤 지연 로딩 프록시에 접근했기 때문이다. Lazy load를 사용하면 처음 데이터를 조회할 때 연관 데이터를 바로 로드하지 않기 때문에, 트랜잭션 밖에서 연관 객체를 사용하면 이런 문제가 발생할 수 있다.

저 당시에는 `@Transactional`을 붙여서 해결했지만, 지금 기준으로는 **필요한 연관관계를 조회 시점에 명시적으로 가져오는 방식(fetch join, EntityGraph, DTO 조회)** 이 더 권장된다.  
반대로 `FetchType.EAGER`로 바꾸는 방식은 조회할 때마다 불필요한 연관 데이터까지 함께 읽어오기 쉬워서 보통 권장되지 않는다.

지연 로딩 쿼리는 리포지토리 메서드가 아니라 **프록시를 실제로 터치하는 시점의 트랜잭션**에서 실행된다. 이 트랜잭션은 서비스 계층이나 OSIV가 열었을 수 있다.

따라서 리포지토리 메서드에 지정한 `@Transactional`의 격리 수준(`isolation`)이나 `readOnly`가 지연 로딩 쿼리에 적용되지 않을 수 있다. Spring의 `isolation` 속성은 새 트랜잭션을 시작할 때만 유효하며, 이미 열린 트랜잭션에 기본 전파 옵션인 REQUIRED로 참여하면 바뀌지 않는다.

격리 수준을 제어해야 하는 조회라면 lazy 컬렉션 접근 대신 해당 설정이 걸린 리포지토리 메서드를 명시적으로 호출해야 한다. MSSQL에서 NOLOCK 효과를 내기 위해 `READ_UNCOMMITTED`를 사용하는 경우가 여기에 해당한다.

반면 영속 상태 컬렉션에 add/remove를 하는 저장·삭제 로직은 관리 컬렉션을 그대로 사용한다. 이를 명시적 조회로 바꾸면 하이버네이트의 연관관계 변경 감지가 깨질 수 있다. 조회는 명시적 호출, 변경은 관리 컬렉션으로 역할을 나눈다.

이 문제를 실제 트래픽 장애에서 겪은 과정은 [트러블슈팅 - 트래픽이 급격하게 늘어났을때 해결방법(JPA + MSSQL)]({% post_url 2023-04-16-jpa-mssql-transaction-lock %})에 정리했다.

사실 문제는 이렇게 만들어진 엔티티가 단방향이었기 때문에, 다른 엔티티 값을 참조하는 로직이 많아질수록 조회 쿼리와 객체 탐색 방식이 더 복잡해졌다는 점이었다. 그래서 단방향 매핑을 양방향으로 전환하면서 고려해야 하는 내용을 테스트하고 정리했다.


## 5. 연관관계 주인 값 설정

이게 무슨 말인지 이해가 잘 되지 않았다. 연관관계의 주인은 외래키를 관리하는 객체 이기 때문에 User, LoginHistory가 있다면 LoginHistory에 외래키가 있기 때문에 연관관계의 주인은 LoginHistory이고 그러면 LoginHistory 안에 있는 User에만 값을 넣으면 된다는 건가?

```java
   @Test
    @Transactional
    void test(){

        User user1 = User.builder()
                .id(1L)
                .username("김")
                .build();

        //히스토리 추가
        LoginHistory h1 = LoginHistory.builder()
                .id(1L)
                .user(user1)
                .build();

        LoginHistory h2 = LoginHistory.builder()
                .id(2L)
                .user(user1)
                .build();

        LoginHistory h3 = LoginHistory.builder()
                .id(3L)
                .user(user1)
                .build();

        userRepository.save(user1);

        loginHistoryRepository.save(h1);
        loginHistoryRepository.save(h2);
        loginHistoryRepository.save(h3);

        User temp = userRepository.findByUsername("김");

        temp.getLoginHistoryList().forEach(o->{
            System.out.println(o.getId());
        });

    }
```

User를 하나 생성하고 3개의 LoginHistory를 생성하고 각각에 같은 User를 넣어주었다. 이렇게 한 상태에서 userRepository로 user를 불러와서 LoginHistory를 조회하면?

![](/images/spring/r43hjolfl_2.png)

User의 loginHistoryList가 초기화되어 있지 않다면 NullPointerException이 발생할 수 있다. 다만 컬렉션을 `new ArrayList<>()`로 초기화했다면 NPE가 아니라 빈 리스트가 나오는 것이 정상이다. 그렇다면 반대로 User에 LoginHistory를 넣고 LoginHistory에는 User를 넣지 않는다면?
메모리상 User 객체에서는 LoginHistory가 보일 수 있지만, 외래키를 가진 연관관계의 주인인 LoginHistory.user 값이 없기 때문에 DB에는 관계가 제대로 반영되지 않는다. LoginHistory에서 username이 `김`인 데이터를 출력하려고 한다면 값이 나오지 않는다.

말이 어려웠지만 결론은 **DB 반영은 연관관계의 주인 쪽 값이 기준이고, 객체 그래프를 사용할 때는 양쪽 값을 함께 맞춰주는 것이 좋다**는 것이다. 보통은 편의 메서드를 만들어 한 번에 양쪽 값을 세팅한다.


## 6. OneToMany와 ManyToOne 기준

간단한 내용인데 막상 연관관계 매핑을 하다보면 혼란이 온다.
이부분은 기준을 확실하게 정하면 될것 같은데 하나의 엔티티가 여러 상대 엔티티를 참조하면 OneToMany, 여러 엔티티가 하나의 엔티티를 참조하면 ManyToOne이다.
대부분의 일대다 관계에서는 외래키를 가진 ManyToOne 쪽이 연관관계의 주인이 된다.

```java

@Entity
@DynamicInsert
@DynamicUpdate
public class User extends BaseTimeEntity{

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //다른 엔티티의 user_id와 혼동하지 말것! -> 로그인시 구분되기 쉽게 하는 이름
    //security를 사용할때 기본으로 요구하는 값
    private String username;
    private String password;
    //실명 입력
    private String name;
    private String email;
    private String profileImg;
    private String phoneNumber;

    //OAuth를 위한 필드
    private String provider;
    private String providerId;


    @Enumerated(EnumType.STRING)
    private UserRole userRole;

    @Enumerated(EnumType.STRING)
    private UserState userState;

    private LocalDateTime retiredDate;

    private LocalDateTime modiPasswordDate;


    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id")
    private Company company;

    @OneToMany(mappedBy = "user",fetch = FetchType.LAZY)
    private List<Account> accountList = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<LoginHistory> loginHistoryList = new ArrayList<>();

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    private List<OwnedHistory> ownedHistoryList = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Receipt> receiptList = new ArrayList<>();

}


@Entity
public class LoginHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime loginDate;

    private String loginIp;

    private Boolean isLogin;

    @Enumerated(EnumType.STRING)
    private IpChecked ipChecked;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;


}
```


## 7. Entity를 바로 전달하지 않는다.

양방향 매핑을 하게 되었을 때 발생할 수 있는 문제 중 하나는 무한순회이다. 무한순회를 막을 수 있는 방법은 @ToString(exclude = "user")와 같이 조회 시에 제외하는 방법도 있지만 다른 방법으로는 DTO를 사용하여 화면에 값을 전달하는 방법이다. DTO에 화면 구성에 필요한 값을 넣으면서 무한 순회를 막을 수 있다.

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssociateDto {

    private String name;
    private String round;
    private String expectDate;
    private String realDate;
    private String feeRatio;
    private String city;
    private String state;
    private String address;
    private String registerDate;
    private String modifiedDate;

    //전체 참여자 수
    private int totalJoinUserCount;

    //전체 사업 금액
    private int totalRequiredPaid;

    //전체 납입 금액
    private int totalPaid;

    //전체 미납 금액
    private int totalUnPaid;


    public AssociateDto(Associate associate){
        this.name = associate.getName();
        this.round = associate.getAssociateRound().name();
        this.expectDate = CommonUtil.toDateStr(associate.getEndExpectDate());
        this.realDate = CommonUtil.toDateStr(associate.getEndRealDate());
        this.feeRatio = CommonUtil.null2str(associate.getOperateFeeRatio());
        this.city = CommonUtil.null2str(associate.getCity());
        this.state = CommonUtil.null2str(associate.getState());
        this.address = CommonUtil.null2str(associate.getState());
        this.registerDate = CommonUtil.toDateStr(associate.getRegDate());
        this.modifiedDate = CommonUtil.toDateStr(associate.getModiDate());


        //전체 사업 금액
        for (SaleProp sale : associate.getSalePropList()){
            for(Claim claim : sale.getClaimList()){
                this.totalRequiredPaid += claim.getPayment();
            }
        }

        //전체 납입 금액
        for (SaleProp sale : associate.getSalePropList()){
            for(Claim claim : sale.getClaimList()){
               for(Receipt receipt : claim.getReceiptList()){
                   this.totalPaid += receipt.getPayment();
               }
            }
        }

        //전체 미납금액
        this.totalUnPaid =  this.totalRequiredPaid -  this.totalPaid;
    }
}
```
위에 DTO는 엔티티에는 없는 부가 정보를 계산하여 전달하는 기능을 한다.
