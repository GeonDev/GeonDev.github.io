---
layout: post
title: 스프링 배치 이론 정리
date: 2024-06-05
Author: Geon Son
categories: Spring
tags: [Spring Batch, Job, Step, Chunk, ExecutionContext, Restart]
comments: true
toc: true
---

> Spring Boot 3.x와 Spring Batch 5.x 기준으로 작성했다.

앞선 hands-on 시리즈에서는 스프링 배치의 주요 구성 요소를 단계별로 구현했다.
각 문서에서 다룬 내용은 다음과 같다.

## Hands-on 목차

1. [스프링 배치 hands on 1](/Spring-batch-hand-on-1/)
   - Spring Batch 구조, Job·Step, 메타데이터 테이블, JobInstance·JobExecution, ExecutionContext
2. [스프링 배치 hands on 2](/Spring-batch-hand-on-2/)
   - Tasklet과 Chunk 비교, JobParameters, JobScope·StepScope
3. [스프링 배치 hands on 3](/Spring-batch-hand-on-3/)
   - CustomItemReader, FlatFileItemReader, JdbcCursorItemReader, JpaCursorItemReader
4. [스프링 배치 hands on 4](/Spring-batch-hand-on-4/)
   - FlatFileItemWriter, JdbcBatchItemWriter, JpaItemWriter
5. [스프링 배치 hands on 5](/Spring-batch-hand-on-5/)
   - ItemProcessor를 이용한 데이터 변환과 필터링

이 글에서는 예제에 등장한 개념을 실행 모델 중심으로 다시 살펴본다.

- 작업을 Job과 Step으로 나누어 실행한다.
- 실행 이력과 상태를 메타데이터로 저장한다.
- 실패한 작업을 재시작하고, 처리 위치를 복원할 수 있게 한다.

# 1. 배치 처리의 기본 개념

배치 처리는 사용자의 요청에 즉시 응답하는 일반적인 웹 요청과 다르다.
정해진 시간에 대량의 데이터를 읽고, 변환하고, 저장하거나 외부 시스템으로 전달한다.

예를 들면 다음과 같다.

- 매일 전날 주문을 집계한다.
- 회원 전체에게 만료 예정 알림을 보낸다.
- 로그 파일을 읽어 통계 테이블을 만든다.
- 실패한 결제 건을 다시 처리한다.

배치 작업은 실행 시간이 길고 중간에 실패할 수 있다. 다음 네 가지를 먼저 정해야 한다.

1. 어떤 작업이 실행되었는가?
2. 어디까지 성공했는가?
3. 실패한 작업을 처음부터 다시 해야 하는가?
4. 같은 작업을 두 번 실행해도 데이터가 안전한가?


# 2. Job과 Step

## 2.1 Job

`Job`은 하나의 배치 작업 전체를 의미한다.
예를 들어 `dailySettlementJob`은 하루치 정산이라는 업무 전체를 나타낸다.

Job은 직접 비즈니스 로직을 수행하기보다 여러 Step의 순서와 흐름을 정의한다.

```text
Job
 ├─ Step 1: 주문 조회
 ├─ Step 2: 금액 집계
 └─ Step 3: 결과 저장
```

Job은 순차 실행뿐 아니라 조건에 따른 분기와 Flow도 구성할 수 있다.
다만 Step을 잘게 나누는 것이 항상 좋은 것은 아니다. 재시작 단위와 트랜잭션 경계를 기준으로 나누는 편이 실용적이다.

## 2.2 Step

`Step`은 Job을 구성하는 독립적인 실행 단위다.
Step은 자신이 처리한 건수, 상태, 시작·종료 시간 등을 별도로 기록한다.

스프링 배치의 Step은 크게 두 가지 방식으로 구현한다.

| 방식 | 적합한 작업 |
| --- | --- |
| Tasklet | 파일 삭제, 임시 테이블 생성, 단순 API 호출, 한 번의 업무 처리 |
| Chunk | 많은 데이터를 일정한 단위로 읽고 변환하고 저장하는 작업 |

