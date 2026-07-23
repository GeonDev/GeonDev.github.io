---
layout: post
title: 단위 테스트, 슬라이스 테스트, 통합 테스트
date: 2025-11-13
Author: Geon Son
categories: Spring
tags: [Testing, JUnit, Mockito, MockMvc, Rest Assured, Testcontainers]
comments: true
toc: true
---

#  단위 테스트, 슬라이스 테스트, 통합 테스트

| 구분 | 단위 테스트 | 슬라이스 테스트 | 통합/API 테스트 |
|------|-------------|--------------|----------------|
| 테스트 대상 | 메서드, 클래스 등 작은 코드 단위 | 특정 계층만 분리한 영역 | 요청부터 응답, DB 연동까지 전체 흐름 |
| 의존성 | 외부 의존성을 배제하고 Mock 사용 | 필요한 계층만 로드하고 나머지는 Mock 또는 제외 | 실제 스프링 컨텍스트와 인프라를 함께 사용 |
| 목적 | 내부 로직의 정확성 검증 | 웹/JPA 같은 계층의 동작 검증 | 클라이언트 관점에서 기능 전체 검증 |
| 속도 | 매우 빠름 | 빠름 | 상대적으로 느림 |
| 도구 | JUnit, Mockito | `@WebMvcTest`, `@DataJpaTest` | `@SpringBootTest`, MockMvc, Rest Assured, Testcontainers |

## 테스트 범위 잡기
처음부터 모든 메서드를 테스트하려고 하면 테스트 코드가 금방 무거워진다.
먼저 아래 범위부터 잡으면 단위 테스트, 슬라이스 테스트, 통합 테스트의 역할을 자연스럽게 나눌 수 있다.

| 테스트 종류 | 무엇을 검증할까 | 예시 |
|-------------|----------------|------|
| 단위 테스트 | Service의 핵심 비즈니스 로직 | 재고가 충분하면 주문 성공, 재고가 부족하면 예외 발생 |
| 슬라이스 테스트 | 특정 계층의 규칙과 연결 | 요청 DTO 검증 실패 시 400 반환, Repository 쿼리 동작 확인 |
| 통합/API 테스트 | Controller부터 응답까지의 요청 흐름 | 올바른 주문 요청을 보내면 200 응답과 성공 결과 반환 |

## 테스트 작성 순서
1. 성공 케이스를 1개 작성한다.
2. 실패 케이스를 1개 작성한다.
3. 경계값 케이스를 1개 추가한다. 예를 들어 재고가 10개라면 10개 주문은 성공, 11개 주문은 실패해야 한다.
4. 테스트 이름만 보고도 조건과 기대 결과를 알 수 있게 작성한다.

처음부터 커버리지 100%를 목표로 잡기보다, **핵심 기능이 깨졌을 때 바로 실패하는 테스트**를 만드는 것이 중요하다.

## 테스트 작성할 때 고려할 점
- 테스트 하나는 가능하면 한 가지 규칙만 검증한다.
- 성공 케이스만 쓰지 말고 실패 케이스도 쓴다.
- Mock은 "이 의존성이 어떤 값을 돌려준다고 가정할지"를 정하는 용도로만 쓴다.
- `verify()`는 저장, 삭제, 외부 호출처럼 반드시 실행되거나 실행되면 안 되는 동작을 확인할 때만 쓴다.
- 테스트 데이터는 너무 현실적으로 길게 만들지 말고, 검증에 필요한 값만 넣는다.
- private 메서드 자체를 테스트하려고 하지 말고, public 메서드의 결과로 검증한다.

# 단위 테스트
단위 테스트는 전체 요청 흐름보다, 비즈니스 로직을 고립해서 빠르게 검증하는 데 초점을 맞춘다.
애플리케이션의 가장 작은 단위(주로 메서드나 클래스)가 의도한 대로 동작하는지 독립적으로 확인하는 테스트다.

## 핵심 원칙: 고립(Isolation)

- 단위 테스트는 다른 컴포넌트나 외부 시스템(데이터베이스, 네트워크 등)에 의존하지 않고, 테스트 대상 코드만 고립해서 검증한다.
- 외부 의존성은 '가짜 객체(Mock Object)'를 사용하여 대체한다.
  예를 들어 `UserRepository`에 의존하는 `UserService`를 테스트할 때는, 실제 DB에 연결하는 대신 특정 값을 반환하도록 만든 가짜 `UserRepository`를 사용한다.

## 단위 테스트의 이점

### 버그 조기 발견
개발 과정에서 버그를 가장 빠르게 발견할 수 있다. 작은 단위로 검증하기 때문에 문제의 원인을 즉시 파악하고 수정할 수 있어 디버깅 시간이 줄어든다.

### 자신감 있는 리팩토링
잘 작성된 단위 테스트 스위트는 코드의 동작을 보증하는 '안전망' 역할을 한다. 내부 구조를 개선하는 리팩토링을 하더라도, 테스트가 통과한다면 기존 기능이 깨지지 않았다는 자신감을 가질 수 있다.
여기서 테스트 스위트는 여러 테스트 케이스를 논리적으로 묶은 집합을 뜻한다.

### 살아있는 문서 역할
`test_whenUserIsVip_thenApply10PercentDiscount()` 같은 테스트 케이스는 "VIP 유저에게는 10% 할인이 적용되어야 한다"는 비즈니스 요구사항을 그대로 보여주는 살아있는 문서가 된다.

## JUnit 단위 테스트
누가 읽어도 테스트의 의도를 명확히 파악할 수 있고, 유지보수하기 좋은 테스트를 작성하는 것은 매우 중요하다.
AAA와 GWT는 테스트 코드에 '구조'를 부여하여 이러한 목표를 달성하게 도와주는 검증된 패턴이다.

### JUnit 테스트의 기본 구조

#### 테스트 클래스와 @Test 어노테이션
JUnit으로 테스트를 작성하려면, 먼저 테스트 코드를 담을 클래스를 생성한다. 그리고 JUnit에게 어떤 메서드를 테스트로 실행해야 할지 알려주기 위해, 각 테스트 메서드 위에 **`@Test`** 어노테이션을 붙여야 한다.

- **`@Test`**: 이 어노테이션이 붙은 메서드는 JUnit이 실행해야 할 독립적인 테스트 케이스임을 나타낸다.

