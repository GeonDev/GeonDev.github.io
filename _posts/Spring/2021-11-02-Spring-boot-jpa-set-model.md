---
layout: post
title: Springboot JPA 적용해 보기
date: 2021-11-02
Author: Geon Son
categories: Spring
tags: [Spring Boot, JPA, Entity, Hibernate, MyBatis]
comments: true
toc: true  
---

## 관련 글
- [Springboot JPA 적용해 보기]({% post_url 2021-11-02-Spring-boot-jpa-set-model %})
- [Springboot + Spring Data JPA + QueryDsl 적용하기(Maven)]({% post_url 2021-11-09-Spring-boot-jpa-querydsl-set %})

Mybatis 로 제작되었던 프로젝트에 JPA를 적용하는 과정을 정리하려고 합니다.
가급적 데이터는 기존에 사용하던 테이블과 데이터 베이스를 그대로 사용하려고 합니다.


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
기존에 사용하던 mybatis와 jdbc를 pom.xml에서 제거하였습니다. spring-boot-starter-data-jpa 내부에 이미 jdbc를 가지고 있기 때문에 추가적인 의존성 주입을 하지 않아도 됩니다.


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
또 Application 클래스에 있던 @MapperScan 어노테이션도 제거하였습니다.



## 2. 도메인 객체 변경

mybatis 로 프로젝트를 제작할 때 select 매핑을 많이 해둔 편이라 도메인 객체에서 ID를 받아오는 경우가 많지 않을 것이라고 생각하였는데 착각이었습니다.

JPA에서는 mybatis와 달리 테이블과 테이블을 연결할때 객체의 관계를 통하여 조인을 실행하기 때문에 int CodeId 와 같은 형태로 정의되어 있는 도메인 내부 값들은 모두 변경이 필요했습니다.


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

