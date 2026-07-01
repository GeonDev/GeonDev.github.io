---
layout: post
title: 스프링 트랜젝션 수동으로 적용하기 (PlatformTransactionManager)
date: 2024-09-20
Author: Geon Son
categories: Spring
tags: [Transaction, PlatformTransactionManager, Spring Boot]
comments: true
toc: true
---

트랜젝션이 필요한 로직이 있을 때는 대부분 선언적 트랜젝션인 **@Transactional**을 사용했다. Spring AOP 기반의
프록시 방식이라 클래스나 메소드에 간단히 붙일 수 있고, 일반적인 CRUD 흐름에서는 충분히 편했다. 그런데 인앱
결제 로직을 수정하면서 선언적 트랜젝션만으로 처리하기 애매한 상황을 만났다.

내가 수정해야 하는 인앱 결제 로직은 다음과 같았다.
  1. 같은 클래스 안에 있는 여러 메소드를 단계적으로 불러 작동한다.
  2. 일부 작업은 DB 프로시저에서 처리하고, 일부 작업은 서비스 코드에서 처리한다.
  3. 프로시저 내부에도 트랜젝션이 선언되어 있다.
  4. 배치성 작업이기 때문에 하나의 메소드에 여러 DB 작업이 섞여 있다.
  5. try/catch 문을 활용하여 인앱 결제 API(google, apple)에 응답한다.

핵심은 프로시저에서 처리하는 작업과 서비스 코드에서 처리하는 작업을 가능하면 하나의 트랜젝션 단위로 묶고
싶었다는 점이다. 결제 검증, 지급, 로그 저장처럼 서로 맞물린 작업 중 일부만 커밋되면 데이터 정합성이 깨질 수
있기 때문이다.

또 하나의 고민은 기존 프로시저를 직접 수정할지 여부였다. 프로시저 내부 로직이 이미 복잡했고, 기존 기능을
건드렸다가 오히려 오류 가능성이 커질 수 있다고 판단했다. 새로 추가해야 하는 기능은 기존 프로시저가 수행하던
작업을 그대로 포함하면서 그 뒤에 추가 작업을 덧붙이는 형태였기 때문에, 가능하면 기존 프로시저는 그대로 두고
서비스 코드에서 추가 작업을 이어 붙이고 싶었다.

먼저 같은 클래스 안에 있는 메소드를 여러 단계로 부르면서 AOP를 활용한 트랜젝션은 기대한 방식으로 적용되지 않았다.
`@Transactional`은 프록시를 통해 호출될 때 동작하기 때문에, 같은 클래스 내부에서 메소드를 직접 호출하면
트랜젝션 경계가 새로 적용되지 않는다.

또 특정 작업이 실패했을 때 전체를 무조건 롤백하는 것이 아니라, 구간에 따라 롤백 범위나 실패 로그 저장 방식을
다르게 가져가고 싶었다. 선언적 트랜젝션만으로 처리하면 메소드 전체가 하나의 경계로 묶여 세밀한 제어가 어렵다고
느꼈다.

클래스를 분리하거나 self-injection으로 우회할 수도 있지만, 이 경우에는 기존 흐름을 크게 건드려야 했다. 그래서
프록시 호출 구조를 억지로 맞추기보다 필요한 구간에서 트랜젝션 경계를 직접 잡는 방향이 더 낫다고 판단했다.

결국 조금 더 세밀하게 트랜젝션을 관리하기 위해 `PlatformTransactionManager`와 `TransactionTemplate`을 사용하기로 하였다.

# 1. PlatformTransactionManager

![](/images/spring/172029548-4c14-b5e8-2241d4b1fe34.png){: .align-center}

스프링은 JDBC, JPA 등 다양한 DB 접근 방식을 지원한다. 접근 방식마다 트랜젝션을 시작하고 커밋/롤백하는 방법이
조금씩 다른데, 이 차이를 추상화한 것이 TransactionManager다.

개발자가 각각의 방식에 맞춰 Transaction을 직접 구현하는 것이 아니라, 기술에 맞는 TransactionManager를 주입받아
사용하면 된다. 그리고 실제 코드에서는 `PlatformTransactionManager` 인터페이스를 통해 동일한 메소드로
트랜젝션을 시작하고 commit/rollback을 수행한다.

~~~java
public interface PlatformTransactionManager extends TransactionManager {
   TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
         throws TransactionException;

   void commit(TransactionStatus status) throws TransactionException;

   void rollback(TransactionStatus status) throws TransactionException;

}
~~~
PlatformTransactionManager 인터페이스는 이렇게 구성되어 있어 커밋과 롤백을 직접 호출할 수 있다. Spring Boot에서는
대부분 자동 설정되지만, 여러 DataSource를 쓰거나 특정 TransactionManager를 명시해야 하는 경우에는 별도 `@Bean`
설정이 필요하다.

