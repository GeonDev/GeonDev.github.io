---
layout: post
title: 스프링 배치 hands on 3
date: 2024-04-10
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

# 1. ItemReader InterFace 구조 

![](/images/spring/sflkjasdfgas-asdfgasgh-sfrf.png){: .align-center}

기본 제공되는 ItemReader 구현체가 많음 (file, jdbc, Jpa 등등)  
ItemReader 구현체가 없으면 직접 개발  
ItemStream은 ExecutionContext로 read, write 정보를 저장

CustomItemReader 구현 예제
~~~
public class CustomItemReader<T> implements ItemReader<T> {

    //예제에서는 List를 받는 ItemReader로 설정
    private final List<T> items;

    //생성자를 통하여 필드를 세팅할수 있도록 정의
    public CustomItemReader(List<T> items) {
        this.items = new ArrayList<>(items);
    }

    @Override
    public T read() throws Exception, UnexpectedInputException, ParseException, NonTransientResourceException {
        if (!items.isEmpty()) {
            // remove() 메소드는 0번째 인덱스 반환 후 리스트에서 제거한다. 
            // ItemReader는 1개씩 데이터를 전달한다. 
            return items.remove(0);
        }

        return null;
    }
}
~~~

위 예제의 CustomItemReader 작동 확인을 위하여 클래스 생성

~~~
@Entity
@NoArgsConstructor
@Getter
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String name;
    private String age;
    private String address;

    public Person(String name, String age, String address) {
        this(0, name, age, address);
    }

    public Person(int id, String name, String age, String address) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.address = address;
    }

    public boolean isNotEmptyName() {
        return Objects.nonNull(this.name) && !name.isEmpty();
    }

    public Person unknownName() {
        this.name = "UNKNOWN";
        return this;
    }
}
~~~

이제 생성한 CustomItemReader를 통하여 Parson 객체를 전달 받고 출력하는 소스코드를 작성한다.  
(customItemReaderStep()과 itemReaderJob() 를 설정 )
~~~

@Configuration
@Slf4j
public class ItemReaderConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    public ItemReaderConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
    }

    @Bean
    public Job itemReaderJob() throws Exception {
        return this.jobBuilderFactory.get("itemReaderJob")
                .incrementer(new RunIdIncrementer())
                .start(this.customItemReaderStep())
                .build();
    }

    @Bean
    public Step customItemReaderStep() {
        return this.stepBuilderFactory.get("customItemReaderStep")
                .<Person, Person>chunk(10)
                .reader(new CustomItemReader<>(getItems()))
                .writer(itemWriter())
                .build();
    }

    // Person의 name을 ,(콤마) 를 붙여 구분하면서 한줄로 출력
    private ItemWriter<Person> itemWriter() {
        return items -> log.info(
            items.stream()
                .map(Person::getName)
                .collect(Collectors.joining(", ")));
    }


    private List<Person> getItems() {
        List<Person> items = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            items.add(new Person(i + 1, "test name" + i, "test age", "test address"));
        }

        return items;
    }
}
~~~


## 1.1. FlatFileItemReader
파일에 저장된 데이터를 읽어 객체에 매핑 하는 ItemReader

테스트를 위한 csv 파일을 생성 (test.csv 파일을 만든다.)  
위에서 생성한 Parson 객체는 그대로 사용한다.
~~~
id,이름,나이,거주지
1,이경원,32,인천
2,홍길동,30,서울
3,아무개,25,강원
~~~


~~~
    private FlatFileItemReader<Person> csvFileItemReader() throws Exception {
        
        /** CSV파일을 Parson 객체에 매핑 **/

        //파일을 한줄씩 읽을수 있는 LineMapper 설정
        DefaultLineMapper<Person> lineMapper = new DefaultLineMapper<>();

        //파읠의 필드명을 설정할수 있는 Tokenizer 선언 
        DelimitedLineTokenizer tokenizer = new DelimitedLineTokenizer();
        
        tokenizer.setNames("id", "name", "age", "address");
        
        //LineMapper에 Tokenizer 세팅
        lineMapper.setLineTokenizer(tokenizer);

        //데이터를 필드 값에 맞추어 세팅
        lineMapper.setFieldSetMapper(fieldSet -> {
            int id = fieldSet.readInt("id");
            String name = fieldSet.readString("name");
            String age = fieldSet.readString("age");
            String address = fieldSet.readString("address");

            //읽은 데이터를 Person 객체로 전달 
            return new Person(id, name, age, address);
        });

        /** FlatFileItemReader 생성 **/

        FlatFileItemReader<Person> itemReader = new FlatFileItemReaderBuilder<Person>()
                .name("csvFileItemReader")
                .encoding("UTF-8")
                // Resource 디랙토리 아래 파일을 읽을수 있는 스프링 클래스
                .resource(new ClassPathResource("test.csv"))
                //첫번째 라인을 무시 (Parson의 필드명이기 떄문에)
                .linesToSkip(1)
                //위에서 설정한 LineMapper 적용
                .lineMapper(lineMapper)
                .build();

        //ItemReader에 필요한 필수 설정값이 정상적으로 세팅 되었는지 검증
        //Exception를 출력하기 때문에 throws Exception 추가    
        itemReader.afterPropertiesSet();

        return itemReader;
    }


    // 생성한 csvFileItemReader을 실행시키기 위한 Step 세팅
    @Bean
    public Step csvFileStep() throws Exception {
        return stepBuilderFactory.get("csvFileStep")
                .<Person, Person>chunk(10)
                .reader(this.csvFileItemReader())
                .writer(itemWriter())
                .build();
    }
