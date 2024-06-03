---
layout: post
title: 스프링 배치 hands on 1
date: 2024-03-31
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

# 1. 스프링 배치란
스프링 프레임 워크 기반 배치 처리 시스템  
작은 단위의 데이터 처리를 위한 tasklet, 큰 단위 처리를 위한 chunk  
작업의 단위는 step / job으로 분류됨

## 1.1 스프링 배치 세팅

~~~
@EnableBatchProcessing
@SpringBootApplication
public class BatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(BatchApplication.class, args);
    }

}
~~~

스프링 배치를 시작하기 위해서는 @EnableBatchProcessing를 추가하여 해당 어플리케이션이 스프링 배치로 실행된다는 것을 명시

    
~~~
@Configuration
@Slf4j
@RequiredArgsConstructor
@AllArgsConstructor
public class HellowConfigration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    @Bean
    public Job helloJob(){
        return jobBuilderFactory.get("helloJob")
                .incrementer(new RunIdIncrementer())
                .start(this.helloStep())
                .build();
    }

    @Bean
    public Step helloStep(){
        return stepBuilderFactory.get("helloStep")
                .tasklet((contribution, chunkContext) -> {
                    log.info("call");
                    return RepeatStatus.FINISHED;
                } ).build();
    }
}
~~~ 

Job 클래스는 스프링 배치에서 연산을 실행하는 단위, 생성된 Jobd을 실행 시킴으로서 스프링 배치의 역할을 수행  
하나의 Job은 최소 1개의 Step을 갖을 수 있다.   
JobBuilderFactory를 통하여 JOB을 생성하고 nameSpace를 부여 한다 

Step은 스프링 배치에서 수행하는 연산의 최소 단위로 Job에 소속되어 있다.  
StepBuilderFactory를 통하여 Step 을 생성하고 이름(nameSpace)을 지정하여야 한다. 

## 1.2 스프링 배치 실행 
스프링 배치를 실행 할때 name을 설정하지 않으면 어플리케이션을 실행할때 프로젝트의 모든 Job을 실핸한다.  
상황에 따라 원하는 Job만 실행 되어야 하고 실수로 name을 지정하지 않고 실행하였을때 모든 Job 실행을 막기 위하여  
application.yml 설정이 필요하다.

~~~
spring:
  batch:
    job:
      names: ${job.name:NONE}
    # 스프링 배치가 데이터 테이블을 언제 생성할지 결정
    initialize-schema: NEVER

~~~

job.name 이라는 argment가 전달되었을때만 지정된 스프링 배치 잡이 실행되도록 설정하였다.  
inteilJ에서는 실행시 다음과 같이 argment를 전달할 수 있다.

![](/images/spring/gsljlerhyweilhf.png){: .align-center}


## 1.3 스프링 배치의 구조 

![](/images/spring/asdf4fqf-4fawfh.png){: .align-center}

Spring Batch는 Job 클래스의 Bean이 생성되면 JobLauncher 객체에 의해서 Job을 수행한다.   
JobRepository는 DB 또는 memory에 Spring Batch가 실행될 수 있도록 배치의 매타데이터를 관리하는 클래스이다

### 1.3.1 Job
job은 JobLauncher에 의해 실행되는 스프링 배치의 실행 단위  
Job은 N개의 Step을 실행할 수 있으며,흐름(Flow) 을 관리할 수 있다.

### 1.3.2 Step

Job의 세부 실행 단위이며, Job은 최소 1개 이상의 Step으로 구성
Step은 Tesk 기반, Chunk 기반으로 분류된다.

Task 기반: 하나의 작업 기반으로 실행  
Chunk 기반: 하나의 큰 덩어리를 n개씩 나눠서 실행 

Chunk 기반 Step은 ItemReader, ItemProcessor, ItemWriter로 나뉘어 있다.   
(Task 기반에 비하여 책임이 확실하게 나누어져 있어 복잡한 배치 실행시 디버그에 유리하다.)