이런 식으로 객체가 아닌 특정 칼럼의 값을 불러오는 경우가 더 많아 이러한 클래스 변수들을 모두 수정하는 작업을 진행하였습니다.


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

	private Image image;

 	private int isTag;
	private User user;
	private String keywordEn;
	private String keywordOrigin;
	private float score;

}
```

**@Entity**는 해당 클래스가 데이터 베이스에 매핑된다는 것을 알려줍니다.

**@Table(name="keyword")** 는 해당 객체가 어떤 테이블에 매핑되는지 알려줍니다. 객체와 테이블의 이름이 같다면 사용하지 않아도 되지만 저는 객체이름과 테이블 이름이 달랐습니다.

**@Id**	해당 변수가 데이터 베이스의 기본키라는 의미를 가지고 있는 어노테이션입니다.

**@GeneratedValue** 주로 ID와 같이 사용됩니다. 기본키의 값을 자동으로 생성해주는 기능을 합니다. JPA는 DBMS에 유연하게 변경이 가능하다고 알고 있는데 GeneratedValue같은 기능을 사용하기 위해서는 DBMS마다 다른 설정이 필요합니다. 이런 것을 방언(?)이라고 한다고 합니다.

**@Column(name = "alarm_Id")** 위에 설명했던 테이블과 비슷한 기능으로 매핑하려는 칼럼의 이름과 클래스 변수의 이름이 다를 때 사용합니다.

**@Enumerated(EnumType.STRING)** Enum 타입을 매핑합니다. 플래그로 사용합니다.

**@ManyToOne / @OneToMany**
객체와 객체의 연관관계를 매핑할때 사용합니다. 조인을 할 객체도 @Entity가 선언되어 있어야 하고 @JoinColumn 값을 입력하지 않으면 JPA의 기본 네이밍 전략에 따라 외래키 컬럼명을 추론합니다. 참조되는 상대 테이블의 컬럼은 기본적으로 상대 엔티티의 @Id입니다.

저는 이부분에서 많은 혼란을 겪었는데  @JoinColumn(name = XXX)의 name은 **현재(소유) 엔티티 테이블에 생기는 외래키(FK) 컬럼명**입니다. 참조되는 상대 테이블의 PK 컬럼은 기본적으로 상대 엔티티의 @Id로 매핑되며, 필요하면 `referencedColumnName`으로 바꿀 수 있습니다.

그리고 이렇게 매핑을 하면서 상당히 삐그덕 거리는 일이 발생하였습니다.


## 3. DB/도메인 재설계
JPA로 매핑을 하면 할수록 DB를 고치고 싶은 생각이 들었습니다. 기존에 플래그를 설정했던 부분을 조금더 직관적으로 바꾸고 싶었고 어떤 객체는 연관관계가 있고 어떤 객체는 연관관계가 없는 것이 마음에 들지 않았습니다.
또한 플래그를 단순 숫자로 정하였기 때문에 여러 단계를 추가하거나 변경했을 경우 처리하기가 까다롭다는 점(JPA로 변경하니까 @Enumerated을 사용해보겠다는 목적은 덤) 등 DB를 변경해보면 어떨까 하는 생각을 갖게 되었습니다.

현재 DB를 변경하게 되면 생길 문제는
1. 이미 데이터가 있다. (GeneratedValue가 잘 돌아갈까?)
2. 일부 값들은 boolean 역할을 하고 있다. (코드상 변경되는 곳을 다 찾아야한다)

음... 결국 mybatis에서 jpa로 변경하기 위해서는 대공사가 필요한... 재미있는 일이 펼쳐질 것 같습니다...


## 4. LazyInitializationException

![](/images/spring/r43hjolfl_1.png)
아무 생각 없이 개발하다가 객체를 불러올 수 없다는 오류가 출력되는 것을 보게 되었습니다.
**org.hibernate.LazyInitializationException: could not initialize proxy** 가 발생하는 이유는 영속성 컨텍스트가 닫힌 뒤 지연 로딩 프록시에 접근했기 때문입니다. Lazy load를 사용하면 처음 데이터를 조회할 때 연관 데이터를 바로 로드하지 않기 때문에, 트랜잭션 밖에서 연관 객체를 사용하면 이런 문제가 발생할 수 있습니다. 해결방법은 크게 2가지인데

1. FetchType을 EAGER로 변경하는 방법
2. 쿼리를 호출할때 @Transactional을 선언하는 것

Lazy에서 EAGER로 변경하면 쿼리를 불러올 때 모든 데이터를 같이 불러오기 때문에 겉보기에는 별다른 문제는 없지만 불러오는 데이터 양이 많아질수록 당연히 느려질 것이고 필요없는 데이터를 더 불러오는 상황이 되기 때문에 @Transactional을 이용하여 해결하였습니다.

사실 문제는 이렇게 만들어진 엔티티가 단방향이였기 때문에 다른 엔티티의 값을 가지고 오는 연산이 점점 많아지면 오버헤드도 늘어나고 데이터를 조회하는 과정에서 양방향 매핑이 되어 있지 않기 때문에 로직상 오류가 더 많이 발생하게 될것이라고 생각하게 되었습니다. 결국 단방향 매핑을 양방향으로 전환하는 작업을 수행하면서 고려해야 하는 내용을 테스트 하고 정리하였습니다.


## 5. 연관관계 주인 값 설정

이게 무슨 말인지 이해가 잘 되지 않았습니다. 연관관계의 주인은 외래키를 관리하는 객체 이기 때문에 User, LoginHistory가 있다면 LoginHistory에 외래키가 있기 때문에 연관관계의 주인은 LoginHistory이고 그러면 LoginHistory 안에 있는 User에만 값을 넣으면 된다는 건가?

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

User를 하나 생성하고 3개의 LoginHistory를 생성하고 각각에 같은 User를 넣어주었습니다. 이렇게 한 상태에서 userRepository로 user를 불러와서 LoginHistory를 조회하면?

![](/images/spring/r43hjolfl_2.png)

User의 loginHistoryList가 초기화되어 있지 않다면 NullPointerException이 발생할 수 있습니다. 다만 컬렉션을 `new ArrayList<>()`로 초기화했다면 NPE가 아니라 빈 리스트가 나오는 것이 정상입니다. 그렇다면 반대로 User에 LoginHistory를 넣고 LoginHistory에는 User를 넣지 않는다면?
메모리상 User 객체에서는 LoginHistory가 보일 수 있지만, 외래키를 가진 연관관계의 주인인 LoginHistory.user 값이 없기 때문에 DB에는 관계가 제대로 반영되지 않습니다. LoginHistory에서 username이 `김`인 데이터를 출력하려고 한다면 값이 나오지 않습니다.

말이 어려웠지만 결론은 **DB 반영은 연관관계의 주인 쪽 값이 기준이고, 객체 그래프를 사용할 때는 양쪽 값을 함께 맞춰주는 것이 좋다**는 것입니다. 보통은 편의 메서드를 만들어 한 번에 양쪽 값을 세팅합니다.


## 6. OneToMany와 ManyToOne 기준

간단한 내용인데 막상 연관관계 매핑을 하다보면 혼란이 옵니다.
이부분은 기준을 확실하게 정하면 될것 같은데 하나의 엔티티가 여러 상대 엔티티를 참조하면 OneToMany, 여러 엔티티가 하나의 엔티티를 참조하면 ManyToOne입니다.
대부분의 일대다 관계에서는 외래키를 가진 ManyToOne 쪽이 연관관계의 주인이 됩니다.

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

양방향 매핑을 하게 되었을 때 발생할 수 있는 문제 중 하나는 무한순회입니다. 무한순회를 막을 수 있는 방법은 @ToString(exclude = "user")와 같이 조회 시에 제외하는 방법도 있지만 다른 방법으로는 DTO를 사용하여 화면에 값을 전달하는 방법입니다. DTO에 화면 구성에 필요한 값을 넣으면서 무한 순회를 막을 수 있습니다.

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
위에 DTO는 엔티티에는 없는 부가 정보를 계산하여 전달하는 기능을 합니다.
