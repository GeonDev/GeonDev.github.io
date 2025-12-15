---
layout: post
title: API 테스트와 단위 테스트
date: 2025-11-13
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

# 단위 테스트(Unit Test) vs. API 테스트

| 구분 | 단위 테스트 (Unit Test) | API 테스트 (API Test) |
|------|------------------------|----------------------|
| 테스트 대상 | 메서드, 클래스 등 작은 코드 단위 | 특정 기능 전체의 API 엔드포인트 |
| 의존성 | 외부 의존성을 배제 (Mock 객체 사용) | DB, 외부 서비스 등 실제 환경과 통합 |
| 목적 | 내부 로직의 정확성 검증 | 클라이언트-서버 간 통신과 흐름 검증 |
| 속도 | 매우 빠름 | 상대적으로 느림 (네트워크, DB I/O 포함) |
| 도구 | JUnit, Mockito 등 | Postman, Rest Assured, MockMVC 등 |

# JUnit과 MockMvcJUnit과 MockMvc 사용법
## MockMvc란?
- Spring에서 제공하는 '가짜(Mock)' MVC 환경을 만들어주는 테스트 도구입니다
- 실제 웹 서버를 실행하지 않고도, Controller에 HTTP 요청을 보내고 응답을 받는 과정을 시뮬레이션
## MockMvc의 장점
- 자동화: 테스트 코드를 한 번 작성해두면, 빌드 시점에 자동으로 실행되어 API 검증 가능
- 빠른 피드백: 실제 서버를 띄우는 것보다 훨씬 빠르게 테스트를 실행하고 결과를 확인
- 통합 검증: 전체 웹 계층의 흐름(클라이언트의 요청 -> DTO 변환 -> Controller와 Service 실행 ->  JSON 응답)을 통합적으로 테스트할 수 있다

## 테스트 환경 설정
~~~
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
~~~

## 테스트 클래스 기본 설정
~~~
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseControllerTest {

    @Autowired
    private MockMvc mockMvc; // API 테스트를 위한 핵심 객체
    
    @Autowired
    private ObjectMapper objectMapper; // 객체를 JSON 문자열로 변환하기 위한 객체

    // ... 테스트 메서드 작성
}
~~~
- @SpringBootTest: 실제 애플리케이션처럼 모든 Bean을 IoC 컨테이너에 로드하여 통합 테스트 환경을 구성
- @AutoConfigureMockMvc: MockMvc를 DI 받을 수 있도록 설정하여, 서버를 실행하지 않고도 가짜 MVC 환경에서 API를 테스트할 수 있게 해준다.

## MockMvc 테스트 코드 해부하기
MockMvc 테스트는 요청(perform) → 검증(andExpect)으로 구성 된다.

~~~
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sparta.bootcamp.java_2_example.domain.purchase.dto.PurchaseProductRequestTest;
import com.sparta.bootcamp.java_2_example.domain.purchase.dto.PurchaseRequestTest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseControllerTest {

  @Autowired
  private MockMvc mockMvc; // API 테스트를 위한 핵심 객체

  @Autowired
  private ObjectMapper objectMapper; // 객체를 JSON 문자열로 변환하기 위한 객체

  // 구매 생성 성공 테스트
  @Test
  void testCreatePurchase_Success() throws Exception {
  
    // given: 테스트에 사용할 요청 DTO와 JSON Body 준비
    List<PurchaseProductRequestTest> purchaseProductRequestTests = new ArrayList<>();
    PurchaseProductRequestTest purchaseProductRequestTest = new PurchaseProductRequestTest(1L, 10);
    purchaseProductRequestTests.add(purchaseProductRequestTest);

    PurchaseRequestTest request = new PurchaseRequestTest(1L, purchaseProductRequestTests);

    String requestBody = new ObjectMapper().writeValueAsString(request);

    // when & then: API를 호출하고 응답을 검증
    mockMvc.perform(post("/api/purchases")                          // 1. HTTP POST 요청을 /api/purchases 로 보냄
            .contentType(MediaType.APPLICATION_JSON.toString())     // 2. 요청의 Content-Type을 JSON으로 설정
            .content(requestBody)                                   // 3. 요청 Body에 JSON 데이터 추가
            .accept(MediaType.APPLICATION_JSON.toString()))         // 4. 클라이언트가 JSON 응답을 기대함을 명시
        .andExpect(status().is(200))                                // 5. 응답 상태 코드가 200 Created 인지 검증
        .andExpect(jsonPath("$.result").value(true));               // 6. 응답 Body의 result 필드가 true인지 검증
  }
}
~~~
- jsonPath("\$.필드명"): JSON 응답의 특정 필드에 접근하기 위한 표현식입니다. 
- $는 JSON 전체를 의미합니다.