#### 1.3.1.1 ItemReader
ItemReader는 배치 처리 대상 객체를 읽어서 ItemProcessor 또는 ItemWriter에 전달 하는 역할을 수행한다.  
(파일 또는 DB의 데이터를 읽는다.)  

#### 1.3.1.2 ItemProcessor
input 객체를 output 객체로 filtering 또는 processing 하여 ItemWriter 로 전달한다.   
(ItemReader에서 읽은 데이터를 수정 또는 ItemWriter 대상인지 filtering 한다.)  
ItemProcessor는 optional 하다 (반드시 있는 것은 아니다.)  
ItemProcessor가 하는 일은 ItemReader 또는 ItemWriter가 대신할 수 있다.  
(다만 좀더 명확한 책임을 나누기 위하여 사용한다.)

#### 1.3.1.3 ItemWriter
배치 처리 데이터를 최종적으로 처리한다.   
(DB updete를 하거나, 대상 사용자에게 알람을 보낸다.)


## 1.4 스프링 배치의 테이블 구조

![](/images/spring/fkjo-4485hkj-47q14ge.png){: .align-center}

BATCH_JOB을 시작하는 것들은 job관련 / BATCH_STEP으로 시작하는 것은 step관련 메타 테이블  
메타 테이블이란 스프링 배치의 실행 결과를 저장하기 위한 테이블

### 1.4.1 BATCH_JOB_INSTANCE
Job이 실행되며 생성되는 최상위 계층의 테이블  
job_instance_id는 job_name과 job_key를 기준으로 하나의 row가 생성되며, 같은 job_name과 job_key가 저장될 수 없다.  
job_key는 BATCH_JOB_EXECUTION_PARAMS에 저장되는 Parameter를 나열해 암호화해 저장

### 1.4.2 BATCH_JOB_EXECUTION
Job이 실행되는 동안 시작/종료 시간, Job 상태 등을 관리  
1개의 BATCH_JOB_INSTANCE는 n개의 BATCH_JOB_EXECUTION을 갖는다. 

### 1.4.3 BATCH_JOB_EXECUTION_PARAMS
Job을 실행하기 위해 주입된 parameter 정보 저장

### 1.4.4 BATCH_JOB_EXECUTION_CONTEXT
Job이 실행되며 공유해야할 데이터를 직렬화해 저장

### 1.4.5 BATCH_STEP_EXECUTION
Batch Step이 실행되는 동안 필요한 데이터 또는 실행된 결과 저장

### 1.4.6 BATCH_STEP_EXECUTION_CONTEXT
Step이 실행되며 공유해야할 데이터를 직렬화해 저장  
하나의 Step이 실행되는 동안 데이터를 공유하지만, 서로 다른 Step의 데이터를 공유하지는 않는다.  
서로 다른 Step의 데이터를 공유하기 위해서는 상위 단계인 BATCH_JOB_EXECUTION_CONTEXT에 저장해야 한다.


## 1.5 스프링 배치의 테이블과 매핑 관계

![](/images/spring/askjl-4324io-4wfwpgqhd.png){: .align-center}


### 1.5.1 JobInstance/ JobExecution 생성 기준
JobInstance: BATCH_JOB_INSTANCE 테이블과 매핑  
JobExecution: BATCH_JOB_EXECUTION 테이블과 매핑  
JobParameters: BATCH_JOB_EXECUTION_PARAMS 테이블과 매핑  
ExecutionContext: BATCH_JOB_EXECUTION_CONTEXT 테이블과 매핑

JobInstance의 생성 기준은 JobParameters 중복 여부에 따라 생성된다.  
다른 parameter로 Job이 실행되면 JobInstance가 생성된다.  
같은 parameter로 Job이 실행되면, 이미 생성된 JobInstance가 실행된다.

처음 Job 실행 시, data parameter가 **01월01일**로 실행 됐다면, 1번 JobInstance가 생성  
다음 Job 실행 시, data parameter가 **01월02일**로 실행 됐다면, 2번 JobInstance가 생성  
다음 Job 실행 시, data parameter가 **01월02일**로 실행 됐다면, 2번 JobInstance가 재 실행  
**이때 Job이 재실행 대상이 아닌 경우 에러가 발생**

