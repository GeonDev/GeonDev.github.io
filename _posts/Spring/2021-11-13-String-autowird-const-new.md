---
title:  "스프링 빈이 아닌 new로 생성한 객체에 @Autowired 하기"
toc: true
toc_sticky: true
categories:
  - Spring
tags:  
  - Web
  - Java
  - SpringBoot  
  - Database
  - Autowired
---

> [이 링크를 참고 했다.](https://www.javaer101.com/ko/article/5021464.html)

스프링 프레임워크에서 관리하지 않는 클래스에 Service를 사용하고 싶었다. 내가 생성한 쓰레드에서 Service 클래스를 이용해서 DB에 데이터를 삽입하고 싶었다. 아무 생각없이 쓰레드에 @Autowired를 하면 당연히 nullPointException을 날린다.
그래서 스프링 프레임워크에서 생성한 Bean을 다른 클래스에 전달할수 있는 클래스가 필요하였다.


# 1. ApplicationContext 전달

```
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
public class ApplicationContextProvider implements ApplicationContextAware{
    
    private static ApplicationContext applicationContext;
    
    @Override
    public void setApplicationContext(ApplicationContext ctx) throws BeansException {
        applicationContext = ctx;
    }
    
    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }
 
}
```
**ApplicationContext**는 스프링에서 제어권을 가지고 BeanFactory를 상속받고 있는 Context라고 한다. 트랜잭션 관리, 메시지 기반의 다국어 처리, AOP 처리등등 DI(Dependency Injection) 과 Ioc(Inverse of Conversion) 외에도 많은 부분을 지원하고 있고 컨테이너가 실행될때 빈을 Pre-loading한다고 한다.

ApplicationContextProvider 클래스 IoC를 수행하는 ApplicationContext를 넘겨주는 역할을 수행한다. 


```
import org.springframework.context.ApplicationContext;

public class BeanUtils {
	public static Object getBean(String beanName) {
		ApplicationContext applicationContext = ApplicationContextProvider.getApplicationContext();
		return applicationContext.getBean(beanName);
	}
}
```
BeanUtils 클래스는 ApplicationContextProvider를 통하여 넘겨 받은 ApplicationContext를 이용하여 스프링 빈 클래스를 리턴해 준다. ApplicationContext를 사용하여 빈을 리턴하였기 때문에 스프링에서 사용하는 @Autowired와 같은 효과를 준다. 

```
public class VisionInfo extends Thread {	
	
	private KeywordService keywordService;			
	private ColorService colorService;
	

	public VisionInfo() {}	
	
	public VisionInfo() {
    
		// BeanUtils을 이용하여 Service 클래스를 주입하였다.
		keywordService = (KeywordService) BeanUtils.getBean("keywordService");
		colorService = (ColorService) BeanUtils.getBean("colorService");
		
	}
}
```

# 2. 생성자를 통하여 전달

이미 주입된 빈을 생성자를 통하여 넘겨주는 것도 한가지 방법이 될 수 있다. 
클래스를 생성하는 과정에서 Controller나 Service에서 이미지 주입이 끝난 Class를 주입해 주었다. 


```
	public VisionInfo(String imageFilePath, int imageId ,KeywordService keywordService, ColorService colorService) {
		this.imageFilePath = imageFilePath;	
		this.imageId = imageId;
		
		this.keywordService = keywordService;
		this.colorService = colorService;
		
	}
```
VisionInfo 클래스의 생성자에서 직접 서비스 클래스를 넣어주는 생성자를 오버로딩 해주었고
new VisionInfo()를 수행하면서 서비스 클래스를 넣어주었다. 

```
logger.info("Start Vision API ImagePath :  "+info.getPath());
	//Vision API에서 이미지 정보를 추출하는 쓰레드 생성
	// keywordService, colorService를 삽입
	VisionInfo vision = new VisionInfo(info.getPath(),info.getImageId(),keywordService,colorService  );
	vision.start();
```

의외로 nullPointException이 발생하지 않았다.

# 3. 그런데... 어디쓰려고...? 

원래 이런 기능을 만들면 보통을 별도 프로젝트를 새로 생성해서 작업을 한다. 그럼에도 굳이 이렇게 하나의 프로젝트에 만드는 이유는 	war를 구동시 한번에 모든 기능이 구동될수 있게 하기 위해서 이다.
나같은 경우는 외부 API에서 이미지정보를 추출한후에 데이터베이스에 넣어야 되는데 JDBC로 작업하기에는 귀찮아서 하나로 만들었다. 