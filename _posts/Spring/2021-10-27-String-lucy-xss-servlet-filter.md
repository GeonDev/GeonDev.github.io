---
layout: post
title: 스프링부트에 lucy-xss-servlet-filter 적용하기
date: 2021-10-27
Author: Geon Son
categories: Spring
tags: [Springboot, Lucy, Xss]
comments: true
toc: true
---

>라이브러리 링크
>https://github.com/naver/lucy-xss-servlet-filter

회사 프로젝트 gradle에서 처음보는 라이브러리를 보게 되어서 무엇인지 검색하다가 xss를 막기 위한 라이브러리 라는 것을 알게 되었습니다. 정작 프로젝트에는 적용되어 있지는 않았지만 (아마 내부에서만 사용하는 웹프로젝트라 그런듯 합니다.) 처음으로 보안을 조금 신경쓴 프로젝트를 만들어보고 싶어 사용법을 간단하게 따라해 보고 이런 작업은 잘 까먹는 편이여서 기록으로 남깁니다.

# 1. 개요

 ![](/images/spring/lifecycle_dfegj4_1.jpg){: .align-center}

> https://justforchangesake.wordpress.com/2014/05/07/spring-mvc-request-life-cycle/

위 이미지에서 보면 스프링 필터는 스프링 내부에서 적용되는 것이 아니라 servelt request를 전달하려는 시점에서 적용되는 것을 알수 있습니다. xss를 방지하기 위해서 스프링 내부에 스크립트가 들어오기 전에 미리 위험소지가 있는 문장이나 단어를 변경하는 기능을 합니다. (아마 내부에서는  “<”와 같은 문자를 동일한 의미의 "&lt" 로 변경하는 작업을 수행할 것이라고 생각합니다.)

# 2. Springboot 적용

## 의존성 주입
먼저 lucy-xss-servlet-filter를 사용할수 있도록 의존성을 주입합니다. 인터넷 예제나 제가 봤던 프로젝트 에서는 lucy-xss와 lucy-xss-servlet-filter가 모두 dependency로 사용되는 것을 보았습니다. 하지만 네이버 깃허브에 Q&A에서는 동시에 사용할 필요가 없다고 되어 있기 때문에 lucy-xss-servlet-filter만 적용하였습니다.

### pom.xml
```
 <dependency>
 	<groupId>com.navercorp.lucy</groupId>
 	<artifactId>lucy-xss-servlet</artifactId>
 	<version>2.0.0</version>
 </dependency>
```

## 필터 생성
네이버 깃허브에 들어가보면 Spring에 적용하기 위하여 web.xml에 필터를 설정하는 것을 볼수 있습니다.
지금 사용하는 프로젝트는 Springboot 이기 때문에 다른 방법(?)으로 필터를 적용합니다.

WebMvcConfigurer를 실체화 하는 WebConfig 클래스를 생성하였습니다. 인터넷에 보면 WebMvcConfigurerAdapter를 사용하는 예제가 많은데 Springboot 2에서는 WebMvcConfigurer를 사용하도록 변경되었습니다.

## WebConfig
```
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.navercorp.lucy.security.xss.servletfilter.XssEscapeServletFilter;
 import com.vig.handler.CertificationInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    //Lucy Xss filter 적용
    @Bean
     public FilterRegistrationBean<XssEscapeServletFilter> getFilterRegistrationBean(){
         FilterRegistrationBean<XssEscapeServletFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new XssEscapeServletFilter());
        registrationBean.setOrder(1);
        registrationBean.addUrlPatterns("/*");
        return registrationBean;
    }

}
```

특별하게 살펴볼 내용은 없어 보이는데 **registrationBean.addUrlPatterns("/*")** 이부분은 메소드 이름처럼 URL 패턴을 설정하는 부분으로 원하는 형식으로 지정하시면 됩니다. 저 같은 경우에는 /를 선호하는 편이지만 *.do 와 같은 패턴도 상관없습니다.

# 3. Xml Config 적용
lucy-xss-servlet을 사용하기 위해서는 resource 아래에 lucy-xss-servlet-filter-rule.xml파일이 필요합니다. (회사 프로젝트에서 의존성만 주입하고 사용하고 있지 않다고 생각했던 이유가 이 파일이 없었기 때문입니다.)

워낙 많은 설정을 포함하고 있는데 저는 최대한 간단한 형태로 적용하였고 추후에 조금씩 설정을 늘려 나갈 생각입니다.

## lucy-xss-servlet-filter-rule.xml
```
<?xml version="1.0" encoding="UTF-8"?>
<config xmlns="http://www.navercorp.com/lucy-xss-servlet">
    <defenders>
        <!-- XssPreventer 등록 -->
        <defender>
            <name>xssPreventerDefender</name>
            <class>com.navercorp.lucy.security.xss.servletfilter.defender.XssPreventerDefender</class>
       </defender>
   </defenders>

    <default>
        <defender>xssPreventerDefender</defender>
    </default>
</config>
```

실제 전체 옵션을 표시한 링크를 첨부합니다. 이 내용을 모두 적용하려면 조금은 공부가 필요해 보입니다.
> https://github.com/naver/lucy-xss-servlet-filter/blob/master/doc/manual.md


# 4. 테스트

```
<script> alert('test') </script>
```
보통 xss를 이용할때 script 테그를 많이 사용한다고 합니다. 입력창에 lucy-xss를 적용하지 않은 상태로 위에 내용을 넣어서 테스트를 하면
![](/images/spring/dfegj4_2.jpeg){: .align-center}

정상적으로 화면에 출력되지 않는 상황이 발생합니다.
![](/images/spring/dfegj4_3.jpeg){: .align-center}


문제를 확인한 상황에서 작성한 설정데로 lucy-xss를 적용하고 다시 이미지를 업로드하면
![](/images/spring/dfegj4_4.jpeg){: .align-center}

제목에 입력한 스크립트가 일반 문자열로 변경되어 정상 출력되는 것을 확인할 수 있습니다.

좀더 확실하게 xss를 해결하기 위해서는 옵션을 좀더 자세하게 설정하고 이 방법뿐 아니라 JSON 데이터 또한 막아야 한다고 합니다. 기회가 된다면 JSON또한 방어하는 방법을 작성하겠습니다.
