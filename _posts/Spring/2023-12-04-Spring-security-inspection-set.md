---
layout: post
title: 자주 나오는 보안 검수 대응
date: 2023-12-04
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

프로젝트 오픈을 하면서 보안 검수를 받게 되었다.  
작업을 하다보니 비슷한 사례가 계속 나와서 어떻게 대응하였는지 리스트를 정리하려고 한다.

# 1. 쿠키 속성 검사 - sameSite
크롬 80 버전부터 새로운 쿠키 정책이 들어와서 쿠키에 samesite 설정이 권장되었다.  
쿠키를 만들때마다 설정하기도 하고 필터를 지정해서 설정을 넣기도 하는데
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
**X-Xss-Protection: 1; mode=block**


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

> 참고: **X-Xss-Protection 헤더는 크롬을 비롯한 최신 브라우저에서 지원이 폐기**되어 실제로는 동작하지 않는다. 오래된 검수 도구가 이 헤더를 요구하는 경우가 있어 넣어주긴 하지만, 진짜 XSS 방어는 입력값 검증·출력 인코딩과 아래 11번의 CSP로 하는 것이 맞다.


# 3. 비인가된 OPTIONS HTTP 메소드 사용
사용하지 않는 Http 메소드는 막는 것이 좋다고 한다.   
다만 API의 경우 프론트에서 호출할때 사용가능한 Http 메소드를 확인하는 경우가 있어 option 메소드는 허용하기도 한다.  
현재 인프라에서는 외부 톰켓을 사용하고 있어서 **톰켓의 web.xml**에 아래 설정을 추가하였다.  
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
import com.example.admin.common.web.service.RestService;
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
**Cache-Control:max-age=0**

~~~

    @Override
    protected HttpSecurity securityConfig(HttpSecurity http) throws Exception{
        http.headers(headers -> headers.cacheControl(cache -> cache.disable()));
        return http;
    }

~~~

# 5. 클릭재킹 - X-Frame-Options
공격자가 정상 페이지를 투명한 iframe으로 덮어씌워, 사용자가 자기도 모르게 버튼을 누르게 만드는 공격이다.
방어는 간단한데 X-Frame-Options 헤더로 페이지가 iframe 안에서 열리는 것을 제한하면 된다.

헤더에 아래 값이 있는지 확인하면 끝  
**X-Frame-Options: SAMEORIGIN** (또는 DENY)

스프링 시큐리티는 기본적으로 `X-Frame-Options: DENY`를 넣어준다. 같은 도메인 안에서 iframe을 써야 한다면 SAMEORIGIN으로 바꾼다.
~~~
http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
~~~

검수에서 "X-Frame-Options 헤더 없음"으로 지적받는 경우가 종종 있는데, `frameOptions().disable()`을 호출하면 이 헤더 자체가 사라지니 주의해야 한다. (2번에서 frameOptions를 disable 했다면 여기서 다시 지적받을 수 있다.)

# 6. MIME 타입 스니핑 - X-Content-Type-Options
브라우저가 응답의 Content-Type을 무시하고 내용을 제멋대로 해석(스니핑)하다가, 이미지로 업로드된 파일이 스크립트로 실행되는 식의 문제가 생길 수 있다.
헤더에 아래 값이 있으면 된다.  
**X-Content-Type-Options: nosniff**

이 헤더도 스프링 시큐리티가 기본으로 추가해 주기 때문에, 시큐리티를 끄거나 헤더를 따로 비활성화하지 않았다면 대부분 그냥 통과한다.

# 7. 서버 정보 노출
응답 헤더나 에러 페이지에 톰켓 버전 같은 정보가 그대로 노출되면, 알려진 취약점을 노린 공격의 표적이 되기 쉽다.
외부 톰켓을 쓴다면 **server.xml**에서 Connector의 server 속성을 바꾸고, 에러 페이지에서 서버 정보를 가려준다.

~~~
<Connector port="8080" server=" " ... />

<Valve className="org.apache.catalina.valves.ErrorReportValve"
       showServerInfo="false" showReport="false" />
~~~

# 8. 디렉토리 리스팅
URL로 디렉토리 경로에 접근했을 때 그 안의 파일 목록이 그대로 보이면 안 된다.
톰켓은 기본값이 막혀 있지만(conf/web.xml의 DefaultServlet listings = false), 혹시 true로 열려 있다면 false로 둔다.

~~~
<servlet>
    <servlet-name>default</servlet-name>
    ...
    <init-param>
        <param-name>listings</param-name>
        <param-value>false</param-value>
    </init-param>
</servlet>
~~~

# 9. 스택 트레이스 / 에러 정보 노출
예외가 났을 때 자바 스택 트레이스가 화면에 그대로 찍히면 내부 패키지 구조나 경로, 사용 중인 라이브러리 정보가 노출된다.
스프링부트에서는 에러 응답에 스택 트레이스와 메시지를 포함하지 않도록 설정하고, 가급적 커스텀 에러 페이지를 둔다.

~~~
server:
  error:
    include-stacktrace: never
    include-message: never
~~~

# 10. HSTS - https 강제
http로 접근하더라도 브라우저가 다음부터는 https로만 접속하도록 강제하는 헤더다.  
**Strict-Transport-Security: max-age=31536000; includeSubDomains**

스프링 시큐리티는 secure(https) 요청에 대해 기본으로 HSTS를 추가한다. 적용 기간이나 서브도메인 포함 여부를 조정하려면 아래처럼 설정한다.
~~~
http.headers(headers -> headers.httpStrictTransportSecurity(hsts ->
        hsts.includeSubDomains(true).maxAgeInSeconds(31536000)));
~~~

http로만 테스트하는 로컬 환경에서는 헤더가 안 붙을 수 있는데, 이는 정상 동작이다. 실제 https로 서비스되는 환경에서 확인하면 된다.

# 11. XSS 근본 대응 - Content-Security-Policy (CSP)
앞의 X-Xss-Protection이 브라우저가 알아서 막아주길 기대하는 보조 장치였다면, 요즘 XSS 방어의 핵심은 CSP다.
페이지에서 로드하거나 실행할 수 있는 스크립트·스타일·이미지 등의 출처를 화이트리스트로 제한해서, 공격자가 주입한 인라인 스크립트나 외부 스크립트가 실행되지 못하게 막는 방식이다.

헤더 예시  
**Content-Security-Policy: default-src 'self'; object-src 'none'**

스프링 시큐리티에서는 아래처럼 설정한다.
~~~
http.headers(headers -> headers.contentSecurityPolicy(csp ->
        csp.policyDirectives("default-src 'self'; object-src 'none'")));
~~~

다만 CSP는 정책을 잘못 잡으면 멀쩡한 스크립트나 스타일까지 막혀서 화면이 깨지기 쉽다.
처음부터 차단하기보다는, 위반 내역만 보고받는 **Report-Only 모드**로 먼저 적용해서 무엇이 막히는지 확인한 뒤 정책을 좁혀가는 것이 안전하다.
~~~
http.headers(headers -> headers.contentSecurityPolicy(csp ->
        csp.policyDirectives("default-src 'self'").reportOnly()));
~~~

특히 인라인 스크립트(`<script>...</script>`)나 인라인 이벤트 핸들러가 많은 레거시 화면은 CSP를 적용하면 대부분 막히기 때문에, nonce나 해시 기반으로 하나씩 풀어줘야 한다. 한 번에 강하게 거는 것보다 단계적으로 좁혀가는 편이 현실적이다.
