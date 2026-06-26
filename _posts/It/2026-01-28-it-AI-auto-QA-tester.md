---
layout: post
title: QA Agent Server, AI 기반 웹 테스트 자동화
date: 2026-01-28
Author: Geon Son
categories: IT
tags: [AI, Playwright, MCP, Spring AI, Gemini]
comments: true
toc: true
---

> 반복적인 웹 화면 테스트를 자동화해보고 싶어서, "이 페이지 로그인 테스트해줘" 같은 자연어 요청을 받으면 AI가 직접 브라우저를 열고 입력·클릭하며 테스트한 뒤 결과를 정리해주는 서버를 만들어봤다.
> 프로젝트 레파지토리: https://github.com/GeonDev/auto-tester-with-ai

# 1. 개발 배경

Selenium이나 Playwright로 테스트 스크립트를 짜본 사람은 알겠지만, 화면이 조금만 바뀌어도 셀렉터가 깨지고 스크립트를 다시 손봐야 한다. "사람이 하듯 페이지를 보고 알아서 테스트해주면 안 되나" 싶었고, LLM이 도구(tool)를 직접 호출할 수 있게 된 지금이라면 해볼 만하겠다 싶어 시도했다.

아이디어 자체는 단순하다. LLM에게 브라우저를 조작하는 도구들을 쥐여주고 "이 페이지를 테스트하라"는 목표만 준다. 그러면 LLM이 알아서 페이지를 열고(navigate), 구조를 파악하고(snapshot), 입력·클릭한 뒤 결과를 보고 다음 행동을 판단한다.

## 기술 스택
- **Framework**: Spring Boot 3.4.1 + Spring AI
- **LLM**: Google Gemini 2.5 (Flash/Pro) 또는 Ollama 로컬 모델(Llama 3.2)
- **Browser Automation**: Playwright (MCP 서버 형태)
- **LLM–도구 연결**: MCP (Model Context Protocol)

Gemini와 Ollama 두 가지를 둔 이유는, 평소엔 빠르고 저렴한 Gemini Flash를 쓰되 민감한 내부 화면을 테스트할 때는 데이터가 외부로 나가지 않는 로컬 Ollama로 바꿔 쓰기 위해서다.

---

# 2. 아키텍처

## 전체 구조

```
┌─────────────────────────┐
│        사용자            │
│        (Chat UI)        │
└────────────┬────────────┘
             │ HTTP 요청
             ▼
┌─────────────────────────┐
│  Chat Controller        │
│       (REST API)        │
└────────────┬────────────┘
             │ 사용자 메시지
             ▼
┌─────────────────────────┐
│  Spring AI Core         │
│       (ChatClient)      │
└────────────┬────────────┘
             │ 프롬프트/응답
             ▼
┌─────────────────────────┐
│        LLM              │
│     (Gemini/Ollama)     │
└────────────┬────────────┘
             │ Tool 호출 결정
             ▼
┌─────────────────────────┐
│  Tool Callback Provider │
│       (도구 관리)        │
└────────────┬────────────┘
             │ 도구 실행
             ▼
┌─────────────────────────┐
│  MCP Client             │
│     (프로토콜 변환)      │
└────────────┬────────────┘
             │ STDIO (JSON Protocol)
             ▼
┌─────────────────────────┐
│  Playwright MCP         │
│   (브라우저 자동화)      │
├─────────────────────────┤
│  Filesystem MCP         │
│     (파일 관리)         │
├─────────────────────────┤
│  Chrome DevTools MCP    │
│    (개발자 도구)        │
└────────────┬────────────┘
             │ Playwright API / CDP / File I/O
             ▼
┌─────────────────────────┐
│  웹 브라우저            │
│  (Chromium 등)          │
└─────────────────────────┘
```

흐름을 풀어 쓰면 이렇다. 사용자의 자연어 요청이 Spring AI의 `ChatClient`를 통해 LLM으로 전달되고, LLM은 "지금 navigate 도구를 호출해야겠다"는 식으로 도구 호출을 결정한다. 그 호출은 MCP Client를 거쳐 STDIO(표준 입출력) 기반 JSON 메시지로 MCP Server(Playwright 등)에 전달되어 실제 브라우저 조작이 일어난다. 결과(페이지 스냅샷 등)는 다시 LLM에게 돌아가 다음 행동의 근거가 된다.

## 2.1 Spring AI

Spring 애플리케이션에서 LLM 기능을 다루게 해주는 프로젝트다. 이 프로젝트에서는 두 가지 역할을 한다.

- `ChatClient`로 LLM 통신을 추상화한다. 덕분에 Gemini든 Ollama든 코드 변경 없이 설정만 바꿔 갈아끼울 수 있다.
- Java 메서드나 외부 MCP 도구를 LLM이 호출 가능한 도구로 노출한다. LLM이 필요할 때 스스로 도구를 골라 호출한다.

