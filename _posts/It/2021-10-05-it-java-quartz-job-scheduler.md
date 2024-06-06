---
layout: post
title: Quartz job Scheduler 기본 사용법 정리
date: 2021-10-05
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---

> 라이브러리 다운로드
http://www.quartz-scheduler.org/downloads/


일정 시간, 주기적으로 작동되는 배치 프로그램을 만들때 사용하는 라이브러리, 회사에서 서로 다른 DB의 데이터를 마이그레이션 하거나 주기별로 DB데이터를 동기화 시키는 데몬을 만들게 되어 사용방법을 정리한다.

# 1. 구성 요소
**JobDetail** : 스케줄러에서 수행할 작업을 담을 JOB을 생성, Job을 상속하는 클래스를 JobBuilder.newJob()을 이용하여 전달 해야 한다.

**JobDataMap** : 스케줄러에서 JOB이 실행될떄 사용할 변수 값을 전달하는데 사용한다.
key-value 형식으로 값을 전달하고 JOB을 수행할떄 값을 꺼낼수 있다.

**Trigger** : 스케줄러를 어떤 방식으로, 어떤 주기로 작동할 지 결정한다.
- SimpleTrigger : start time, end time, interval time, repeat times 설정
- CronTrigger : Cron 형식으로 일정 주기를 지정

**Scheduler** : 생성된 JOB과 Trigger를 입력하여 스케줄러를 실행한다.



# 2. 기본 실행 방법

## 스케줄러 Job 클래스 생성
Job interface를 implements 하여 execute() 메소드를 만든다.
execute() 메소드는 스케줄러가 수행할 기능을 명시한다.

```
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

public class JobTest implements Job {


	@Override
	public void execute(JobExecutionContext arg0) throws JobExecutionException {
		System.out.println("## Test Job Call!!");

		String name = arg0.getJobDetail().getJobDataMap().get("jobName").toString();

		System.out.println("## Job Name : "+name);

	}
}
```

## 스케줄러 실행 코드
JobDetail에 위에서 생성한 JobTest 클래스를 이용하여 실행될 Job을 만든다.
이때 JobDataMap을 추가로 입력하여 job 수행중에 값을 불러올 수 있도록 한다.
Trigger를 이용하여 스케줄러의 주기를 정한다.

```
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

import java.util.ArrayList;
import java.util.List;

import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;

import org.quartz.Trigger;
import org.quartz.impl.StdSchedulerFactory;

public class QuartzMainTest {

	public static void main(String[] args) throws SchedulerException, InterruptedException {
		// TODO Auto-generated method stub

		//JobDataMap은 Quartz에서 실행되는 Job에 Key-value 형식으로 값을 전달할수 있다.
		JobDataMap jobDataMap = new JobDataMap();
		jobDataMap.put("jobName", "HELLO");		

		JobDetail jobDetail = newJob(JobTest.class)
				//job Data 주입
				.usingJobData(jobDataMap)
				.build();

		Trigger trigger = newTrigger().build();

        // 스케줄러 실행 및 JobDetail과 Trigger 정보로 스케줄링
        Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();
        scheduler.start();
        scheduler.scheduleJob(jobDetail, trigger);

	}
 }
```
 예제에서는 JobDetail, Trigger에 별다른 설정을 하지 않았지만 실제 사용할때는 Job에 ID, Group 등을 입력하여 구분하거나 여러 옵션을 넣을 수 있다.

예를 들어 위에서는 JobDetail, JobDataMap를 따로 선언하여 값을 넣었지만 아래 코드처럼
JobDetail 내부의 JobDataMap을 불러오는 방식으로 변수를 넣어줄 수 있고

```
JobDetail jobDetail = newJob(JobTest.class).build();

//JobDetail에 JobDataMap을 불러온다.              
JobDetail.getJobDataMap().put("jobName", "HELLO");
```

Trigger 또한 SimpleTrigger, CronTrigger로 선언 하여 여러 옵션을 줄 수 있다.

> Quartz Tutorials 참고
http://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/tutorial-lesson-05.html
http://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/tutorial-lesson-06.html


```
import static org.quartz.TriggerBuilder.*;
import static org.quartz.CronScheduleBuilder.*;
import static org.quartz.SimpleScheduleBuilder.*;
import static org.quartz.DateBuilder.*:


CronTrigger trigger = newTrigger()
    .withIdentity("ID", "group")
    .withSchedule(cronSchedule("0 0/2 8-17 * * ?"))  
    .build();

SimpleTrigger trigger1 =  (SimpleTrigger) newTrigger()
    .withIdentity("trigger1", "group1")
	.startAt(DateBuilder.dateOf(5, 5, 5))
	.build();
```
