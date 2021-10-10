---
title:  "이미지 검색프로젝트(VIG) Migration/Refactoring -1"
toc: true
toc_sticky: true
categories:
  - IT
tags:   
  - Spring
  - Springboot
  - Vision
  - Migration
  - Refactoring  
---



>[소스 코드](https://github.com/GeonDev/VIG)


# 1. VIG(Visual Inspiration Gallery) 란?
사용자 맞춤형 이미지 검색 기반 포트폴리오(핀터레스트 & 비헨스) 클론 프로젝트 입니다.   
머리속에 있는 막연한 이미지와 유사한 이미지를 찾고 싶을때 사용자의 검색기록, 키워드 등을 활용하여 찾고 있는 이미지와 가장 유사한 이미지를 찾습니다.

사용자가 검색하기 위하여 입력한 키워드가 많아질수록 점점 해당 키워드와 겹치는 유사한 이미지를 보여주면서 사용자가 생각했던 이미지와 가장 유사한 이미지를 제시하는 것을 목적으로 합니다.

## 시연 동영상
[![VIG](/assets/images/project/e35cf1fe9f99t1.jpg)](https://www.youtube.com/watch?v=Ck9diBmMfdU) 




# 2. Refactoring 목표
프로젝트를 진행하면서 몇몇 아쉬운 점이 있었습니다. 처음 스프링프로젝트를 만들다 보니 구조상 아쉬운 부분이나 프로젝트를 제작하면서 개선하고 싶었던 점이 있었는데 마침 회사 프로젝트가 스프링 부트로 진행되면서 개인공부를 위해 스프링부트로 전환과 함께 아쉬운 점을 개선해 보려합니다.

- **필수 목표**
  - SpringBoot 마이그레이션
  - 프로젝트 디렉토리 구조 간소화
  - DB 비밀번호 보안(암호화) 도입
  - Controller 연산 최소화 및 Service로 이전  
  - Spring interceptor 도입(로그인 부분)
  - AOP 도입 (로그 저장용으로 사용)
  - DB Query 최적화
  - Vision 처리속도 개선(또는 Thread 구조 변경)
  <br/>
  
 - **선택 사항**
   - View에 thymeleaf 적용
   - Spring JPA 적용
   - spring scheduler 분리
   - https 적용
   <br/> 
   
Refactoring를 하게 되면서 스프링부트로 전환하는 것과 구조/로직상 아쉬웠던 점에 대해서 개선을 하려고 합니다. 프로젝트를 제작할 때 Controller를 중심으로 작업내용을 나누었고 덕분에(?) Service를 공용으로 사용하는 경우가 많아 Controller에 많은 로직이 들어가게 되었습니다. 디렉토리 구조를 개선하면서 동시에 이러한 문제를 개선해보려고 합니다.

또한 AWS에 올릴 때 DB관련 정보를 암호화 하지 않아 불안하다고 생각하였는데 암호화를 적용하여 최소한의 보안을 적용하려고 합니다.

마지막으로 이미지에서 키워드, 색상 등 정보를 추출하기 위해 Google Vision API를 사용하고 있는데 Vision의 처리속도도 느린편이고 1분에 1800개라는 제한이 있어 최초 초기화시 대기를 하는 일이 많았습니다. 이러한 처리를 쓰레드 분리를 통해 개선해 보고자 합니다.


# 3. Springboot Migration
## 프로젝트 생성
![](/assets/images/project/e35cf1fe9f99t2.jpg)

스프링부트에서 jar, themeleaf 사용을 권장하고 있지만 View를 크게 수정하고 싶지는 않았습니다. 기존에 사용하던 JSP를 사용하기 위하여 pom.xml에 dependency 를 추가하고 application.properties에 일부 설정을 추가하였습니다.
```
 <!-- pom.xml JSP 적용 -->
 <dependency>
	<groupId>javax.servlet</groupId>
 	<artifactId>jstl</artifactId>
  </dependency> 

  <dependency>
  	<groupId>org.apache.tomcat.embed</groupId> 
 	<artifactId>tomcat-embed-jasper</artifactId>
    <scope>provided</scope>
  </dependency>
```
 패키지는 보통 3개로 나누지만(com.example.demo) 편의상 2개(com.demo)로 변경하였습니다. 

## 톰캣 설정
스프링부트의 장점 중 하나는 내장 톰켓이라고 생각하지만 현재 회사에는 외부 톰켓을 사용하여 프로젝트를 구성하고 있습니다. 이번 마이그레이션은 공부 목적도 있기  때문에 외부톰켓을 사용하도록 구성하려고 합니다.

war를 사용하고 스프링부트 내장 톰켓이 아닌 외부 톰켓을 사용하기 위해서는 dependency에 tomcat을 추가해 주어야 합니다. 처음에는 spring-boot-web-start에 tomcat이 포함되어 있으니 필요없을 것이라고 생각했는데 추가를 하지 않으면 외부 톰켓에 프로젝트를 올려 실행할때 스프링부트 프로젝트를 불러오지 못했습니다. 또한 scope를 설정하지 않아도 문제가 생기는 것을 알게 되었습니다. 아무래도 maven을 추가로 공부할 필요할 것 같습니다.

```

<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-web</artifactId>				
		<exclusions>
		  <!-- 스프링부트 내장 톰켓 제거 -->
		     <exclusion>
		     <groupId>org.springframework.boot</groupId>
		    <artifactId>spring-boot-starter-tomcat</artifactId>
		</exclusion>		       
	</exclusions>
</dependency>
        
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-tomcat</artifactId>
	<scope>provided</scope>
</dependency>
```

### 톰캣 캐쉬 설정
VIG는 별도의 파일서버 없이 WAS에 사용하는 리소스를 로드합니다. 아무래도 사진이미지가 많다보니 톰캣 기본 메모리인 10MB로는 부족하여 경고 메세지가 출력됩니다. 
![](/assets/images/project/e35cf1fe9f99t3.png)

작동하는데 문제는 없지만 불필요한 로그를 보고 싶지 않았습니다. 기존 스프링에서는 톰켓 설정(conf)에서 캐쉬를 늘려주는 설정 값을 넣어 로그를 제거했는데 스프링부트로 전환을 하니 작동하지 않습니다....
```
<Resources cacheMaxSize="100000" cachingAllowed="true"/>
```

어쩔수 없이 캐쉬를 사용하지 않는다는 설정을 추가하였습니다.
```
<?xml version="1.0" encoding="UTF-8"?>

<Context>

	<WatchedResource>WEB-INF/web.xml</WatchedResource>
    <WatchedResource>WEB-INF/tomcat-web.xml</WatchedResource>
    <WatchedResource>${catalina.base}/conf/web.xml</WatchedResource>	
    
    <Resources antiResourceLocking="false" cachingAllowed="false" />

</Context>
```

## 디렉토리 구조
면접 중에 디렉토리 구조가 다소 복잡하다는 말을 들었습니다. 아마 Service 별로 패키지를 나누고 또 interface와 implements를 분리해 두어서 복잡하게 보였다고 생각합니다.
개선작업을 진행하면서 일단 DAO의 implement를 제거하고 interface로 Mybatis와 직접 연결하도록 변경하였습니다. 
개인적으로는 service 별로 나누는 것이 더 좋다고 생각하지만 구조를 조금 더 단순화 하기 위하여 기존 서비스 별로 나누어 있던 패키지 구조를 repository, service, controller와 같이 기능별로 분리하였습니다. 

기존 디랙토리 구조는 service 또한 interface로 구성되어 있었습니다. 
이러한 구조는 서비스를 구현하였을 때의 장점은 어떤 요구사항이 왔을때 service를 변경하는 것이 아닌 serviceImpl의 로직을 변경하거나 새로운 implements를 만들어 요구사항에 조금 더 유연하게 대응하는 것이라고 생각합니다. 하지만 지금 코드에서는 service와 serviceImpl이 1:1로 매칭되어 있고 비지니스 로직을 자주 변경할 필요가 없기 때문에 굳이 이런 구조를 갖고 있을 필요는 없다고 생각하였습니다.

기존 디렉토리 구조가 아래와 같이 Dao-impl, Service-impl 구조로 되어 있었다면
```
VIG_ORIGIN
├─.settings
├─SQL(script)
└─src
    └─main
        ├─java
        │  └─com
        │      └─VIG
        │          └─mvc
        │              ├─service
        │              │  ├─alarm
        │              │  │  └─impl
        │              │  ├─category
        │              │  │  └─impl
        │              │  ├─color
        │              │  │  └─impl
        │              │  ├─comment
        │              │  │  └─Impl
        │              │  ├─domain
        │              │  ├─event
        │              │  │  └─impl
        │              │  ├─feed
        │              │  │  └─impl
        │              │  ├─follow
        │              │  │  └─Impl
        │              │  ├─history
        │              │  │  └─Impl
        │              │  ├─image
        │              │  │  └─Impl
        │              │  ├─keyword
        │              │  │  └─impl
        │              │  ├─like
        │              │  │  └─Impl
        │              │  ├─payment
        │              │  │  └─Impl
        │              │  ├─report
        │              │  │  └─Impl
        │              │  ├─user
        │              │  │  └─Impl
        │              │  └─withdraw
        │              │      └─Impl
        │              ├─util
        │              └─web
        │                  ├─alarm
        │                  ├─chart
        │                  ├─chat
        │                  ├─comment
        │                  ├─event
        │                  ├─feed
        │                  ├─follow
        │                  ├─history
        │                  ├─like
        │                  ├─main
        │                  ├─myFeed
        │                  ├─payment
        │                  ├─report
        │                  ├─search
        │                  ├─user
        │                  └─withdraw
        ├─resource
        │  ├─config
        │  └─sql
        └─webapp
            ├─chart
            ├─chat
            ├─common
            ├─event
            ├─feed
            ├─history
            ├─main
            ├─myFeed
            ├─payment
            ├─report
            ├─search
            ├─user
            ├─WEB-INF
            │  ├─css
            │  ├─fonts
            │  ├─images
            │  │  ├─others
            │  │  └─uploadFiles
            │  └─javascript
            └─withdraw
```

변경된 디렉토리 구조는 Mybatis Framework에서 Dao Interface의 id로 매핑하여 implement를 생성하지 않고 Service Interface를 class로 변경하여 조금 더 구조를 쉽게 파악할 수 있도록 변경하였습니다.
```
VIG
├─.mvn
│  └─wrapper
├─.settings
├─SQL(script)
└─src
    ├─main
    │  ├─java
    │  │  └─com
    │  │      └─vig
    │  │          ├─config
    │  │          ├─controller
    │  │          ├─domain
    │  │          ├─repository
    │  │          ├─restController
    │  │          ├─service
    │  │          └─util
    │  ├─resources
    │  │  ├─mapper
    │  │  └─static
    │  │      ├─css
    │  │      ├─fonts
    │  │      ├─images
    │  │      │  ├─others
    │  │      │  └─uploadFiles
    │  │      └─javascript
    │  └─webapp
    │      └─WEB-INF
    │          └─views
    │              ├─chartView
    │              ├─chatView
    │              ├─common
    │              ├─eventView
    │              ├─feedView
    │              ├─historyView
    │              ├─mainView
    │              ├─myFeedView
    │              ├─paymentView
    │              ├─reportView
    │              ├─searchView
    │              ├─userView
    │              └─withdrawView
    └─test
        └─java
            └─com
                └─vig
```
 
## DB 비밀번호 암호화
프로젝트를 처음 제작할때 DB 비밀번호를 암호화 하겠다는 생각을 하지 못했습니다. 사실 필요성을 잘 느끼지 못했는데 어차피 코드도 공개되어 있고 개인프로젝트라 딱히 문제가 없을 줄 알았습니다. 
하지만 AWS에 웹 서버를 올리고 배포를 하면서 비정상적으로 사용량이 올라가는 문제와 해킹 경고 메일을 보면서 암호화를 하지 않아 불안하다는 생각을 하게 되어 Jasypt를 적용하여 암호화하는 방법을 찾아보게 되었습니다. 

스프링부트에서는 Config를 .java를 이용하여 적용한다는 것이 신기했습니다. 먼저 dependency를 추가하고 JasyptConfig 클래스를 만들어서 암호화를 적용하였습니다.
```
<!--  jasypt  암호화-->
<dependency>
	<groupId>com.github.ulisesbocchio</groupId>
	<artifactId>jasypt-spring-boot-starter</artifactId>
	<version>2.0.0</version>
</dependency>
```

```
@Configuration
public class JasyptConfig {

	private static final String ENCRYPT_KEY = "XXXXX";

	@Bean("jasyptStringEncrptor")
	public StringEncryptor stringEncryptor() {
		PooledPBEStringEncryptor encryptor = new PooledPBEStringEncryptor();
		SimpleStringPBEConfig config = new SimpleStringPBEConfig();
		config.setPassword(ENCRYPT_KEY);
		config.setAlgorithm("PBEWithMD5AndDES");
		config.setKeyObtentionIterations("1000");
		config.setPoolSize("1");
		config.setSaltGeneratorClassName("org.jasypt.salt.RandomSaltGenerator");
		config.setStringOutputType("base64");
		encryptor.setConfig(config);
		return encryptor;
	}

}
```
결과적으로 아래와 같은 결과물이 생겼는데 물론 git을 이용하여 소스코드를 보고 어떤 내용인지 확인하고 복호화를 할 가능성은 있지만 이전에 완전 공개되어 있는 것 보다는 조금이나마 안전할 것이라고 생각했습니다.

spring.datasource.url=ENC(aHuB5KHfETMI7NHpIUTv+pCOnGVt7k3rlLQ3rTpWbPs7+XPyhDw3lg==)
spring.datasource.username=ENC(BIWadOY2h/E0Bo4ltc51dw==)
spring.datasource.password=ENC(xwMsH4cKMRPC4xCtzElKpA==)


추가적으로 기존 Context Path를 /로 변경하는 것을 끝으로 기본적인 Springboot Migration은 모두 끝났습니다. 
다음 부터는 기존에 잘못 설계된 Service - Controller 관계를 정리하고 Interceptor를 도입해서 인증을 위해 어지럽게 되어있는 if-else 문을 정리하려고 합니다.