#### 테스트 실행 전후 처리: @BeforeEach
여러 테스트에서 같은 객체나 테스트 데이터를 반복해서 만든다면 `@BeforeEach`를 사용한다.
`@BeforeEach`가 붙은 메서드는 **각 `@Test` 메서드가 실행되기 전에 매번 한 번씩 실행**된다.

```java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PurchaseProcessServiceTest {

  private User testUser;
  private Product testProduct;

  @BeforeEach
  void setUp() {
    testUser = User.builder()
        .name("테스트사용자")
        .build();

    testProduct = Product.builder()
        .name("노트북")
        .price(new BigDecimal("1000000"))
        .stock(10)
        .build();
  }

  @Test
  void process_should_decreaseStock_when_productInStock() {
    // 이 테스트가 실행되기 전에 setUp()이 먼저 실행된다
  }
}
```

- `@BeforeEach`: 테스트마다 새로 필요한 객체, Mock 동작, 테스트 데이터를 준비할 때 사용
- `@AfterEach`: 테스트가 끝난 뒤 정리 작업이 필요할 때 사용
- `@BeforeAll`, `@AfterAll`: 테스트 클래스 전체에서 한 번만 실행되어야 하는 준비/정리 작업에 사용

테스트 간에 상태가 공유되면 실행 순서에 따라 결과가 달라질 수 있다.
그래서 테스트 데이터는 가능하면 `@BeforeEach`에서 매번 새로 만드는 것이 안전하다.

#### 테스트 메서드 네이밍 규칙
테스트 메서드의 이름은 그 자체로 하나의 요구사항 명세서 역할을 해야 한다. '어떤 조건에서, 무엇을 테스트하며, 어떤 결과를 기대하는지'가 이름에 명확히 드러나는 것이 좋다.
- **좋은 네이밍 규칙 예시**:
    - `메서드명_should_기대행위_when_조건`
        - `calculateTotalPrice_should_returnSum_when_givenTwoItems`
    - `given_전제조건_when_행위_then_기대결과` (GWT 패턴과 일치)
        - `givenValidPrice_whenCalculateDiscount_thenCorrectValueIsReturned`

## Arrange-Act-Assert (AAA) 패턴: "준비, 실행, 검증"
테스트를 준비(Arrange), 실행(Act), 검증(Assert)이라는 세 단계로 나눠 작성하는 방식이다.
절차가 분명하고 읽기 쉬워서 많이 쓰인다.
- **`Arrange` (준비)**: 테스트에 필요한 객체와 데이터를 준비하는 단계다. 테스트 대상 객체, Mock 객체, 입력값 등을 이때 만든다.
- **`Act` (실행)**: 준비된 데이터를 바탕으로 테스트할 **핵심 메서드를 한 번 호출**하는 단계다.
- **`Assert` (검증)**: `Act` 단계의 실행 결과가 우리가 **기대하는 값과 일치하는지** 확인하는 단계로 `assertEquals`, `assertTrue` 등의 검증 메서드를 사용한다.

실제 코드에서는 `Arrange/Act/Assert` 주석을 쓰거나, 아래의 `Given/When/Then` 주석을 쓰면 된다.
둘은 이름만 다를 뿐 테스트를 준비하고, 실행하고, 검증한다는 구조는 같다.

## Given-When-Then (GWT) 패턴: "스토리텔링 테스트"
GWT 패턴은 행위 주도 개발(BDD)에서 유래했으며,
테스트 코드를 하나의 시나리오처럼 읽히게 만드는 방식이다.

- **`Given` (주어진 상황)**: 테스트에 필요한 전제 조건과 환경을 설정한다. `Arrange` 단계와 같은 역할이다.
- **`When` (어떤 행동을 하면)**: 테스트할 실제 동작을 실행한다. `Act` 단계와 같은 역할이다.
- **`Then` (이런 결과가 나와야 한다)**: 실행 결과를 검증한다. `Assert` 단계와 같은 역할이다.

### 코드 예제: 구매 생성 시 재고 감소 테스트
아래 테스트 메서드는 뒤에서 만드는 `PurchaseProcessServiceTest` 클래스 안에 추가한다.

```java
  @Test
  @DisplayName("재고가 충분한 상품을 구매하면 재고가 감소하고 구매가 성공한다")
  void process_should_decreaseStockAndSucceed_when_productInStock_gwt() {
    // Given
    PurchaseProductRequest purchaseItem = new PurchaseProductRequest();
    ReflectionTestUtils.setField(purchaseItem, "productId", 1L);
    ReflectionTestUtils.setField(purchaseItem, "quantity", 2);

    List<PurchaseProductRequest> purchaseItems = List.of(purchaseItem);

    when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
    when(purchaseRepository.save(any(Purchase.class))).thenReturn(testPurchase);
    when(purchaseProductRepository.saveAll(anyList())).thenReturn(Collections.emptyList());

    // When
    Purchase result = purchaseProcessService.process(testUser, purchaseItems);

    // Then
    assertThat(result).isNotNull();
    assertThat(result.getTotalPrice()).isEqualTo(new BigDecimal("2000000")); // 1,000,000 * 2
    assertThat(testProduct.getStock()).isEqualTo(8); // 10 - 2

    verify(productRepository).findById(1L);
    verify(purchaseRepository).save(any(Purchase.class));
    verify(purchaseProductRepository).saveAll(anyList());
  }
```

## Mockito로 단위 테스트하기
단위 테스트의 핵심은 **고립(Isolation)** 이다.
테스트 대상 코드를 다른 의존성으로부터 분리해 해당 로직만 검증해야 한다.
하지만 대부분의 서비스 객체는 다른 Repository나 Service에 의존한다.
이때 Mockito는 '가짜 객체(Mock Object)'를 만들어 실제 의존성을 대체함으로써 완벽한 고립 테스트를 가능하게 해준다.

### 의존성 추가
Spring Boot의 spring-boot-starter-test 의존성은 기본적으로 mockito-core 라이브러리를 포함하고 있다.
여기에 JUnit 5와의 완전한 통합을 위해 mockito-junit-jupiter를 추가해주는 것이 좋다.

```groovy
dependencies {
    // spring-boot-starter-test가 mockito-core를 포함
    testImplementation 'org.springframework.boot:spring-boot-starter-test'

    // JUnit 5와 Mockito를 통합해주는 라이브러리 (권장)
    testImplementation 'org.mockito:mockito-junit-jupiter:5.12.0' // 최신 버전 사용 권장
}
```

