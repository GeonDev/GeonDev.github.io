---
layout: post
title: JMeter로 부하 테스트하기
date: 2026-06-23
Author: Geon Son
categories: IT
tags: [LoadTest, JMeter, Performance, k6, Gatling]
comments: true
toc: true
---

> 배포 전에 "트래픽이 몰리면 어디까지 버틸까"를 미리 확인할 때 부하 테스트를 한다. 대표 도구인 JMeter의 기능과 활용법, 그리고 요즘 쓰이는 대안 툴을 정리한다.

# 1. 부하 테스트 목적

기능 테스트가 "되느냐"를 본다면, 부하 테스트는 "얼마나 견디느냐"를 본다. 확인하려는 건 대체로 이렇다.

- 동시 사용자가 늘어도 응답 시간이 허용 범위 안에 있나
- 어느 지점부터 느려지거나 에러가 나나 (한계점)
- 부하가 빠진 뒤 정상으로 돌아오나 (회복력)
- 오래 부하를 주면 메모리 누수나 커넥션 고갈이 생기나 (내구성)

목적에 따라 부르는 이름이 나뉜다.

| 유형 | 목적 |
|:--|:--|
| Load Test | 예상 트래픽에서 응답 시간·처리량이 기준을 만족하는지 |
| Stress Test | 한계까지 밀어 어디서 무너지는지 |
| Spike Test | 트래픽이 순간 급증할 때 견디는지 |
| Soak Test | 장시간 부하에서 누수·성능 저하가 없는지 |

# 2. JMeter란

