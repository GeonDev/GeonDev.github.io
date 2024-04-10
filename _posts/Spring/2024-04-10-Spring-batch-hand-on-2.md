---
layout: post
title: 스프링 배치 hands on 2
date: 2024-04-10
Author: Geon Son
categories: Spring
tags: [Spring, batch, Task, Chunk]
comments: true
toc: true    
---

# 1. Task 기반 배치와 Chunk 기반 배치 

## 1.1 Task 기반 배치
배치 처리 과정이 비교적 쉽게 사용
대용량 처리를 할 경우에는 더 복잡할 수 있다.
하나의 큰 덩어리를 여러개로 처리 하기 부적합

~~~

@Configuration
@Slf4j
public class TaskProcessConfiguration {
    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    public TaskProcessConfiguration(JobBuilderFactory jobBuilderFactory, StepBuilderFactory stepBuilderFactory) {
        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
    }

    @Bean
    public Job taskProcessJob(){
        return jobBuilderFactory.get("taskProcessJob")
                .incrementer(new RunIdIncrementer())
                .start(this.teskBaseStep())
                .build();
    }

    @Bean
    public Step teskBaseStep(){
        return stepBuilderFactory.get("teskBaseStep")
                .tasklet(this.tesklet())
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
~~~

## 1.1.1 Task 기반 배치를 수동으로 나누어 처리하기

~~~
    private Tasklet tesklet(){
        return (contribution, chunkContext) -> {

            List<String> items = getItems(100);

            //log.info("task item size : {}", items.size());

            //Task에서 Chunk처럼 데이터를 쪼개서 실행시켜 보면
            StepExecution stepExecution = contribution.getStepExecution();

            int chunkSize = 10;
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
~~~


## 1.2 Chunk 기반 배치
itemReader, itemProcesser, itemWriter로 구성되어 있다.
대용량 처리에 적합 

Chunk - 10000개의 덩어리를 1000개씩 10번에 나누어 수행하도록 설정 가능
Task - 10000개의 데이터를 한번에 수행/ 또는 수동으로 나누어야 함

~~~
@Configuration
@Slf4j
public class ChunkProcessConfiguration {
    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    public ChunkProcessConfiguration(JobBuilderFactory jobBuilderFactory, StepBuilderFactory stepBuilderFactory) {
        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
    }


    @Bean
    public Job chunkProcessJob(){
        return jobBuilderFactory.get("chunkProcessJob")
                .incrementer(new RunIdIncrementer())
                .start(this.chunkBaseStep())
                .build();
    }


    @Bean
    public Step chunkBaseStep(){
        return stepBuilderFactory.get("chunkBaseStep")
                // 100개의 데이터를 10개씩 나누겠다는 선언 
                .<String, String>chunk(10)
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
    
~~~


![](/images/spring/sfetl-4e5hqwdghq3gy4gyrfh4y.png){: .align-center}


ItemReader에서 null을 반환할때 까지 Step 반복 -> 처리할 데이터가 없다는 의미
ItemReader와 ItemProcesser는 아이템을 1개 씩 받아서 처리하지만
ItemWriter는 아이템을 리스트로 받아서 처리 

### $\lt$INPUT, OUTPUT$\gt$chunk(int)
예제 코드의 **$\lt$String, String$\gt$chunk(10)** 부분

reader에서 INPUT 을 return
processor에서 INPUT을 받아 processing 후 OUPUT을 return (INPUT, OUTPUT은 같은 타입일 수 있음)

writer에서 List$\lt$OUTPUT$\gt$을 받아 write

# 2. JobParameters 
배치를 실행에 필요한 값을 parameter를 통해 외부에서 주입
실행시 조금 더 유연한 세팅을 위하여 사용 

## 2.1 JobParameters 객체를 활용하여 데이터를 전달하는 방법
**String parameter = jobParameters.getString(key, defaultValue);**

1.1.1 예제에서 chuncksize를 받은 방법을 JobParameters를 활용하도록 변경 

~~~
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
~~~


![](/images/spring/dfjld-3asdfmotg-d2gasdgyj.png){: .align-center}
인텔리제이의 Application 창에서 chunkSize 변수를 추가한다.


## 2.2 Spring EL(Expression Language)로 접근
**@Value(“#{jobParameters[key]}”)** 
예저 1.2 에서 chunkBaseStep를 변경

~~~

    @Bean
    @JobScope
    public Step chunkBaseStep(@Value("#{jobParameters[chunkSize]}") String chunkSize){

        return stepBuilderFactory.get("chunkBaseStep")
                .<String, String>chunk(StringUtils.hasText(chunkSize) ? Integer.parseInt(chunkSize) : 10 )
                .reader(itemReader())
                .processor(itemProcessor())
                .writer(itemWriter())
                .build();
    }
~~~

@Value 가 lombok의 value가 아니라 org.springframework.beans.factory.annotation.Value 라는 것에 주의
위 예제와 동일하게 chunkSize 변수가 있다면 해당 데이터로 없다면 10을 기본 값으로 하도록 생성
chunkBaseStep의 시그니처가 변경되었음으로 실행을 위해 chunkProcessJob에서 chunkBaseStep을 호출하는 것도 변경

~~~

    @Bean
    public Job chunkProcessJob(){
        return jobBuilderFactory.get("chunkProcessJob")
                .incrementer(new RunIdIncrementer())
                // 파라메터의 null이 들어가도 환경 변수에 설정된 데이터를 받아온다.
                .start(this.chunkBaseStep(null))
                .build();
    }
~~~


## 2.3 JobScope와 StapScope의 이해
@Scope는 어떤 시점에 bean을 생성/소멸 시킬 지 bean의 lifecycle을 설정
스프링에서 @Scope는 싱글톤으로 구현되어 있음 
  * @JobScope는 job 실행 시점에 생성/소멸 -> Step에 선언
  * @StepScope는 step 실행 시점에 생성/소멸 -> Tasklet, Chunk(ItemReader, ItemProcessor, ItemWriter) 에 선언

에제의 ItemReader, ItemProcessor, ItemWriter는 @Bean 선언이 없었지만 @StepScope를 사용하기 위해서는 @Bean으로 설정이 필요
(@StepScope의 라이프 사이클이 @Bean을 따르기 때문 -> 데이터 및 설정을 스프링 기반 시스템에 의존한다.)

Spring의 @Scope과 같은 것 이기 때문에 @Scope의 속성중 ScopeName이 있는데 아래와 같이 선언하면 기능이 동일하게 작동
@Scope(“job”) ->  @JobScope / @Scope(“step”) -> @StepScope

Job과 Step 라이프사이클에 의해 생성되기 때문에 Thread safe하게 작동
@Value(“#{jobParameters[key]}”)를 사용하기 위해 @JobScope와 @StepScope는 필수

2.1 예제에서 JobParameters 사용부분을 @StepScope 사용으로 변경해보면 

~~~

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

~~~

tesklet의 시그니처가 변경되었기 때문에 아래와 같이 teskBaseStep을 변경
~~~

    
    @Bean
    public Step teskBaseStep(){
        return stepBuilderFactory.get("teskBaseStep")
                //tasklet이 bean으로 생성되었으므로 null을 넣더라도 스프링 라이프 사이클에서 파라메터를 넣어줌
                .tasklet(this.tesklet(null))
                .build();
    }
~~~