### 테스트 클래스 기본 설정: 어노테이션 활용
```java
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)  // @SpringBootTest 대신 사용
class PurchaseProcessServiceTest {

  @InjectMocks
  private PurchaseProcessService purchaseProcessService;

  @Mock
  private PurchaseRepository purchaseRepository;

  @Mock
  private ProductRepository productRepository;

  @Mock
  private PurchaseProductRepository purchaseProductRepository;

  @Mock
  private UserRepository userRepository;

    // ... 테스트 메서드 작성
}
```

- **`@ExtendWith(MockitoExtension.class)`**: JUnit 5에 Mockito 확장을 연결한다.
- **`@Mock`**: 해당 필드를 가짜(Mock) 객체로 만든다.
- **`@InjectMocks`**: `@Mock` 어노테이션이 붙은 객체들을 감지하여, 테스트 대상 객체(`purchaseProcessService`)에 자동으로 주입해준다.

## Mockito 기본 사용법: given-when-then
1. **`given` (준비)**: 테스트에 필요한 Mock 객체를 만들고, `when(...).thenReturn(...)`으로 동작(Stub)을 미리 정의한다.
2. **`when` (실행)**: 테스트할 실제 메서드를 호출한다.
3. **`then` (검증)**: 결과를 단정문(`Assertions`)으로 검증하거나, Mock 객체의 특정 메서드가 **예상대로 호출되었는지 `verify()`를 통해 확인**한다.

## AssertJ로 테스트 결과 검증하기
단위 테스트에서 가장 자주 쓰는 검증 도구는 AssertJ의 `assertThat(...)` 계열 메서드다.
값 비교, 컬렉션 확인, 예외 검증을 모두 같은 스타일로 작성할 수 있어서 읽기 쉽다.

### 1. `assertThat(...)` - 값과 상태 검증
`assertThat(...)`은 어떤 값을 검증할지 먼저 넘기고, 그 뒤에 기대 조건을 체이닝해서 붙이는 방식이다.

```java
assertThat(result).isNotNull();
assertThat(result.getTotalPrice()).isEqualTo(new BigDecimal("2000000"));
assertThat(testProduct.getStock()).isEqualTo(8);
```

- `isNotNull()`: 값이 `null`이 아닌지 확인
- `isEqualTo(...)`: 기대값과 정확히 같은지 확인
- `isTrue()`, `isFalse()`, `contains(...)`, `hasSize(...)` 같은 메서드도 같은 방식으로 이어서 쓸 수 있다

예를 들어 리스트를 검증할 때는 이렇게 쓸 수 있다.

```java
assertThat(products).hasSize(2);
assertThat(products).contains(savedProduct);
```

### 2. `assertThatThrownBy(...)` - 예외 검증
예외가 발생해야 하는 경우에는 `assertThatThrownBy(...)`를 사용한다.
람다 안에 실행 코드를 넣고, 어떤 예외가 발생해야 하는지 뒤에서 검증한다.

```java
assertThatThrownBy(() -> purchaseProcessService.process(testUser, purchaseItems))
    .isInstanceOf(ServiceException.class)
    .hasMessageContaining("OUT_OF_STOCK");
```

- `isInstanceOf(...)`: 예외 타입 검증
- `hasMessageContaining(...)`: 예외 메시지 일부 검증

즉, "예외가 났는가"만 보는 것이 아니라 "어떤 예외가, 어떤 메시지로 났는가"까지 함께 확인할 수 있다.

### 3. `assertThat(...)`과 `verify()`의 차이
둘 다 테스트에서 자주 같이 쓰이지만, 확인하는 대상이 다르다.

- `assertThat(...)`: **결과 값이나 상태**를 검증한다.
- `verify(...)`: **Mock 객체의 메서드 호출 여부**를 검증한다.

예를 들면 아래처럼 역할이 나뉜다.

```java
assertThat(result.getTotalPrice()).isEqualTo(new BigDecimal("2000000")); // 결과 검증
verify(purchaseRepository).save(any(Purchase.class));                    // 호출 검증
```

보통은 "반환값, 상태 변화"는 `assertThat(...)`으로 보고, "저장, 삭제, 외부 호출이 실제로 일어났는가"는 `verify(...)`로 확인하면 된다.

### 자주 쓰는 검증 메서드 표

| 목적 | 메서드 예시 | 설명 |
|------|-------------|------|
| null 아님 확인 | `assertThat(result).isNotNull()` | 결과 객체가 정상적으로 생성됐는지 확인 |
| 값 비교 | `assertThat(totalPrice).isEqualTo(expected)` | 실제 값과 기대값이 같은지 확인 |
| boolean 검증 | `assertThat(success).isTrue()` | true/false 상태 확인 |
| 컬렉션 크기 검증 | `assertThat(products).hasSize(2)` | 리스트 크기 확인 |
| 컬렉션 포함 여부 | `assertThat(products).contains(savedProduct)` | 특정 값이 포함됐는지 확인 |
| 예외 타입 검증 | `assertThatThrownBy(() -> service.call()).isInstanceOf(ServiceException.class)` | 기대한 예외가 발생했는지 확인 |
| 예외 메시지 검증 | `assertThatThrownBy(() -> service.call()).hasMessageContaining("OUT_OF_STOCK")` | 예외 메시지 일부 확인 |
| 호출 여부 검증 | `verify(repository).save(any())` | Mock 메서드가 호출됐는지 확인 |
| 호출 금지 검증 | `verify(repository, never()).delete(any())` | 호출되면 안 되는 메서드가 실행되지 않았는지 확인 |
| 호출 횟수 검증 | `verify(repository, times(1)).save(any())` | 정확히 몇 번 호출됐는지 확인 |

### PurchaseProcessService 단위 테스트 예시
```java
@Service
@RequiredArgsConstructor
public class PurchaseProcessService {

  private final PurchaseRepository purchaseRepository;
  private final ProductRepository productRepository;
  private final PurchaseProductRepository purchaseProductRepository;
  private final UserRepository userRepository;

  @Transactional
  public Purchase process(User user, List<PurchaseProductRequest> purchaseItems) {
    // 이제 purchase 메서드는 "무엇을 하는지" 명확히 보여준다.
    Purchase purchase = createAndSavePurchase(user);
    List<PurchaseProduct> purchaseProducts = createAndProcessPurchaseProducts(purchaseItems,
        purchase);
    BigDecimal totalPrice = calculateTotalPrice(purchaseProducts);

    purchase.setTotalPrice(totalPrice);
    return purchase;
  }

//...

}
```