~~~

## 1.2 JdbcCursorItemReader

## 1.2.1 Cursor 개념
jtbc의 ResultSet은 Cursor를 구현한 클래스로 쿼리를 실행하기 위해서 Connection이 연결된 상태에서 Cursor의 위치를 한개씩 이동시키면서 데이터를 불러오게 되어 있다. 

Cursor도 ItemSteam을 사용하여 데이터를 읽어오는데 open() -> update() -> close()의 순으로 데이터를 읽어오게 되며 모든 데이터를 읽었다는 기준은 update()가 null을 반환하는 것으로 되어 있다. 따라서 아래와 같은 특징을 갖고 있다.

* 배치 처리가 완료될 때 까지 DB Connection이 연결  
* DB Connection 빈도가 낮아 성능이 좋은 반면, 긴 Connection 유지 시간 필요  
* 하나의 Connection에서 처리되기 때문에, Thread Safe 하지 않음  
* 모든 결과를 메모리에 할당하기 때문에, 더 많은 메모리를 사용  

 
## 1.2.2 Paging 개념
Cursor와 반대로 Connection을 짧게 유지하면서 데이터를 조회 하는 paging 방식이 있다.

* 페이징 단위로 DB Connection을 연결  
* DB Connection 빈도가 높아 비교적 성능이 낮은 반면, 짧은 Connection 유지 시간 필요  
* 매번 Connection을 하기 때문에 Thread Safe  
* 페이징 단위의 결과만 메모리에 할당하기 때문에, 비교적 더 적은 메모리를 사용


JdbcCursorItemReader는 DB기반 읽기 임으로 예제를 위한 sql 코드를 생성한다.  
생성한 코드는 resource 폴더 아래에 parson.sql로 지정하였다.
~~~
create table person (
     id bigint primary key auto_increment,
     name varchar(255),
     age varchar(255),
     address varchar(255)
);

insert into person(name, age, address)
values('이경원','32','인천');
insert into person(name, age, address)
values('홍길동','30','서울');
insert into person(name, age, address)
values('아무개','25','강원');
~~~

테이블 구성이 완료되었으면 application.yml에 설정한 테이블을 읽을수 있도록 구성한다.  
이때 데이터 베이스는 h2 DB를 사용한다. (다른 DB를 사용해도 무방) 

~~~
spring:
  batch:
    job:
      names: ${job.name:NONE}
    initialize-schema:
  datasource:
    driver-class-name: org.h2.Driver
    data: classpath:person.sql

~~~
생성된 데이터 베이스를 연결해야 하기 때문에 이전에 구현하였던 ItemReaderConfiguration에  DataSource 필드를 추가하고 생성자를 다시 만들어 준다.

~~~
@Configuration
@Slf4j
public class ItemReaderConfiguration {


    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;
    
    //추가된 DataSource 클래스
    private final DataSource dataSource;
    
    public ItemReaderConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory,
                                   DataSource dataSource) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
        this.dataSource = dataSource;
    }

    //이하 생략

}
~~~

생성자로 주입받은 dataSource를 활용하여 JdbcCursorItemReader를 구현한다.  
커서 기반 JdbcItemReader에서는 sql 문을 활용하여 데이터를 조회한다.

~~~

private JdbcCursorItemReader<Person> jdbcCursorItemReader() throws Exception {
    JdbcCursorItemReader<Person> itemReader = new JdbcCursorItemReaderBuilder<Person>()
            .name("jdbcCursorItemReader")
            //스프링 부트에서는 application.yml을 기반으로 dataSource를 자동으로 생성해 준다.
            .dataSource(dataSource)
            //데이터 조회 쿼리
            .sql("select id, name, age, address from person")
            //쿼리를 통하여 조회된 데이터를 Person 객체에 매핑 시켜 준다.
            //람다 식으로 설정할수 있다.
            //컬럼 인덱스는 0이 아니라 1부터 시작한다.
            .rowMapper((rs, rowNum) -> new Person(
                    rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4)))
            .build();
    itemReader.afterPropertiesSet();
    return itemReader;
}
~~~