Python을 해봤다면 LangChain과 역할이 거의 비슷하다고 보면 된다. LLM 추상화, 도구(Tool) 호출, 프롬프트 템플릿 같은 개념이 대부분 대응되기 때문에, LangChain에 익숙하다면 Spring AI로 넘어오는 데 큰 부담은 없었다.

## 2.2 MCP (Model Context Protocol)

LLM과 외부 도구를 잇는 표준 프로토콜이다. 도구마다 제각각 연동 코드를 짜는 대신, MCP라는 하나의 규격으로 붙인다. 이 프로젝트에서는 Spring AI(MCP Client)와 실제 도구를 제어하는 서버(MCP Server) 사이를 STDIO 기반 JSON 메시지로 연결했다.

```
Spring AI → MCP Client → [STDIO] → MCP Server → Playwright/Filesystem
```

직접 써보며 좋았던 점은 두 가지였다.

- 도구 서버가 애플리케이션과 별도 프로세스로 떠서, 도구 쪽이 죽어도 본체에 미치는 영향이 적다.
- 새 도구가 필요하면 MCP 서버만 추가하면 되고 기존 코드를 건드릴 필요가 없다.

붙여 쓴 MCP 서버는 **Playwright**(브라우저 자동화), **Filesystem**(테스트 프롬프트 파일 읽기), **Chrome DevTools**(개발자 도구) 세 가지다. 각 서버가 어떤 도구를 몇 개 노출하는지는 버전에 따라 달라지므로, 실제 도구 목록은 `npx @playwright/mcp@latest --help` 등으로 확인하는 것이 정확하다.

## 2.3 Ollama

Ollama는 로컬 PC나 온프레미스 서버에서 오픈소스 LLM을 손쉽게 실행하게 해주는 도구다. Docker처럼 모델을 받아 관리하며, `ollama run llama3.2`처럼 간단한 명령으로 모델을 다운로드하고 실행한다. 이 프로젝트에서는 Gemini 대신 선택할 수 있는 로컬 LLM 옵션으로 썼다.

내부망이나 민감 데이터를 테스트할 때 내용이 외부 API로 나가지 않는다는 점, 호출 비용이 들지 않는다는 점이 장점이다. 다만 로컬 모델은 같은 작업에서도 Gemini보다 도구 호출 판단이 부정확할 때가 있어, 정확도가 중요한 시나리오에는 Gemini를 썼다.

---

# 3. 동작 흐름

## 테스트 실행 과정

```
┌─────────────────────────────────────────┐
│              사용자                       │
│   "http://localhost:8080/login 테스트해줘" │
└───────────────────┬─────────────────────┘
                    │ 요청
                    ▼
┌─────────────────────────────────────────┐
│             Spring AI                    │
│             (ChatClient)                 │
└───────────────────┬─────────────────────┘
                    │ 테스트 계획 요청
                    ▼
┌─────────────────────────────────────────┐
│                LLM                       │
│          (Gemini/Ollama)                 │
│                                          │
│   1. 페이지 접속  → navigate             │
│   2. 구조 파악   → snapshot              │
│   3. 폼 입력     → type                  │
│   4. 버튼 클릭   → click                 │
│   5. 결과 확인   → snapshot              │
└───────────────────┬─────────────────────┘
                    │ 도구 호출
                    ▼
┌─────────────────────────────────────────┐
│               MCP Client                 │
│            (프로토콜 변환)               │
└───────────────────┬─────────────────────┘
                    │ STDIO (JSON Protocol)
                    ▼
┌─────────────────────────────────────────┐
│              MCP Server                  │
│       (Playwright, Filesystem 등)        │
└───────────────────┬─────────────────────┘
                    │ 브라우저 조작 및 결과 반환
                    ▼
┌─────────────────────────────────────────┐
│         웹 브라우저 (Chromium)           │
└───────────────────┬─────────────────────┘
                    │ 실행 결과 (페이지 상태, 스냅샷 등)
                    ▼
┌─────────────────────────────────────────┐
│                LLM                       │
│   (결과 분석 후 다음 액션 결정 or 종료)  │
└───────────────────┬─────────────────────┘
                    │ 테스트 결과 요약
                    ▼
┌─────────────────────────────────────────┐
│             Spring AI                    │
└───────────────────┬─────────────────────┘
                    │ 결과 응답 (실시간 스트리밍)
                    ▼
┌─────────────────────────────────────────┐
│              사용자                      │
└─────────────────────────────────────────┘
```

핵심은 사람이 단계를 일일이 지정하지 않는다는 점이다. LLM이 페이지 스냅샷을 보고 → 다음 단계를 판단하고 → 도구를 골라 실행하고 → 결과를 다시 확인해 진행할지 종료할지 스스로 결정한다. 화면 구조가 바뀌어도 스냅샷을 다시 읽어 대응하기 때문에, 고정된 셀렉터에 의존하는 기존 스크립트보다 화면 변경에 덜 취약했다.

---

