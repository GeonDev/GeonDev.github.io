---
layout: post
title: 스프링 의존성 주입 알아보기
date: 2022-01-10
Author: Geon Son
categories: Spring
tags: [Springboot,  Autowired]
comments: true
toc: true    
---

> [참고 블로그](https://yaboong.github.io/spring/2019/08/29/why-field-injection-is-bad/)


스프링의 특징 이라고 하면 제어역행(IoC, 사용자가 아닌 스프링에서 코드를 호출), 의존성 주입(DI, 객체를 직접 생성하지 않고 주입받아 사용),
관점지향 프로그래밍(AOP, 공통적으로 사용하는 기능을 분리) 이렇게 보통 3가지 정도를 말하는 것 같다. 이번 포스팅에서는 의존성 주입을 정리해 보려고 한다.

# 1. 의존성 주입과 결합도
정보처리기사를 취득하려고 공부할때 매일 외우던 부분이 "결합도는 낮추고 응집도는 높힌다" 는 것 이였다. 좋은 프로그램 구조를 설명하면서 나오는
부분 이였는데 스프링에서도 결합도를 낮추는 방법으로 의존성 주입을 제공한다. 결합도가 낮은 코드는 코드의 재사용성이 좋다고 설명한다.
의존성 주입을 하게 되면 주입된 객체의 작동을 자세하게 알지 못하더라도 코드를 작동시킬수 있고 사용하던 객체가 아닌 다른 객체로 전환할때도
코드의 큰 수정 없이 간단하게 작업할수 있다.

개인적으로 코드를 작성하면서 의존성 주입이 결합도를 낮추어 준다는 것을 느끼는 부분은 테스트 용으로 비슷한 기능을 하는 서비스 객체를 여러개 만들고
변경하면서 리펙토링을 할때 정도 라고 생각한다. 스프링이 아니였다면 결합도를 줄이기 위해서 인터페이스를 만들고 구현체를 만들고 바꿔가면서 작업을 해야 할것 같은데
스프링에서는 여러가지 의존성 주입 방법을 제공한다.

# 2. 의존성 주입 방법

## 2.1. 생성자 주입
개인적으로 가장 깔끔하게 의존성 주입을 할수 있는 방법이라고 생각한다. 특히 롬복과 같이 쓰면 이게 코드가 많이 줄어들고 깔끔하게(?) 정리할 수 있다.
컨트롤러에 서비스를 주입하는 과정에서 보면 다음과 같이 작업 된다.

 ```
 @Controller
 @RequestMapping("/test")
 public class TestController {


 private TestService testService;

 @Autowired
 public TestController (TestService testService){
   this.testService = testService;
 }
}  
```

만약 롬복을 사용한다면 이런식으로도 코드를 작성할 수도 있다.
RequiredArgsConstructor는 final로 선언된 필드에 대해 생성자로 만들어 준다.
```
@Controller
@RequestMapping("/test")
@RequiredArgsConstructor
public class TestController {

   private final TestService testService;

}  
```
생성자에서 의존성 주입을 하기 때문에 1회 호출 되는 것을 보장하고 주입받을 객체를 반드시 요구한다. 이방법은 스프링에서 가장 권장하는 방법이라고 한다.
이 방법으로 의존성 주입을 했을때 순환참조를 감지할수 있게 되고 스프링에서 오류를 출력하게 되기 때문에 잘못된 설계(?)를 감지하는데도 도움이 된다고 한다.
(한번 경험해보면 이쁘게? 그림도 그려준다 ㅋㅋ)

![](/images/spring/gjl5ngsdpdgfw.png){: .align-center}



## 2.2. 필드 주입
클래스 필드에 @Autowired를 선언하여 의존성 주입을 한다. 사용이 가장 간단하다. @Qualifier를 이용하여 주입될 구현체를 선택할 수도 있다.
필드 주입을 하게되면 순환참조를 감지하지 않는다. 그냥 잘(?) 생성되고 작동한다. 문제는 실제 코드가 호출되었을때 순환 참조가 발생하면서
오류가 발생한다.

```
@Controller
@RequestMapping("/test")
public class TestController {

@Autowired
private TestService testService;

}  
```

## 2.3. Setter 주입
솔직히 회사에 처음 들어와서 사용하는 걸 봤다. setter를 통해 의존성 주입을 하는 방식으로 주입받는 객체를 변경할 수 있는 장점이 있다고 한다.
Setter 주입은 필드 주입과 마찬가지로 순환 참조를 감지하지 않는다. 생성자 주입 이전에 많이 사용하던 방법이라고 한다.

```
@Controller
@RequestMapping("/test")
public class TestController {

private TestService testService;

@Autowired
private void setTestService(TestService testService){
  this.testService = testService;
}

}  
```

# 3. 결론
스프링에서 생성자 주입을 권장하는데는 이유가 있다. 생성자 주입은 1회 실행을 보장하기 때문에 주입받는 객체의 불변을 보장한다.
순환참조를 컴파일 시점에서 확인하여 오류를 방지할수 있다. 의존관계를 강제 할수 있고 의존성 주입이 되지 않는다면 컴파일 시점에서 확인할수 있다.
여러가지로 방어순단이 많은 방법이다.
