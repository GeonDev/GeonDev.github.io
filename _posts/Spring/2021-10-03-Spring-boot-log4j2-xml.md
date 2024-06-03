---
layout: post
title: Springboot + log4j2 적용하기
date: 2021-10-03
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true
---

로그를 기록하고 저장하기 위해 log4j를 사용하는데 한번 적용하면 다시 만지는 일이 거의 없어서 다시하려고 하면 까먹는다.... 자세하게는 아니지만 간단하게 사용방법을 기록하고 최신버전인 log4j2를 스프링부트에 적용해보려고 한다.

# 1. 의존성 주입
사실 스프링부트에는 log4j의 업그레이드(?) 판인 Logback이 이미 내장되어 있고 스프링 프로필을 이용하여 빌드하는 환경에 따라 별도의 설정을 해주는 좋은 기능을 갖고 있다. 지금 시점에서 log4j2를 굳이 적용한 것은 특별한 의도가 있어서가 아니라 xml이 조금 더 간단해졌다는 점을 빼면 없다. 그래도 적용해 보려고 한다.

spring-boot-starter-web에는 logback을 이미 내장하고 있기때문에 스프링부트에 내장된 logback를 사용하지 않겠다고 선언해야 한다. 먼저 pom.xml에서  spring-boot-starter-web을 찾아 다음 내용을 추가한다.

```
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-web</artifactId>				
	   <exclusions>
		 <!-- log4j2 사용을 위해 내장 Logger 제외 -->
		<exclusion>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-logging</artifactId>
		</exclusion>
	</exclusions>
</dependency>

<!-- log4j2 설정 -->
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-log4j2</artifactId>
</dependency>
```

spring-boot-starter-web에 내장된 spring-boot-starter-logging을 사용하지 않겠다고 선언하고 spring-boot-starter-log4j2를 사용하겠다고 선언하였다. 스프링부트에서 logback을 사용할때는 logback에 바로 접근하지 않고 **slf4j**를 통하여 logger를 사용하는 것이 일반적이다.

이렇게 slf4j를 통하여 logger를 사용하게 되었을때 가장 큰 장점은 지금 내가 하는 것처럼 새로운 log4j를 적용할때 소스코드는 변경을 하지 않고 xml만 이용하여 변경이 가능하다는 점이다.


log4j2를 사용하기 위해서는 원래 log4j2 라이브러리 뿐 아니라 앞에서 설명한 slf4j-api, log4j-core-2, log4j-slf4j-impl-2같은 별도의 라이브러리를 더 추가하여야 하지만 spring-boot-starter-log4j2를 적용하면 이런 라이브러리들도 모두 자동으로 주입해준다.

# 2. log4j2.xml 설정
![](/images/it/imlog6e54j32g.png){: .align-center}

당연히 log4j2.xml의 위치는 최상위 resource경로에 있어야 한다. 처음에는 이 xml이 어디에 위치하여야 하는지도 몰라서 해맸던 경험이 있다.

logger는 레벨이 있어 log4j2를 설정할때 일정 레벨이하의 로그가 찍힌 경우 무시할수 있다.
**TRACE > DEBUG > INFO > WARN > ERROR > FATAL**
사실 나는 DEBUG, INFO, WARN 정도만 사용하는 것 같다.



```
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
    <Appenders>
        <Console name="LogToConsole" target="SYSTEM_OUT">
            <PatternLayout pattern="%d{HH:mm:ss} [%t] %-5level %logger{36} - %msg%n"/>
        </Console>

        <!-- log 파일을 저장하는 위치와 정책 -->
		<RollingFile name="SaveFile">
		  <FileName>./workspace/VIG/logs/VIG.log</FileName>
		  <FilePattern>./workspace/VIG/logs/%d{yyyy-MM-dd}.log</FilePattern>
		  <PatternLayout pattern="%d{yyyy-MMM-dd HH:mm:ss} [%t] %-5level %logger{36} - %msg%n"/>
		  <Policies>
		    <TimeBasedTriggeringPolicy interval="1" modulate="true" />
		  </Policies>
		  <DefaultRolloverStrategy max="1000" />
		</RollingFile>


    </Appenders>
    <Loggers>

         <!-- 기본(디폴트) loger 설정-->
        <Root level="INFO">
            <AppenderRef ref="LogToConsole"/>
        </Root>


        <Logger name="org.springframework" level="WARN" additivity="false">
            <AppenderRef ref="LogToConsole"/>
        </Logger>

        <Logger name="com.vig" level="DEBUG" additivity="false">
            <AppenderRef ref="LogToConsole"/>
            <!--com.vig 패키지의 로그는 파일로 저장한다. -->
            <AppenderRef ref="SaveFile"/>
        </Logger>

    </Loggers>
</Configuration>
```

