---
layout: post
title: 스프링 배치 hands on 3
date: 2024-04-10
Author: Geon Son
categories: Spring
tags: [Spring, batch, ItemReader]
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

이제 생성한 CustomItemReader를 통하여 Parson 객체를 전달 받고 출력하는 소스 코드 

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



