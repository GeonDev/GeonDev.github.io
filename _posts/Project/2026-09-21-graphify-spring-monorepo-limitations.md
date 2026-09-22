---
layout: post
title: graphify 사용 후기
date: 2026-09-21
Author: Geon Son
categories: Project
tags: [graphify, Knowledge Graph, AST, Spring, Claude Code, Refactoring]
comments: true
toc: true
---

> 개인 프로젝트에 [graphify](https://github.com/safishamsi/graphify)를 붙여 코드베이스 전체를 지식 그래프로 만들어본 기록이다. 목적은 리팩토링 후보(중복·저사용 코드) 탐색이었고, 실제로 부딪힌 한계 위주로 정리한다.

# graphify란

코드·문서·논문·이미지가 섞인 폴더를 넣으면 노드-엣지 지식 그래프로 바꿔주는 CLI 도구다. Claude Code 같은 에이전트 환경에서는 `/graphify` 스킬로 동작하고, 별도 API 키 없이도 코드 전용 코퍼스(분석 대상 파일 묶음)는 정적 파싱만으로 그래프를 만든다.

파이프라인은 다음 순서로 진행된다.

![graphify 파이프라인 — 파일 감지부터 그래프 빌드, 커뮤니티 디텍션, 분석, 리포트·시각화 출력까지의 처리 흐름](/images/project/graphify-pipeline.svg){: .align-center}
*graphify의 처리 흐름. 코드 파일은 AST 정적 파싱(Part A)만 거치고, 문서·이미지 같은 시맨틱 자료만 LLM 서브에이전트(Part B)로 처리된다.*

- **구조 추출(Part A)** — 코드 파일은 tree-sitter 기반 AST로 함수·클래스·호출 관계를 추출한다. LLM을 쓰지 않아 무료이고 결정적(deterministic)이다.
- **시맨틱 추출(Part B)** — 문서·논문·이미지만 LLM(서브에이전트 병렬 디스패치, 또는 `GEMINI_API_KEY` 설정 시 Gemini)로 처리한다. 코드만 있는 레포는 이 단계 자체를 스킵한다.
- **그래프 빌드** — 두 결과를 NetworkX 그래프로 병합.
- **커뮤니티 디텍션** — 연결 밀도로 노드를 클러스터링, 커뮤니티별 cohesion 점수 산출.
- **분석** — God Node(연결이 몰린 허브 노드), Surprising Connection(커뮤니티 경계를 넘는 의외의 연결) 탐지.
- **출력** — `graph.html`(인터랙티브 시각화), `GRAPH_REPORT.md`(사람이 읽는 감사 리포트), `graph.json`(원본 데이터).

자주 쓰는 명령은 이 정도다.

| 명령 | 동작 |
|------|------|
| `/graphify <path>` | 전체 파이프라인 실행 |
| `/graphify <path> --mode deep` | 더 정밀한 추출, INFERRED 엣지 강화 |
| `/graphify <path> --update` | 변경된 파일만 재추출 |
| `/graphify query "<질문>"` | 그래프 위에서 BFS/DFS 순회로 답 찾기 |
| `/graphify path "A" "B"` | 두 노드 간 최단 경로 |
| `/graphify explain "X"` | 노드 하나와 인접 연결을 자연어로 설명 |

# 시각화와 내보내기

`graph.html`은 기본으로 항상 생성되고, 브라우저로 열면 인터랙티브 그래프(검색, 커뮤니티 색상 구분, 확대/축소)를 볼 수 있다. 노드가 5,000개를 넘으면 자동으로 커뮤니티 단위로 뭉쳐 렌더링한다. 그 외 내보내기는 목적에 따라 고른다.

| 옵션 | 용도 |
|------|------|
| `--svg` | 문서·GitHub에 임베드할 정적 이미지 |
| `--graphml` | Gephi, yEd 같은 전문 그래프 툴 |
| `--neo4j` / `--neo4j-push` | Neo4j에 Cypher로 적재, 쿼리 언어로 탐색 |
| `--falkordb` / `--falkordb-push` | FalkorDB(Redis 기반 그래프 DB)에 적재 |
| `--obsidian` | 노드 하나당 마크다운 파일 하나로, Obsidian vault 생성 |
| `--mcp` | `graphify.serve` MCP 서버 기동. `query_graph`, `get_neighbors`, `shortest_path` 등을 다른 에이전트가 실시간 호출 |

stock-msa에서 실제로 나온 `graph.html`을 그대로 붙여넣는다. 좌측 검색창에 클래스·메서드 이름을 입력하면 해당 노드로 이동하고, 노드를 클릭하면 우측 패널에 소스 위치와 인접 노드가 뜬다.

<iframe src="/assets/graphify/stock-msa-graph.html" width="100%" height="600" style="border:1px solid #333;border-radius:8px;" loading="lazy"></iframe>
*stock-msa 코드베이스를 돌린 실제 graph.html(313개 커뮤니티, 7,603개 노드). 검색·클릭으로 직접 탐색해볼 수 있다.*

# 그래프에 질문하기 — CLI와 에이전트 스킬은 동작이 다르다

터미널에서 `graphify` CLI를 직접 쓸 때는 서브커맨드를 명시해야 한다. `query`, `path`, `explain`, `update` 등은 최상위 서브커맨드로 파싱되므로, 자연어 질문만 치면 인식하지 못한다.

```bash
graphify query "AuthService는 어디서 호출되나"
graphify query "가격 조회 흐름" --dfs --budget 1500
```

Claude Code에서 `/graphify` 스킬을 통해 쓸 때는 다르다. 스킬 지침에 "`graphify-out/graph.json`이 이미 있고 사용자의 요청이 리빌드 명령이 아닌 자연어 질문이면, 곧바로 `graphify query`를 대신 실행하라"는 fast path가 있다. 즉 에이전트를 거치면 `query`라는 단어를 직접 치지 않아도 자연어 질문만으로 CLI가 내부에서 호출된다. CLI 단독 사용과 에이전트 경유 사용의 차이다.

# 개인 프로젝트 분석

대상은 개인 프로젝트 stock-msa다. Spring Boot 서비스 9개(인증, 게이트웨이, 시세, 재무, 전략, 트레이딩 등)와 공통 모듈 1개로 나뉜 MSA(마이크로서비스 아키텍처) 구조라, 서비스 하나하나는 작아도 전체로는 944개 파일·약 55만 단어 규모다. 이 코퍼스에 `/graphify .`를 돌린 최초(shallow) 빌드 결과는 다음과 같다.

| 항목 | 값 |
|------|-----|
| 노드 | 7,258개 |
| 엣지 | 28,466개 |
| 커뮤니티 | 291개(218개 표시, 73개 thin으로 생략) |
| 토큰 비용 | 이 실행 1회 기준 output 1,511,688 토큰(input 0) |

목적은 그래프에서 저사용·고립 노드를 찾아 리팩토링 후보를 추리는 것이었다. 실제로 이 목적을 기준으로 겪은 한계를 아래에 정리한다. `--mode deep` 재추출 후의 수치 변화와 이 한계들이 실제로 해소됐는지는 글 뒤쪽 "일반 모드 vs `--mode deep` 비교"에서 다룬다.

# 실제로 잘 맞았던 활용

한계로 넘어가기 전에, 그래프를 보고 실제로 조치까지 이어진 사례부터 짚는다.

**놓친 호출부 발견 — `TechnicalIndicatorService` 사례.** `TechnicalIndicatorService.calculateAndFillIndicators()`를 소스만 읽어서 조사했을 때는 호출부가 `StockPriceBatch` 두 곳뿐인 줄 알았다. `--mode deep` 재빌드 후 그래프에서 이 메서드로 들어오는 엣지를 다시 조회하니, INFERRED 엣지로 세 곳이 더 잡혔다 — `CalculateIndicatorProcessor.process()`, `EtfPriceService.recalculateProductIndicators()`, `EtfPriceService.ingestOne()`. grep으로 전수 확인한 결과 실제 호출부는 총 다섯 곳이었고, 그중 `EtfPriceService.recalculateProductIndicators()`가 그동안 놓치고 있던 "레코드마다 지표를 전체 재계산하는" 세 번째 사례였다. 이건 실제로 수정까지 이어졌다.

**예상 밖 호출 트리거 발견 — `ReconciliationService` 사례.** `ReconciliationService.reconcileAll()`은 스케줄러 하나가 하루 한 번 부르는 줄 알았는데, 그래프를 따라가 보니 `KisExecutionNotifier`가 KIS(한국투자증권) WebSocket이 재연결될 때마다 별도로 호출하는 경로가 있었다. 하루 한 번이 아니라 네트워크 상태에 따라 빈도가 달라진다는 뜻이라, 이미 알고 있던 "트랜잭션 범위가 넓다"는 문제의 심각도 판단 자체가 바뀌었다.

**복잡도 우선순위 정렬 — God Node.** 연결이 가장 많은 노드 상위 10개(`BacktestRequest` 136개 엣지, `BacktestService` 124개, `StockPriceDto` 123개 등)를 "이 코드베이스에서 조심할 곳"이 아니라 "복잡한 곳부터 순서대로 읽자"는 우선순위로 썼다. 실제로 이 목록 기준으로 `BacktestService`, `SimulationEngine`, `TechnicalIndicatorService`를 먼저 읽었고, 위 두 사례도 그 과정에서 나왔다.

**중복처럼 보였지만 확인해보니 의도된 설계였던 것들.** `GRAPH_REPORT.md`는 "Springdoc Prod-Disable Convention Repeated Across All Services"라는 하이퍼엣지로 7개 서비스의 `application.yml`에 같은 설정이 반복된다고 잡았고, `CLAUDE.md`↔`AGENTS.md`, `README.md`↔`INSTRUCTIONS.md`도 Surprising Connection으로 묶었다. 언뜻 원래 목적("중복 찾기")에 들어맞아 보이지만, 확인해보니 둘 다 의도된 구조였다 — Springdoc 쪽은 `docs/rules/SECURITY_INFRA_GUIDE.md`에 문서화된 공통 정책(`${SPRINGDOC_API_DOCS_ENABLED:false}`)을 각 서비스가 그대로 따른 것이었고, 문서 쪽은 `.claude/rules/`·`.codex/rules/`가 `docs/rules/`를 가리키는 심볼릭 링크로, AI 도구별 진입 문서만 분리해둔 설계였다. 그래서 이 두 건은 실제 조치로 이어지지 않았다 — 여기서도 그래프가 보여준 신호를 그대로 믿지 않고 확인하는 과정이 필요했다.

# 한계 1 — 커뮤니티 라벨 중복, 단 graphify 자체의 문제는 아니다

`GRAPH_REPORT.md`의 Community Hubs 목록에서 "Strategy Utility Methods"가 서로 다른 커뮤니티에 걸쳐 952개 노드에, "Price Utility Methods"가 795개 노드에 반복해서 붙어 있었다. 도메인(Strategy, Price, Trading, Auth …)마다 레이어(Utility, Controller, Test, Config)별로 쪼개진 커뮤니티가 따로따로 잡히면서, 라벨만 훑어서는 어떤 커뮤니티가 실제로 흥미로운지 구분이 안 됐다.

정확히 짚어야 할 게 있다 — **커뮤니티를 묶는 클러스터링 자체는 graphify의 기능이지만, 각 커뮤니티에 이름을 붙이는 라벨링은 별개다.** graphify 스킬의 기본 절차(Step 5)는 에이전트가 커뮤니티별 노드 라벨을 보고 직접 2-5단어 이름을 지어주는 방식이고, 커뮤니티가 200개가 넘어가면 이걸 사람이 일일이 손으로 붙이기 어렵다. 이번 stock-msa 작업에서는 세션이 다수결 기준의 후처리 휴리스틱 라벨러를 별도로 짜서 자동화했는데, 라벨 중복은 이 휴리스틱의 한계였지 graphify의 클러스터링 알고리즘이 잘못 묶은 게 아니었다. `--mode deep`으로 재추출해도 이 라벨링 스크립트를 다시 돌리지 않는 한 그대로다(실제로 재추출 후에도 동일하게 남아있었다).

라벨 자체를 믿기보다는 God Node와 Surprising Connection 섹션이 실질적인 탐색 시작점이었다.

# 한계 2 — 대형 코드베이스는 한 번 돌리는 데 토큰 비용이 크다

944개 파일 규모에서 graphify는 실행 시작부터 경고를 낸다.

```
Large corpus: 944 files · ~550,533 words. Semantic extraction will be expensive
(many Claude tokens). Consider running on a subfolder.
```

실제로 이번 실행 한 번에 output 토큰만 151만 개가 들었다(input 0, 캐시 히트 없는 첫 풀빌드 기준). 개인 프로젝트 규모에서는 무시할 수 없는 비용이라, 전체를 한 번에 돌리기보다 서비스 모듈 단위로 쪼개거나 `--update`로 변경분만 재추출하는 편이 낫다.

# 한계 3 — 중단된 세션은 임시 파일을 그대로 남긴다

`graphify-out/`을 확인하는 과정에서 `.graphify_chunk_01.json`, `.graphify_chunk_04.json`, `.graphify_chunk_05.json` 같은 중간 산출물이 `GRAPH_REPORT.md`보다 몇 시간 늦은 타임스탬프로 남아있는 것을 봤다. 정상적으로 끝난 실행이라면 Step 9에서 이런 임시 파일을 정리하는데, 정리가 되지 않은 채 디렉터리에 쌓여 있었다.

정확한 원인까지는 확인하지 못했다 — 세션이 중간에 끊겼는지, 업데이트가 아직 진행 중이었는지는 추정이다. 다만 관찰된 사실은, `--update`나 재실행 도중 세션이 끊기면 `graphify-out/`에 완료되지 않은 청크 파일이 그대로 남을 수 있다는 것이고, 이 상태에서 `GRAPH_REPORT.md`만 보면 실제 그래프 상태와 리포트가 어긋나 있을 수 있다는 점이다.

# 한계 4 — AST 정적 분석은 스프링이 런타임에 자동으로 이어주는 연결을 못 잡는다

가장 크게 부딪힌 한계다. 처음 목적이 "그래프에서 저사용 노드를 찾아 정리 후보로 삼는 것"이었는데, 실제로 걸러낸 후보 중 하나가 오탐이었다.

## 사례 — UserLoginLockRepositoryImpl

그래프에서 incoming edge가 0인 클래스 13개를 정리 후보로 뽑았다. 소스 전체를 grep으로 재검증한 결과 13개 모두 실제로 참조되고 있어 후보에서 전부 제외했는데, 그중 `UserLoginLockRepositoryImpl`만 유일하게 jacoco 커버리지 리포트 외에는 grep으로 어떤 소스 참조도 안 잡혔다. 그래프 신호를 곧바로 믿지 않고 grep으로 교차검증했기 때문에 걸러진 사례다.

`graph.json`을 직접 덤프해서 확인한 결과는 다음과 같았다.

- `UserLoginLockRepositoryImpl --implements--> UserLoginLockRepository` (EXTRACTED) — 정상 존재
- `UserRepository --inherits--> UserLoginLockRepository`(`UserRepository extends JpaRepository<User,Long>, UserLoginLockRepository` 선언에서 추출) — 정상 존재
- `AuthService.login()`에서 나가는 엣지 14개 중, 같은 줄 근처의 `userRepository.findByUsername(...)`은 `calls` 엣지로 잡혔지만 **`userRepository.recordFailedLogin(...)`은 잡히지 않았다.** 둘 다 같은 필드(`userRepository`) 뒤에 점을 찍어 메서드를 호출하는 형태(필드 체이닝 호출)인데, 하나는 잡고 하나는 놓친 일관성 없는 누락이다.

실제 코드 패턴은 Spring Data JPA의 커스텀 레포지토리 프래그먼트 컨벤션이다.

```java
// UserLoginLockRepository.java — 커스텀 프래그먼트 인터페이스
public interface UserLoginLockRepository {
    int recordFailedLogin(Long userId, ...);
}

// UserRepository.java — JpaRepository + 커스텀 프래그먼트 합성
public interface UserRepository extends JpaRepository<User, Long>, UserLoginLockRepository { ... }

// UserLoginLockRepositoryImpl.java — {프래그먼트 인터페이스명}+Impl, @Repository
@Repository
public class UserLoginLockRepositoryImpl implements UserLoginLockRepository { ... }
```

`AuthService`는 `userRepository.recordFailedLogin(...)`을 호출하고, `userRepository`는 `UserRepository` 타입이다. 실제 실행 시점에는 Spring이 기동할 때 classpath 스캔으로 `UserLoginLockRepositoryImpl`을 찾아 그 프래그먼트의 구현체로 연결한다(`repositoryImplementationPostfix` 기본값 `Impl`). 소스 어디에도 `Impl` 클래스명이 명시적으로 등장하지 않는다.

이 사례는 정확히 두 종류의 한계가 겹쳐서 헷갈리기 쉽다.

1. **인터페이스·상속·구현 관계(정적 Java 문법)는 전부 정확히 잡혔다.** 그래프 자체는 틀리지 않았다.
2. **그런데도 `recordFailedLogin` 호출 엣지 하나를 놓쳐서 Impl 노드가 고립되어 보였다.** 이건 필드 체이닝 호출 인식의 평범한 AST 한계다. 같은 코드베이스의 `SimulationEngine.calculateDailyReturn()` → `priceClient.getPriceByDate()` 호출 누락도 같은 유형이었다 — 다른 파일에서도 재현되는, 우연이 아닌 패턴이다.
3. **설령 그 호출 엣지가 잡혔더라도**, `Impl`이 어떤 메커니즘으로 실행에 연결되는지(스프링의 프래그먼트 자동탐지)는 AST가 원천적으로 알 수 없는 영역이다. tree-sitter는 스프링의 프레임워크 시맨틱을 모른다.

"스프링 어노테이션 기반 와이어링이라 그래프가 못 잡는다"로 뭉뚱그리면 부정확하다. 실제로 걸린 건 ②이고, ③은 별개로 항상 존재하는 구조적 한계다. `@Autowired`/`@Qualifier` 빈 주입, `@Scheduled`/`JobRegistry`가 이름 문자열로 잡을 배치 잡도 같은 이유(③)로 그래프에 나타나지 않는다.

## `--mode deep`으로 해결되지 않는다

`.java` 코드 파일은 Part A(AST, tree-sitter 결정적 파싱)로만 처리되고, `--mode deep`이 바꾸는 건 Part B(문서·논문·이미지의 LLM 시맨틱 추출 프롬프트)뿐이다. 코드 파일은 애초에 Part B를 타지 않으므로, 이 케이스는 `--mode deep`으로 재추출해도 그대로 남는다는 게 구조상의 예상이었다.

실제로 `--mode deep` 재추출을 끝낸 뒤 `graph.json`을 다시 덤프해서 확인했다. `AuthService.login()`의 엣지 14개 중 `recordFailedLogin` 관련 엣지는 재추출 후에도 0건이었다 — 예상대로 그대로였다. "아직 개선 중"이 아니라 "이 플래그로는 원천적으로 바뀌지 않는 종류의 문제"라고 쓰는 게 이론과 실측 모두에서 정확하다.

## 6,342개 노드급 코드베이스의 파싱 트레이드오프

대형 코드베이스를 5–10개 worker로 병렬 파싱하면서 필드 체이닝, 제네릭, 람다 내부 호출 같은 edge case가 위 사례처럼 산발적으로 누락되는 트레이드오프가 있다. 파일 전체가 안 잡히는 게 아니라, 같은 파일·같은 메서드 안에서도 호출 하나만 골라서 놓치는 식이라 예측하기 어렵다.

# 일반 모드 vs `--mode deep` 비교

위에서 나온 한계들이 `--mode deep`으로 재추출하면 나아지는지 실제로 돌려서 확인했다.

| 항목 | shallow(최초) | deep(재추출) |
|------|------|------|
| 노드 | 7,258 | 7,603 |
| 엣지 | 28,466 | 29,038 |
| 커뮤니티 | 291 | 313 |
| output 토큰 | 1,511,688 | 1,061,817 |
| EXTRACTED / INFERRED / AMBIGUOUS | 미측정 | 25,973 / 3,059 / 6 |
| INFERRED 비율(전체 엣지 중) | — | 10.53% |
| INFERRED 평균 confidence | — | 0.8074 |

숫자를 그대로 읽으면 안 되는 이유가 몇 가지 있다.

- **shallow 빌드 시점엔 EXTRACTED/INFERRED 분포를 따로 뽑아두지 않았다.** 그래프가 deep 결과로 덮어써진 뒤라 소급 계산이 불가능해서, "deep이 INFERRED 비율을 얼마나 늘렸는지"는 정량 비교를 할 수 없다.
- **노드·엣지가 늘어난 것(+345 / +572)을 온전히 deep 모드 효과로 보기 어렵다.** 재추출 사이에 문서 1개가 코퍼스에 추가됐고, 이 증가분과 deep 모드의 "더 적극적인 INFERRED 생성" 효과가 섞여 있어 분리가 안 된다.
- **토큰 비용이 줄어든 건(151만 → 106만) deep 모드가 더 저렴하다는 뜻이 아니다.** 이번엔 시맨틱 추출을 맡은 서브에이전트들이 우연히 더 간결하게 응답한 결과였다. "`--mode deep`이 비용을 줄인다"로 일반화할 근거는 없다.

앞서 짚은 두 한계는 이 재추출로도 그대로였다.

- `AuthService.login()` → `recordFailedLogin` 호출 엣지: 재추출 후에도 0건. 이론대로 Part A(코드 AST)는 `--mode deep`의 영향권 밖이었다.
- 커뮤니티 라벨 중복("Strategy Utility Methods" 952개 노드, "Price Utility Methods" 795개 노드): 그대로. 애초에 graphify의 클러스터링이 아니라 이 세션이 짠 후처리 라벨링 스크립트의 한계였으니, `--mode deep`과는 무관하다.

결국 `--mode deep`이 바꾼 건 문서·이미지 쪽 시맨틱 추출의 적극성(INFERRED 엣지 생성)이었고, 이 글에서 다룬 코드 파싱 한계·라벨링 한계는 애초에 이 플래그의 적용 범위 밖이었다.

# 그래프에서 나온 신호를 다루는 법

이번 조사에서 실제로 효과가 있었던 절차는 "그래프 신호를 최종 판단으로 쓰지 않고, 항상 grep으로 소스 텍스트를 교차검증한다"였다. incoming edge 0은 후보를 좁히는 필터로는 유용했지만, 13개 후보 중 12개가 오탐이었던 걸 감안하면 단독 근거로는 신뢰도가 낮다. 리팩토링·죽은 코드 판단처럼 실수 비용이 큰 작업에는 그래프를 "탐색 범위를 좁히는 1차 필터"로, grep이나 IDE의 Find Usages를 "최종 확인"으로 쓰는 2단계 절차가 맞다.

# graphify-out을 git에 올려도 되는가

graphify는 그래프를 버전관리에 포함시키는 걸 전제로 한 도구도 갖고 있다. `graphify merge-driver`라는 서브커맨드가 여러 브랜치에서 각자 갱신한 `graph.json`의 충돌을 union-merge로 처리하고, `graphify hook install`은 커밋 후 자동으로 그래프를 재빌드하는 post-commit 훅을 심어준다.

다만 이건 확인된 사실이 아니라 판단이다 — stock-msa 기준 `graphify-out/` 전체가 68MB, `graph.json` 하나가 18MB다. 이 정도 크기의 JSON은 커밋할 때마다 통째로 바뀌어 diff가 의미 없고 레포 용량만 불린다. 개인 프로젝트 규모라면 `graphify-out/`을 `.gitignore`에 넣어 로컬·CI 캐시로만 쓰고, 사람이 읽는 `GRAPH_REPORT.md`(수십 KB 수준)만 리뷰 기록용으로 커밋하는 절충이 낫다고 본다. 여러 사람이 동시에 그래프를 갱신하며 공유해야 하는 팀 레포라면 merge-driver 활용이 의미가 있을 것이다.

# 정리

graphify는 대형 코드베이스를 훑을 때 "어디서부터 봐야 할지"를 좁혀주는 지도로는 쓸모가 있었다. 다만 이번 목적이었던 리팩토링 판단에는 그래프 하나만으로 부족했다. AST가 정적 문법 관계는 정확히 잡아도, 스프링처럼 컨벤션(이름 규칙)이나 리플렉션(실행 중에 클래스를 뒤져 찾는 방식)으로 코드를 자동 연결하는 프레임워크의 런타임 연결은 원천적으로 못 보고, 같은 파일 안에서도 필드 체이닝 호출을 산발적으로 놓친다. 두 한계는 원인이 다르고 대응도 다르다 — 전자는 애초에 그래프가 알 수 없는 영역이라 사람이 보완해야 하고, 후자는 grep 같은 텍스트 검증으로 걸러낼 수 있다.

`--mode deep`으로 재추출해봐도 이 두 한계는 바뀌지 않았다. 이 플래그가 손대는 범위는 문서·이미지의 시맨틱 추출이지, 코드 AST 파싱이나 커뮤니티 라벨링이 아니기 때문이다. 코드 위주 프로젝트에서 그래프를 리팩토링 판단에 쓰려면 플래그를 바꾸는 것보다, 그래프가 낸 후보를 grep이나 IDE로 반드시 교차검증하는 절차를 먼저 두는 편이 실익이 컸다.