[Apache JMeter](https://jmeter.apache.org/)는 자바로 만든 오픈소스 부하 테스트 도구다.

- 오픈소스, 무료
- HTTP뿐 아니라 JDBC, JMS, FTP, gRPC·WebSocket(플러그인) 등 다양한 프로토콜 지원
- GUI로 시나리오 구성
- 플러그인 생태계와 풍부한 자료

다만 자바 GUI 기반이라 무겁고, 동시성이 커지면 부하 발생기 자체가 리소스를 많이 먹는다. 이 한계는 뒤에서 다시 짚는다.

# 3. 핵심 구성요소

테스트는 **Test Plan**을 트리로 구성한다. 자주 쓰는 요소는 다음과 같다.

| 요소 | 역할 |
|:--|:--|
| **Test Plan** | 테스트 전체를 담는 최상위 |
| **Thread Group** | 가상 사용자 수·기동 시간·반복을 정의 (부하량 결정) |
| **Sampler** | 요청 단위 (예: HTTP Request) |
| **Logic Controller** | 요청 흐름 제어 |
| **Config Element** | 공통 설정 (호스트, 헤더, CSV 등) |
| **Pre/Post Processor** | 요청 전후 처리 (값 추출 등) |
| **Assertion** | 응답 검증 |
| **Timer** | 요청 사이 대기 시간 |
| **Listener** | 결과 수집·표시 |

부하량은 **Thread Group**의 세 값으로 정한다.

- **Number of Threads** — 동시 가상 사용자 수
- **Ramp-up Period** — 스레드를 다 띄우는 시간(초). 100 스레드 / 10초면 1초에 10명씩 증가
- **Loop Count** — 각 스레드의 반복 횟수

# 4. 기본 사용법 (GUI)

자바(JDK)가 있으면 [공식 사이트](https://jmeter.apache.org/download_jmeter.cgi)에서 받아 실행한다.

```bash
brew install jmeter        # macOS

cd apache-jmeter-5.6.3/bin
./jmeter                   # Windows는 jmeter.bat
```

간단한 HTTP 시나리오 구성 순서는 다음과 같다.

1. Test Plan → **Thread Group** 추가 (Threads `100`, Ramp-up `10`, Loop `10`)
2. Thread Group → **HTTP Request Defaults**에 공통 호스트·포트 지정
3. Thread Group → **HTTP Request**에 Method·Path 지정
4. Thread Group → Listener에 **Summary Report**, **View Results Tree** 추가
5. ▶ 실행

![JMeter GUI Test Plan](/images/it/jmeter-gui.png){: .align-center}
*JMeter GUI. 왼쪽 트리에 Thread Group → HTTP Request → Listener를 얹어 시나리오를 구성한다.*

> GUI는 결과를 실시간으로 그리느라 무거워 실제 부하에는 권장되지 않는다. 시나리오(`.jmx`) 작성·디버깅만 GUI로 하고, 측정은 CLI로 돌리는 것을 추천한다.

# 5. 실제 부하는 CLI(non-GUI)로

`.jmx`를 명령행에서 돌리면 GUI 오버헤드 없이 더 큰 부하를 줄 수 있다.

```bash
jmeter -n \
  -t test-plan.jmx \        # 테스트 플랜
  -l result.jtl \           # 결과 로그
  -e -o ./report            # 종료 후 HTML 리포트 생성
```

- `-n` : non-GUI 모드
- `-t` : 입력 `.jmx`
- `-l` : 결과 로그(`.jtl`)
- `-e -o <dir>` : 종료 후 HTML 리포트 생성

한 대로 부족하면 분산 모드로 여러 머신을 묶는다.

```bash
jmeter -n -t test-plan.jmx -R 192.168.0.11,192.168.0.12 -l result.jtl
```

# 6. 결과 보는 법

주요 지표는 다음과 같다.

| 지표 | 의미 |
|:--|:--|
| **Throughput** | 초당 처리 요청 수(TPS/RPS) |
| **Average / Median** | 평균·중앙값 응답 시간 |
| **90/95/99% Line** | 백분위 응답 시간 |
| **Error %** | 실패 비율 |
| **Min / Max** | 최소·최대 응답 시간 |

평균보다 **p95/p99**를 본다. 평균이 100ms여도 p99가 5초면 100명 중 1명은 5초를 기다린다. 한계점은 부하를 올리며 **Error %나 p99가 급격히 꺾이는 지점**으로 잡는다.

# 7. TPS 등 그래프 얻기

TPS 그래프는 터미널에는 안 나온다. 터미널에는 텍스트 요약만 찍힌다.

```
summary +   5000 in 00:00:30 =  166.7/s Avg: 120 Min: 30 Max: 980 Err: 0
```

그래프는 리포트·대시보드에서 나온다.

**HTML 리포트 (테스트 종료 후)** — `-e -o`로 만든 리포트(`report/index.html`)에 시간축 그래프가 들어 있다.

```bash
jmeter -n -t test-plan.jmx -l result.jtl -e -o ./report
```

- **Transactions Per Second** — 보고서에 첨부하는 TPS 그래프
- Hits Per Second, Response Times Over Time, Active Threads Over Time
- Response Time Percentiles

![JMeter TPS 그래프](/images/it/jmeter-tps.png){: .align-center}
*HTML 리포트의 Transactions Per Second 그래프. 보고서에 첨부하는 게 보통 이 그래프다.*

`.jtl`만 있으면 리포트만 따로 생성할 수도 있다.

```bash
jmeter -g result.jtl -o ./report
```

**실시간 대시보드** — 부하 도중 실시간 그래프가 필요하면 **Backend Listener**로 메트릭을 보내 Grafana로 그린다.

```
JMeter (Backend Listener) → InfluxDB / Prometheus → Grafana
```

# 8. 자주 쓰는 활용법

**① CSV로 데이터 주입** — 모두 같은 값으로 요청하면 캐시 때문에 비현실적이다. **CSV Data Set Config**로 사용자마다 다른 값을 읽어 쓴다.

```
# users.csv
userId,keyword
user01,laptop
user02,keyboard
```

요청에서 `${userId}`, `${keyword}`로 참조한다.

**② 응답 값 추출 (상관관계)** — 로그인 응답의 토큰을 다음 요청에 쓰는 흐름은 **JSON Extractor**로 변수에 담는다.

```
JSON Path : $.accessToken
Variable  : token
```

이후 헤더에 `Authorization: Bearer ${token}`으로 넘긴다.

**③ Timer** — Constant/Uniform Random Timer로 요청 사이에 생각 시간을 둔다.

**④ Assertion** — Response Assertion으로 상태 코드·본문을 검증해 "빠르지만 틀린 응답"을 에러로 잡는다.

**⑤ Transaction Controller** — "로그인 → 조회 → 주문"을 묶어 시나리오 단위로 측정한다.

# 9. 실전 예시: 목록 API의 한계와 회복력 확인

아래는 특정 프로젝트의 값이 아닌 **가상의 쇼핑몰 상품 목록 API**를 대상으로 만든 예시다. 호스트·경로·토큰·부하량·판정 기준은 테스트 환경에 맞게 다시 정해야 한다.

## 9-1. 먼저 질문을 정한다

부하부터 크게 걸지 말고 테스트가 답할 질문을 좁힌다.

1. 동시 사용자를 늘릴 때 p99가 급격히 나빠지는 지점은 어디인가?
2. 병목은 애플리케이션 스레드, DB 커넥션 풀, DB 중 어디인가?
3. 순간 부하가 끝난 뒤 평상시 응답 시간으로 돌아오는가?

개발 환경에서 얻은 최대 TPS를 운영 용량으로 그대로 환산하면 안 된다. 장비 사양, 인스턴스 수, DB, 캐시 설정이 다르므로 같은 환경에서 변경 전후를 비교하는 값으로 쓰는 편이 안전하다.

## 9-2. 닫힌 모델로 무릎 찾기

동시 사용자 수를 `5 → 10 → 20 → 40`으로 올리고 각 구간을 3분 동안 유지한다. 반복 횟수로 끝내면 앞 스레드가 먼저 종료되어 설정한 동시성이 유지되지 않을 수 있으므로 `scheduler`와 `duration`을 쓴다.

### 왜 `Threads + Loops`만으로는 부족한가

`Number of Threads`는 만들 가상 사용자의 수이고, `Loop Count`는 각 사용자가 요청을 반복할 횟수다. 예를 들어 다음 설정을 보자.

```text
Threads = 100
Ramp-up = 10초
Loops = 5
응답 시간 = 약 50ms
```

스레드 하나는 `5회 × 50ms = 약 250ms` 만에 작업을 끝낸다. 100개 스레드를 10초에 걸쳐 기동하면 스레드 하나가 초당 약 10개씩 시작되는데, 먼저 시작한 스레드는 다음 스레드가 시작되기 전에 이미 종료된다. 따라서 결과에는 `100 × 5 = 500`개 샘플이 남아도, 실제 요청 처리 중인 스레드의 최대값은 100보다 훨씬 작을 수 있다.

예를 들어 `allThreads` 최대값이 5로 기록됐다면 설정한 100명의 5%만 한 시점에 살아 있었던 셈이다. 나머지 95개 스레드는 아직 시작하지 않았거나 이미 작업을 끝내고 종료한 상태다.

이 경우 설정값 100은 **생성한 전체 스레드 수**일 뿐, 100명이 계속 동시에 사용한 것이 아니다. 짧은 저부하 응답시간 측정에 가까우며, 지속적인 동시성 부하로 해석하면 안 된다.

### `scheduler + duration`으로 사용자를 유지하기

각 스레드가 정해진 횟수만 실행하고 끝나는 대신, 일정 시간 동안 반복하도록 설정한다.

```text
Threads = 100
Ramp-up = 10초
Loop Count = Forever
Scheduler = 체크
Duration = 180초
```

JMX에서는 다음처럼 표현한다.

```xml
<stringProp name="ThreadGroup.num_threads">100</stringProp>
<stringProp name="ThreadGroup.ramp_time">10</stringProp>
<boolProp name="ThreadGroup.scheduler">true</boolProp>
<stringProp name="ThreadGroup.duration">180</stringProp>
<stringProp name="LoopController.loops">-1</stringProp>
```

이제 스레드는 한 번 요청하고 종료하지 않는다. 램프업이 끝난 뒤에도 180초까지 요청을 반복하므로, 각 계단에서 일정한 동시 사용자 수를 유지하며 응답시간·처리량·에러율을 비교할 수 있다.

단, 이 방식이 매 순간 정확히 100개의 HTTP 요청을 동시에 처리한다는 뜻은 아니다. 응답이 빠르면 스레드가 다음 요청을 빠르게 시작하고, 응답이 느려지면 요청이 처리 중인 채로 쌓인다. 즉 `Threads + scheduler + duration`은 동시 사용자를 유지하는 **닫힌 모델**이다. 서버가 느려져도 실제 유입 속도 자체를 일정하게 유지해야 한다면 아래 열린 모델과 `Precise Throughput Timer`를 사용한다.

```xml
<ThreadGroup testname="Step load">
  <stringProp name="ThreadGroup.num_threads">${__P(threads,5)}</stringProp>
  <stringProp name="ThreadGroup.ramp_time">${__P(rampup,30)}</stringProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">${__P(duration,180)}</stringProp>
</ThreadGroup>
```

JMX에는 다음 요소만 둔다.

- `HTTP Cookie Manager`: 브라우저처럼 사용자별 세션 쿠키 유지
- `HTTP Header Manager`: 토큰은 파일에 쓰지 않고 `${__P(token,)}`으로 주입
- `HTTP Request`: `HttpClient4`, Keep-Alive, 연결·응답 타임아웃 설정
- `Response Assertion`: HTTP 200과 목록을 나타내는 응답 필드 확인
- `Throughput Controller`: 첫 페이지 80%, 나머지 페이지 20%처럼 실제 사용 비율 모사

## 9-3. GUI에서 만드는 전체 트리

JMeter GUI에서 `Test Plan`이나 `Thread Group`을 우클릭한 뒤 **Add** 메뉴로 구성한다. 예제의 최종 트리는 다음과 같다.

```text
Test Plan
├── User Defined Variables
└── Thread Group: Step load
    ├── HTTP Request Defaults
    ├── HTTP Cookie Manager
    ├── HTTP Header Manager
    ├── Throughput Controller: 첫 페이지 80%
    │   └── HTTP Request: GET 상품 목록 page=1
    │       ├── Response Assertion: HTTP 200
    │       └── Response Assertion: body에 "items" 포함
    ├── Throughput Controller: 다음 페이지 20%
    │   └── HTTP Request: GET 상품 목록 page=2~5
    │       ├── Response Assertion: HTTP 200
    │       └── Response Assertion: body에 "items" 포함
    ├── HTTP Request: GET 상품 분류 정보
    │   └── Response Assertion: HTTP 200
    └── [디버깅할 때만] View Results Tree
```

각 요소를 추가하는 GUI 경로는 다음과 같다.

| 구성요소 | 추가 경로 | 이 예제에서 하는 일 |
|:--|:--|:--|
| Thread Group | Test Plan → Add → Threads (Users) → Thread Group | 동시 사용자, 램프업, 실행 시간 설정 |
| HTTP Request Defaults | Thread Group → Add → Config Element → HTTP Request Defaults | 프로토콜·호스트·포트 공통화 |
| HTTP Cookie Manager | Thread Group → Add → Config Element → HTTP Cookie Manager | 스레드별 세션 쿠키 유지 |
| HTTP Header Manager | Thread Group → Add → Config Element → HTTP Header Manager | 인증·Content-Type 헤더 공통화 |
| Throughput Controller | Thread Group → Add → Logic Controller → Throughput Controller | 요청 종류별 실행 비율 제어 |
| Transaction Controller | Thread Group → Add → Logic Controller → Transaction Controller | 여러 API를 한 번의 화면 조회로 묶어 측정할 때 사용 |
| HTTP Request | Controller → Add → Sampler → HTTP Request | 실제 API 요청 |
| Response Assertion | HTTP Request → Add → Assertions → Response Assertion | 상태 코드 검증 |
| Precise Throughput Timer | Thread Group → Add → Timer → Precise Throughput Timer | 열린 모델의 목표 RPS 유지 |
| Listener | Thread Group → Add → Listener | 디버깅 또는 결과 확인 |

`Handler`라는 별도 분류보다는 요청 흐름을 제어하는 **Logic Controller**, 요청 속도를 조절하는 **Timer**, 결과를 검증하는 **Assertion**, 결과를 보여주는 **Listener**로 역할이 나뉜다.

## 9-4. 컴포넌트별 설정

### User Defined Variables

Test Plan 화면의 **User Defined Variables**에 환경별로 달라지는 값만 둔다.

| Name | Value |
|:--|:--|
| `HOST` | `${__P(host,loadtest.example.invalid)}` |
| `TOKEN` | `${__P(token,)}` |

`${__P(name,default)}`는 CLI의 `-Jname=value`를 읽는다. 토큰의 기본값은 비워 두고 저장소에 실제 값을 커밋하지 않는다.

### Thread Group

다음 값으로 실행 횟수가 아니라 **시간**을 기준으로 동시성을 유지한다.

| 항목 | 값 | 의미 |
|:--|:--|:--|
| Number of Threads | `${__P(threads,5)}` | 동시 가상 사용자 수 |
| Ramp-up period | `${__P(rampup,30)}` | 전체 사용자를 기동하는 시간 |
| Loop Count | `Forever` | Duration 동안 반복 |
| Specify Thread lifetime | 체크 | Scheduler 활성화 |
| Duration | `${__P(duration,180)}` | 한 계단의 총 실행 시간 |
| Action after Sampler error | Continue | 오류도 집계하면서 테스트 계속 |
| Same user on each iteration | 체크 | 한 스레드가 같은 사용자 세션 유지 |

예를 들어 `threads=20`, `rampup=30`이면 30초 동안 20명을 순차적으로 기동한다. 총 180초 중 앞 60초를 램프업·안정화로 제외하면 뒤 120초를 비교 구간으로 쓸 수 있다.

### HTTP Request Defaults와 HTTP Request

`HTTP Request Defaults`에는 `Protocol=https`, `Server Name=${HOST}`, `Implementation=HttpClient4`, `Connect Timeout=10000`, `Response Timeout=30000`을 둔다. 개별 Sampler에는 경로, 메서드, 파라미터만 적는다.

```text
Method: GET
Path: /api/products

Parameters
page = 1
size = 20
```

`Use KeepAlive`는 체크한다. 실제 클라이언트가 연결을 재사용하는데 JMeter만 매번 새 연결을 만들면 서버의 연결 비용을 과대 측정한다.

### Cookie Manager와 Header Manager

`HTTP Cookie Manager`의 **Clear cookies each iteration?**은 체크하지 않는다. 그러면 각 스레드는 자기 쿠키를 유지하되 다른 스레드와 쿠키를 공유하지 않는다. 이 요소가 없으면 매 요청마다 새 세션이 생기는 애플리케이션에서는 DB 조회와 메모리 사용량이 실제보다 커질 수 있다.

`HTTP Header Manager`에는 필요한 헤더만 둔다.

```text
Accept        application/json
Authorization Bearer ${TOKEN}
```

GET 요청에는 본문이 없으므로 서버가 요구하지 않는다면 `Content-Type`은 생략해도 된다.

### Throughput Controller

첫 페이지 Controller는 **Percent Executions=80.0**, 다음 페이지 Controller는 **20.0**으로 설정하고 **Per User**는 해제한다. 다음 페이지 번호는 `${__Random(2,5,)}`처럼 가상 범위에서 고른다.

Throughput Controller의 이름과 달리 이 요소는 RPS를 제한하지 않는다. 하위 요청이 실행될 **비율**만 정한다. 초당 요청 수를 고정하려면 Timer를 사용해야 한다.

### Transaction Controller

화면 한 번을 열 때 목록·분류·추천 API가 함께 호출된다면 세 Sampler를 `Transaction Controller` 아래에 넣는다. **Generate parent sample**을 체크하면 개별 API 결과와 별도로 “상품 목록 화면 전체” 응답 시간을 한 건으로 볼 수 있다. 단일 API만 측정한다면 필요 없다.

### Assertion

HTTP 200만 확인하면 오류 메시지를 200으로 반환하는 API를 성공으로 오판할 수 있다. 최소 두 단계를 검증한다.

1. `Response Assertion`: **Field to Test=Response Code**, **Pattern Matching Rules=Equals**, **Patterns to Test=200**
2. `Response Assertion`: **Field to Test=Text Response**, **Pattern Matching Rules=Substring**, **Patterns to Test=\"items\"**

목록이 비어도 정상일 수 있으므로 배열 길이보다 필드 존재 여부를 검증하는 편이 안전하다. 응답 구조를 엄격하게 검사해야 한다면 `JSON JMESPath Assertion`을 추가해 `data.items` 같은 표현식의 존재 여부를 검사한다.

## 9-5. Listener는 언제 무엇을 쓰나

Listener는 요청을 만드는 요소가 아니라 결과를 읽는 요소다. GUI로 소량 디버깅할 때와 실제 부하를 걸 때 구성을 다르게 한다.

| Listener | 용도 | 실제 부하에서 사용 |
|:--|:--|:--|
| View Results Tree | 요청·응답 본문, Assertion 실패 원인 확인 | **사용 안 함** |
| Summary Report | 샘플 수, 평균, min/max, 처리량, 에러율 확인 | GUI에서는 소량만 |
| Aggregate Report | median과 90·95·99 백분위 확인 | GUI에서는 소량만 |
| Aggregate Graph | 집계 결과를 막대그래프로 확인 | 보고서용 임시 사용 |
| Backend Listener | InfluxDB·Prometheus 등으로 실시간 메트릭 전송 | 실시간 관찰이 필요할 때 사용 |
| Simple Data Writer | JTL 파일 저장 | CLI의 `-l`로 대체 가능 |

`View Results Tree`는 모든 샘플과 응답 본문을 메모리에 쌓는다. 수천 건 이상에서는 JMeter 자체의 CPU·메모리를 사용해 부하 발생기가 먼저 느려질 수 있다. 따라서 다음처럼 나눈다.

- 시나리오 작성: 스레드 1명, Loop 1회, `View Results Tree`로 요청·응답 확인
- 짧은 검증: 스레드 2~5명, `Summary Report`로 에러 여부 확인
- 본 테스트: 모든 GUI Listener를 비활성화하고 `jmeter -n -l result.jtl -e -o report` 사용

실시간 그래프가 꼭 필요하면 `Backend Listener`만 사용하고, 부하 발생기와 모니터링 저장소가 병목이 아닌지 확인한다. 종료 후 분석만 필요하다면 JTL과 HTML 리포트가 가장 단순하다.

예시 요청은 `GET /api/products?page=1&size=20`으로 두고, 토큰은 실행할 때만 넘긴다.

```bash
export TOKEN='temporary-test-token'
jmeter -n \
  -t product-list-step.jmx \
  -Jhost=loadtest.example.invalid \
  -Jtoken="$TOKEN" \
  -Jthreads=20 -Jrampup=30 -Jduration=180 \
  -l out/step020.jtl -e -o out/step020-report
```

실행 전 1~2분 워밍업하고, 각 구간의 램프업과 안정화 시간은 집계에서 제외한다. 다음처럼 결과표를 채우면 무릎과 서버 지표를 함께 볼 수 있다.

| 동시 사용자 | TPS | 평균 | p99 | 에러율 | DB 풀 active | DB 풀 waiting |
|:--|:--|:--|:--|:--|:--|:--|
| 5 |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |
| 20 |  |  |  |  |  |  |
| 40 |  |  |  |  |  |  |

응답이 느려졌는데 `waiting=0`이고 풀에 여유가 있다면 풀 크기부터 늘릴 이유는 약하다. 이때는 DB CPU·I/O·락 또는 애플리케이션 스레드를 확인한다. 반대로 `active`가 풀 크기에 붙고 `waiting`이 증가하면 커넥션 대기가 병목 후보가 된다.

## 9-6. 열린 모델로 스파이크 재현하기

Thread Group은 서버가 느려지면 요청을 보내는 속도도 함께 느려지는 **닫힌 모델**이다. 실제 유입처럼 서버 상태와 관계없이 일정 RPS를 넣으려면 `Precise Throughput Timer` 같은 도착률 제어를 사용한다.

`Precise Throughput Timer`는 Thread Group 바로 아래에 두고 다음처럼 설정한다.

| 항목 | 예시 값 | 의미 |
|:--|:--|:--|
| Target throughput | `80` | 목표 요청 수 |
| Throughput period | `1` second | 초당 80건 |
| Test duration | `120` seconds | 해당 RPS 유지 시간 |
| Number of threads in a batch | `1` | 요청을 한꺼번에 몰아 보내지 않음 |
| Delay between threads in a batch | `0` | 배치 내 추가 지연 없음 |

Timer는 요청 시각만 늦출 뿐 필요한 스레드를 만들어 주지 않는다. 목표가 80 RPS이고 최악 응답 시간이 3초라면 최소 동시성은 대략 `80 × 3 = 240`이다. Thread Group의 스레드를 이보다 넉넉하게 잡고, 결과의 실제 RPS가 목표의 80%에도 못 미치면 스레드 부족인지 서버 처리량 부족인지 먼저 구분한다.

가상의 프로파일을 다음처럼 잡을 수 있다.

| 구간 | 시간 | 목표 RPS | 목적 |
|:--|:--|:--|:--|
| 평시 | 2분 | 10 | 기준선 |
| 상승 | 1분 | 10 → 80 | 급증 재현 |
| 피크 | 2분 | 80 | 포화 여부 확인 |
| 부하 제거 | 1분 | 0 | 큐와 자원 해소 |
| 회복 관찰 | 5분 | 10 | 정상화 시간 측정 |

여기서는 피크의 최대 TPS보다 **부하 제거 뒤 회복 시간**이 더 중요하다. 평시 RPS로 낮췄는데도 에러율이나 p99가 계속 높다면 자원 고갈, 긴 큐, 락 경합처럼 부하 이후에도 남는 상태를 의심한다.

## 9-7. 실행 스크립트에 둘 안전장치

여러 단계를 자동 실행한다면 러너에는 아래 정도만 넣는다.

```bash
set -euo pipefail

: "${TOKEN:?TOKEN 환경변수가 필요합니다}"
command -v jmeter >/dev/null

for threads in 5 10 20 40; do
  jmeter -n -t product-list-step.jmx \
    -Jhost=loadtest.example.invalid -Jtoken="$TOKEN" \
    -Jthreads="$threads" -Jrampup=30 -Jduration=180 \
    -l "out/step-${threads}.jtl"
done
```

실제 러너에는 에러율이나 p99가 허용 기준을 넘으면 다음 단계를 실행하지 않는 중단 조건을 추가한다. 출력 파일은 단계별로 분리하고, 같은 시각의 애플리케이션·DB·APM 지표를 함께 보관해야 원인을 판단할 수 있다.

> 운영 서버에 예고 없이 부하를 주지 않는다. 격리된 환경에서 시작하고, 테스트 계정과 짧게 만료되는 토큰을 사용하며, `.jmx`·`.jtl`·로그에 개인정보나 인증 정보가 남지 않았는지 확인한다.

# 10. 요즘은 다른 툴도 많이 쓴다

최근에는 **코드로 시나리오를 짜고 CI에 끼워 넣는** 흐름이 선호된다. JMeter는 가상 사용자 한 명당 스레드 하나라 동시성이 커질수록 부하 발생기 리소스가 빠르게 늘지만, 신생 툴들은 이 부분이 가볍다.

> **macOS에서 부하 발생기로 쓸 때의 한계** — JMeter는 사용자 한 명당 스레드와 소켓(파일 디스크립터)을 하나씩 쓴다. 그런데 macOS는 `ulimit -n` 기본값이 256으로 낮아, 스레드를 올리다 보면 서버가 멀쩡해도 부하 발생기 쪽에서 `Too many open files`가 먼저 터진다.
>
> ```bash
> ulimit -n            # 현재 한도 확인 (기본 256)
> ulimit -n 65536      # 셸 세션 한정으로 상향
> ```
>
> 다만 이 값도 상위 한도(`launchctl limit maxfiles`)에 막힌다. mac에서 큰 부하가 필요하면 분산 모드, 리눅스 서버, 또는 가벼운 툴을 쓴다.

| 툴 | 방식 | 특징 |
|:--|:--|:--|
| **k6** | JavaScript (Go 엔진) | 가볍고 CI 친화적, Grafana 연동이 강점 |
| **Gatling** | Scala/Java/Kotlin DSL | 비동기 엔진, 적은 리소스로 높은 동시성 |
| **Locust** | Python | 분산 부하가 쉽고 웹 UI 제공 |
| **wrk / wrk2** | C (+Lua) | 단일 엔드포인트 고부하, 정밀 측정용 |
| **Vegeta** | Go | 일정 비율(rate) 요청에 강함 |

k6는 메트릭을 Prometheus·Grafana로 내보내기 좋다. 시나리오는 자바스크립트로 짧게 쓴다.

```javascript
// script.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // 1분간 100명까지 올렸다가, 1분 유지, 30초간 0으로
  stages: [
    { duration: '1m', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // p95가 500ms 미만이어야 통과
    http_req_failed: ['rate<0.01'],      // 에러율 1% 미만
  },
};

export default function () {
  const res = http.get('http://localhost:8080/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run script.js
```

`thresholds`로 합격 기준을 코드에 박아두면, 기준 미달 시 CI 빌드를 실패시킬 수 있다. JMeter의 GUI 중심 워크플로 대비 신생 툴이 선호되는 이유다.

# 11. 정리

- 시나리오는 GUI로 만들고 측정은 CLI로 돌린다.
- 결과는 평균보다 **p95/p99와 Error %**를 본다.
- 계단식 테스트로 한계점을 찾고, 스파이크 테스트에서는 **부하 제거 뒤 회복 시간**도 확인한다.
- **TPS 그래프**는 `-e -o` HTML 리포트에 있고, 실시간은 Backend Listener → Grafana로 그린다.
- 요즘은 코드 기반·CI 친화적인 **k6·Gatling·Locust** 등이 많이 쓰인다.