#### 테스트 케이스 초기 설정  

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)  // @SpringBootTest 대신 사용
class PurchaseProcessServiceTest {

  @InjectMocks
  private PurchaseProcessService purchaseProcessService;

  @Mock
  private PurchaseRepository purchaseRepository;

  @Mock
  private ProductRepository productRepository;

  @Mock
  private PurchaseProductRepository purchaseProductRepository;

  @Mock
  private UserRepository userRepository;

  private User testUser;
  private Product testProduct;
  private Purchase testPurchase;

  @BeforeEach
  void setUp() {
    testUser = User.builder()
        .name("테스트사용자")
        .email("test@example.com")
        .passwordHash("hashedPassword")
        .build();

    ReflectionTestUtils.setField(testUser, "id", 1L);

    testProduct = Product.builder()
        .name("노트북")
        .price(new BigDecimal("1000000"))
        .stock(10)
        .build();

    ReflectionTestUtils.setField(testProduct, "id", 1L);

    testPurchase = Purchase.builder()
        .user(testUser)
        .totalPrice(BigDecimal.ZERO)
        .status(PurchaseStatus.PENDING)
        .build();

    ReflectionTestUtils.setField(testPurchase, "id", 1L);
  }
}
```

**테스트 1: 재고가 충분한 상품을 구매하면 재고가 감소하고 구매가 성공한다**

- **검증 목표**: 이 테스트는 `purchaseProcessService`의 `process` 메서드가 호출됐을 때, **재고가 충분한 상품 구매가 정상적으로 처리되는지**를 검증한다. 구체적으로는 다음을 확인한다.
    - 상품의 재고가 구매 수량만큼 **정확히 감소하는지**.
    - 총 구매 금액이 **올바르게 계산되는지**.
    - `productRepository`, `purchaseRepository`, `purchaseProductRepository`의 관련 메서드들이 **예상대로 호출되는지**.

- **테스트 코드**: 앞서 "Given-When-Then (GWT) 패턴" 절에서 본 `process_should_decreaseStockAndSucceed_when_productInStock_gwt()`와 같다. 위 `setUp()`에서 준비한 `testUser`, `testProduct`를 그대로 사용하며, 재고 감소, 총액 계산, 각 Repository 호출 여부를 함께 검증한다.

## 경계값과 예외 상황 테스트
대부분의 버그는 일반적인 '성공 케이스'가 아닌, 예상치 못한 경계값이나 예외적인 상황에서 발생한다.
견고한 코드를 만들려면 이런 엣지 케이스를 꾸준히 테스트해야 한다.

### 예외 상황 테스트
성공 케이스만 검증하면 "실패해야 할 때 제대로 실패하는지"는 보장되지 않는다.
예외 테스트에서는 두 가지를 함께 확인하는 것이 중요하다.

1. 기대한 예외가 실제로 발생하는가
2. 예외가 발생했을 때, **일어나면 안 되는 후속 동작이 실행되지 않았는가** (`verify(..., never())`)

```java
  @Test
  @DisplayName("존재하지 않는 상품을 구매하면 예외가 발생하고 구매 상품 저장이 일어나지 않는다")
  void process_should_throwException_when_nonExistentProduct() {
    // Given: 존재하지 않는 상품 ID로 요청
    PurchaseProductRequest purchaseItem = new PurchaseProductRequest();
    ReflectionTestUtils.setField(purchaseItem, "productId", 999L);
    ReflectionTestUtils.setField(purchaseItem, "quantity", 1);
    List<PurchaseProductRequest> purchaseItems = List.of(purchaseItem);

    when(productRepository.findById(999L)).thenReturn(Optional.empty());

    // When & Then: 예외 발생을 검증
    assertThatThrownBy(() -> purchaseProcessService.process(testUser, purchaseItems))
        .isInstanceOf(ServiceException.class);

    // 예외가 났으므로 구매 상품 저장은 절대 호출되면 안 된다
    verify(purchaseProductRepository, never()).saveAll(anyList());
  }
```

`assertThatThrownBy`(AssertJ)는 `assertThrows`(JUnit)와 같은 역할을 하지만, `.isInstanceOf().hasMessageContaining()` 처럼 메시지·예외 타입을 체이닝으로 검증할 수 있어 가독성이 좋다.

### 경계값 테스트는 @ParameterizedTest로
재고가 10개일 때 1개·9개·10개 주문은 성공하고, 11개는 실패해야 한다. 이런 경계값들을 테스트 메서드로 하나씩 복사하면 코드가 금방 지저분해진다.
JUnit 5의 `@ParameterizedTest`를 쓰면 입력값만 바꿔가며 같은 검증을 반복할 수 있다.

```java
  @ParameterizedTest(name = "재고 10개일 때 {0}개 주문은 성공한다")
  @ValueSource(ints = {1, 9, 10})   // 경계 안쪽과 경계값(딱 재고만큼)
  void process_should_succeed_when_quantityWithinStock(int quantity) {
    // Given
    PurchaseProductRequest purchaseItem = new PurchaseProductRequest();
    ReflectionTestUtils.setField(purchaseItem, "productId", 1L);
    ReflectionTestUtils.setField(purchaseItem, "quantity", quantity);
    List<PurchaseProductRequest> purchaseItems = List.of(purchaseItem);

    when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
    when(purchaseRepository.save(any(Purchase.class))).thenReturn(testPurchase);
    when(purchaseProductRepository.saveAll(anyList())).thenReturn(Collections.emptyList());

    // When
    Purchase result = purchaseProcessService.process(testUser, purchaseItems);

    // Then
    assertThat(result).isNotNull();
    assertThat(testProduct.getStock()).isEqualTo(10 - quantity);
  }