## 1.1 DataSourceTransactionManager
~~~java
@Bean
public PlatformTransactionManager transactionManager(@Qualifier("billDataSource") DataSource dataSource) {
	return new DataSourceTransactionManager(dataSource);
}
~~~
DataSourceTransactionManager는 JDBC를 사용하는 프로젝트에서 사용한다.
상대적으로 단순하게 구현되어 있다고 한다. 단 JPA를 사용할때는 사용할수 없어 다른 방식이 필요하다.



## 1.2 JpaTransactionManager

~~~java
@Bean
public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
	return new JpaTransactionManager(entityManagerFactory);
}
~~~
JPA를 사용할때는 dataSource가 아닌 entityManager를 전달 받아 transactionManager를 세팅하도록 되어 있다.

상대적으로 복잡한 방식으로 구현되어 있다고 하지만 실제 사용할 때는 PlatformTransactionManager를 사용하기 때문에
설정 부분만 고려하면 된다.


이외에 Hibernate를 이용하는 HibernateTransactionManager, 여러 리소스를 묶는 분산 트랜잭션(JTA)에 사용하는 JtaTransactionManager 등이 있다.

Spring Boot에서는 별도 설정 없이도 자동 구성(auto-configuration)이 클래스패스를 보고 적절한 PlatformTransactionManager를 등록해준다. 예를 들어 JDBC만 있으면 DataSourceTransactionManager를, JPA가 있으면 JpaTransactionManager를 자동으로 설정해준다.

다만 여러 DB에 접근하거나 추가적인 옵션을 설정하기 위해서는 별도로 @Bean 설정을 해주어야 한다.


# 2. TransactionTemplate
위에서 설정한 PlatformTransactionManager를 실제 코드에서 사용할 때 TransactionTemplate을 사용하여 프로그래밍적으로 트랜잭션을 관리할 수 있다.

대략적으로 아래와 같이 사용하면 된다.

~~~java
@Service
public class MyService {

    @Autowired
    private PlatformTransactionManager transactionManager;

    public void someBusinessMethod() {
        // 트랜젝션 수동 실행
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // 트랜젝션 전파속성 지정
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);

        transactionTemplate.executeWithoutResult(status -> {
            try {
                testMethod(); // 트랜젝션이 필요한 메소드 예시
            } catch (Exception e) {
                LOGGER.info("Transaction RollBack");
                status.setRollbackOnly();

                // 롤백 이후 별도 로직이 필요할 경우 추가한다.
            }
        });
    }
}
~~~
TransactionTemplate에 Bean으로 설정한 PlatformTransactionManager를 인자로 전달하여 객체를 만들고 필요에 따라 전파 속성을 설정한다.
프로시저 작업과 서비스 코드 작업을 하나로 묶고 싶다면 기존 트랜젝션에 참여하는 `PROPAGATION_REQUIRED`가
기본 선택지다.

반대로 실패 로그처럼 본 작업이 롤백되어도 반드시 남겨야 하는 작업은 `PROPAGATION_REQUIRES_NEW`로 분리할 수
있다. `REQUIRES_NEW`는 기존 트랜젝션과 별개의 새 트랜젝션을 만들기 때문에, 전체 작업을 하나로 묶는 목적에는
맞지 않는다.

그리고 TransactionTemplate의 `execute()` 또는 `executeWithoutResult()`를 실행한다. Spring 5.3 이상에서는
람다로 더 간결하게 쓸 수 있다. 반환값이 없으면 위처럼 `executeWithoutResult(status -> { ... })`를 쓰면 되고,
반환값이 있으면 `execute(status -> { ... return result; })` 형태로 사용하면 된다.

이때 기존 소스들이 배치성 void 메소드 중심이었기 때문에 반환값이 없는 방식이 더 잘 맞았다.


# 3. 프로시저와 서비스 코드를 하나의 트랜젝션으로 묶을 때

실무에서 가장 헷갈렸던 부분은 "프로시저 내부에도 트랜젝션이 있는데, 서비스 코드의 DB 작업과 하나로 묶을 수
있는가?"였다. 결론부터 말하면 **프로시저가 내부에서 직접 COMMIT을 해버리면 Spring 트랜젝션으로는 그 작업까지
되돌릴 수 없다.**

내가 원했던 목표는 다음 흐름이었다.

```text
Spring 트랜젝션 시작
  -> 프로시저 실행
  -> Spring 서비스 코드의 DB 작업 실행
  -> 둘 다 성공하면 commit
  -> 둘 중 하나라도 실패하면 rollback
Spring 트랜젝션 종료
```

이 목표를 만족하려면 프로시저와 서비스 코드가 같은 트랜젝션 경계 안에서 실행되어야 한다. 즉, 프로시저는
작업만 수행하고 최종 `COMMIT/ROLLBACK`은 Spring이 관리해야 한다.

