---
title:  "이미지 검색프로젝트(VIG) Migration/Refactoring -3"
toc: true
toc_sticky: true
categories:
  - IT
tags:   
  - Spring
  - Springboot
  - Vision
  - Migration
  - Refactoring  
---

>[소스 코드](https://github.com/GeonDev/VIG)


지난번에 Websocket을 이용하여 실시간 알람을 구현(?)한 것에 이어서 이번 Migration/Refactoring에서 가장 중요하게 생각하였던 google Vision API 실행 속도 개선을 위한 작업을 진행하려고 합니다. 

# Vision API 작동 로직
 
 
 ## 기존 Vision 로직
![](/assets/images/project/74d8c2a44d6ef1.png)
 사실 이전에도 Vision API에서 추출되는 속도를 개선하기 위한 작업은 진행한 상태 입니다.
이전에 조금이나마 이미지 업로드 후에 Vision API 키워드 추출 속도를 올리기 위해서 구현 했던 방식은 Vision API 로직을 쓰레드로 만들어서 이미지를 1개 씩 추출하는 것이 아니라 한번에 여러개의 이미지를 동시에 추출하는 것이였습니다. 이렇게 작업을 한 결과 10 개의 이미지를 올리는데 대략 10~13초 정도의 시간이 지나면 이미지 업로드가 완료 되었습니다.

기존에 이미지당 2~3초 걸리던 (총 20초 이상) 걸리던 것보다는 개선된 것이였지만 아직도 속도가 느리고 무엇 보다 이미지를 업로드 하는 과정 중에는 다른 작업을 할수 없다는 것이 상당히 답답하게 느껴진다는 의견이 있었습니다. 

기존 구조는 대략적으로 이런 형태인데 먼저 이미지 파일은 프로젝트에 업로드 한 후에 개별 비전 스레드를 생성하면서 이미지를 1개씩 꺼내서 키워드와 색상을 추출하고 다시 DB에 순서데로 저장하는 방식이였습니다. 

이렇게 작업을 했던 이유는 쓰레드에서 직접적으로 DB에 접근하게 만들면 DB Connection에 문제가 생길것 같다는 점, 가급적이면 들어오는 이미지 키워드의 순서를 유지하고 싶었다는 것 때문이였습니다.

## 개선한 Vision 로직

![](/assets/images/project/74d8c2a44d6ef2.png)
사실 Vision API 로직이 추출되는 속도를 자체를 개선하는 것은 불가능 합니다. Vision로직을 스스로 구현하지 않는 한 관련 로직에 어떠한 조작을 할수는 없기 때문입니다. 따라서 이번 수정작업에서는 FeedController에서 한번에 이루어지던 작업을 두 단계로 나누어서 업로드한 이미지의 ID를 넣어두는 별도 리스트를 만들고 일정 시간 마다 리스트를 체크 하여 비전을 돌리는 방식으로 개선 작업를 수행하려고 합니다.

이렇게 로직을 변경하게 되면 오래 걸리는 Vision 추출 기능이 나중에 수행되기 때문에
피드를 올릴떄 처음 완벽한 상태(이미지에 모든 키워드가 추출된 상태)로 올라가지는 않더라도 유저가 기다리는 시간은 줄어 들게(사실상 기다리는 시간이 없어지는 것과 동일) 되고 대기 리스트를 이용하여 현재 추출해야 하는 이미지의 개수를 조절할 수 있기 때문에 분당 1800개 제한 이라는 Vision의 규칙을 위반하지 않고 작업할 수 있게 됩니다.

추가적으로 기존에 추출하던 키워드 타입을 5개에서 4개로 변경하여 처리 단계를 조금 줄였습니다


# Scheduler 로직 구성

먼저 스케줄러를 동작시키기 위해 Application 클래스에 @EnableScheduling를 입력하여 스케줄러를 사용한다고 명시합니다. 

```
@EnableScheduling
@MapperScan(basePackageClasses = VigApplication.class)
@SpringBootApplication
@PropertySource("classpath:common.properties")
public class VigApplication {
	
	
	public static void main(String[] args) {
		SpringApplication.run(VigApplication.class, args);
	}

}
```

## FeedController 수정

기존 FeedController - addFeed()메소드 하단에 있던 Vision API 관련 부분을 제거 합니다.
기존에는 Vision API를 통하여 키워드를 추출한 후 쓰레드가 키워드를 반환하면 컨트롤러에서 다시 DB로 입력하는 과정을 거쳐 피드 업로드를 완료 하였습니다.

```
@RequestMapping(value = "addFeed", method = RequestMethod.POST)
public ModelAndView addFeed(@RequestParam("keyword") String keyword ...) throws Exception {
		
	//이미지 업로드 관련 코드는 생략....
   							
	VisionInfo vision = new VisionInfo(path+imageFile, imageServices.getLastImageId());
				vision.start();			
				visions.add(vision); 
					
   				}
				for (VisionInfo vision : visions) {			
					vision.join();
				}
				
				for (VisionInfo vision : visions) {			
					for(ImageKeyword vkeyword : vision.getKeywords()) {
						keywordServices.addKeyword(vkeyword);
					}
					
					for(ImageColor color : vision.getColors()) {
						colorServices.addColor(color);
					}			
				}  	
			}
	
		return new ModelAndView("myfeedView/getMyFeedList");
	}
```
 
이제는 추출된 비전 정보를 모아서 한번에 처리하는 것 아닌 Vision API에서 처리가 필요한 이미지 리스트를 모아 두었다가 시간이 되었을때 개별 VisionInfo 클래스에서 Vision API를 이용하여 키워드를 추출하고 DB에 Insert하는 과정 까지 수행하게 변경하겠습니다.


우선 업로드한 이미지에 대한 정보를 저장하는 Domain을 생성하고 업로드는 되었지만 아직 이미지 키워드를 추출하지 않은 데이터를 저장할 큐를 만들었습니다.

```
package com.vig.domain;

import lombok.Data;

@Data
public class ImageInfo {
	
	private int imageId;
	private String path;
	
}
```
이미지 정보를 저장 할 ImageInfo 클래스는 다른 Domain과 큰 차이가 없습니다.


```
package com.vig.scheduler;

import java.util.LinkedList;
import java.util.Queue;

import org.springframework.stereotype.Component;

import com.vig.domain.ImageInfo;

@Component
public class WaitingList {

	//추출 대기중인 이미지 큐
	public static Queue<ImageInfo> images = new LinkedList<ImageInfo>();
	
}
```
새로 생성한 WaitingList 클래스에 @Component를 이용하여 스프링에서 해당 클래스를 생성하고 관리하도록 합니다. 스프링에서 생성하는 객체는 기본적으로 싱글톤이기 때문에 여러 사용자가 호출하더라도 같은 클래스에 저장됩니다. 따라서 별도의 추가 코드 없이 사용이 가능하고 스프링을 실행시키면 자동으로 생성 되기 때문에 필요한 곳에서 바로 호출하면됩니다.
(여기에는 Radis 같은 인메모리 DB를 사용할 수도 있을것 같은데 AWS에 프리티어를 넘기고 싶지는 않아서 일단 Component로 사용하였습니다.)

위에서 작성한 addFeed() 메소드에서 Vision API를 호출하여 쓰레드를 생성하는 부분을 지우고
WaitingList에 이미지 정보를 넣는 것으로 변경하는 것으로 스케줄러를 작동시킬 준비가 끝났습니다.

```
@RequestMapping(value = "addFeed", method = RequestMethod.POST)
public ModelAndView addFeed(@RequestParam("keyword") String keyword ...) throws Exception {
		
	//이미지 업로드 관련 코드는 생략....
   							
				ImageInfo info = new ImageInfo();
				info.setImageId(imageServices.getLastImageId());
				info.setPath(path+imageFile);
				
				//대기 리스트에 이미지 추가
				WaitingList.images.offer(info);
				}  	
			}

		return new ModelAndView("myfeedView/getMyFeedList");
	}
```
## Scheduler 생성

스케줄러를 만들때 인터넷이나 다른 코드를 보면 별도의 Schedule 클래스를 만들고 @Component를 이용하여 스프링에서 생성하는 방식으로 구현하는 것을 많이 보았는데 제가 적용하려고 했을때는 스케줄러를 생성하지 않아서 Controller에 작성하였습니다. 

(서버가 시작할때 ServletContextListener를 이용하여 직접 스케줄러를 등록 할수도 있지만 더 간단한 방법으로 제작하였습니다.)

 
개선된 버전에서는 최초 진입점 역할을 수행하는 mainController 클래스에 scheduleFixedRateTask() 메소드를 추가 하였습니다. @Scheduled를 사용하기 때문에 별다른 설정 없이 스케줄러를 작동 시킬수 있었습니다.

앞서 설명했던것 처럼 Google Vision API에는 분당 최대 사용량의 제한이 있습니다.
혹시 스케줄러 호출이 겹치게 된다면 분당 최대 사용량의 제한을 넘을수 있기 때문에 @Scheduled 옵션을 고정된 시간으로 작동하는 fixedRate가 아닌 해당 스케줄러가 끝나는 것을 기준으로 하는 **fixedDelay** 로 설정하였습니다.

```
@Scheduled(fixedDelay = 60000)
public void scheduleFixedRateTask() {
		List<ImageInfo> imagelist = new ArrayList<ImageInfo>();
		int currentSize = WaitingList.images.size();
		
		
		if(currentSize > 0) {
			if(currentSize > limitCount ) {
				for(int i =0; i< limitCount; i++) {
					imagelist.add(WaitingList.images.poll());
				}
				
			}else {
				for(int i=0; i< currentSize; i++) {
					imagelist.add(WaitingList.images.poll());
				}
			}			
			
			for(ImageInfo info: imagelist) {
				
				VisionInfo vision = new VisionInfo(info.getPath(), info.getImageId());
				vision.start();			
			}
		}else {
			logger.info("no remain waiting image ");
		} 
	}
```

## VisionInfo Class 수정
기존 Vision 쓰레드에서는 작업이 완료 되면 컨트롤러로 추출된 키워드를 빼서 DB에 작성하는 과정을 겪었는데 이제는 쓰레드 내부에서 Service 클래스를 불러와서 작성하는 방향으로 코드를 변경하여 조금 더 깔끔한 코드로 작성하였습니다.


```
//com.vig.util 패키지 VisionInfo 클래스
//Vision API를 이용하여 추출 한 데이터를 DB에 저장 한다.
public void setVisionInfo() throws Exception {
		
		for(ImageKeyword keyword : keywords ) {
			keywordService.addKeyword(keyword);
		}
		
		for(ImageColor color : colors ) {
			colorService.addColor(color);
		}		
}


//쓰래드 실행시 Insert 직접 수행
@Override
public void run() {		
	getKeywordForVision();
	getColorForVision();	
		
		try {
			setVisionInfo();
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
```

이제 scheduleFixedRateTask()가 60초에 한번씩 WaitingList에 저장된 이미지 정보를 확인하고 Vision API를 이용하여 이미지 키워드를 추출하는 기능이 완성되었습니다. 


# Migration/Refactoring 후기
생각보다 오랜 시간이 걸려서 기존 프로젝트를 수정하였습니다. 덕분에 스프링부트를 공부해 볼 수 있었고 개발했던 내용을 정리해서 후기를 작성하는 것 또한 생각보다 쉽지는 않은 걸 알게 되었습니다. 개발한건 많다고 생각했는데 어느 부분을 어떻게 적어서 전달해야 할지는 고민이 많았습니다.

지금도 조금씩 기능을 테스트 하거나 개선하고 있지만 차후에 JPA나 Security를 적용할지 아니면 다른 토이 프로젝트를 작성할지는 모르겠습니다. (지금은 새로운 언어를 적용해보는 것과 하둡같은 데이터 관련 프로젝트를 해보고 싶다고 생각만 하고 있습니다....)
후기는 여기 까지만 작성하지만 추가로 변경될 내용이 있다면 계속 수정하려고 합니다. 

