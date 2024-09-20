---
layout: post
title: 스프링 트랜젝션 수동으로 적용하기 (PlatformTransactionManager) 
date: 2024-09-20
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

트랜젝션이 필요한 로직이 있을때 대부분 선언적 트랜젝션인 **@Transactional**를 사용하여 트랜젝션을 적용하였다. Spring AOP를 사용해 프록시 패턴으로 구현 되어 있고 클레스나 메소드에 사용할수 있어 아주 간단하게 트랜젝션을 명시해 줄수 있어 자주 사용하였는데 인앱 결제로직을 구현하면서 문제가 발생하였다. 

내가 수정해야 하는 인앱 결제 로직은 
  1. 같은 클래스 안에 있는 여러 메소드를 단계적으로 불러 작동한다.
  2. 특정 메소드 안에서 트랜젝션이 선언된 프로시저를 사용하는 메소드가 있다.
  3. 배치성 작업이기 때문에 하나의 메소드에 여러 DB 작업이 섞여 있다.
  4. try/catch 문을 활용하여 인앱 결제 API(google, apple)에 응답한다.

일단 같은 클래스 안에 있는 메소드를 여러 단계로 부르면서 AOP를 활용한 트랜젝션은 전파되지 않았다. 전파속성을 아무리 바꾸어도 자식 메소드가 까지 전파되지 않았다. 
또 특정 작업이 실패 했을때 필요에 따라 일부 작업을 롤백하고 로그를 남기는 것이 효율적인데 선언적 트랜젝션을 사용하면 메소드 전체가 롤백되기 때문에 효율적인 작업이라고 생각하지 않았다.  
(일부 작업을 다시 해야 하는 수고로움이 있다.)

트랜젝션이 전파되지 않는 문제는 클래스를 분리하여 해결하거나 self-injection을 하면 되지만 불필요한 클래스를 생성해야하거나 순환참조가 될수 있는 문제 등 깔끔한 해결이 아니라고 생각하였다. 

결국에 조금더 세밀하게 트랜젝션을 관리하기 위하여 TransactionManager 인터페이스를 사용하기로 하였다.

# 1. PlatformTransactionManager 

![](/images/spring/172029548-4c14-b5e8-2241d4b1fe34.png){: .align-center}

스프링은 JDBC, JPA 등 다양한 방식의 DB 접근 방식이 존재 하는데 사용하는 방식마다 transaction을 구성하는 방식이 조금씩 다르게 되어 있다. 이러한 문제를 객체지향적(?)인 방법으로 해결하는 것이 TransactionManager 이다. 

개발자가 각각의 방식으로 Transaction을 구현하는 것이 아니라 각각의 기술에 맞는 TransactionManager가 이미 있고 이를 주입 받아 사용하면 된다. 다만 모든 기술에 따라 TransactionManager가 구현되어 있다고 해도 실제 사용할때는 스펙이 상이 할수 있기 때문에 
PlatformTransactionManager 라는 interface를 사용하여 동일한 메소드를 호출하도록 설정하게 된다.

~~~
public interface PlatformTransactionManager extends TransactionManager {
   TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
         throws TransactionException;

   void commit(TransactionStatus status) throws TransactionException;

   void rollback(TransactionStatus status) throws TransactionException;

}
~~~
PlatformTransactionManager 인터페이스는 이렇게 구성되어 있어 커밋과 롤백을 사용하게 된다. 다만 완전히 자동으로 설정되지는 않는 것으로 보이고 구현체를 정의하기 위해 @Bean 설정은 해주어야 한다.

## 1.1 DataSourceTransactionManager
~~~
@Bean
public PlatformTransactionManager transactionManager(@Qualifier("billDataSource") DataSource dataSource) {
	return new DataSourceTransactionManager(dataSource);
}
~~~
DataSourceTransactionManager는 JDBC를 사용하는 프로젝트에서 사용한다. 
상대적으로 단순하게 구현되어 있다고 한다. 단 JPA를 사용할때는 사용할수 없어 다른 방식이 필요하다.



## 1.2 JpaTransactionManager

~~~
@Bean
public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
	return new JpaTransactionManager(entityManagerFactory);
}
~~~
JPA를 사용할때는 dataSource가 아닌 entityManager를 전달 받아 transactionManager를 세팅하도록 되어 있다.

 상대적으로 복잡한 방식으로 구현되어 있다고 하지만 실제 사용할때는 PlatformTransactionManager를 사용하기 때문에 세팅시 부분만 고려하고 사용하면 된다.  


이외로 Hibernate를 이용하는 방법, JUnit 를 할때 사용하는 방법 등이 있다. 

Spring Boot에서는 @SpringBootApplication 애너테이션을 사용하여 애플리케이션을 설정하면, PlatformTransactionManager가 자동으로 등록되고 기본적으로 Spring Boot는 JPA와 관련된 설정을 자동으로 처리하며 JpaTransactionManager를 자동으로 설정해준다. (위에 과정을 하지 않아도 된다는 의미)

다만 여러 DB에 접근하거나 추가 적인 옵션을 설정하기 위해서는 별도로 @Bean설정을 해주어야 한다. 


# 2. TransactionTemplate 
위에서 설정한 PlatformTransactionManager를 실제 코드에서 사용할때 TransactionTemplate을 사용하여 프로그래밍적으로 트랜잭션을 관리할 수 있다. 

대략적으로 아래와 같이 사용하면 된다. 

~~~
@Service
public class MyService {

    @Autowired
    private PlatformTransactionManager transactionManager;

    public void someBusinessMethod() {

       //트랜젝션 수동 실행
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

	//트랜젝션 전파속성 지정
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

                transactionTemplate.execute(new TransactionCallbackWithoutResult() {
                    @Override
                    protected void doInTransactionWithoutResult(TransactionStatus transactionStatus) {
                        try {
                            testMethod() // 트랜젝션이 필요한 메소드 예시
                           
                        }catch (Exception e){
                            LOGGER.info("Transaction RollBack");
                            transactionStatus.setRollbackOnly();

			    //롤백 이후 별도 로직이 필요할 경우 추가 한다.
                        }
                    }
                });

    }
}
~~~
TransactionTemplate에 Bean으로 설정한 PlatformTransactionManager를 인자로 전달하여 객체를 만들고 필요에 따라 전파 속성을 설정한다.
 나같은 경우에는 해당 로직이 실행될때 기존 트랜젝션과 별도로 실행되기를 바랬기 때문에 **REQUIRES_NEW**로 설정하였다. 

그리고 TransactionTemplate의 execute()를 실행한다. execute를 실행할때 콜백이 있는 경우 new TransactionCallback \<T>() 를 활용하면 된다. 반대로 콜백이 없는 경우에는 위와 같이 new TransactionCallbackWithoutResult()을 선언하여 사용하게 된다. 

나 같은 경우는 기존 소스들이 배치 void 형식이였기 떄문에 TransactionCallbackWithoutResult을 사용하였다. 


# 3. 결론 
처음 설계 단계에서 선언적 트랜젝션이 잘 동작하도록 설계를 했다면 이런 설정이 필요 없을수도 있다. 다만 트랜젝션의 단계마다 특정한 로직을 수행하거나 기존 로직에서 일부만 트랜젝션을 적용하는 등 여러 가지 상황에서 프로그래밍적 트랜젝션은 유용하게 사용 할수 있을 것 같다. 