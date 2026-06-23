---
layout: post
title: JMeter로 부하 테스트하기 — 기능 소개와 활용법, 그리고 요즘 대안들
date: 2026-06-23
Author: Geon Son
categories: IT
tags: [LoadTest, JMeter, Performance, k6, Gatling]
comments: true
toc: true
---

> 배포 전에 "트래픽이 몰리면 어디까지 버틸까"를 미리 확인할 때 부하 테스트를 한다. 대표 도구인 JMeter의 기능과 활용법, 그리고 요즘 쓰이는 대안 툴을 정리한다.

# 1. 부하 테스트는 왜 하나

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

> GUI는 결과를 실시간으로 그리느라 무거워 실제 부하에는 권장되지 않는다. 시나리오(`.jmx`) 작성·디버깅만 GUI로 하고, 측정은 CLI로 돌린다.

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

# 9. 요즘은 다른 툴도 많이 쓴다

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

# 10. 정리

- 시나리오는 GUI로 만들고 측정은 CLI로 돌린다.
- 결과는 평균보다 **p95/p99와 Error %**를 본다.
- **TPS 그래프**는 `-e -o` HTML 리포트에 있고, 실시간은 Backend Listener → Grafana로 그린다.
- 요즘은 코드 기반·CI 친화적인 **k6·Gatling·Locust** 등이 많이 쓰인다.
