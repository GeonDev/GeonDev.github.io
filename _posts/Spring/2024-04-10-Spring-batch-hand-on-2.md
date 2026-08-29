---
layout: post
title: 스프링 배치 hands on 2
date: 2024-04-10
Author: Geon Son
categories: Spring
tags: [Spring Batch, Tasklet, Chunk, Job, Step]
comments: true
toc: true    
---

> 이 글은 Spring Boot 3.x와 Spring Batch 5.x 기준입니다.

# 1. Task 기반 배치와 Chunk 기반 배치 

## 1.1 Task 기반 배치
배치 처리 과정을 설정으로 구성할 수 있다.
대용량 처리를 할 경우에는 더 복잡할 수 있어 하나의 큰 덩어리를 여러개로 처리 하기 부적합

```java
@Configuration
@Slf4j
public class TaskProcessConfiguration {
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    public TaskProcessConfiguration(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        this.jobRepository = jobRepository;
        this.transactionManager = transactionManager;
    }

    @Bean
    public Job taskProcessJob(){
        return new JobBuilder("taskProcessJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(this.teskBaseStep())
                .build();
    }

    @Bean
    public Step teskBaseStep(){
        return new StepBuilder("teskBaseStep", jobRepository)
                .tasklet(this.tesklet(), transactionManager)
                .build();
    }

    private Tasklet tesklet(){
        return (contribution, chunkContext) -> {
            List<String> items = getItems(100);
            log.info("task item size : {}", items.size());

            //tesklet 종료    
            return RepeatStatus.FINISHED;
        };
    }

    //단순 아이템을 생성하는 로직
    private List<String> getItems(int count){
        List<String> temp = new ArrayList<>();
        for(int i =0; i < count; i++){
            temp.add(i + "hello");
        }
        return temp;
    }

}
```

### 1.1.1 Task 기반 배치를 수동으로 나누어 처리하기

```java
    private Tasklet tesklet(){
        return (contribution, chunkContext) -> {

            List<String> items = getItems(100);

            //log.info("task item size : {}", items.size());

            //Task에서 Chunk처럼 데이터를 쪼개서 실행시켜 보면
            StepExecution stepExecution = contribution.getStepExecution();

            int chunkSize = 10;
            int formIndex = stepExecution.getReadCount();
            int toIndex = Math.min(formIndex + chunkSize, items.size());

            if(formIndex >= items.size()){
                return RepeatStatus.FINISHED;
            }

            List<String> sub = items.subList(formIndex, toIndex);
            log.info("task item size : {}", sub.size());

            //전체 리스트에서 어디 까지 읽었는지 수동으로 갱신 시켜줌
            stepExecution.setReadCount(toIndex);

            //Tesk를 반복하라는 명령어
            return RepeatStatus.CONTINUABLE;
        };
    }
```


## 1.2 Chunk 기반 배치
itemReader, itemProcesser, itemWriter로 구성되어 있고 대용량 처리에 적합하다 

Chunk - 10000개의 덩어리를 1000개씩 10번에 나누어 수행하도록 설정 가능  
Task - 10000개의 데이터를 한번에 수행/ 또는 수동으로 나누어야 함