# 4. 시스템 프롬프트: AI의 행동 지침

결국 이 시스템의 성능은 프롬프트 품질에 크게 좌우된다. LLM에게 QA 엔지니어 역할과 작업 방식, 보고 형식을 정해줬다.

```
역할: 웹 애플리케이션 QA 전문가
목표: 기능 동작 검증, 버그 발견, 사용성 평가

사용 가능한 도구(Playwright MCP):
- browser_navigate : 페이지 이동
- browser_click    : 요소 클릭
- browser_type     : 텍스트 입력
- browser_snapshot : 현재 상태 캡처

보고 형식:
1. 테스트 시나리오
2. 실행 단계
3. 결과 (통과/실패)
4. 발견된 이슈
```

처음에는 도구 이름을 `navigate`, `click`처럼 짧게 안내했는데, 실제 Playwright MCP가 노출하는 도구명은 `browser_navigate`, `browser_click`처럼 `browser_` 접두사가 붙는다. 프롬프트의 도구명과 실제 도구명이 어긋나면 LLM이 호출에 실패하므로, 실제 노출되는 이름 그대로 안내하는 편이 안정적이었다.

---

# 5. 핵심 설정

## 5.1 LLM 설정 (application.yml)

가장 헤맸던 부분이 Spring AI의 설정 키 구조다. Google GenAI와 Ollama는 모델·파라미터를 두는 위치가 다르다.

- **Google GenAI**: `spring.ai.google.genai.chat.model`, `...chat.temperature` (별도의 `options` 단계 없음)
- **Ollama**: `spring.ai.ollama.chat.options.model`, `...options.temperature` (`options` 아래에 둔다)

```yaml
spring:
  ai:
    # Google Gemini
    google:
      genai:
        api-key: ${GEMINI_API_KEY}
        chat:
          model: gemini-2.5-flash     # 속도 우선
          temperature: 0.3            # 일관성 있는 테스트 결과

    # Ollama (로컬 LLM)
    ollama:
      base-url: ${OLLAMA_BASE_URL:http://localhost:11434}
      chat:
        options:
          model: ${OLLAMA_MODEL:llama3.2}
          temperature: ${OLLAMA_TEMPERATURE:0.3}
```

환경 변수로 모델을 주입하도록 해두면, `OLLAMA_MODEL=llama3.2`처럼 설정만 바꿔 사용할 모델을 전환할 수 있다.

## 5.2 MCP 서버 연결

```yaml
spring:
  ai:
    mcp:
      client:
        sync-timeout: 60s
        stdio:
          connections:
            playwright:
              command: npx
              args: ["--yes", "@playwright/mcp@latest"]

            filesystem:
              command: npx
              args: ["--yes", "@modelcontextprotocol/server-filesystem", "${user.dir}/qa-prompts"]

            chrome-devtools:
              command: npx
              args: ["--yes", "chrome-devtools-mcp@latest"]
```

---

# 6. 실행

## 환경 설정

Google Gemini를 쓸 경우 API 키를 설정한다. Ollama(로컬 LLM)만 쓸 거라면 별도 키 없이 로컬 Ollama 서버만 떠 있으면 된다.

```bash
export GEMINI_API_KEY=your-api-key
```

```bash
# 1. 빌드
./gradlew bootJar

# 2. Docker 실행 (필요한 환경 변수 설정 후)
cd docker
docker-compose up -d

# 3. 접속
open http://localhost:8090
```

## 테스트 실행

```
채팅창에 입력:
"http://example.com/login 로그인 페이지 테스트해줘"
```

---

# 7. 해보고 느낀 점과 남은 과제

직접 돌려보니 단순한 흐름(로그인, 폼 제출 같은)은 사람이 셀렉터를 지정하지 않아도 LLM이 스냅샷을 보고 알아서 처리했다. 화면이 조금 바뀌어도 다시 스냅샷을 읽어 대응하는 점이 기존 스크립트 방식보다 확실히 편했다.

반대로 한계도 분명했다. 단계가 많아지는 복잡한 시나리오에서는 LLM이 중간에 엉뚱한 요소를 클릭하거나, 같은 단계를 반복하는 경우가 있었다. 모델·프롬프트 품질에 결과가 크게 흔들리는 것도 운영 관점에서는 부담이다.

앞으로 보완하고 싶은 부분은 대략 이렇다.

- 멀티 페이지에 걸친 복잡한 사용자 여정 지원
- 에러 복구 전략(재시도, 대체 경로)과 LLM 의사결정 로깅
- CI/CD 파이프라인 연동 및 다양한 브라우저/디바이스 대응
- 스크린샷·비디오가 포함된 시각적 테스트 리포트

아직은 사람의 테스트를 완전히 대체하기보다, 반복적인 화면 점검을 거들어주는 보조 도구에 가깝다. 다만 LLM의 도구 호출 능력이 더 좋아질수록 쓸모가 빠르게 커질 영역이라고 본다.
