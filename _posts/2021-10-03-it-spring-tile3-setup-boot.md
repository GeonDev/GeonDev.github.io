---
title:  "Spring Tiles3 + Spring boot 적용해보기"
toc: true
toc_sticky: true
categories:
  - IT
tags:  
  - Web
  - Java
  - Spring
  - Tiles3
---
![](\assets\images\it\20160524100541html5.jpg)

스프링 타일즈는 header, sidebar, footer 등 페이지에서 반복적으로 작성해야 하는 요소를 따로 관리 할수 있게 해주는 라이브러리이자 템플릿 이다.

최근에 나온 VUE나 REACT 같은 경우 자세하게는 모르지만 각 부분을 컴포넌트로 관리 할수 있는 기능이 있다고 알고 있지만 JSP에는 이런 기능이 빠져 있기 때문에 별도의 기능으로 구현 할수 있다. (반대로 말하면 프론트엔트가 따로 있는 환경에서는 굳이 사용하지 않아도 된다는 것) 

스프링에 적용하는 내용은 많이 보았지만 Springboot에 적용하는 내용은 많이 없어 정리한다.
 
#  1. 라이브러리 다운로드
```
<properties>
	<java.version>1.8</java.version>		
	<!-- tiles version -->
	<org.apache.tiles-version>3.0.5</org.apache.tiles-version>
</properties>


<!-- Spring Tiles -->
	<dependency>
            <groupId>org.apache.tiles</groupId>
            <artifactId>tiles-servlet</artifactId>
            <version>${org.apache.tiles-version}</version>
        </dependency>
         <dependency>
            <groupId>org.apache.tiles</groupId>
            <artifactId>tiles-api</artifactId>
            <version>${org.apache.tiles-version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.tiles</groupId>
            <artifactId>tiles-jsp</artifactId>
            <version>${org.apache.tiles-version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.tiles</groupId>
            <artifactId>tiles-core</artifactId>
            <version>${org.apache.tiles-version}</version>
        </dependency> 
        <dependency>
            <groupId>org.apache.tiles</groupId>
            <artifactId>tiles-template</artifactId>
            <version>${org.apache.tiles-version}</version>
        </dependency>

```
스프링 타일즈를 적용하기 위해서는 꽤 많은 라이브러리가 필요하다. 스프링 부트 용으로 따로 관리되는 라이브러리는 없는 것으로 보인다. 작성시에 버전이 변경될 수도 있어 별도의 properties를 설정하였다. (수동 으로 설정하여도 상관없다)
 
# 2. ViewResolver 설정

```
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.ViewResolver;
import org.springframework.web.servlet.view.JstlView;
import org.springframework.web.servlet.view.UrlBasedViewResolver;
import org.springframework.web.servlet.view.tiles3.TilesConfigurer;
import org.springframework.web.servlet.view.tiles3.TilesView;
import org.springframework.web.servlet.view.tiles3.TilesViewResolver;

@Configuration
public class ConfigurationForTiles {
	/**
	 * Initialise Tiles on application startup and identify the location of the
	 * tiles configuration file, tiles.xml.
	 * 
	 * @return tiles configurer
	 */
	@Bean
	public TilesConfigurer tilesConfigurer() {
		final TilesConfigurer configurer = new TilesConfigurer();
		configurer.setDefinitions(new String[] { "WEB-INF/tiles/tiles.xml" });
		configurer.setCheckRefresh(true);
		return configurer;
	}

	/**
	 * Introduce a Tiles view resolver, this is a convenience implementation that
	 * extends URLBasedViewResolver.
	 * 
	 * @return tiles view resolver
	 */
	@Bean
	public TilesViewResolver tilesViewResolver() {
		final TilesViewResolver resolver = new TilesViewResolver();
		resolver.setViewClass(TilesView.class);
		resolver.setOrder(1);
		return resolver;
	}

	@Bean
	public ViewResolver viewResolver() {
		UrlBasedViewResolver resolver = new UrlBasedViewResolver();
		resolver.setPrefix("/WEB-INF/views/");
		resolver.setSuffix(".jsp");
		resolver.setViewClass(JstlView.class);
		resolver.setOrder(2);
		return resolver;
	}
}
```
스프링 타일즈를 적용하기 위해서는 viewResolver를 변경하여야 한다. 타일즈가 동작할때 스프링 vieResolver의 기능을 가지고 와서 화면을 구성하기 때문에 타일즈가 사용하는 viewResolver를 먼저 작동시키고 이어서 스프링 기본 viewResolver를 동작하게 하여 화면을 작성한다. 스프링 부트에서는 설정을 @Configuration로 작성한다. 