```java
@Configuration
@Slf4j
public class ChunkProcessConfiguration {
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    public ChunkProcessConfiguration(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        this.jobRepository = jobRepository;
        this.transactionManager = transactionManager;
    }


    @Bean
    public Job chunkProcessJob(){
        return new JobBuilder("chunkProcessJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(this.chunkBaseStep())
                .build();
    }


    @Bean
    public Step chunkBaseStep(){
        return new StepBuilder("chunkBaseStep", jobRepository)
                // 100개의 데이터를 10개씩 나누겠다는 선언 
                .<String, String>chunk(10, transactionManager)
                .reader(itemReader())
                .processor(itemProcessor())
                .writer(itemWriter())
                .build();
    }



    private ItemReader<String> itemReader() {
        // 스프링 배치의 기본 ItemReader
        // getItems 에서 100개의 아이템이 저장된 리스트를 받음
        return new ListItemReader<>(getItems(100));
    }

    // 리더에서 읽은 아이템에 "Spring batch" 라는 붙여준다.
    // ItemProcessor 데이터가 null로 반환 하면 해당 아이템은 ItemWriter로 전달 불가
    // 예제에서는 모든 데이터를 넘김 
    private ItemProcessor< String, String> itemProcessor() {
        return item -> item +",Spring batch";
    }


    private ItemWriter<String> itemWriter() {
        //return items -> log.info("chunk item size {}", items.size());

        //ItemProcessor를 통하여 변경된 문자열을 출력
        return items -> items.forEach(log::info);
    }


    //단순 아이템을 생성하는 로직
    private List<String> getItems(int count){
        List<String> temp = new ArrayList<>();
        for(int i =0; i < count; i++){
            temp.add(i + "hello");
        }
        return temp;
    }

}
```


![](/images/spring/sfetl-4e5hqwdghq3gy4gyrfh4y.png){: .align-center}


ItemReader에서 null을 반환할때 까지 Step 반복 -> 처리할 데이터가 없다는 의미  
ItemReader와 ItemProcessor는 아이템을 1개씩 받아서 처리하지만  
Spring Batch 5의 ItemWriter는 `Chunk<? extends T>`를 받아서 처리한다. 

### <INPUT, OUTPUT>chunk(int)
예제 코드의 **<String, String>chunk(10)** 부분  
reader에서 INPUT 을 return 한다  
processor에서 INPUT을 받아 processing 후 OUPUT을 return (INPUT, OUTPUT은 같은 타입일 수 있음)  
writer에서 List<OUTPUT>을 받아 write

# 2. JobParameters 
배치 실행에 필요한 값을 parameter로 외부에서 주입
배치 실행 시 조금 더 유연한 세팅을 위하여 사용 

## 2.1 JobParameters 객체를 활용하여 데이터를 전달하는 방법
**String parameter = jobParameters.getString(key, defaultValue);**

1.1.1 예제에서 chunkSize를 받은 방법을 JobParameters를 활용하도록 변경 

```java
    private Tasklet tesklet(){
        return (contribution, chunkContext) -> {

            List<String> items = getItems(100);

            StepExecution stepExecution = contribution.getStepExecution();
            
            //stepExecution에서 JobParameters를 호출
            JobParameters jobParameters = stepExecution.getJobParameters();

            //JobParameters에서 chunkSize라는 이름의 변수값을 받음 / 없으면 10으로 세팅
            int chunkSize = Integer.parseInt(jobParameters.getString("chunkSize", "10"));
            int formIndex = stepExecution.getReadCount();
            int toIndex = formIndex + chunkSize;

            if(formIndex >= items.size()){
                return RepeatStatus.FINISHED;
            }

            List<String> sub = items.subList(formIndex, toIndex);
            log.info("task item size : {}", sub.size());

            //전체 리스트에서 어디 까지 읽었는지 수동으로 갱신 시켜줌
            stepExecution.setReadCount(toIndex);

            //Tesk를 반복하라는 명령어
            return RepeatStatus.CONTINUABLE;
        };
    }
```


![](/images/spring/dfjld-3asdfmotg-d2gasdgyj.png){: .align-center}
인텔리제이의 Application 창에서 chunkSize 변수를 추가한다.


## 2.2 Spring EL(Expression Language)로 접근
**@Value("#{jobParameters['key']}")** 
JobParameters를 Bean 생성 시점에 주입하려면 해당 구성 요소를 `@StepScope`로 선언한다. `Step` 자체에는 scope를 선언하지 않는다.

```java
    @Bean
    @StepScope
    public Tasklet parameterizedTasklet(@Value("#{jobParameters['chunkSize']}") String chunkSize){

        return (contribution, chunkContext) -> {
            int size = StringUtils.hasText(chunkSize) ? Integer.parseInt(chunkSize) : 10;
            log.info("chunkSize: {}", size);
            return RepeatStatus.FINISHED;
        };
    }
```

