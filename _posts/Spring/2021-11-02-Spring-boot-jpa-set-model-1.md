---
layout: post
title: Springboot JPA 적용해 보기 - 1
date: 2021-11-02
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true  
---

Mybatis 로 제작되었던 프로젝트에 JPA를 적용하는 과정을 정리하려고 합니다.
가급적 데이터는 기존에 사용하던 테이블과 데이터 베이스를 그대로 사용하려고 합니다.


## 1. 의존성 주입

```
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


```
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
또 Application 클래스에 있던 @MapScan 어노테이션도 제거하였습니다.



## 2. 도메인 객체 변경

mybatis 로 프로젝트를 제작할 때 select 매핑을 많이 해둔 편이라 도메인 객체에서 ID를 받아오는 경우가 많지 않을 것이라고 생각하였는데 착각이였습니다.

JPA에서는 mybatis와 달리 테이블과 테이블을 연결할때 객체의 관계를 통하여 조인을 실행하기 때문에 int CodeId 와 같은 형태로 정의되어 있는 도메인 내부 값들은 모두 변경이 필요했습니다.


```
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


```
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

**@Column(name = "alarm_Id")** 위에 설명했던 테이블과 비슷한 기능으로 매핑하려는 칼럼의 이름과 클래스 변수의 이름이 다를떄 사용합니다.

**@Enumerated(EnumType.STRING)** Enum 타입을 매핑합니다. 플래그로 사용합니다.

**@ManyToOne / @OneToMany**
객체와 객체를 조인할때 사용합니다. 조인을 할 객체도 @Entity가 선언되어 있어야 하고 @JoinColumn 값을 입력하지 않는다면 매핑할 객체의 @Id값으로 매핑을 수행합니다.

저는 이부분에서 많은 혼란을 겪었는데  @JoinColumn(name =XXX) 에서 들어갈 칼럼명은 조인될 클래스의 @Id 이라는 것을 알게 되었습니다.

그리고 이렇게 매핑을 하면서 상당히 삐그덕 거리는 일이 발생하였습니다.


## 3. DB/도메인 재설계
JPA로 매핑을 하면 할수록 DB를 고치고 싶은 생각이 들었습니다. 기존에 플래그를 설정했던 부분을 조금더 직관적으로 바꾸고 싶었고 어떤 객체는 연관관계가 있고 어떤 객체는 연관관계가 없는 것이 마음에 들지 않았습니다.
또한 플래그를 단순 숫자로 정하였기 때문에 여러 단계를 추가하거나 변경했을 경우 처리하기가 까다롭다는 점(JPA로 변경하니까 @Enumerated을 사용해보겠다는 목적은 덤) 등 DB를 변경해보면 어떨까 하는 생각을 갖게 되었습니다.

현재 DB를 변경하게 되면 생길 문제는
1. 이미 데이터가 있다. (GeneratedValue가 잘 돌아갈까?)
2. 일부 값들은 boolean 역할을 하고 있다. (코드상 변경되는 곳을 다 찾아야한다)

음... 결국 mybatis에서 jpa로 변경하기 위해서는 대공사가 필요한... 재미있는 일이 펼쳐질 것 같습니다...
