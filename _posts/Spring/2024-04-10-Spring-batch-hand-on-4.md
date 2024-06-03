---
layout: post
title: 스프링 배치 hands on 4
date: 2024-04-10
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

# 1. ItemWriter InterFace 구조


![](/images/spring/fglqon-3nl5-sfnlwg4.png){: .align-center}

* ItemWriter는 마지막으로 배치 처리 대상 데이터를 어떻게 처리할 지 결정  
* Step에서 ItemWriter는 필수
* 데이터 처리 과정의 마지막 처리를 담당(삭제, 업데이트 등 기능 수행)


## 1.1 FlatFileItemWriter
FlatFileItemWriter는 데이터가 매핑된 객체를 파일로 write

테스트를 위하여 이전에 생성한 Person객체를 사용하는 ItemReader를 생성한다.  
ItemWriter는 **csvFileItemWriter** 라는 이름으로 설정하였다. 

~~~
@Configuration
@Slf4j
public class ItemWriterConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;
    private final DataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    public ItemWriterConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory,
                                   DataSource dataSource,
                                   EntityManagerFactory entityManagerFactory) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
        this.dataSource = dataSource;
        this.entityManagerFactory = entityManagerFactory;
    }

    @Bean
    public Job itemWriterJob() throws Exception {
        return this.jobBuilderFactory.get("itemWriterJob")
                .incrementer(new RunIdIncrementer())
                .start(this.csvItemWriterStep())
                .build();
    }

    @Bean
    public Step csvItemWriterStep() throws Exception {
        return this.stepBuilderFactory.get("csvItemWriterStep")
                .<Person, Person>chunk(10)
                .reader(itemReader())
                .writer(csvFileItemWriter())
                .build();
    }

    private ItemReader<Person> itemReader() {
        return new CustomItemReader<>(getItems());
    }

    private List<Person> getItems() {
        List<Person> items = new ArrayList<>();

        for (int i = 0; i < 100; i++) {
            items.add(new Person("test name" + i, "test age", "test address"));
        }

        return items;
    }

}
~~~

FlatFileItemWriter는 CSV 파일에 데이터를 작성하기위해서 FieldExtractor 객체가 필요하다.    
FieldExtractor를 이용하여 필드 객채의 이름을 설정 한다.

입력받은 데이터를 한줄씩 구분하여 작성하기 위해서 구분자가 필요한데 이때 LineAggregator를 사용한다.  

FlatFileItemWriter는 builder를 이용하여 생성하게 된다.
~~~
    private ItemWriter<Person> csvFileItemWriter() throws Exception {
        BeanWrapperFieldExtractor<Person> fieldExtractor = new BeanWrapperFieldExtractor<>();
        
        //작성할 필드명을 설정한다. (Person 객체 기준으로 설정)
        fieldExtractor.setNames(new String[] {"id", "name", "age", "address"});

        //입력데이터의 구분자를 설정한다. (따옴표로 설정)
        DelimitedLineAggregator<Person> lineAggregator = new DelimitedLineAggregator<>();
        lineAggregator.setDelimiter(",");
        lineAggregator.setFieldExtractor(fieldExtractor);

        FlatFileItemWriter<Person> itemWriter = new FlatFileItemWriterBuilder<Person>()
                .name("csvFileItemWriter")
                .encoding("UTF-8")
                //파일을 생성할 경로, 파일을 쓸때는 FileSystemResource를 사용하면 된다. 
                .resource(new FileSystemResource("output/test-output.csv"))
                //매핑 설정을 저장한다.
                .lineAggregator(lineAggregator)
                .build();

        itemWriter.afterPropertiesSet();

        return itemWriter;
    }
~~~

이렇게 파일을 작성하여도 문제는 없지만 추가적으로 CSV 파일에 header와 footer를 생성할수 있다.  
위에 FlatFileItemWriter에 headerCallback, footerCallback을 추가하면 된다.
~~~
        FlatFileItemWriter<Person> itemWriter = new FlatFileItemWriterBuilder<Person>()
                .name("csvFileItemWriter")
                .encoding("UTF-8")
                .resource(new FileSystemResource("output/test-output.csv"))
                .lineAggregator(lineAggregator)
                //header, footer 실행 
                .headerCallback(writer -> writer.write("id,이름,나이,거주지"))
                .footerCallback(writer -> writer.write("-------------------/n"))
                .build();
