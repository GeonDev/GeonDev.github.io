---
layout: post
title: 이미지 검색프로젝트(VIG) Migration/Refactoring -2
date: 2021-10-10
Author: Geon Son
categories: Project
tags: [Springboot, Vision, Migration]
comments: true
toc: true
---

>[소스 코드](https://github.com/GeonDev/VIG)

프로젝트를 진행하면서 지금 구현하는 것에만 신경을 쓰다보니 간단한 설정으로 해결할 수 있는 문제를 수많은 중복된 코드로 해결하거나 나중에 해결하자면서 넘긴 문제가 많습니다. 핑계이긴 하지만 4명이 작업하는 코드를 모두 확인하고 패치하기에는 실력도 부족했고 시간도 부족했습니다.

일단 첫번째 수정사항으로 interrupt를 설정하여 불필요한 로그인 체크를 줄일려고 합니다.

# HandlerInterceptor 설정

로그인 하지 않은 유저가 특정 URL접근하는 것을 차단하고 URL로 잘못된 접근을 하는 것을 막아줍니다. 사실 간단하게 구성할 수 있는 부분이였지만 어떤 URL Path를 사용할지 완벽하게 정하지 않았다는 점과 테스트 하기 귀찮다는 이유로 설정하지 않았고 덕분에 Controller에서 workflow를 통제하는 결과가 생겼습니다.

![](/assets/images/project/291b9101698bd1.jpg)

이런 불필요한 if문을 제거하기 위해서 인터럽트를 설정하였습니다.

```
@Component
public class CertificationInterceptor implements HandlerInterceptor{

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        HttpSession session = request.getSession();
        User loginVO = (User) session.getAttribute("user");

        if(ObjectUtils.isEmpty(loginVO)){
            response.sendRedirect("/checkLogin");

            return false;
        }else{
            session.setMaxInactiveInterval(30*60);
            return true;
        }

    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
            ModelAndView modelAndView) throws Exception {
        // TODO Auto-generated method stub

    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex)
            throws Exception {
        // TODO Auto-generated method stub

    }

}
```

인터럽트에서 작동할 기능을 정하는 클래스를 만들었습니다. 차후에 발전할수도 있겠지만 지금은 특정 URL에 입장하기 전에 로그인을 했는지 확인하는 간단한 코드로 만들었습니다. 이 클래스를 WebCinfig 클래스를 만들어서 적용하기만 하면 인터럽트 작업은 끝나게 됩니다.

```
@Configuration
public class WebCinfig implements WebMvcConfigurer {

	/* 로그인 인증 Interceptor 설정 */   
	@Autowired   
	private CertificationInterceptor certificationInterceptor;   

	@Value("${checkUrlList}")
	String checkUrls;

	@Value("${enableUrlList}")
	String enableUrls;


	@Override   
	public void addInterceptors(InterceptorRegistry registry) {

		//addPathPatterns 해당 패턴에 해당하는 URL을 인터럽트한다.
		//excludePathPatterns 해당 패턴에 해당하는 URL은 인터럽트하지 않는다.
		List<String> addUrlList = new ArrayList<>(Arrays.asList(checkUrls.split(",")));

		List<String> excludeUrlList = new ArrayList<>(Arrays.asList(enableUrls.split(",")));

		registry.addInterceptor(certificationInterceptor).addPathPatterns(addUrlList).excludePathPatterns(excludeUrlList);


	}  

}
```
회사에서 봤던 일부 프로젝트는 인터럽트를 할 URL과 무시할 URL이 하드코딩 되어 있었습니다.
인터럽트 이후에 여러 분기가 있어서, URL을 직접 비교 해서 하드코딩을 한 것 같은데 좋은 방법이라고 생각되지는 않아 common.properties라는 별도의 파일에서 값을 불러오는 방식으로 적용했습니다.


# AOP 적용
개념적으로 AOP는 공통적으로 수행하는 로직을 분리하여 비즈니스 로직에 집중하게 해준다고 알고 있습니다만 어떻게 활용해야 할지에 대해서는 잘 몰랐고 스프링에서 세팅을 하려면 다소 복잡하다고 생각하여 적용하지 않았습니다. 스프링 부트에서는 비교적 간단하게 구현할수 있기 때문에 AOP를 적용해 보았습니다.


우선 pom.xml에 aop Dependency를 추가합니다.
```
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-aop</artifactId>		  
</dependency>
```

상위 클래스인 Application Class에 @EnableAspectJAutoProxy를 작성하여 AOP를 사용한다는 것을 스프링부트에게 알려줍니다.

```
package com.vig;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAspectJAutoProxy
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

본격적으로 AOP에서 수행할 기능을 정의 할 메소드를 만듭니다. aop 라는 패키지를 추가하고 LoggerAspect라는 클래스를 만들었습니다.
기본 코드에 컨트롤러의 메소드의 수행시간을 알기 위한 기능이 있었습니다.
이 기능을  AOP로 옮겨서 불필요한 코드를 줄이려고 합니다.

@Around, @before, @after 등 여러 기능을 제공하고 있지만 개인적으로 가장 활용성이 좋다고 생각하는 @Around로 공통 적용할 소스를 작성하였습니다.   

```
package com.vig.aop;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Component
@Aspect
public class LoggerAspect {

	public static final Logger logger = LogManager.getLogger(LoggerAspect.class);


	@Around("execution(* com.vig.controller.*Controller.get*(..))")
	public Object printLog(ProceedingJoinPoint joinPoint) throws Throwable {


		//가지고온 joinPoint의 타입이름을 갖고온다 -> 여기서는 컨트롤러 이름
		String name = joinPoint.getSignature().getDeclaringTypeName();

		//전달되는 메소드의 파라미터를 담는다.
		Object[] parms = joinPoint.getArgs();		

		long startTime = System.currentTimeMillis();

		//Around로 가져온 프로세스가 실행된다.
		Object ret = joinPoint.proceed();

		// 메소드가 실행될때 까지 걸리는 실행시간 측정
		long time = System.currentTimeMillis() - startTime;


		logger.info(name + "." + joinPoint.getSignature().getName() + "() " + "WorkTime : "+ (time/1000.0f));

		if(parms != null ) {
			for(Object t : parms) {
				logger.info("ParameterType :" + t.getClass().getName());
			}
		}


		return ret;
	}
}

```

스프링에 비하여 간단하게 AOP 기능이 완성되었습니다. AOP를 활용하면 더 많은 기능을 구현 할수 있을것 같은데 공통로직에 사용한다는 것 때문에 특정 유저의 방문 히스토리를 저장한다 같은 기능에는 사용하는데는 맞지 않다는 생각이 들었습니다.

원래 AOP를 적용하려던 목적은 피드를 열람할때 History를 저장하는 기능을 넘기고 싶었습니다. joinPoint에서 값을 가져와서 기존에 FeedController에서 처리하던 히스토리를 저장하도록 처리하였습니다. History 저장기능은 @Before로 처리하였습니다.

```
	@Before("execution(* com.vig.controller.FeedController.getFeed(..))")
	public void  addHistory(JoinPoint joinPoint) throws Exception  {

		int feedId = (int)joinPoint.getArgs()[0];
		HttpSession session = (HttpSession)joinPoint.getArgs()[1];
		HttpServletRequest request = (HttpServletRequest)joinPoint.getArgs()[2];

		//ip로 조회수 counting 하는 부분
		String ipAddress = CommonUtil.getUserIp(request);

		Feed feed = feedService.getFeed(feedId);
		User user = (User)session.getAttribute("user");


		// 로그인한 유저정보가 있는지 체크 - 히스토리를 남기는 부분입니다.
		History history = new History();		
		history.setWatchUser(user);
		history.setHistoryType(0);
		history.setShowFeed(feed);
		history.setIpAddress(ipAddress);


			//같은 기록의 히스토리가 있는지 체크
			if(historyService.getViewHistory(history) == 0 ) {				

				historyService.addHistory(history);
				feedService.updateViewCount(feedId);

				logger.info("FeedId : "+ feedId+" FeedViewCount History update" );
				logger.info("UserCode : "+ user.getUserCode()+" FeedView History update" );
			}

			//유저가 로그인한 경우
			if(user != null) {
				//히스토리 기록에 열람기록은 추가
				historyService.addHistory(history);
			}			
		}
```

이렇게 AOP를 적용하게 되면 파라미터값과 순서가 변경되면 AOP 코드도 변경해야 되기 때문에 아주 완벽한 해답은 아니라고 생각합니다.
AOP를 활용하는 것에 대해서는 조금 더 생각해 봐야 할것 같습니다.


# Controller 비즈니스 로직 분리

MVC 패턴을 배우면서 business layer와  presentation layer를 나누어서 구현하라고 배웠고 적어도 view 파일이나 DAO는 원칙을 지켜 분리를 했다고 생각합니다. 개인적으로 로직을 분리할때 고민이 되던 부분은 service와 controller를 어떻게 나누는지에 대한 것이였습니다.

기존 구현 방식은 service는 단순히 DAO를 연결하는 수단으로 제작되어 DAO 메소드에 Service매소드가 1:1로 매칭되어 있는 형태 였습니다. 로직이 아주 복잡한 것도 아니고 Service를 여러명이 다른 파트에서 사용할수 있다고 생각하여 추가적인 연산이 필요한 경우 Controller에서 연산을 하는 방식으로 제작되었습니다.

```
@Service
public class FeedService {

	@Autowired	  
	private FeedMapper feedMapper;

	public FeedService() {	}


	public void addFeed(Feed feed) throws Exception {		
		feedMapper.addFeed(feed);
	}
}
```
FeedService에서 addFeed를 하기 위해서는 간단히 feedMapper.addFeed()을 호출하는 것으로 끝나지만


```
@RequestMapping(value = "addFeed", method = RequestMethod.POST)
public ModelAndView addFeed(@RequestParam("keyword") String keyword, @ModelAttribute("feed") Feed feed,
                                   @ModelAttribute("category") Category category,@RequestParam("uploadFile") List<MultipartFile> files,
                                   @SessionAttribute("user") User user,@ModelAttribute("joinUser") JoinUser joinUser) throws Exception {

	feed.setWriter(user);									
	feed.setFeedCategory(category);        
	feedServices.addFeed(feed);


        String path = context.getRealPath("/");              
        if(OS.contains("win")) {
        	//워크스페이스 경로를 받아온다.
            path = path.substring(0,path.indexOf("\\.metadata"));         
            path +=  uploadPath;           
        }else {
        	//실제 톰켓 데이터가 저장되는 경로를 가리킨다.
        	path =  realPath;
        }

        // 이후에 VISION API을 이용하여 이미지에서 키워드를 추출)중략.......


	}
```
FeedController에서 addFeed()를 수행할 때는  FeedService.addFeed()를 호출하는 것과 이미지를 저장할 위치를 확인하고 VISION API에서 이미지를 추출하는 기능 등 여러 가지 기능을 같이 수행하고 있습니다.

이렇게 Controller에서 연산을 해도 작동에는 문제가 없지만 가독성이 떨어지고 business logic을 presentation layer에서 수행한다는 것이 좋다고 생각했지만 막상 작업을 하려고 코드를 보니 어떤 로직까지 허용해야 하는지 고민이 생겼습니다.

그래서 이번 리펙토링에서 **데이터의 생성 또는 세팅을 위한 작업은 Service로 이동 시킨다**는 전제로 일부 로직을 Service로 이동 시켰습니다.

## RestSearchController 수정

기존 RestSearchController에서 카테고리별, 또는 개인별 추천이미지를 출력하기 위해서는
아래와 같이 Controller에서 많은 연산을 요구하였기 때문에 가독성이 많이 떨어지는 코드가 될수 밖에 없었습니다.

아주 큰 변화는 없지만 일부 중복된 기능을 별도 메소드로 묶고 숨김 처리한 피드 리스트를 불러오지 않는 기능을 FeedService에서 바로 처리하도록 하여 코드를 정리했습니다.

```
//선택된 카테고리에 해당하는 피드를 리턴한다.
@RequestMapping(value = "json/getSearchCategoryResult")
public Map<String, Object> getSearchCategoryResult(@RequestBody Map<String, String> jsonData, HttpSession session, @CookieValue(value = "searchKeys", defaultValue = "", required = false) String searchKeys) throws Exception {

		Map<String, Object> map = new HashMap<String, Object>();

		Search search = new Search();		

		search.setCurrentPage(Integer.valueOf(jsonData.get("currentPage")));
		search.setPageSize(pageSize);

		//카테고리 ID 세팅
		search.setSearchType(Integer.parseInt(jsonData.get("category")));

		//로그인한 유저 정보를 받아옴
		User user = (User)session.getAttribute("user");

		List<Feed> feedlist = new ArrayList<Feed>();


		//선택된 카테고리가 사용자 추천인지 체크
		if(search.getSearchType() ==  10012) {

			//로그인 하지 않았다면 조회수가 가장 많은 피드를 추천
			if(user == null) {
				feedlist = feedServices.getHightViewFeedList(search);

			}else {
			// 로그인 한 유저에게 피드를 추천한다.------------------------------------------------------//					

				Search tempSearch = new Search();
				tempSearch.setKeyword(user.getUserCode());
				tempSearch.setPageSize(20);

				//일반 피드를 본 기록을 가지고 온다.
				tempSearch.setSearchType(0);
				//첫페이지 양만 가지고 옴
				tempSearch.setCurrentPage(1);				

				//최근 본 피드정보 20개를 가지고 온다.
				List<History> historyList =	historyServices.getHistoryList(tempSearch);					

				if(historyList.size() > 0) {					
					List<ImageKeyword> keywordList = new ArrayList<ImageKeyword>();

					//최근 본 피드의 썸네일 키워드 리스트를 가지고 온다.
					for(History history : historyList) {						
						keywordList.addAll(history.getShowFeed().getKeywords());
					}

					keywordList = addkeywordListFromCookis(keywordList,searchKeys);					

					tempSearch.setKeywords(CommonUtil.checkEqualKeyword(keywordList));
					tempSearch.setPageSize(pageSize);
					tempSearch.setCurrentPage(Integer.valueOf(jsonData.get("currentPage")));

					feedlist = CommonUtil.checkEqualFeed(feedServices.getRecommendFeedList(tempSearch));									


				// 다른 피드를 본 기록이 없는 유저
				}else {
					// 조회수가 가장 많은 피드를 추천
					feedlist = feedServices.getHightViewFeedList(search);
				}					
			}


		//추천 카테고리를 선택하지 않은 경우 - 카테고리에 해당하는 이미지를 출력
		}else {
			feedlist = feedServices.getFeedListFromCategory(search, user);
		}		

		map.put("list",feedlist);		
		return map;		
	}
```

솔직하게 컨트롤러 정리는 아직도 어떤 것이 정답인지 애매하다고 느꼈습니다.
회사에서 보게된 대부분의 코드 또한 Service 보다는 Controller에서 많은 연산을 수행하고 있고 뷰에서 JAVA코드를 제거하는 것과는 다르게 Service와 Controller를 어떤 기준으로 나누어야 할지 모호한 경우가 많았습니다.

재 사용성을 높이고 비즈니스 로직과 View를 분리하는 설계는 조금 더 고민해봐야 좋은 정답이 무엇인지 알수 있을 것 같습니다.

# WebSocket을 이용한 실시간 알람
인스타그램을 보면 좋아요, 댓글, 팔로우를 했을때 상대에게 알람이 전송되는 기능이 있습니다. 개인적으로 알람 보는 맛(?)에 인스타그램을 자주 들어가는 편이여서 웹 프로젝트에서도 비슷한 기능을 구현하고 싶어 찾아 보다 webSocket을 알게 되었습니다.
(일정 주기마다 DB에 접속해서 값을 받아오는 풀링은 하기 싫었습니다.)

스프링부트로 변경한다고 해서 모든 로직을 변경할 필요는 없지만 config 하는 방법을 찾는데 조금 시간이 결렸습니다.

```
    <!-- Websocket -->
    <websocket:handlers>
    	<websocket:mapping handler="echoHandler" path="/echo"/>

    	<!-- Httpsession 의 값을 websession에 넣어준다.  -->
    	<websocket:handshake-interceptors>
 	         <bean class="org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor"/>
 	    </websocket:handshake-interceptors>     	

    	<websocket:sockjs/>
	</websocket:handlers>

	<!-- 핸들러 관리 -->
	<bean id="echoHandler" class="com.VIG.mvc.util.EchoHandler"/>
```

기존 Spring에서는 dispatcher-servlet.xml에서 핸들러와 Handshake(세션정보를 공유하기 위해서)를 적용하였는데 스프링부트로 변경되면서 별도의 클래스를 만들어 config를 정의했습니다.

```
package com.vig.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

import com.vig.handler.WebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

	@Autowired
	WebSocketHandler socketHandler;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(socketHandler, "/rt")
				.addInterceptors(new HttpSessionHandshakeInterceptor());
	}
}
```

기존 프로젝트에서는 SessionHandshake 통하여 HttpSession의 정보를 WebsocketSession에 가지고와서 유저를 구분하는 용도로 사용하였습니다.

처음에 SessionHandshake를 어떻게 해야 하는지 몰랐는데 나중에 알고 보니 **registry.addHandler(socketHandler, "/rt")
				.addInterceptors(new HttpSessionHandshakeInterceptor());** 라고 한줄만 적어주면 디폴트로 HttpSession의 정보를 WebsocketSession에 넣어준다는 것을 알게 되었습니다.

기존의 로직에서 Ajax를 이용하여 웹 페이지 갱신없이 알람을 전송하고 있었기 때문에 알람 표시관련 로직은 큰 변경점 없이 기존의 Handler를 사용하여 웹소켓을 적용시켰습니다.

![](/assets/images/project/291b9101698bd2.png)


웹소켓을 연결하고 메세지를 전송하는 부분은 모두 툴바에 구현되어 있습니다. 툴바는 어느 페이지에서나 노출되기 때문인데 이렇게 설정을 하다보니 화면을 이동할때 마다 웹소켓을 다시 연결해 주어야 하는 문제가 있습니다.

이 문제를 해결하기 위해서 싱글 페이지 애플리케이션(SPA)로 뷰를 수정하면 개선할 수 있을것 같지만 이번 목표는 뷰를 수정하는 것이 아니기 때문에 여기서 리펙토링은 종료 하였습니다.

다음은 이번 리펙토링의 가장 큰 목표인 Vision API 추출 속도 개선을 수정하도록 하겠습니다.
