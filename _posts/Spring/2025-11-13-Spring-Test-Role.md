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