Tasklet과 Chunk는 우열 관계가 아니다.
반복 데이터 처리를 Tasklet 안에서 직접 구현할 수도 있지만, 읽기·처리·쓰기·재시작을 직접 관리해야 하므로 Chunk가 제공하는 기능을 활용하는 편이 낫다.

## 2.3 JobLauncher와 JobRepository

`JobLauncher`는 Job을 실행하는 진입점이다.
Spring Boot에서는 `Job` Bean과 설정을 바탕으로 애플리케이션 시작 시 Job을 실행할 수 있고, 애플리케이션 코드에서 `JobLauncher`를 직접 호출할 수도 있다.

`JobRepository`는 실행 메타데이터를 저장하고 조회한다.
Spring Batch 5에서는 과거의 Map 기반 repository가 제거되었으므로 일반적으로 JDBC 기반 repository와 DataSource를 사용한다.

실행 흐름은 다음과 같다.

```text
JobLauncher
    │
    ▼
JobRepository ── 실행 이력·상태 저장
    │
    ▼
Job ── Step 1 ── Step 2 ── Step 3
```

## 2.4 Flow

`Flow`는 Job 안에서 Step을 어떤 순서와 조건으로 실행할지 정의하는 실행 흐름이다.
모든 Step을 순서대로 실행하는 단순한 Job은 `next()`로 구성한다.

```text
Step A → Step B → Step C
```

```java
@Bean
public Job sequentialJob(JobRepository jobRepository,
                          Step stepA,
                          Step stepB,
                          Step stepC) {
    return new JobBuilder("sequentialJob", jobRepository)
            .start(stepA)
            .next(stepB)
            .next(stepC)
            .build();
}
```

검증 결과에 따라 정상 처리와 오류 처리를 나누는 경우도 있다.

```text
검증 Step
 ├─ COMPLETED → 정상 처리 Step
 └─ FAILED    → 오류 처리 Step
```

Step의 종료 결과인 `ExitStatus`를 기준으로 분기할 때는 `on().to()`와 `from()`을 사용한다.

```java
@Bean
public Job validationJob(JobRepository jobRepository,
                         Step validationStep,
                         Step normalStep,
                         Step errorStep) {
    return new JobBuilder("validationJob", jobRepository)
            .start(validationStep)
                .on("COMPLETED").to(normalStep)
            .from(validationStep)
                .on("FAILED").to(errorStep)
            .end()
            .build();
}
```

`validationStep`이 실패한 뒤 `errorStep`으로 이동하는 경우, 오류 처리를 완료했다는 이유로 Job을 성공 처리할지 결정해야 한다.
오류를 기록한 뒤 정상 종료할 수도 있고, 오류 처리를 수행했더라도 Job을 최종 실패로 남길 수도 있다.
즉, 분기 대상 Step의 결과와 최종 Job 상태는 별도로 설계해야 한다.

```text
검증 실패
 ├─ 오류 기록 후 정상 종료 → Job COMPLETED
 └─ 오류 기록 후 실패 반환 → Job FAILED
```

`BatchStatus`와 `ExitStatus`는 비슷해 보이지만 역할이 다르다.

- `BatchStatus`: Job 또는 Step의 전체 실행 상태(`COMPLETED`, `FAILED`, `STOPPED` 등)
- `ExitStatus`: Flow에서 다음 경로를 선택하기 위한 종료 코드

분기 조건은 업무 결과를 표현할 수 있도록 명확한 이름을 사용하고, 예상하지 못한 상태가 나왔을 때의 기본 경로도 함께 고려해야 한다.

## 2.5 JobExecutionDecider

Step의 성공·실패만으로는 다음 작업을 결정하기 어려울 때 `JobExecutionDecider`를 사용한다.
Decider는 현재 `JobExecution`과 마지막 `StepExecution`을 받아 `FlowExecutionStatus`를 반환한다.

예를 들어 다음과 같은 조건은 Decider에 적합하다.

- DB에 저장된 검증 결과가 수동 확인 대상인지 판단
- 처리 대상 건수가 0건인지 판단
- JobParameter의 실행 모드에 따라 다른 Step 선택
- 앞선 Step이 저장한 업무 상태에 따라 후속 처리 선택