## 2.1. tilesConfigurer()
스프링 타일즈의 설정, 페이지 구성등 정보를 담고 있는 tiles.xml 파일의 위치를 지정한다. 
파일 이름에는 제한이 없는 것으로 보이지만 구분을 위해서 가급적이면 타일즈 라고 작성한다. 

## 2.2. tilesViewResolver()
타일즈 설정을 불러와 화면을 구성하기 위하여 스프링 프레임워크에서 사용하는 ViewResolver
전에 호출된다. resolver.setOrder(1)을 통하여 호출 순서를 결정한다. 

## 2.3. viewResolver()
스프링 프레임 워크에서 사용하는 기본 ViewResolver이다. 앞에서 tilesViewResolver가 구성한 화면을 전달 받아 웹에 그려준다. 말 그대로 viewResolver 이기 때문에 html 위치, 어떤 확장자를 쓰는지 resolver.setSuffix(".jsp") 등을 설정한다. 


# 3. tiles.xml 살펴 보기
```
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE tiles-definitions PUBLIC
       "-//Apache Software Foundation//DTD Tiles Configuration 3.0//EN"
       "http://tiles.apache.org/dtds/tiles-config_3_0.dtd">
<tiles-definitions>
	
	<!-- 통합 메인 레이아웃 -->
	<definition name="Main" template="/WEB-INF/tiles/layout/Main.jsp">
		<put-attribute name="title" value="HNS MALL" />
		<put-attribute name="gnb" value="/WEB-INF/tiles/inc/sidemenu.jsp" />
		<put-attribute name="header" value="/WEB-INF/tiles/inc/header.jsp" />
		<put-attribute name="page-title" value="/WEB-INF/tiles/inc/title.jsp" />
		<put-attribute name="body" value="" />
		<put-attribute name="footer" value="/WEB-INF/tiles/inc/footer.jsp" />
	</definition>
	
	<!-- 통계 메인 레이아웃 -->
	<definition name="statMain" template="/WEB-INF/tiles/layout/StatMain.jsp">
		<put-attribute name="title" value="HNS MALL" />
		<put-attribute name="gnb" value="/WEB-INF/tiles/inc/sidemenu.jsp" />
		<put-attribute name="header" value="/WEB-INF/tiles/inc/header.jsp" />
		<put-attribute name="page-title" value="/WEB-INF/tiles/inc/title.jsp" />
		<put-attribute name="body" value="" />
		<put-attribute name="footer" value="/WEB-INF/tiles/inc/footer.jsp" />
	</definition>

	
	<!-- 시스템 설정 레이아웃 -->
	<definition name="predictMain" template="/WEB-INF/tiles/layout/PredictMain.jsp">
		<put-attribute name="title" value="MALL" />
		<put-attribute name="gnb" value="/WEB-INF/tiles/inc/sidemenu.jsp" />
		<put-attribute name="header" value="/WEB-INF/tiles/inc/header.jsp" />
		<put-attribute name="body" value="" />
		<put-attribute name="footer" value="/WEB-INF/tiles/inc/footer.jsp" />
	</definition>
	
	
	<!-- Main -->
	<definition name="main" extends="Main">
		<put-attribute name="body" value="/WEB-INF/views/main/main.jsp" />
		<put-attribute name="page-title" value="" />
	</definition>
	
	<!-- 통계화면 -->
	<definition name="stat/*" extends="statMain">
		<put-attribute name="body" value="/WEB-INF/views/statistics/{1}.jsp" />
	</definition>
	
	<!-- 시스템관리 화면 -->
	<definition name="setting/*" extends="Main">
		<put-attribute name="body" value="/WEB-INF/views/setting/{1}.jsp" />
	</definition>

	
	<!-- 시스템관리 화면 -->
	<definition name="predictUpload" extends="predictMain">
		<put-attribute name="body" value="/WEB-INF/views/setting/predictUpload.jsp" />
	</definition>


</tiles-definitions>
```