Spring의 `PlatformTransactionManager`나 `TransactionTemplate`은 애플리케이션이 사용하는 커넥션에 대해
트랜젝션 경계를 만든다. 서비스 코드에서 같은 DataSource/Connection을 사용하고, 프로시저도 그 커넥션 안에서
실행되면 하나의 트랜젝션처럼 묶을 수 있다. 하지만 프로시저 내부에서 `COMMIT`이 실행되면 그 시점에 DB 작업이
확정된다. 이후 서비스 코드에서 예외가 발생해 Spring이 rollback을 호출하더라도 이미 commit된 프로시저 작업은
같이 롤백되지 않는다.

```sql
-- 주의가 필요한 프로시저 예시
CREATE PROCEDURE payment_process
    @userId BIGINT
AS
BEGIN
    BEGIN TRAN;

    UPDATE user_point
       SET point = point + 1000
     WHERE user_id = @userId;

    COMMIT TRAN;
END
```

위처럼 프로시저가 내부에서 `COMMIT`까지 해버리면 서비스 코드와 원자적으로 묶기 어렵다.

```java
transactionTemplate.executeWithoutResult(status -> {
    jdbcTemplate.update("EXEC payment_process ?", userId); // 프로시저 안에서 이미 COMMIT

    orderRepository.save(order); // 여기서 실패해도 프로시저 작업은 이미 확정될 수 있음
});
```

따라서 하나의 트랜젝션으로 묶는 것이 목표라면 프로시저의 역할을 바꾸는 편이 낫다. 프로시저 내부에서
`COMMIT/ROLLBACK`을 직접 수행하지 않고, 실패 시 예외만 던지게 만든 뒤 최종 commit/rollback은 Spring이
관리하게 하는 구조다.

```sql
-- Spring 트랜젝션과 묶기 쉬운 방향
CREATE PROCEDURE payment_process
    @userId BIGINT
AS
BEGIN
    UPDATE user_point
       SET point = point + 1000
     WHERE user_id = @userId;

    IF @@ERROR <> 0
        THROW 50000, 'point update failed', 1;
END
```

```java
transactionTemplate.executeWithoutResult(status -> {
    try {
        jdbcTemplate.update("EXEC payment_process ?", userId);
        orderRepository.save(order);
        paymentLogRepository.save(log);
    } catch (Exception e) {
        status.setRollbackOnly();
        throw e;
    }
});
```

이 구조에서는 프로시저 작업과 서비스 코드의 DB 작업이 같은 트랜젝션 경계 안에서 실행된다. 중간에 예외가 나면
Spring이 전체 rollback을 수행한다.

이때 필요한 조건은 다음과 같다.

- 프로시저 내부에서 `COMMIT`을 직접 호출하지 않는다.
- 프로시저 내부에서 독립적인 `ROLLBACK`도 가급적 직접 처리하지 않는다.
- 프로시저와 Spring 코드가 같은 DB, 같은 트랜젝션 커넥션을 사용한다.
- 프로시저 실패는 예외로 Spring 코드까지 전달한다.
- Spring 코드에서 예외를 잡아먹지 않는다. 잡아야 한다면 `status.setRollbackOnly()`를 호출한다.

이 내용을 기준으로 정리하면 다음과 같다.

- 프로시저 내부에 `COMMIT/ROLLBACK`이 있으면 Spring 트랜젝션과 완전히 하나로 묶기 어렵다.
- 하나로 묶고 싶다면 프로시저는 DB 작업과 오류 발생만 담당하고, commit/rollback은 Spring이 맡는 구조가 낫다.
- 프로시저를 수정할 수 없다면 서비스 코드에서 트랜젝션을 잡아도 완전한 원자성을 보장하기 어렵다.
- 이런 경우에는 보상 트랜젝션, 재처리 로직, 실패 로그 적재 같은 별도 정합성 전략이 필요하다.

이 상황에서 중요한 점은 전파 속성 선택이다. 프로시저 작업과 서비스 코드 작업을 하나로 묶는 것이 목적이면
`PROPAGATION_REQUIRED`가 자연스럽고, 실패 로그처럼 본 작업과 별도로 남겨야 하는 작업만 `REQUIRES_NEW`로
분리한다.

# 4. 결론
처음 설계 단계에서 선언적 트랜젝션이 잘 동작하도록 구조를 나눴다면 이런 설정이 필요 없을 수도 있다. 하지만
기존 프로시저와 서비스 코드가 섞여 있고, 일부 구간의 commit/rollback 경계를 직접 제어해야 하는 상황이라면
프로그래밍적 트랜젝션이 유용하다.

특히 프로시저 작업과 서비스 코드 작업을 하나의 단위로 묶고 싶다면 `TransactionTemplate`만 보는 것이 아니라,
프로시저 내부의 `COMMIT/ROLLBACK` 여부까지 함께 확인해야 한다. 트랜젝션 경계는 Spring 코드에만 있는 것이
아니라 DB 프로시저 안에도 숨어 있을 수 있기 때문이다.