```java
@Bean
public JobExecutionDecider validationDecider() {
    return (jobExecution, stepExecution) -> {
        boolean needsManualCheck = true;

        return new FlowExecutionStatus(
                needsManualCheck ? "MANUAL" : "NORMAL"
        );
    };
}
```

Decider는 Job의 Flow에 연결한다.

```java
@Bean
public Job decidedJob(JobRepository jobRepository,
                      Step prepareStep,
                      Step manualStep,
                      Step normalStep,
                      JobExecutionDecider validationDecider) {
    return new JobBuilder("decidedJob", jobRepository)
            .start(prepareStep)
            .next(validationDecider)
                .on("MANUAL").to(manualStep)
            .from(validationDecider)
                .on("NORMAL").to(normalStep)
            .end()
            .build();
}
```

판단 기준은 다음처럼 나눌 수 있다.

| 판단 기준 | 적합한 방식 |
| --- | --- |
| 앞 Step의 성공·실패 | `ExitStatus` 기반 Flow |
| DB 값, 처리 건수, JobParameter, 업무 조건 | `JobExecutionDecider` |

Flow는 독립적인 Flow를 `split()`으로 병렬 실행하는 것도 지원한다.
다만 병렬 Flow는 서로 다른 데이터 범위를 처리하는지, Writer가 동시 실행을 지원하는지, 트랜잭션과 외부 API 호출이 충돌하지 않는지 확인한 뒤 사용해야 한다.

# 3. JobInstance와 JobExecution

스프링 배치는 논리적인 실행과 실제 실행 시도를 별도로 기록한다.

## 3.1 JobInstance

`JobInstance`는 **Job 이름과 식별용 JobParameters의 조합**으로 결정되는 논리적 실행 단위다.

예를 들어 다음과 같이 실행한다고 하자.

```text
job: settlementJob, date: 2026-08-01 → JobInstance 1
job: settlementJob, date: 2026-08-02 → JobInstance 2
job: settlementJob, date: 2026-08-02 → JobInstance 2
```

같은 Job 이름과 같은 식별 파라미터를 사용하면 새로운 JobInstance가 생기지 않는다.

## 3.2 JobExecution

`JobExecution`은 JobInstance를 실제로 실행한 한 번의 시도다.

```text
JobInstance: settlementJob + 2026-08-01
 ├─ JobExecution 1: FAILED
 └─ JobExecution 2: COMPLETED
```

처음 실행이 실패하면 같은 JobInstance에 대해 새로운 JobExecution을 만들어 재시작할 수 있다.
반대로 이미 성공한 JobInstance를 같은 파라미터로 다시 실행하면 보통 `JobInstanceAlreadyCompleteException`이 발생한다.

재시작과 새로운 실행은 다르다.

- **재시작**: 같은 JobInstance의 실패·중단된 실행을 이어서 처리
- **새로운 실행**: 식별 파라미터를 변경해 새로운 JobInstance 생성
- **강제 신규 실행**: `RunIdIncrementer`처럼 파라미터를 추가해 매번 다른 JobInstance 생성

`RunIdIncrementer`는 재시작을 대신하는 기능이 아니다.
기존 실행을 이어가는 것이 아니라 새로운 `run.id` 파라미터를 추가해 새로운 JobInstance를 만든다.

## 3.3 JobParameters

`JobParameters`는 실행 시 외부에서 전달하는 값이다.
날짜, 입력 파일 경로, 대상 테넌트처럼 실행마다 달라지는 값을 코드 밖에서 주입할 때 사용한다.

JobParameters를 설계할 때는 이 값이 JobInstance 식별에 포함되는지 판단해야 한다.

```text
정산일자 = 식별 파라미터
로그 레벨 = 식별하지 않는 파라미터
```

정산일자가 달라지면 다른 JobInstance여야 하지만, 로그 레벨만 달라졌다고 같은 정산 작업을 새로운 작업으로 취급할 필요는 없기 때문이다.