스프링 타일즈는 5개의 구성요소로 되어 있다. (title,gnb,header, page-title, body, footer) 각각의 구성요소는 고정으로 배치할 수도 있고 Controller를 통하여 변경하면서 사용할수도 있다. 
타일즈를 통하여 화면을 구성하게 되면 미리 정해진 레이아웃 안에 각각 요소를 추가하는 형태로 구성된다.
설정에 따라서 5개의 구성요소가 모두 없어도 상관은 없다. 필요에 따라서 5개의 구성요소를 적절하게 조합하여 작성하면 된다.

```
<definition name="Main" template="/WEB-INF/tiles/layout/Main.jsp">
<definition name="statMain" template="/WEB-INF/tiles/layout/StatMain.jsp">
<definition name="predictMain" template="/WEB-INF/tiles/layout/PredictMain.jsp">
```
## 3.1. Main.jsp(레이아웃) 구성
```
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%   
response.setHeader("Cache-Control","no-store");   
response.setHeader("Pragma","no-cache");   
response.setDateHeader("Expires",0);   

if (request.getProtocol().equals("HTTP/1.1")) 
        response.setHeader("Cache-Control", "no-cache"); 
%>
<%@ include file="/WEB-INF/tiles/taglib.jsp" %>
<!DOCTYPE HTML>
<html lang="ko">
<head>
	<meta charset="utf-8" />
	<meta http-equiv="X-UA-compatible" content="IE=Edge, chrome=1" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title><tiles:getAsString name="title" /></title>
	
	<link rel="shortcut icon" href="/img/favicon_n.ico" type="image/x-icon">
	<link rel="icon" href="/img/favicon_n.ico" type="image/x-icon">
	
	<!-- Bootstrap -->
	<link href="/css/bootstrap.min.css" rel="stylesheet">
	
	<!-- Font awesome -->
	<link href="/font-awesome/css/font-awesome.css" rel="stylesheet">
	
	<!-- Main css -->
	<link href="/css/animate.css" rel="stylesheet">
	<link href="/css/style.css" rel="stylesheet">
	<link href="/css/ui.css" rel="stylesheet">
	
	<!-- Mainly scripts -->
	<script src="/js/jquery-3.1.1.min.js"></script>
	<script src="/js/bootstrap.min.js"></script>
	<script src="/js/plugins/metisMenu/jquery.metisMenu.js"></script>
	<script src="/js/plugins/slimscroll/jquery.slimscroll.min.js"></script>
	<script src="/js/inspinia.js"></script>
	<script src="/js/plugins/pace/pace.min.js"></script>
	
	<!-- jQuery Cookie -->
	<script src="/js/jquery.cookie.js"></script>
	
	<!-- Sweet Alert -->
	<link href="/css/plugins/sweetalert/sweetalert.css" rel="stylesheet">
	<script src="/js/plugins/sweetalert/sweetalert.min.js"></script>
	
	<!-- iCheck -->
	<link href="/css/plugins/iCheck/custom.css" rel="stylesheet">
	<script src="/js/plugins/iCheck/icheck.min.js"></script>
	
	<!-- Bootstrap select -->
	<link href="/css/plugins/bootstrap-select/bootstrap-select.min.css" rel="stylesheet">
	<script src="/js/plugins/bootstrap-select/bootstrap-select.js"></script>

	<!-- validation -->
	<script src="/js/plugins/validate/jquery.validate.min.js"></script>
	
	<script src="/js/common.js"></script>
</head>


<body class="">
	<div id="wrapper">
		<!-- GNB -->
	    <tiles:insertAttribute name="gnb" />
		<!-- End of GNB -->
		
	    <div id="page-wrapper" class="gray-bg">
	    	<!-- Header -->	
		    <tiles:insertAttribute name="header" />
	        <!-- End of Header -->
	        
	        <!-- Page Title -->
	        <tiles:insertAttribute name="page-title" />
			<!-- End of Page Title -->
			
			<!-- Contents -->
			<div>
				<tiles:insertAttribute name="body" />
			</div>
	        <!-- End of Contents -->
	        
	        <!-- footer -->
	        <div>
	        	<tiles:insertAttribute name="footer" />
	        </div>
	        <!-- End of footer -->
	 	</div>
	</div>
</body>
</html>

```

