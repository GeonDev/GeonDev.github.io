---
layout: post
title: 자주 나오는 보안 검수 대응
date: 2023-12-04
Author: Geon Son
categories: Spring
tags: [Spring, security, samesite]
comments: true
toc: true    
---

프로젝트 오픈을 하면서 보안 검수를 받게 되었다. 작업을 하다보니 비슷한 사례가 계속 나와서 어떻게 대응하였는지 리스트를 정리하려고 한다.

# 1. 쿠키 속성 검사 - sameSite
크롬 80 버전부터 새로운 쿠키 정책이 들어와서 쿠키에 samesite 설정이 권장되었다. 쿠키를 만들때마다 설정하기도 하고 필터를 지정해서 설정을 넣기도 하는데
스프링부트에서는 application.yml 설정으로 적용할수 있다.

~~~
server:
  servlet:
    session:
      cookie:
        http-only: true
        path: /
        secure: true
        same-site: "Lax"

~~~


same-site 설정과 함께 http-only, secure cokie는 거의 필수로 설정해 주는 것이 좋다.

# 2. X-XSS-나이트메어 

공격자가 xss공격을 할때 방어하는 설정을 한다. 스프링 시큐리티를 활용하여 방어할 수 있다. 
시큐리티 설정으로 xss를 막더라도 헤더에 스타일이나 스크립트 태그를 추가하면 자동 검수에서 공격이라고 판단하기도 하니
가급적이면 이런 설정은 하지 않는 것이 좋다.

헤더에 아래 값이 포함되는지 확인하면 끝

X-Xss-Protection: 1; mode=block


~~~
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf().disable()
                .formLogin().disable()
                .headers().frameOptions().disable()
                .xssProtection().block(true);
    }

}

~~~  

아래 처럼 헤더에 직접 설정하기도 하니 참고 
~~~
        http.headers(headers -> headers.xssProtection(xssProtection ->
                xssProtection.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)));
~~~


# 3. 비인가된 OPTIONS HTTP 메소드 사용
사용하지 않는 Http 메소드는 막는 것이 좋다고 한다. 
다만 API의 경우 프론트에서 호출할때 사용가능한 Http 메소드를 확인하는 경우가 있어 option 메소드는 허용하기도 한다.
현재 인프라에서는 외부 톰켓을 사용하고 있어서 톰켓의 web.xml에 아래 설정을 추가하였다.
(보안검수 요구사항이기 때문에 어쩔수 없이 메소드를 막았지만 GET,POST만 쓰라고 하는건 요즘 개발과 맞지 않는다고 생각한다.)

~~~
<security-constraint>
        <web-resource-collection>
            <web-resource-name>Restricted Methods</web-resource-name>
            <url-pattern>/*</url-pattern>
            <http-method>DELETE</http-method>
            <http-method>PUT</http-method>
            <http-method>HEAD</http-method>
            <http-method>TRACE</http-method>
			<http-method>PATCH</http-method>
        </web-resource-collection>
        <auth-constraint/>
</security-constraint>
~~~ 


# 4. 잘못된 캐시 통제 
캐시를 사용하지 않는다면 헤더에 설정을 넣으면 된다. 사실 https로 통신을 하면 헤더에 default 값이 추가 되기는 한다. 
처음에는 WebMvcConfigurer를 사용하여 캐시를 사용하지 않는다고 명시해 줬다

~~~
import com.jtbc.admin.common.web.service.RestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;


@Configuration
public class WebServiceConfig implements WebMvcConfigurer {

    // 캐시 정책 적용
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        CacheControl cacheControl = CacheControl.noCache();

        registry.addResourceHandler("**/*.*")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(cacheControl);
    }
}

~~~


시큐리티를 통해서는 아래 처럼 설정할수도 있다. disable 설정을 하면 헤더에서 캐시 전략 자체가 사라진다. 

Cache-Control:max-age=0

~~~

    @Override
    protected HttpSecurity securityConfig(HttpSecurity http) throws Exception{
        http.headers(headers -> headers.cacheControl(cache -> cache.disable()));
        return http;
    }

~~~