실무에서는 날짜나 파일 경로를 식별 파라미터로 사용하고, 실행 시각을 무조건 식별 파라미터로 넣지 않도록 주의한다.
실행 시각을 매번 넣으면 실패한 작업을 같은 JobInstance로 재시작할 수 없게 된다.

# 4. 배치 메타데이터 테이블

JDBC 기반 JobRepository는 실행 상태를 다음 메타데이터 테이블에 저장한다.

| 테이블 | 역할 |
| --- | --- |
| `BATCH_JOB_INSTANCE` | Job 이름과 식별 파라미터로 결정되는 논리적 실행 |
| `BATCH_JOB_EXECUTION` | 실제 실행 시도와 상태·시작·종료 시간 |
| `BATCH_JOB_EXECUTION_PARAMS` | Job 실행 파라미터 |
| `BATCH_JOB_EXECUTION_CONTEXT` | Job 수준의 재시작 상태 |
| `BATCH_STEP_EXECUTION` | Step 실행 결과와 처리 건수 |
| `BATCH_STEP_EXECUTION_CONTEXT` | Step 수준의 재시작 상태 |

상태는 단순히 성공과 실패만 의미하지 않는다.
대표적인 `BatchStatus`는 다음과 같다.

```text
STARTING → STARTED → COMPLETED
                    ├→ FAILED
                    ├→ STOPPING → STOPPED
                    └→ UNKNOWN
```

재시작 가능 여부는 Job 설정, 마지막 상태, Step 완료 여부에 따라 달라진다.
메타데이터 테이블을 삭제하면 실행 이력뿐 아니라 재시작에 필요한 정보도 함께 사라지므로 운영 DB에서 임의로 삭제하면 안 된다.

# 5. ExecutionContext

`ExecutionContext`는 실행 중인 Job 또는 Step이 재시작에 필요한 상태를 저장하는 key-value 저장소다.
예를 들어 파일의 현재 줄 번호, 마지막으로 처리한 ID, 임시 파일 경로를 저장할 수 있다.

## 5.1 JobExecutionContext

JobExecution에 귀속된다.
같은 JobExecution 안의 여러 Step이 공유해야 하는 값을 저장한다.

```text
JobExecutionContext
 ├─ inputFile = /data/input.csv
 └─ settlementDate = 2026-08-01
```

## 5.2 StepExecutionContext

특정 StepExecution에 귀속된다.
다른 Step이나 같은 Step의 다음 실행과 자동으로 공유되지 않는다.

```text
StepExecutionContext
 └─ currentLine = 1200
```

저장 위치는 다음 기준으로 나눈다.

| 저장 위치 | 사용 목적 |
| --- | --- |
| JobExecutionContext | 여러 Step이 함께 사용할 값 |
| StepExecutionContext | 특정 Step의 재시작 위치·처리 상태 |

ExecutionContext에 저장하는 값은 작고 직렬화 가능한 값이어야 한다.
대량의 데이터나 Entity 전체를 넣는 저장소로 사용하면 안 된다.

## 5.3 저장 시점과 재시작

Chunk 기반 Step에서는 보통 Chunk 커밋 단위에 맞춰 처리 상태가 저장된다.
따라서 마지막으로 성공적으로 커밋된 지점부터 재시작할 수 있다.

예를 들어 100개 단위로 커밋하고 350번째 데이터에서 실패했다면, 일반적으로 301번째 근처의 마지막 커밋 지점부터 다시 처리될 수 있다.
정확한 재시작 위치는 Reader와 ExecutionContext 업데이트 방식에 따라 달라진다.

읽은 위치를 저장하는 것과 업무 결과의 중복을 막는 것은 별개의 문제다.
재시작 시 일부 데이터가 다시 Reader로 들어올 수 있으므로 Writer는 중복 실행에도 안전해야 한다.

# 6. Chunk 지향 처리

Chunk 방식은 데이터를 한 건씩 읽되, 일정 개수를 하나의 묶음으로 처리한다.

```text
ItemReader.read()      → item 1개
ItemProcessor.process() → item 1개
ItemWriter.write()     → Chunk 묶음
                         ↓
                       commit
```