log4j2.xml 파일은 다음과 같이 설정하면 된다 여기서  Console name="LogToConsole", RollingFile name="SaveFile"과 같은 설정은 변경하여도 작동에는 상관이 없다.

pattern 같은 경우에는 자세히 알지도 못하고 다른 사람들이 설명을 잘 해놓은 것이 있으니 추가 설명은 하지 않겠다.

**RollingFile**은 로그를 파일로 저장하기 위한 설정을 하는 곳으로 원하는 경로, 파일의 생성 주기, 파일 최대 크기, 개수 등을 정할수 있다. 여기서는 프로젝트 폴더 아래에 있는 logs 디렉토리에 하루에 한번 파일을 생성하고 최대 10000개 까지만 생성한다.

상대경로로 ./위치는 이클립스의 실행 경로 이기 때문에 프로젝트 폴더 아래로 이동 시키려면 ./workspace/VIG/ 로 지정하여야 했다.

파일크기에 따라서 롤링을 지정하려면
```
<!-- Rolling File Appender -->
<RollingFile name="RollingFile">
  <FileName>C:/log/mylog.log</FileName>
  <FilePattern>C:/log/size-based-logs/%d{yyyy-MM-dd-hh}-%i.log.zip</FilePattern>
  <PatternLayout>
	<Pattern>%d{yyyy-MMM-dd HH:mm:ss a} [%t] %-5level %logger{36} - %msg%n</Pattern>
  </PatternLayout>
  <Policies>
	<SizeBasedTriggeringPolicy size="10 KB" />
  </Policies>
  <DefaultRolloverStrategy max="5" />
</RollingFile>   
```
이런식으로 SizeBasedTriggeringPolicy에 파일 사이즈를 지정하면 된다. 파일 사이즈는 MB, GB로 지정할 수 있다.



** Loggers** 부분을 보면 패키지마다 적용할 logger를 지정할수 있다. 전체 디폴트 로그는 ROOT로 INFO 이상의 메세지만 출력하고 따로 파일로 저장하지는 않는다. org.springframework 패키지에 로그는 WARN 이상만 표시하고 저장하지는 않는다.

프로그래머가 생성하는 com.vig 패키지에서는 DEBUG 이상을 출력하고 출력된 로그를 저장한다.


# 3. logger 사용

```
package com.vig.aop;


import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
@Aspect
public class LoggerAspect {

	// log4j 사용
	public static final Logger logger = LoggerFactory.getLogger(LoggerAspect.class);

	//@Around("execution(* com.board..controller.*Controller.*(..)) or execution(* com.board..service.*Impl.*(..)) or execution(* com.board..mapper.*Mapper.*(..))")
	@Around("execution(* com.vig.controller.*Controller.get*(..))")
	public Object printLog(ProceedingJoinPoint joinPoint) throws Throwable {


		//가지고온 joinPoint의 타입이름을 갖고온다 -> 여기서는 컨트롤러 이름
		String name = joinPoint.getSignature().getDeclaringTypeName();

		//전달되는 메소드의 파라미터를 담는다.
		Object[] parms = joinPoint.getArgs();		

		long startTime = System.currentTimeMillis();

		//Around로 가져온 프로세스가 실행된다.
		Object ret = joinPoint.proceed();

		// 메소드가 실행될때 까지 걸리는 실행시간 측정
		long time = System.currentTimeMillis() - startTime;


		logger.info(name + "." + joinPoint.getSignature().getName() + "() " + "WorkTime : "+ (time/1000.0f));

		if(parms != null ) {
			for(Object t : parms) {
				logger.info("ParameterType :" + t.getClass().getName());
			}
		}


		return ret;
	}
}

```

사용 예시로 AOP를 적용한 부분을 가지고 왔다. 앞서 설명한 것 처럼 Logger를 사용할때는 slf4j를 통하여 사용하기 때문에 org.slf4j.Logger, org.slf4j.LoggerFactory를 임포트 한 것을 알 수 있다. 이렇게 임포트 하지 않고 @slf4j를 선언해서 사용하는 것도 가능하다.

```
public static final Logger logger = LoggerFactory.getLogger(LoggerAspect.class);
```

부분에서는 해당 로거를 사용하는 클래스가 어디인지를 명시해서 해당 패키지가 어디인지 판단하는 기능을 한다. 이렇게 로거가 적용되었다.