```

- `@ValueSource`: int, String 등 단순 값 하나를 반복 주입할 때 사용
- 입력과 기대값을 함께 바꿔야 한다면 `@CsvSource({"3, 7", "10, 0"})` 또는 `@MethodSource`를 쓴다

이렇게 경계값(재고와 같은 수량)과 경계를 벗어난 값(재고+1)을 함께 테스트해야, off-by-one 같은 실수를 잡아낼 수 있다.

---

# 슬라이스 테스트
단위 테스트보다 범위는 넓지만, 전체 애플리케이션을 띄우지 않고 특정 계층만 잘라 검증하는 방식이다.
실무에서는 웹 계층이나 JPA 계층의 규칙을 빠르게 확인할 때 많이 쓴다.

## 1. @WebMvcTest - 컨트롤러만 가볍게 테스트
`@SpringBootTest`는 모든 Bean을 로드해서 느리다. 컨트롤러의 요청/응답·검증 로직만 보고 싶다면 `@WebMvcTest`로 **웹 계층만 잘라서(slice)** 띄우는 것이 훨씬 빠르다.
이때 컨트롤러가 의존하는 서비스는 실제 Bean 대신 Mock으로 주입한다.

```java
@WebMvcTest(PurchaseController.class)   // 해당 컨트롤러와 웹 계층만 로드
class PurchaseControllerWebMvcTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean                          // 컨트롤러가 의존하는 서비스를 Mock으로 등록
  private PurchaseProcessService purchaseProcessService;

  // ... 테스트 메서드
}
```

> 참고: DB/JPA 계층만 테스트하고 싶다면 `@DataJpaTest`, JSON 직렬화만 보고 싶다면 `@JsonTest` 같은 슬라이스 어노테이션도 있다.

## 2. @MockitoBean - @MockBean의 후속
스프링 컨텍스트 안의 Bean을 Mock으로 교체할 때 쓰던 **`@MockBean` / `@SpyBean`은 Spring Boot 3.4(Spring Framework 6.2)부터 deprecated** 상태가 됐다.
대신 프레임워크 코어로 들어온 **`@MockitoBean` / `@MockitoSpyBean`** 을 사용한다. 패키지만 바뀌었을 뿐 사용법은 거의 같다.

```java
// 변경 전 (deprecated)
import org.springframework.boot.test.mock.mockito.MockBean;
@MockBean
private PurchaseProcessService service;

// 변경 후 (권장)
import org.springframework.test.context.bean.override.mockito.MockitoBean;
@MockitoBean
private PurchaseProcessService service;
```

`@Mock`(Mockito)과 헷갈리기 쉬운데, `@Mock`은 순수 단위 테스트에서 객체만 가짜로 만드는 것이고, `@MockitoBean`은 **스프링 컨텍스트에 올라간 Bean 자체를 Mock으로 바꿔치기** 한다는 차이가 있다.

## 3. MockMvcTester - AssertJ 스타일 MockMvc
Spring Framework 6.2부터 MockMvc에 **AssertJ 기반의 `MockMvcTester`** 가 추가되었다.
기존 `andExpect(...)` 체인 대신, 우리가 단위 테스트에서 쓰던 `assertThat(...)` 스타일로 응답을 검증할 수 있어 일관성이 좋다.

```java
@WebMvcTest(PurchaseController.class)
class PurchaseControllerTesterTest {

  @Autowired
  private MockMvcTester mvc;   // 자동 구성됨

  @MockitoBean
  private PurchaseProcessService purchaseProcessService;