```java
new StepBuilder("step", jobRepository)
        .<Input, Output>chunk(100, transactionManager)
        .reader(reader())
        .processor(processor())
        .writer(writer())
        .build();
```

`chunk(100)`의 100은 단순한 메모리 분할 크기가 아니라 기본적인 커밋 간격이다.
일반적으로 100개를 읽고 처리한 뒤 Writer를 호출하고 트랜잭션을 커밋한다.
마지막 묶음은 100개보다 작을 수 있다.

## 6.1 ItemReader

`ItemReader`는 한 번에 하나의 item을 반환한다.
더 이상 읽을 데이터가 없으면 `null`을 반환한다.

대표적인 Reader는 다음과 같다.

- `FlatFileItemReader`: CSV·고정 길이 파일
- `JdbcCursorItemReader`: 하나의 DB Cursor를 유지하며 순차 조회
- `JdbcPagingItemReader`: 페이지 단위로 조회
- `JpaCursorItemReader`: JPA Cursor 기반 조회
- `RepositoryItemReader`: Spring Data Repository 기반 조회

Reader는 단순히 데이터를 읽는 객체가 아니라, 재시작 시 현재 위치를 복원할 수 있는 `ItemStream` 구현체인 경우가 많다.
따라서 Reader 이름을 고유하게 지정하고, 상태 저장이 필요한 Reader를 임의로 singleton 상태 객체처럼 공유하지 않아야 한다.

## 6.2 ItemProcessor

`ItemProcessor<I, O>`는 입력을 변환하거나 검증한다.

- `I`와 `O`가 같은 타입이면 값 수정·검증
- `I`와 `O`가 다르면 DTO 변환·Entity 변환
- `null`을 반환하면 해당 item은 Writer에 전달되지 않음

`null` 반환은 예외가 아니라 필터링이다.
필터링 건수는 읽은 건수에는 포함될 수 있지만, 쓰기 건수에는 포함되지 않는다.

## 6.3 ItemWriter

Spring Batch 5의 `ItemWriter`는 `Chunk<? extends T>`를 받는다.
Writer는 보통 DB 저장, 파일 기록, 메시지 발행을 담당한다.

Writer가 외부 시스템에 데이터를 전송한다면 재시작과 재시도에 따른 중복을 고려해야 한다.
예를 들어 동일한 주문 ID로 두 번 호출되어도 최종 결과가 한 번 처리한 것과 같도록 upsert, 고유 키, 멱등성 키 등을 사용할 수 있다.

## 6.4 Chunk 트랜잭션

일반적인 Chunk 처리 흐름은 다음과 같다.

1. 트랜잭션 시작
2. Reader에서 item을 읽음
3. Processor로 변환·필터링
4. 설정된 개수만큼 모이면 Writer 호출
5. 성공하면 커밋
6. 예외가 발생하면 롤백·재시도·스킵 정책 적용

Chunk 크기를 크게 하면 DB 왕복과 커밋 횟수는 줄지만, 한 번에 사용하는 메모리와 롤백 범위가 커진다.
작게 하면 메모리와 재처리 범위는 줄지만 트랜잭션·DB 호출 비용이 증가한다.

# 7. Cursor와 Paging 선택

## 7.1 Cursor

Cursor Reader는 하나의 ResultSet을 열고 커서를 이동하면서 데이터를 읽는다.
전체 결과를 메모리에 올리지 않는 장점이 있지만, 처리하는 동안 DB Connection과 Cursor를 오래 유지한다.

다음 상황에서 고려할 수 있다.

- 단일 스레드로 순차 처리한다.
- 읽는 동안 Connection을 오래 유지해도 괜찮다.
- 조회 결과의 순서와 일관성이 중요하다.

## 7.2 Paging

Paging Reader는 `LIMIT/OFFSET` 또는 DB 방언에 맞는 페이징 쿼리를 사용해 페이지 단위로 조회한다.
Connection을 짧게 사용할 수 있지만, 정렬 기준이 안정적이어야 하고 페이지 사이에 데이터가 변경될 때 누락·중복 가능성을 검토해야 한다.