## 테스트 시나리오 예시
### 시나리오 1: 유효성 검증(Validation) 실패 테스트
사용자 ID가 누락된 요청을 보냈을 때, 올바른 에러 코드가 반환되는지 검증
~~~
  @Test
  void testCreatePurchase_Fail_MissingUserId() throws Exception {
    // given: userId가 null인 요청 DTO
    List<PurchaseProductRequestTest> purchaseProductRequestTests = new ArrayList<>();
    PurchaseProductRequestTest purchaseProductRequestTest = new PurchaseProductRequestTest(1L, 10);
    purchaseProductRequestTests.add(purchaseProductRequestTest);

    PurchaseRequestTest request = new PurchaseRequestTest(10L, null);

    String requestBody = new ObjectMapper().writeValueAsString(request);

    // when & then
    mockMvc.perform(post("/api/purchases")
            .contentType(MediaType.APPLICATION_JSON.toString())
            .content(requestBody))
        .andExpect(jsonPath("$.error.errorCode").value("NOT_FOUND_USER"));
  }
~~~

### 시나리오 2: 비즈니스 로직 실패 테스트
재고가 부족한 상품을 주문했을 때, 비즈니스 예외가 발생하고 올바른 에러 코드가 반환되는지 검증
~~~
  @Test
  void testCreatePurchase_Fail_InsufficientStock() throws Exception {
    // given: 재고(예: 5개)보다 많은 수량(예: 10개)을 주문하는 DTO
    List<PurchaseProductRequestTest> purchaseProductRequestTests = new ArrayList<>();
    PurchaseProductRequestTest purchaseProductRequestTest = new PurchaseProductRequestTest(1L,
        1000);
    purchaseProductRequestTests.add(purchaseProductRequestTest);

    PurchaseRequestTest request = new PurchaseRequestTest(1L, purchaseProductRequestTests);

    String requestBody = new ObjectMapper().writeValueAsString(request);

    // when & then
    mockMvc.perform(post("/api/purchases")
            .contentType(MediaType.APPLICATION_JSON.toString())
            .content(requestBody))
        .andExpect(jsonPath("$.error.errorCode").value("OUT_OF_STOCK_PRODUCT"));
  }
~~~

## Rest Assured로 API 테스트하기

### Rest Assured란?
Java 기반으로 작성된 API 자동화 테스트 라이브러리로  
실제 HTTP 요청을 보내고 응답을 검증하는 과정을 매우 간결하고 직관적인 코드로 작성할 수 있게 해준다.

### MockMvc와의 차이점
 - MockMvc : 가짜' MVC 환경을 만들어, 웹 서버를 실행하지 않고 애플리케이션 내부에서 컨트롤러의 동작을 시뮬레이션
 - Rest Assured: 실제 테스트용 웹 서버를 실행하고, 외부 클라이언트 입장에서 http://localhost:port로 실제 네트워크 요청을 보냄

### Rest Assured 테스트 환경 설정

### 1단계: 의존성 추가 (build.gradle)
~~~
dependencies {
    testImplementation 'io.rest-assured:rest-assured:5.4.0'
}
~~~

### 2단계: 테스트 환경 구성

~~~
import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

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
~~~
@SpringBootTest 어노테이션에 webEnvironment 속성을 추가하여, 테스트 실행 시 실제 서블릿 컨테이너(Tomcat 등)가 실행되도록 설정한다.
- webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT: 테스트마다 비어있는 랜덤 포트로 내장 서버를 실행하여 포트 충돌을 방지

## Rest Assured 테스트 코드 해부하기
Rest Assured는 given - when - then 이라는 BDD(행위 주도 개발) 스타일의 문법을 사용한다
- `given()`: **요청을 보내기 위한 준비 과정.** 헤더, 쿠키, 요청 Body 등을 설정한다
- `when()`: **실제 요청을 보내는 행위.** `get()`, `post()`, `put()` 등 HTTP 메서드를 사용한다
- `then()`: **받은 응답을 검증하는 과정.** 상태 코드, 응답 Body의 내용 등을 확인한다.

~~~
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
~~~
log().all()을 추가하면 요청과 응답의 모든 내용을 콘솔에서 확인할 수 있어 디버깅에 매우 유용하다

## 테스트 시나리오 예시
### 시나리오 1: 유효성 검증(Validation) 실패 테스트
userId가 누락된 요청을 보냈을 때, 400 Bad Request와 함께 올바른 에러 코드가 반환되는지 검증한다.

~~~
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
~~~

