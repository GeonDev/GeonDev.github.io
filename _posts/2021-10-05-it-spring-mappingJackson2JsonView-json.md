---
title:  "MappingJackson2JsonView를 이용하여 JSON 파싱(jsonView)"
toc: true
toc_sticky: true
categories:
  - IT
tags:  
  - Web
  - Java
  - SpringBoot
  - MappingJackson2JsonView
  - JsonView
---

ajax를 사용하면서 가장 불편하다고 생각했던 것이 json으로 파싱을 하는 과정이였다. 
프론트엔드에 대한 지식이 부족하다보니 생으로 만드는 부분도 있겠지만 기본적으로 ajax호출 과정이 길다고 생각했다. 기존에 작성했던 코드를 보면 데이터를 전달하는 과정도 받아오는 과정도 다소 귀찮았다고 생각한다. (나중에는 아예 백엔드에서 뷰 자체를 던지기도 하더라...)

```
$.ajax( 
		{
			url : "/search/json/getSearchResultList",
			method : "POST",
			dataType : "Json",					
			headers : {
				"Accept" : "application/json",
				"Content-Type" : "application/json"
			},
			data :  JSON.stringify({keyword : $("#Keyword").val(), mode : Mode, currentPage : page, category: $("#categorySelecter").val()}),
			success : function(JSONData , status) {
				
				//검색 결과가 있는지 체크
				if (JSONData.list.length != 0){					
				
					//불러와야 되는 페이지보다 개수가 적은 경우 페이지가 끝났다
					if (JSONData.list.length < pageSize){
						isPageEnd = true;
					}
					
					//유저를 불러올 경우 유저리스트를 생성한 후 피드를 삽입한다 
					if(Mode == 'Writer'){							
						
						$.each(JSONData.list, function(index, item) { 						
							getUserlistFromAjax(item); 									
												
						});	
						
						$.each(JSONData.feeds, function(index, item) { 						
							getUserFeedlistFromAjax(item);	 							
												
						});	 							
						
					}else{
						$.each(JSONData.list, function(index, item) {						
							
							if(Mode == 'Feed'){						 								
								getfeedlistFromAjax(item, '${user}');
									
							}else if(Mode == 'Image'){			
								getImagelistFromAjax(item); 									
							}					
						});	 							
					}	 						
					//로드가 완료되면 로딩이 되었다고 체크
					isLoadPage = false;
				
				//검색결과가 없는 경우	
				}else{
					
					//첫번째 페이지를 로드 했을 경우에만 발생
					if(page == 1){
						isPageEnd = true;
						getNoSearchResult();
					}
				}
			}
	});
```

나만 모르고 있었던것 같지만.......이러한 과정을 조금이나마 쉽게 해주는(?) JsonView 라이브러리를 회사에서 사용해서 사용법을 정리해보려고 한다.

# 1. 의존성 주입
```
<dependency>
	<groupId>com.fasterxml.jackson.core</groupId>
	<artifactId>jackson-core</artifactId>
	<version>2.4.3</version>
</dependency>

<dependency>
	<groupId>com.fasterxml.jackson.core</groupId>
	<artifactId>jackson-databind</artifactId>
	<version>2.4.3</version>
</dependency>
```

보통 인터넷을 검색하면 위에 두개의 라이브러리를 추가하라고 한다. 
물론 두개를 추가해도 작동이 되지만 스프링부트를 사용하면 조금 더 간단(?)한 방법으로 추가할 수도 있다.
```
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
```
starter-web을 추가하게되면 위에 필요한 모든 라이브러리를 포함하게 된다.

# 2. Config 설정

```
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.web.servlet.view.json.MappingJackson2JsonView;

@Configuration
public class WebConfig {

    @Bean
    MappingJackson2JsonView jsonView(){
        return new MappingJackson2JsonView();
    }
}
```

정말 간단하게 Bean만 추가하면 된다. Bean에 이름을 jsonView로 하는 경우도 있는데 반드시 설정해야 하는 것은 아니기 때문에 그냥 넘어가도 된다.

# 3. 컨트롤러 작성

일반적인 컨트롤러(?)와 동일하게 작성하면 된다. 기존에는 Map이나 List를 새로 만들어서 데이터를 전달했는데 이러한 작업 필요 없이 ModelAndView나 String을 사용하여 viewresolver를 사용하는 것 처럼 전달하면 파싱된 데이터가 전달된다. 

아래 예시는 ModelAndView를 반환하거나 String을 반환하는 경우로 작성하였다. 

```
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

@RestController
public class TestController {

    @RequestMapping("/testmv")
    public ModelAndView testMv(Model model){

        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("name","Son");
        return mv;
    }


    @RequestMapping("/testStr")
    public String testStr(Model model){

        model.addAttribute("name", "Son");
        return "jsonView";
    }
}
```