대량 처리에서는 `OFFSET` 기반 페이징보다 변하지 않는 단조 증가 키를 기준으로 다음 페이지를 조회하는 **Keyset Pagination(Seek Pagination)** 방식이 안정적일 수 있다.
다만 다음 SQL은 `JdbcPagingItemReader`의 설정 예제가 아니라 Keyset Pagination의 개념 예제다.

```sql
SELECT id, name
  FROM person
 WHERE id > :lastId
 ORDER BY id
 LIMIT :pageSize;
```

Cursor와 Paging 중 어느 쪽이 항상 빠르다고 말할 수는 없다.
DB 종류, 인덱스, 네트워크, 트랜잭션 시간, 페이지 크기와 데이터 변경 여부를 함께 측정해야 한다.

# 8. JobScope와 StepScope

배치 Bean은 애플리케이션 시작 시점에 만들어지는 singleton만으로는 부족할 때가 있다.
Job parameter나 ExecutionContext는 실제 Job·Step 실행 시점에야 존재하기 때문이다.

## 8.1 JobScope

`@JobScope`는 실행 중인 Job마다 하나의 Bean 인스턴스를 만든다.
JobParameters나 JobExecutionContext를 Job 단위로 주입할 때 사용할 수 있다.

## 8.2 StepScope

`@StepScope`는 StepExecution마다 Bean 인스턴스를 만든다.
파일 경로, partition 값, step parameter처럼 Step 실행 시점에 결정되는 값을 주입할 때 주로 사용한다.

```java
@Bean
@StepScope
public FlatFileItemReader<Person> reader(
        @Value("#{jobParameters['input.file']}") String file) {
    return new FlatFileItemReaderBuilder<Person>()
            .name("personReader")
            .resource(new FileSystemResource(file))
            .build();
}
```

late binding이 필요한 구성 요소에 scope를 지정한다.
Step 자체를 무조건 `@StepScope`나 `@JobScope`로 만들 필요는 없다.

Scope는 실행별 인스턴스를 제공할 뿐, 해당 객체가 자동으로 Thread-safe해진다는 뜻은 아니다.
멀티스레드 Step이나 Partition에서는 Reader·Writer의 동시성 지원 여부를 별도로 확인해야 한다.

# 9. 실패 처리와 재시작

## 9.1 재시작

재시작은 실패한 JobInstance를 같은 파라미터로 다시 실행하는 기능이다.
Reader가 ExecutionContext에 위치를 저장하고, Writer가 이미 처리된 데이터를 안전하게 다룰 수 있어야 재시작이 실용적이다.

재시작 전에 다음 항목을 확인한다.

- 입력 데이터가 재시작 시에도 같은 순서로 제공되는가?
- Reader 위치가 ExecutionContext에 저장되는가?
- Writer가 이미 처리된 데이터를 다시 처리해도 안전한가?
- 외부 API 호출이 중복되어도 안전한가?
- 실패한 Step만 재실행해도 앞선 Step 결과와 일관적인가?

## 9.2 Retry와 Skip

Retry는 일시적인 오류를 같은 item에 다시 적용하는 정책이다.
네트워크 일시 장애나 잠금 충돌처럼 잠시 후 성공할 가능성이 있는 오류에 적합하다.

Skip은 특정 오류 item을 실패 목록으로 남기고 다음 item으로 진행하는 정책이다.
데이터 형식 오류처럼 재시도해도 성공하지 않는 오류에 사용할 수 있다.

둘을 무조건 많이 설정하면 안 된다.
재시도 가능한 예외와 건너뛰어도 되는 예외를 구분하고, skip된 데이터는 별도 저장·알림·재처리 경로를 마련해야 한다.

## 9.3 Tasklet의 재시작

Tasklet은 내부 상태를 자동으로 모두 저장해 주지 않는다.
반복 처리 위치를 직접 관리하는 Tasklet이라면 `ExecutionContext`에 진행 위치를 저장해야 한다.
단순히 `StepExecution`의 통계 필드를 임의의 커서처럼 사용하는 방식은 재시작 계약을 명확하게 표현하지 못한다.