  @Test
  void createPurchase_success() {
    String requestBody = """
        { "userId": 1, "products": [ { "productId": 1, "quantity": 5 } ] }
        """;

    assertThat(mvc.post().uri("/api/purchases")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .hasStatusOk()                                  // 상태 코드 검증
        .bodyJson().extractingPath("$.result").isEqualTo(true);   // JSON 필드 검증
  }
}
```

기존 `MockMvc`도 그대로 쓸 수 있으니, 새 프로젝트나 새로 작성하는 테스트부터 점진적으로 도입하면 된다.

---

# 통합/API 테스트 (MockMvc, Rest Assured)
이제 마지막으로 전체 요청 흐름을 검증하는 통합/API 테스트를 본다.
여기서 말하는 API 테스트는 보통 통합 테스트의 한 형태로 보면 된다.

## MockMvc 개념
- Spring에서 제공하는 '가짜(Mock)' MVC 환경 기반 테스트 도구다.
- 실제 웹 서버를 실행하지 않고도 `Controller`에 HTTP 요청을 보내고 응답을 받는 과정을 시뮬레이션할 수 있다.

## MockMvc의 장점
- 자동화: 테스트 코드를 한 번 작성해두면 빌드 시점에 자동으로 실행되어 API를 검증할 수 있다.
- 빠른 피드백: 실제 서버를 띄우는 것보다 훨씬 빠르게 테스트를 실행하고 결과를 확인
- 통합 검증: 전체 웹 계층의 흐름(클라이언트의 요청 -> DTO 변환 -> Controller와 Service 실행 -> JSON 응답)을 통합적으로 테스트할 수 있다

## 테스트 환경 설정
```groovy
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

## 테스트 클래스 기본 설정
```java
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
// 기타 애플리케이션 타입 import 생략

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseControllerTest {

    @Autowired
    private MockMvc mockMvc; // API 테스트를 위한 핵심 객체

    // ... 테스트 메서드 작성
}
```

- `@SpringBootTest`: 실제 애플리케이션처럼 모든 Bean을 IoC 컨테이너에 로드해 통합 테스트 환경을 구성한다.
- @AutoConfigureMockMvc: MockMvc를 DI 받을 수 있도록 설정하여, 서버를 실행하지 않고도 가짜 MVC 환경에서 API를 테스트할 수 있게 해준다.

## MockMvc 테스트 코드 해부하기
MockMvc 테스트는 요청(`perform`) -> 검증(`andExpect`) 순서로 구성된다.

```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
// 기타 애플리케이션 타입 import 생략

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseControllerTest {

  @Autowired
  private MockMvc mockMvc; // API 테스트를 위한 핵심 객체

  // 구매 생성 성공 테스트
  @Test
  void testCreatePurchase_Success() throws Exception {
    // given: 테스트에 사용할 JSON Body 준비
    String requestBody = """
        {
          "userId": 1,
          "products": [
            {
              "productId": 1,
              "quantity": 10
            }
          ]
        }
        """;

    // when & then: API를 호출하고 응답을 검증
    mockMvc.perform(post("/api/purchases")                          // 1. HTTP POST 요청을 /api/purchases 로 보냄
            .contentType(MediaType.APPLICATION_JSON)                // 2. 요청의 Content-Type을 JSON으로 설정
            .content(requestBody)                                   // 3. 요청 Body에 JSON 데이터 추가
            .accept(MediaType.APPLICATION_JSON))                    // 4. 클라이언트가 JSON 응답을 기대함을 명시
        .andExpect(status().isOk())                                 // 5. 응답 상태 코드가 200 OK 인지 검증
        .andExpect(jsonPath("$.result").value(true));               // 6. 응답 Body의 result 필드가 true인지 검증
  }
}
```

- jsonPath("\$.필드명"): JSON 응답의 특정 필드에 접근하기 위한 표현식이다.
- $는 JSON 전체를 의미한다.
- 위 예시는 `userId=1`, `productId=1` 데이터가 테스트 DB에 이미 있다는 전제다. 실제 테스트에서는 `@BeforeEach`, `@Sql`, 테스트용 Repository 중 하나로 필요한 데이터를 먼저 만들어야 한다.

## MockMvc 테스트 시나리오 예시

### 시나리오 1: 유효성 검증(Validation) 실패 테스트
사용자 ID가 누락된 요청을 보냈을 때, 올바른 에러 코드가 반환되는지 검증한다.

```java
  @Test
  void testCreatePurchase_Fail_MissingUserId() throws Exception {
    // given: userId가 null인 요청 Body
    String requestBody = """
        {
          "userId": null,
          "products": [
            {
              "productId": 1,
              "quantity": 10
            }
          ]
        }
        """;

    // when & then
    mockMvc.perform(post("/api/purchases")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.errorCode").value("VALIDATE_ERROR"));
  }
```

### 시나리오 2: 비즈니스 로직 실패 테스트
재고가 부족한 상품을 주문했을 때, 비즈니스 예외가 발생하고 올바른 에러 코드가 반환되는지 검증한다.

```java
  @Test
  void testCreatePurchase_Fail_InsufficientStock() throws Exception {
    // given: 재고보다 많은 수량을 주문하는 요청 Body
    String requestBody = """
        {
          "userId": 1,
          "products": [
            {
              "productId": 1,
              "quantity": 1000
            }
          ]
        }
        """;

    // when & then
    mockMvc.perform(post("/api/purchases")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.error.errorCode").value("OUT_OF_STOCK_PRODUCT"));
  }
```

## Rest Assured로 API 테스트하기

### Rest Assured 개념
Java 기반 API 자동화 테스트 라이브러리다.
실제 HTTP 요청을 보내고 응답을 검증하는 과정을 간결하고 직관적인 코드로 작성할 수 있게 해준다.

### MockMvc와의 차이점
- MockMvc: '가짜' MVC 환경을 만들어, 웹 서버를 실행하지 않고 애플리케이션 내부에서 컨트롤러의 동작을 시뮬레이션
- Rest Assured: 실제 테스트용 웹 서버를 실행하고, 외부 클라이언트 입장에서 http://localhost:port로 실제 네트워크 요청을 보냄

### Rest Assured 테스트 환경 설정

### 1단계: 의존성 추가 (build.gradle)
```groovy
dependencies {
    testImplementation 'io.rest-assured:rest-assured:5.4.0'
}
```

### 2단계: 테스트 환경 구성

```java
import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
// 기타 애플리케이션 타입 import 생략

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PurchaseControllerRestAssuredTest {

    @LocalServerPort
    private int port; // 실행된 서버의 포트 번호를 주입받음

    @BeforeEach
    void setUp() {
        // 모든 테스트 실행 전, Rest Assured가 요청을 보낼 포트를 설정
        RestAssured.port = port;
    }

    // ... 테스트 메서드 작성
}
```

`@SpringBootTest`에 `webEnvironment` 속성을 추가하면, 테스트 실행 시 실제 서블릿 컨테이너(Tomcat 등)가 함께 실행된다.
- `webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT`: 테스트마다 비어 있는 랜덤 포트로 내장 서버를 실행해 포트 충돌을 막는다.

## Rest Assured 테스트 코드 해부하기
Rest Assured는 `given - when - then`이라는 BDD(행위 주도 개발) 스타일 문법을 사용한다.
- `given()`: **요청을 보내기 위한 준비 과정.** 헤더, 쿠키, 요청 Body 등을 설정한다
- `when()`: **실제 요청을 보내는 행위.** `get()`, `post()`, `put()` 등 HTTP 메서드를 사용한다
- `then()`: **받은 응답을 검증하는 과정.** 상태 코드, 응답 Body의 내용 등을 확인한다.

아래 테스트 메서드는 앞에서 만든 `PurchaseControllerRestAssuredTest` 클래스 안에 추가한다.

```java
import static org.hamcrest.Matchers.equalTo;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
// 기타 애플리케이션 타입 import 생략

  @Test
  void testCreatePurchase_Success() {
    // given: 요청 Body 준비
    String requestBody = """
        {
            "userId": 1,
            "products": [
                {
                    "productId": 1,
                    "quantity": 5
                }
            ]
        }
        """;

    // when & then
    RestAssured.given().log().all()                 // (요청 로깅)
        .contentType(ContentType.JSON)              // 요청 헤더의 Content-Type 설정
        .body(requestBody)                          // 요청 Body 데이터 추가
        .when()
        .post("/api/purchases")                     // POST 요청 실행
        .then().log().all()                         // (응답 로깅)
        .statusCode(200)                            // 응답 상태 코드가 200 인지 검증
        .body("result", equalTo(true));             // 응답 Body의 'result' 필드 값이 true인지 검증
  }
```

`log().all()`을 추가하면 요청과 응답의 모든 내용을 콘솔에서 확인할 수 있어 디버깅에 유용하다.

## Rest Assured 테스트 시나리오 예시

### 시나리오 1: 유효성 검증(Validation) 실패 테스트
userId가 누락된 요청을 보냈을 때, 400 Bad Request와 함께 올바른 에러 코드가 반환되는지 검증한다.

```java
  @Test
  void testCreatePurchase_Fail_MissingUserId() {
    // given: userId가 없는 요청 Body
    String requestBody = """
        {
            "userId": null,
            "products": [
                {
                    "productId": 1,
                    "quantity": 5
                }
            ]
        }
        """;

    // when & then
    RestAssured.given()
        .contentType(ContentType.JSON)
        .body(requestBody)
        .when()
        .post("/api/purchases")
        .then()
        .statusCode(400) // 400 Bad Request 검증
        .body("error.errorCode", equalTo("VALIDATE_ERROR"));
  }
```

### 시나리오 2: 비즈니스 로직 실패 테스트
재고가 부족한 상품을 주문했을 때, 올바른 비즈니스 에러 코드가 반환되는지 검증한다.

```java
  @Test
  void testCreatePurchase_Fail_InsufficientStock() {
    // given: 재고보다 많은 수량을 주문하는 요청 Body
    String requestBody = """
        {
            "userId": 1,
            "products": [
                {
                    "productId": 1,
                    "quantity": 100000
                }
            ]
        }
        """;

    // when & then
    RestAssured.given()
        .contentType(ContentType.JSON)
        .body(requestBody)
        .when()
        .post("/api/purchases")
        .then()
        .statusCode(200)
        .body("error.errorCode", equalTo("OUT_OF_STOCK_PRODUCT"));
  }
```

Rest Assured를 사용하면 마치 Postman을 코드로 자동화하는 것처럼, 실제 네트워크 통신을 포함한 통합 테스트를 수행할 수 있다.
즉, MockMvc와 Rest Assured는 둘 다 API를 검증하지만 실제 환경을 얼마나 재현하느냐에서 차이가 난다.

## Testcontainers - 운영 환경과 가까운 인프라로 테스트하기

### Testcontainers란?
이름을 풀어보면 **테스트(Test)를 위한 컨테이너(Containers)** 다.
Java 테스트 코드에서 Docker 컨테이너를 실행하고 종료할 수 있게 해주는 라이브러리로, 주로 통합 테스트에서 사용한다.

여기서 컨테이너는 애플리케이션 내부에서 만드는 Mock 객체가 아니다.
MySQL, PostgreSQL, Redis, Kafka 같은 소프트웨어가 실제로 실행되는 **격리된 프로세스 환경**이다.
예를 들어 MySQL Testcontainer를 사용하면 MySQL처럼 동작하는 가짜 객체가 아니라, 지정한 Docker 이미지의 MySQL 서버 자체가 실행된다.

Testcontainers가 테스트를 대신 작성하거나 검증해 주는 것은 아니다.
테스트에 필요한 외부 인프라를 준비하고 정리하는 역할을 하며, 요청 실행과 결과 검증은 기존처럼 JUnit, AssertJ, MockMvc, Rest Assured 등으로 작성한다.

### 왜 필요한가?
Repository 테스트에서 실제 운영 DB 대신 H2 같은 인메모리 DB를 사용할 수도 있다.
H2는 가볍고 빠르지만, 운영 환경이 MySQL이라면 서로 다른 DB 제품을 테스트하는 셈이다.
DB마다 SQL 문법, 자료형, 예약어, 대소문자 처리, 제약 조건과 트랜잭션 동작 등이 조금씩 다르기 때문에 H2에서는 성공한 코드가 MySQL에서는 실패할 수 있다.

반대로 개발자가 직접 설치한 로컬 MySQL을 테스트에 사용하면 다음 문제가 생긴다.

- 개발자마다 DB 버전과 설정이 다를 수 있다.
- 이전 테스트가 남긴 데이터 때문에 결과가 달라질 수 있다.
- CI 서버에도 같은 DB와 계정, 스키마를 별도로 준비해야 한다.
- 테스트가 공유 DB를 사용하면 동시에 실행될 때 서로 영향을 줄 수 있다.

Testcontainers는 테스트가 요구하는 DB 종류와 버전을 코드에 명시하고, 테스트용 인스턴스를 필요할 때 실행한다.
그래서 로컬 개발 환경과 CI에서 비교적 동일하고 재현 가능한 환경을 만들 수 있다.

### 실행 흐름
MySQL을 사용하는 Spring 통합 테스트를 예로 들면 다음 순서로 동작한다.

1. JUnit 테스트가 시작된다.
2. Testcontainers가 로컬 또는 CI의 Docker 환경에 MySQL 이미지가 있는지 확인하고, 필요하면 내려받는다.
3. 격리된 MySQL 컨테이너를 실행하고 임의의 호스트 포트를 연결한다.
4. Spring Boot가 컨테이너의 JDBC URL, 사용자 이름, 비밀번호를 전달받아 `DataSource`를 구성한다.
5. 애플리케이션이 이 DB를 사용하여 Repository와 Service 로직을 실행한다.
6. JUnit과 AssertJ 등이 저장 결과나 조회 결과를 검증한다.
7. 테스트가 끝나면 컨테이너가 종료된다.

즉, 애플리케이션 입장에서는 아래처럼 실제 DB에 연결하는 것과 같다.

```text
JUnit 테스트 → Spring 애플리케이션 → JDBC 드라이버 → 컨테이너 안의 실제 MySQL
```

### Mock, H2, Testcontainers의 차이

| 방식 | 실제 SQL 실행 | 운영 DB와 유사성 | 속도 | 적합한 목적 |
|------|-------------|-----------------|------|------------|
| Repository Mock | 실행하지 않음 | 낮음 | 매우 빠름 | Service의 분기와 계산 같은 단위 테스트 |
| H2 인메모리 DB | H2에서 실행 | 중간 | 빠름 | 간단한 JPA 매핑과 Repository 테스트 |
| Testcontainers | 지정한 DB에서 실행 | 높음 | 상대적으로 느림 | DB 방언, 제약 조건, 마이그레이션을 포함한 통합 테스트 |

세 방식은 서로 대체 관계라기보다 검증 목적이 다르다.
Service의 할인 계산을 확인하는 데 MySQL 컨테이너를 띄울 필요는 없다.
반대로 MySQL 전용 쿼리가 올바른지 확인하면서 Repository를 Mock으로 바꾸면 실제 SQL은 전혀 검증되지 않는다.

### 장점과 한계

Testcontainers의 가장 큰 장점은 **운영 환경과 같은 종류·버전의 인프라를 사용하여 재현 가능한 테스트를 만들 수 있다는 점**이다.
빈 DB에서 시작할 수 있어 테스트 격리가 쉬우며, 개발자 PC에 DB를 직접 설치하거나 CI용 공유 DB를 관리할 필요도 줄어든다.
DB뿐 아니라 Redis, Kafka 같은 외부 인프라에도 같은 방식을 적용할 수 있다.

다만 다음 비용도 있다.

- Docker 또는 Testcontainers가 지원하는 컨테이너 실행 환경이 필요하다.
- 처음 사용하는 이미지는 내려받는 시간이 들고, 컨테이너 시작 때문에 단위 테스트보다 느리다.
- 실제 DB를 사용해도 운영 서버의 데이터 양, 네트워크 상태, 하드웨어, 모든 설정까지 똑같아지는 것은 아니다.
- 테스트마다 컨테이너를 무분별하게 새로 만들면 전체 테스트 시간이 크게 늘 수 있다.

따라서 모든 테스트를 Testcontainers로 작성하기보다, 빠른 단위 테스트를 기본으로 두고 **실제 인프라와의 호환성이 중요한 핵심 경로**에 사용하는 것이 좋다.

### Spring Boot에서 연결하는 원리
일반적으로 컨테이너는 실행할 때마다 JDBC URL과 포트가 달라질 수 있다.
예전에는 `@DynamicPropertySource`로 이 값을 `spring.datasource.*` 속성에 직접 등록했다.

Spring Boot 3.1 이상에서는 **`@ServiceConnection`** 을 사용할 수 있다.
이 어노테이션을 컨테이너 필드에 붙이면 Spring Boot가 컨테이너의 연결 정보를 읽어 `DataSource` 구성에 사용한다.
이를 사용하려면 `spring-boot-testcontainers` 테스트 의존성이 필요하다.

`@Testcontainers`와 `@Container`는 JUnit 5가 컨테이너의 시작과 종료 시점을 관리하게 한다.
아래처럼 `@Container` 필드를 `static`으로 선언하면 일반적으로 테스트 메서드마다 새로 띄우지 않고, 해당 테스트 클래스에서 하나의 컨테이너를 공유한다.

### 최소 설정 예시

```groovy
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-testcontainers'
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:mysql'
}
```

```java
@SpringBootTest
@Testcontainers
class PurchaseIntegrationTest {

  @Container
  @ServiceConnection // 컨테이너 접속 정보를 스프링에 자동 연결
  static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

  // 테스트 메서드에서는 Repository나 API를 호출하고 결과를 검증한다.
}
```

각 어노테이션의 역할을 분리해서 보면 이해하기 쉽다.

| 어노테이션 | 역할 |
|-----------|------|
| `@SpringBootTest` | 전체 Spring 애플리케이션 컨텍스트를 실행한다. |
| `@Testcontainers` | JUnit 5에서 Testcontainers 확장 기능을 활성화한다. |
| `@Container` | Testcontainers가 해당 컨테이너의 생명주기를 관리하게 한다. |
| `@ServiceConnection` | 컨테이너 접속 정보를 Spring Boot 자동 구성에 연결한다. |

이 예제에서는 테스트가 시작될 때 MySQL 8.0 컨테이너가 실행되고, Spring의 `DataSource`가 그 MySQL을 바라본다.
따라서 실제 테스트에서는 `PurchaseRepository`로 데이터를 저장한 뒤 다시 조회하거나, MockMvc·Rest Assured로 API를 호출한 후 DB 상태를 확인할 수 있다.

Testcontainers가 빈 DB를 제공하는 것과 테이블을 자동으로 만들어 주는 것은 별개의 문제다.
테이블 생성은 테스트 설정의 Hibernate DDL 옵션을 사용하거나, 운영 환경과 동일하게 Flyway 또는 Liquibase 마이그레이션을 실행해서 처리해야 한다.
특히 마이그레이션 스크립트가 실제 MySQL에서도 처음부터 정상 적용되는지를 검증하는 용도로 Testcontainers가 유용하다.

### 언제 사용하면 좋을까?

- MySQL, PostgreSQL 등 특정 DB에 의존하는 쿼리를 검증할 때
- JPA 엔티티의 매핑, 제약 조건, 트랜잭션 동작을 실제 DB에서 확인할 때
- Flyway나 Liquibase 마이그레이션이 빈 DB에 정상 적용되는지 확인할 때
- Redis, Kafka 등 외부 인프라와 연결되는 핵심 흐름을 통합 테스트할 때
- 로컬과 CI가 같은 버전의 인프라를 사용해야 할 때

반면 순수 계산, 조건 분기, 예외 발생 여부처럼 외부 인프라와 관계없는 비즈니스 규칙은 Mockito를 사용한 단위 테스트가 더 빠르고 원인도 쉽게 파악된다.

---

# 테스트 커버리지 측정 - JaCoCo
테스트를 얼마나 작성했는지 객관적으로 보려면 커버리지 도구를 붙인다. 가장 많이 쓰는 것이 **JaCoCo**다.

```groovy
plugins {
    id 'jacoco'
}

test {
    finalizedBy jacocoTestReport   // 테스트 후 리포트 자동 생성
}
```

`./gradlew test` 후 `build/reports/jacoco/test/html/index.html`에서 라인/분기 커버리지를 확인할 수 있다.
다만 **커버리지 숫자(%) 자체가 목표가 되면 안 된다.** 의미 없는 호출만 늘려 100%를 채우는 것보다, 핵심 비즈니스 로직과 예외/경계 케이스가 실제로 검증되고 있는지가 훨씬 중요하다.

---

# 정리: 테스트 작성 범위

마지막으로 지금까지 나온 분류를 한 표로 다시 묶으면 이렇다. 흔히 말하는 **테스트 피라미드**의 형태를 따르는 것이 비용 대비 효율이 좋다.

| 종류 | 도구 | 범위 | 속도 | 비중 |
|------|------|------|------|------|
| 단위 테스트 | JUnit + Mockito | 메서드/클래스 | 매우 빠름 | 가장 많이 |
| 슬라이스 테스트 | @WebMvcTest, @DataJpaTest | 특정 계층 | 빠름 | 적당히 |
| 통합/API 테스트 | @SpringBootTest, MockMvc(Tester), Rest Assured, Testcontainers | 전체 흐름 | 느림 | 핵심 시나리오 위주로 |

- **단위 테스트**는 빠르고 원인 파악이 쉬우니, 비즈니스 로직과 예외/경계 케이스를 여기서 촘촘히 잡는다.
- **슬라이스/통합 테스트**는 계층 간 연결과 실제 요청 흐름처럼 단위 테스트로는 보장하기 어려운 부분을 확인한다.
- 느린 통합 테스트로 모든 경우를 검증하려 하면 빌드가 무거워지므로, **핵심 시나리오 위주로** 작성하는 것이 좋다.

결국 중요한 건 테스트 개수나 커버리지 숫자가 아니라, **리팩토링과 배포를 안심하고 할 수 있게 해주는 안전망**을 만드는 것이다.