### 시나리오 2: 비즈니스 로직 실패 테스트
재고가 부족한 상품을 주문했을 때, 올바른 비즈니스 에러 코드가 반환되는지 검증합니다.

~~~
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
~~~

Rest Assured를 사용하면 마치 Postman을 코드로 자동화하는 것처럼, 실제 네트워크 통신을 포함한 통합 테스트를 수행할 수 있다.

## 단위 테스트
단위 테스트(Unit Test)란, 애플리케이션을 구성하는 가장 작은 단위(주로 메서드 또는 클래스)가 의도한 대로 정확히 동작하는지를 독립적으로 검증하는 테스트
### 핵심 원칙: 고립(Isolation)

- 단위 테스트는 다른 컴포넌트나 외부 시스템(데이터베이스, 네트워크 등)에 의존하지 않고 오직 테스트 대상 코드만 고립시켜 검증
- 외부 의존성은 '가짜 객체(Mock Object)'를 사용하여 대체한다.
  UserRepository에 의존하는 UserService를 테스트할 때, 실제 DB에 연결하는 대신 특정 값을 반환하도록 프로그래밍된  가짜 UserRepository를 사용한다.

## 단위 테스트의 이점
### 버그 조기 발견
개발 과정에서 버그를 가장 빠르게 발견할 수 있다. 작은 단위로 검증하기 때문에 문제의 원인을 즉시 파악하고 수정할 수 있어 디버깅 시간이 줄어든다.
### 자신감 있는 리팩토링
잘 작성된 단위 테스트 스위트는 코드의 동작을 보증하는 '안전망' 역할을 합니다. 내부 구조를 개선하는 리팩토링을 하더라도, 테스트가 통과한다면 기존 기능이 깨지지 않았다는 자신감을 가질 수 있습니다.
(테스트 스위트 : 여러 개의 테스트 케이스들을 논리적으로 그룹화한 집합)
### 살아있는 문서 역할
test_whenUserIsVip_thenApply10PercentDiscount() 와 같은 테스트 케이스는 그 자체로 "VIP 유저에게는 10% 할인이 적용되어야 한다"는 비즈니스 요구사항을 명확하게 보여주는 살아있는 문서가 된다.

## JUnit 단위 테스트
누가 읽어도 테스트의 의도를 명확히 파악할 수 있고, 유지보수하기 좋은 테스트를 작성하는 것은 매우 중요하다.
AAA와 GWT는 테스트 코드에 '구조'를 부여하여 이러한 목표를 달성하게 도와주는 검증된 패턴이다.

### JUnit 테스트의 기본 구조
#### 테스트 클래스와 @Test 어노테이션
JUnit으로 테스트를 작성하려면, 먼저 테스트 코드를 담을 클래스를 생성한다. 그리고 JUnit에게 어떤 메서드를 테스트로 실행해야 할지 알려주기 위해, 각 테스트 메서드 위에 **`@Test`** 어노테이션을 붙여야 한다.

- **`@Test`**: 이 어노테이션이 붙은 메서드는 JUnit이 실행해야 할 독립적인 테스트 케이스임을 나타냄.

#### 테스트 메서드 네이밍 규칙
테스트 메서드의 이름은 그 자체로 하나의 요구사항 명세서 역할을 해야 한다. '어떤 조건에서, 무엇을 테스트하며, 어떤 결과를 기대하는지'가 이름에 명확히 드러나는 것이 좋다.
- **좋은 네이밍 컨벤션 예시**:
    - `메서드명_should_기대행위_when_조건`
        - `calculateTotalPrice_should_returnSum_when_givenTwoItems`
    - `given_전제조건_when_행위_then_기대결과` (GWT 패턴과 일치)
        - `givenValidPrice_whenCalculateDiscount_thenCorrectValueIsReturned` 


## Arrange-Act-Assert (AAA) 패턴: "준비, 실행, 검증"
테스트를 준비(Arrange), 실행(Act), 검증(Assert)이라는 3개의 논리적인 단계로 명확하게 구분하여 작성하는 방식으로
절차적이고 직관적이어서 개발자들이 선호 하는 방식이다.
- **`Arrange` (준비)**: 테스트에 필요한 모든 객체와 데이터를 준비하고 설정하는 단계로 테스트 대상 객체, Mock 객체, 입력값 등을 모두 만든다
- **`Act` (실행)**: 준비된 데이터를 가지고, 테스트하고자 하는 **핵심 메서드를 단 한 번 호출**하는 단계
- **`Assert` (검증)**: `Act` 단계의 실행 결과가 우리가 **기대하는 값과 일치하는지** 확인하는 단계로 `assertEquals`, `assertTrue` 등의 검증 메서드를 사용한다.