# 10. 멱등성과 중복 처리

배치에서 가장 자주 놓치는 부분은 “한 번만 실행될 것”이라는 가정이다.
프로세스 장애, 네트워크 타임아웃, Chunk 롤백, Job 재시작 때문에 같은 입력이 다시 처리될 수 있다.

멱등성은 같은 작업을 여러 번 수행해도 최종 결과가 한 번 수행한 것과 같은 성질이다.

대표적인 방법은 다음과 같다.

- 업무 키에 Unique 제약 조건을 둔다.
- Insert 대신 조건부 Update 또는 Upsert를 사용한다.
- 처리 이력 테이블에 업무 키를 저장한다.
- 외부 메시지에 idempotency key를 포함한다.
- 전송과 처리 이력을 같은 트랜잭션 경계에서 설계한다.

예를 들어 `orderId=100`의 정산 결과를 저장한다면, `order_id`를 Unique로 만들고 이미 존재하는 경우 Update하거나 정상적으로 무시하도록 설계할 수 있다.

Job 실행 자체의 중복과 데이터 처리의 중복은 다른 문제다.
JobRepository는 Job 실행 상태를 관리하지만, 외부 API 호출이나 업무 테이블의 중복까지 자동으로 막아 주지는 않는다.

# 11. 스케줄러와 배치 실행은 별개의 문제

`@Scheduled`는 각 애플리케이션 인스턴스의 로컬 스케줄러다.
서버가 두 대면 같은 시각에 두 인스턴스가 모두 Job 실행을 시도할 수 있다.

문제를 다음처럼 나눠서 본다.

| 문제 | 해결 대상 |
| --- | --- |
| 같은 Job을 두 번 실행 | 분산 실행 제어, ShedLock, leader election 등 |
| 실패한 Job 재시작 | JobRepository, ExecutionContext |
| 같은 데이터를 두 번 반영 | 멱등성 키, Unique 제약, 처리 이력 |
| 동시 데이터 갱신 | DB 락, 낙관적 락, 비관적 락 |

JobRepository는 같은 Job 이름과 같은 식별 파라미터를 가진 JobInstance의 실행 상태를 관리하고, 이미 실행 중인 동일 JobInstance의 중복 실행을 막을 수 있다.
하지만 여러 서버의 `@Scheduled` 호출 자체를 하나로 조정하는 분산 스케줄러는 아니며, 서로 다른 파라미터로 실행되는 중복 작업까지 자동으로 막아주지는 않는다.
따라서 스케줄러의 중복 실행 제어와 Job의 재시작·멱등성 설계를 각각 마련해야 한다.

# 12. 운영 전 체크리스트

운영 배포 전 확인할 항목이다.

- Job 이름과 식별 JobParameters가 명확한가?
- 같은 파라미터로 재실행했을 때 기대한 재시작 동작을 하는가?
- JobRepository 메타데이터 DB를 별도로 안정적으로 운영하는가?
- Chunk 크기와 트랜잭션 시간을 측정했는가?
- Reader의 정렬 기준과 재시작 위치가 안정적인가?
- Writer가 중복 호출에 안전한가?
- Retry와 Skip 대상 예외가 구분되어 있는가?
- 실패·스킵 데이터의 알림과 재처리 방법이 있는가?
- 멀티 인스턴스 환경에서 Job 중복 실행을 막았는가?
- Job·Step·Reader·Writer의 처리 건수와 실패 원인을 관측할 수 있는가?

# 마무리

스프링 배치의 핵심은 `Reader → Processor → Writer`라는 코드 구조보다 **실행을 기록하고 실패를 복구하는 모델**에 있다.

핵심 개념의 관계는 다음과 같다.

```text
Job / Step
   ↓
JobInstance / JobExecution
   ↓
ExecutionContext와 재시작
   ↓
Chunk 트랜잭션
   ↓
멱등성·중복 처리·운영 제어
```

Reader와 Writer를 선택하기 전에 먼저 “실패하면 어디서부터 다시 실행할 것인가”와 “같은 데이터가 다시 들어오면 안전한가”를 결정해야 한다.