@Value 가 lombok의 value가 아니라 org.springframework.beans.factory.annotation.Value 라는 것에 주의  
위 예제는 `chunkSize`가 있으면 해당 값을 사용하고, 없으면 10을 사용한다. `@StepScope`가 붙은 Tasklet은 Step 생성 시점이 아니라 Step 실행 시점에 JobParameters를 주입받는다.

```java
    @Bean
    public Step parameterizedTaskletStep(){
        return new StepBuilder("parameterizedTaskletStep", jobRepository)
                .tasklet(this.parameterizedTasklet(null), transactionManager)
                .build();
    }
```


## 2.3 JobScope와 StepScope의 이해
@Scope는 어떤 시점에 bean을 생성/소멸 시킬 지 bean의 lifecycle을 설정  
기본 `@Scope`는 singleton이며, Batch scope는 실행 시점에 객체를 생성한다.
  * @JobScope는 Job 실행 시점에 생성·소멸 -> Job에 필요한 Bean에 선언  
  * @StepScope는 step 실행 시점에 생성/소멸 -> Tasklet, Chunk(ItemReader, ItemProcessor, ItemWriter) 에 선언

예제의 ItemReader, ItemProcessor, ItemWriter는 @Bean 선언이 없었지만  
@StepScope를 사용하기 위해서는 @Bean으로 설정이 필요  
(@StepScope의 라이프 사이클이 @Bean을 따르기 때문 -> 데이터 및 설정을 스프링 기반 시스템에 의존한다.)

Spring의 @Scope과 같은 것 이기 때문에 @Scope의 속성중 ScopeName이 있는데 아래와 같이 선언하면 기능이 동일하게 작동  
@Scope(“job”) ->  @JobScope / @Scope(“step”) -> @StepScope

Scope는 실행별 Bean 인스턴스를 제공할 뿐 Thread-safe를 보장하지 않는다.  
`@Value("#{jobParameters['key']}")` 같은 늦은 바인딩을 사용하는 Bean에는 해당 Bean에 `@JobScope` 또는 `@StepScope` 중 하나를 선언한다.

2.1 예제에서 JobParameters 사용부분을 @StepScope 사용으로 변경해보면 

```java
    @Bean
    @StepScope
    //StepScope를 사용하기 위해 Bean으로 등록한다. 
    //Bean으로 등록을 하게 되면 private 선언을 할수 없기 때문에 public으로 변경
    public Tasklet tesklet(){
        return (contribution, chunkContext) -> {

            List<String> items = getItems(100);

            StepExecution stepExecution = contribution.getStepExecution();
            
            //stepExecution에서 JobParameters를 호출
            JobParameters jobParameters = stepExecution.getJobParameters();

            //JobParameters에서 chunkSize라는 이름의 변수값을 받음 / 없으면 10으로 세팅
            int chunkSize = Integer.parseInt(jobParameters.getString("chunkSize", "10"));
            int formIndex = stepExecution.getReadCount();
            int toIndex = Math.min(formIndex + chunkSize, items.size());

            if(formIndex >= items.size()){
                return RepeatStatus.FINISHED;
            }

            List<String> sub = items.subList(formIndex, toIndex);
            log.info("task item size : {}", sub.size());

            //전체 리스트에서 어디 까지 읽었는지 수동으로 갱신 시켜줌
            stepExecution.setReadCount(toIndex);

            //Tesk를 반복하라는 명령어
            return RepeatStatus.CONTINUABLE;
        };
    }

```

tesklet의 시그니처가 변경되었기 때문에 아래와 같이 teskBaseStep을 변경
```java
    @Bean
    public Step teskBaseStep(){
        return new StepBuilder("teskBaseStep", jobRepository)
                //tasklet이 bean으로 생성되었으므로 null을 넣더라도 스프링 라이프 사이클에서 파라메터를 넣어줌
                .tasklet(this.tesklet(null), transactionManager)
                .build();
    }
```