### 코드 예제: 할인 금액 계산 테스트
~~~
  @Test
  @DisplayName("재고가 충분한 상품을 구매하면 재고가 감소하고 구매가 성공한다")
  void process_should_decreaseStockAndSucceed_when_productInStock_aaa() {
    // Arrange
    PurchaseProductRequest purchaseItem = new PurchaseProductRequest();
    ReflectionTestUtils.setField(purchaseItem, "productId", 1L);
    ReflectionTestUtils.setField(purchaseItem, "quantity", 2);

    List<PurchaseProductRequest> purchaseItems = List.of(purchaseItem);

    when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
    when(purchaseRepository.save(any(Purchase.class))).thenReturn(testPurchase);
    when(purchaseProductRepository.saveAll(anyList())).thenReturn(Collections.emptyList());

    // Act
    Purchase result = purchaseProcessService.process(testUser, purchaseItems);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.getTotalPrice()).isEqualTo(new BigDecimal("2000000")); // 1,000,000 * 2
    assertThat(testProduct.getStock()).isEqualTo(8); // 10 - 2

    verify(productRepository).findById(1L);
    verify(purchaseRepository).save(any(Purchase.class));
    verify(purchaseProductRepository).saveAll(anyList());
  }
~~~

## Given-When-Then (GWT) 패턴: "스토리텔링 테스트"
GWT 패턴은 행위 주도 개발(BDD)에서 유래했으며, 
테스트 코드를 마치 하나의 '시나리오'나 '이야기'처럼 자연스럽게 읽히도록 작성하는 방식

- **`Given` (주어진 상황)**: 테스트가 진행될 전제 조건과 환경을 설정한다. "이러한 상황이 주어졌을 때"를 의미하며, `Arrange` 단계와 역할이 같다.
- **`When` (어떤 행동을 하면)**: 테스트할 실제 동작을 실행한다. "사용자가 어떤 행동을 하면"을 의미하며, `Act` 단계와 역할이 같다.
- **`Then` (이런 결과가 나와야 한다)**: 행동의 결과를 검증한다. "이런 결과가 보장되어야 한다"를 의미하며, `Assert` 단계와 역할이 같다.

### 코드 예제: 구매 생성 시 재고 감소 테스트
~~~
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
~~~

## Mockito로 단위 테스트하기
단위 테스트의 핵심은 **'고립(Isolation)'** 테스트 대상 코드를 다른 의존성으로부터 완벽하게 분리하여
오직 해당 코드의 로직만을 검증해야 하지만 대부분의 서비스 객체는 다른 Repository나 Service에 의존하고 있다.
이때 Mockito는 '가짜 객체(Mock Object)'를 만들어 실제 의존성을 대체함으로써 완벽한 고립 테스트를 가능하게 해준다.

### 의존성 추가
Spring Boot의 spring-boot-starter-test 의존성은 기본적으로 mockito-core 라이브러리를 포함하고 있다.
여기에 JUnit 5와의 완전한 통합을 위해 mockito-junit-jupiter를 추가해주는 것이 좋다.
~~~
dependencies {
    // spring-boot-starter-test가 mockito-core를 포함
    testImplementation 'org.springframework.boot:spring-boot-starter-test' 

    // JUnit 5와 Mockito를 통합해주는 라이브러리 (권장)
    testImplementation 'org.mockito:mockito-junit-jupiter:5.12.0' // 최신 버전 사용 권장
}
~~~

### 테스트 클래스 기본 설정: 어노테이션 활용
~~~
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

    // ... 테스트 메서드 작성
}
~~~

- **`@ExtendWith(MockitoExtension.class)`**: JUnit 5에게 Mockito 관련 기능을 사용하겠다고 알려준다.
- **`@Mock`**: 해당 필드를 가짜(Mock) 객체로 만든다.
- **`@InjectMocks`**: `@Mock` 어노테이션이 붙은 객체들을 감지하여, 테스트 대상 객체(`refundService`)에 자동으로 주입해준다.

## Mockito 기본 사용법: given-when-then과 함께하기

1. **`given` (준비)**: 테스트에 필요한 Mock 객체들을 생성하고, `when(...).thenReturn(...)`을 통해 이들의 행동(Stub)을 미리 정의한다
2. **`when` (실행)**: 테스트할 실제 메서드를 호출한다.
3. **`then` (검증)**: 결과를 단정문(`Assertions`)으로 검증하거나, Mock 객체의 특정 메서드가 **예상대로 호출되었는지 `verify()`를 통해 확인**한다.