JobExecution은 (재실행 여부와 상관없이) 항상 새롭게 생성된다.  
예제에서 처음 만들었던 Job은 파라메터가 없어 재실행되어야 하지만 RunIdIncrementer()를 사용하였기 때문에 항상 새롭게 시작한다.  
(RunIdIncrementer 는 내부에서 시퀀셜한 run.id 라는 parameter를 자동으로 생성한다.)


### 1.5.2 StepExecution/ ExecutionContext 생성 기준
StepExecution: BATCH_STEP_EXECUTION 테이블과 매핑  
ExecutionContext: BATCH_STEP_EXECUTION_CONTEXT 테이블과 매칭  
**ExecutionContext는 BATCH_JOB_EXECUTION_CONTEXT과 BATCH_STEP_EXECUTION_CONTEXT를 모두 매핑할수 있다.**


## 1.6 데이터 공유
~~~
@Configuration
@Slf4j
@RequiredArgsConstructor
public class SharedConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    @Bean
    public Job shareJob(){
        return jobBuilderFactory.get("shareJob")
                .incrementer(new RunIdIncrementer())
                .start(this.shareStep())
                .start(this.shareStep2())
                .build();
    }

    @Bean
    public Step shareStep(){
        return stepBuilderFactory.get("shareStep")
                .tasklet((contribution, chunkContext) -> {

                    //contribution을 통하여 StepExecution을 받아옴
                    StepExecution stepExecution = contribution.getStepExecution();

                    //stepExecution에서 ExecutionContext를 받아옴 
                    ExecutionContext stepExecutionContext = stepExecution.getExecutionContext();
                    
                    //ExecutionContext에 stepKey라는 키를 생성하고 step execution context 이라는 임의의 데이터를 넣음
                    stepExecutionContext.putString("stepKey", "step execution context");


                    //stepExecution 에서 JobExecution을 받아옴    
                    JobExecution jobExecution = stepExecution.getJobExecution();

                    //JobExecution에서 jobExecutionContext 받아옴
                    ExecutionContext jobExecutionContext = jobExecution.getExecutionContext();

                    //jobExecutionContext에 jobKey라는 키를 생성하고 job execution context 이라는 임의의 데이터를 넣음
                    jobExecutionContext.putString("jobKey", "job execution context");


                    //JobExecution에서 JobInstance를 받아옴
                    JobInstance jobInstance = jobExecution.getJobInstance();


                    //로그를 출력하기 위하여 JobExecution에서 JobParameters를 가지고 옴
                    JobParameters jobParameters = jobExecution.getJobParameters();


                    log.info("JobName : {}, stepName : {}, parameter : {} ", jobInstance.getJobName(), stepExecution.getStepName(), jobParameters.getLong("run.id"));
                    return RepeatStatus.FINISHED;
                } ).build();
    }

    @Bean
    public Step shareStep2(){
        return stepBuilderFactory.get("shareStep2")
                .tasklet((contribution, chunkContext) -> {
                    StepExecution stepExecution = contribution.getStepExecution();
                    ExecutionContext stepExecutionContext = stepExecution.getExecutionContext();

                    JobExecution jobExecution = stepExecution.getJobExecution();
                    ExecutionContext jobExecutionContext = jobExecution.getExecutionContext();

                    //위에 shareStep에서 저장한 jobKey와 stepKey의 값을 호출함
                    log.info("JobKey : {}, stepKey : {}", jobExecutionContext.getString("jobKey", ""), stepExecutionContext.getString("stepKey", ""));
                    return RepeatStatus.FINISHED;
                } ).build();
    }
}
~~~

jobExecutionContext는 서로 다른 Step 끼리 데이터를 공유 할수 있고  
stepExecutionContext는 같은 Step 내부에서만  데이터를 공유할수 있다. 따라서 위에 코드를 실행하면 
~~~
JobName : shareJob, stepName : shareStep, parameter : 1
JobKey : job execution context, stepKey : 
~~~

이렇게 jobExecutionContext의 데이터만 공유 되어 출력된 결과를 확인할 수 있다.





