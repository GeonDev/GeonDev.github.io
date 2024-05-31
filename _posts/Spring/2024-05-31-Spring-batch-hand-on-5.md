---
layout: post
title: 스프링 배치 hands on 5
date: 2024-05-31
Author: Geon Son
categories: Spring
tags: [Spring, batch, ItemWriter]
comments: true
toc: true    
---

# 1. ItemProcessor interface 구조 이해

* ItemReader에서 읽은 데이터를 가공 또는 Filtering
* Step의 ItemProcessor는 optional
ItemProcessor는 필수는 아니지만, 책임 분리를 분리하기 위해 사용
* ItemProcessor는 I(input)를 O(output)로 변환하거나
ItemWriter의 실행 여부를 판단 할 수 있도록 filtering 역할을 한다.
(ItemWriter는 not null만 처리)

## 1.1 예제 
itemReader에서 10개의 person 클래스를 생성한 후에 ItemProcessor를 활용하여 짝수번째 데이터만 반환 한다.  
  
ItemProcessor <I,O> 의 형태로 선언하며 Input, output의 자료형을 명시한다.

~~~
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.JobBuilderFactory;
import org.springframework.batch.core.configuration.annotation.StepBuilderFactory;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@Slf4j
public class ItemProcessorConfiguration {

    private final JobBuilderFactory jobBuilderFactory;
    private final StepBuilderFactory stepBuilderFactory;

    public ItemProcessorConfiguration(JobBuilderFactory jobBuilderFactory,
                                      StepBuilderFactory stepBuilderFactory) {
        this.jobBuilderFactory = jobBuilderFactory;
        this.stepBuilderFactory = stepBuilderFactory;
    }

    @Bean
    public Job itemProcessorJob() {
        return this.jobBuilderFactory.get("itemProcessorJob")
                .incrementer(new RunIdIncrementer())
                .start(this.itemProcessorStep())
                .build();
    }

    @Bean
    public Step itemProcessorStep() {
        return this.stepBuilderFactory.get("itemProcessorStep")
                .<Person, Person>chunk(10)
                .reader(itemReader())
                .processor(itemProcessor())
                .writer(itemWriter())
                .build();
    }

    private ItemWriter<Person> itemWriter() {
        return items -> items.forEach(x -> log.info("PERSON.ID : {}", x.getId()));
    }

    private ItemProcessor<Person, Person> itemProcessor() {
        return item -> {
            if (item.getId() % 2 == 0) {
                return item;
            }

            return null;
        };
    }

    private ItemReader<Person> itemReader() {
        return new CustomItemReader<>(getItems());
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