~~~
itemWriter를 변경하고 다시 실행을 하게 되면 전체 파일이 다시 실행하게 된다.  
파일을 새로 생성하지 않고 기존에 있던 파일에 이어서 데이터를 작성하고 싶다면 append(true) 옵션을 추가하면 된다.  
단, append를 하게 되면 파일을 이어쓰는 것이기 때문에 마지막 footer에 반드시 개행문자를 추가해 주어야 정상적인 데이터 출력이 된다.


## 1.2. JdbcBatchItemWriter
* JdbcBatchItemWriter는 jdbc를 사용해 DB에 write
* JdbcBatchItemWriter는 bulk insert/update/delete처리
* insert를 단건 으로 처리하지 않기 때문에 비교적 성능이 높다. (bulkInsert)  
ex) insert into person (name, age, address) values (1,2,3), (4,5,6), (7,8,9);      


jdbc를 사용하기 때문에 당연히 DataSource를 사용한다. 생성자에서 데이터를 받아올수 있도록 생성자를 추가하였다.

~~~
@Configuration
@Slf4j
public class ItemWriterConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;
    private final DataSource dataSource;

    public ItemWriterConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory,
                                   DataSource dataSource) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
        this.dataSource = dataSource;
    }

    @Bean
    public Job itemWriterJob() throws Exception {
        return this.jobBuilderFactory.get("itemWriterJob")
                .incrementer(new RunIdIncrementer())
                .start(this.jdbcBatchItemWriterStep())
                .build();
    }

    @Bean
    public Step jdbcBatchItemWriterStep() {
        return stepBuilderFactory.get("jdbcBatchItemWriterStep")
                .<Person, Person>chunk(10)
                .reader(itemReader())
                .writer(jdbcBatchItemWriter())
                .build();
    }

   private ItemWriter<Person> jdbcBatchItemWriter() {
        JdbcBatchItemWriter<Person> itemWriter = new JdbcBatchItemWriterBuilder<Person>()
                .dataSource(dataSource)
                //Person 클래스를 파라메터로 받기 위해 설정
                //별도의 설정을 하지 않아도 자동으로 Person객체를 받는다고 인식 한다.
                .itemSqlParameterSourceProvider(new BeanPropertyItemSqlParameterSourceProvider<>())
                .sql("insert into person(name, age, address) values(:name, :age, :address)")
                .build();

        itemWriter.afterPropertiesSet();

        return itemWriter;
    }
}
~~~

## 1.3 JpaItemWriter
* JpaItemWriter는 JPA Entity 기반으로 데이터를 DB에 write
* Entity를 하나씩 EntityManager.persist 또는 EntityManager.merge로 insert


jpa를 사용하기 위해 EntityManagerFactory를 추가한다. 

~~~
@Configuration
@Slf4j
public class ItemWriterConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;
    private final EntityManagerFactory entityManagerFactory;

    public ItemWriterConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory,
                                   EntityManagerFactory entityManagerFactory) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
        this.entityManagerFactory = entityManagerFactory;
    }

    @Bean
    public Job itemWriterJob() throws Exception {
        return this.jobBuilderFactory.get("itemWriterJob")
                .incrementer(new RunIdIncrementer())
                .start(this.jpaItemWriterStep())
                .build();
    }

    @Bean
    public Step jpaItemWriterStep() throws Exception {
        return stepBuilderFactory.get("jpaItemWriterStep")
                .<Person, Person>chunk(10)
                .reader(itemReader())
                .writer(jpaItemWriter())
                .build();
    }

    private ItemWriter<Person> jpaItemWriter() throws Exception {
        JpaItemWriter<Person> itemWriter = new JpaItemWriterBuilder<Person>()
                .entityManagerFactory(entityManagerFactory)
                .build();

        itemWriter.afterPropertiesSet();
        return itemWriter;
    }
}
~~~