이제 위에서 생성한 JdbcCursorItemReader를 실행시킬수 있는 Step을 설정해주고  
Job에 추가한 Step을 넣어준다. (Job은 이전 예제를 이어 사용)
~~~
@Bean
public Step jdbcStep() throws Exception {
    return stepBuilderFactory.get("jdbcStep")
            .<Person, Person>chunk(10)
            .reader(jdbcCursorItemReader())
            .writer(itemWriter())
            .build();
}



@Bean
public Job itemReaderJob() throws Exception {
    return this.jobBuilderFactory.get("itemReaderJob")
            .incrementer(new RunIdIncrementer())
            .start(this.customItemReaderStep())
            .next(this.csvFileStep())
            //jdbcStep을 이어 실행하도록 추가
            .next(this.jdbcStep())
            .build();
}
~~~


## 1.3 JpaCursorItemReader

* 기존에는 Jpa는 Paging 기반의 ItemReader만 제공됨
* 스프링 4.3+ 에서 Jpa 기반 Cursor ItemReader가 제공됨

![](/images/spring/hjk7dyy65-f4jghi-efgjl.png){: .align-center}

jpa는 EntityManager를 사용하여 데이터를 조회하기 때문에 기존 Person 객체를 Entity로 만들어 준다. 

~~~
@Entity
@NoArgsConstructor
@Getter
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String name;
    private String age;
    private String address;

    //ID를 받지 않는 생성자를 만듬
    //JPA에서 자체적으로 ID를 생성해서 리턴해 준다. 
    public Person(String name, String age, String address) {
        this(0, name, age, address);
    }

    public Person(int id, String name, String age, String address) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.address = address;
    }
}
~~~

jdbc와 마찬가지로 jpa를 사용하기 위해서 EntityManagerFactory를 받아와아 햔다.  
스프링 부트의 기능을 활용하여 ItemReaderConfiguration에 생성자로 EntityManagerFactory를 받아오도록 설정한다. 

~~~
@Configuration
@Slf4j
public class ItemReaderConfiguration {


    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;
    private final DataSource dataSource;

    //EntityManagerFactory를 Injection 시킨다.
    private final EntityManagerFactory entityManagerFactory;

    public ItemReaderConfiguration(JobBuilderFactory jobBuilderFactory,
                                   StepBuilderFactory stepBuilderFactory,
                                   DataSource dataSource,
                                   EntityManagerFactory entityManagerFactory) {

        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
        this.dataSource = dataSource;
        this.entityManagerFactory = entityManagerFactory;
    }

    //이하 생략

}
~~~

위에서 추가한 entityManagerFactory를 사용하는 JpaCursorItemReader를 만든다.   
특이한 점은 queryString에서 사용하는 쿼리가 JPQL 쿼리 라는 것이다.

~~~
private JpaCursorItemReader<Person> jpaCursorItemReader() throws Exception {
    JpaCursorItemReader<Person> itemReader = new JpaCursorItemReaderBuilder<Person>()
            .name("jpaCursorItemReader")
            .entityManagerFactory(entityManagerFactory)
            .queryString("select p from Person p")
            .build();
    itemReader.afterPropertiesSet();

    return itemReader;
}

~~~

위에서 생성한 JpaCursorItemReader를 실행시키기 위해 Step을 생성하고 기존에 생성한 itemReaderJob()에 Step을 추가한다. 

~~~

@Bean
public Step jpaStep() throws Exception {
    return stepBuilderFactory.get("jpaStep")
            // Input을 Person 타입으로 Output을 Person으로 설정 
            .<Person, Person>chunk(10)
            .reader(this.jpaCursorItemReader())
            .writer(itemWriter())
            .build();
}

@Bean
public Job itemReaderJob() throws Exception {
    return this.jobBuilderFactory.get("itemReaderJob")
            .incrementer(new RunIdIncrementer())
            .start(this.customItemReaderStep())
            .next(this.csvFileStep())
            .next(this.jdbcStep())
            //jpaStep을 추가하였다.
            .next(this.jpaStep())
            .build();
}
~~~

csvFileStep, jdbcStep, jpaStep 모두 같은 writer를 사용하도록 설정하였기 때문에 똑같은 결과가 3번 출력되는 것을 확인할 수 있다. 