레이아웃 구성 파일을 보면 head 부분은 기존의 JSP에서 보는 것과 동일하게 화면 구성에 필요한 스크립트나 설정을 불러오는 부분이다. 
주목할 것은 tiles:insertAttribute 부분인데 이 부분은 tiles.xml에서 설정한 각 요소에 실제 페이지를 불러오는 기능을 담당한다.
 이러한 구성요소를 사용하여 타일즈는 반복작업 없이 동일한 페이지에 요소를 바꾸어 가면서 화면을 구성할수 있게 된다.

# 4. Controller 호출

```
import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.ModelAndView;

import com.tis.hnsmall.domain.HisLogin;
import com.tis.hnsmall.domain.Manager;
import com.tis.hnsmall.service.ManagerService;
import com.tis.hnsmall.utill.CmmUtil;


@Controller
public class MainController {
	
	@Autowired
	private ManagerService managerService;
	
	private static final Logger logger = LoggerFactory.getLogger(MainController.class);
	
	
	@RequestMapping(value = "/main")
	public ModelAndView main(Model model, HttpSession session ){
		
		//스프링 타일즈에 설정된 main을 호출한다.
		return new ModelAndView("main");
	}
	
	@RequestMapping(value = "/login", method = RequestMethod.GET)
	public ModelAndView login(HttpSession session, HttpServletResponse response, ModelAndView mv) {
		
		if (session.getAttribute("Manager") == null) {
			mv.setViewName("login/login");
		}
		else {
			try {
				response.sendRedirect("/main");	
			}
			catch (Exception e) {
				logger.error("[ERROR] Fail to go main : ",e);
			}
		}
		
		return mv;
	}
    
    	private static final Logger logger = LoggerFactory.getLogger(StatController.class);
	
	@RequestMapping("/stat/totalCall")
	public ModelAndView totalCall(Model model ) {
		
		ModelAndView mv = new ModelAndView();
		mv.setViewName("stat/totalCall");		
		
		return mv;		
	}
 }   
```

Controller에서 화면을 호출할때 특이한 점은 view를 호출 하는 이름이 파일 이름이 아니라 tiles에서 설정한 이름이라는 것입니다. tiles.xml의 definition 부분 중 호출될 이름을 지정하는 부분이 있는데 이것을 이용하여 타일즈에서 불러올 파일을 동적으로 불러옵니다.

```
<definition name="main" extends="Main">
<definition name="stat/*" extends="statMain">
```

실제로 호출하는 부분은 하나이지만 타일즈 설정에 의해서 최대 5개 까지 구성된 파일이 출력되는 것을 알수 있습니다. 

# 5. 결론
타일즈는 include 같은 과정 없이 기존에 개발자가 손으로 만들던 기능을 대신해 주는 라이브러리 입니다. 
최신의 프론트엔드 기술을 적용한다면 필요하지 않을 수도 있지만 
저처럼 어드민용도의 페이지를 자주 만들게 되는 상황이라면 유용하게 사용할 수도 있을 것 같습니다. 