---
layout: post
title: Spring 설정을 활용하여 sameSite 옵션 추가하기
date: 2022-11-05
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

크롬이 업데이트 되면서 쿠키 공유 옵션을 빡세게(?) 결정해주고 있다. 사실 이 내용은 21년 부터 고지되고 시행되었지만  
기존에 운영하던 사이트는 백엔드와 프론트엔드가 통합되어 같은 도메인으로 사용하고 있었기 때문에 문제가 없었다.  
이번에 신규 시스템을 구현하면서 프론트와 백엔드를 분리하였고 CORS, CSRF에 대한 경고를 확인하고 대응하였다.



# Access-Control-Allow-Origin 세팅
CORS 경고는 간단하게 서버에 허용할 도메인을 넣음으로 해결할수 있다. 백엔트 파트에서 적용하고 프론트에서 확인하면 끝.  
특별히 코드양이 많지도 않고 webConfig를 만들고 설정만 추가해주면 된다.
```
@Configuration
@EnableWebMvc
@Slf4j
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${AAA.domain.front}")
    String frontUrl;

    @Value("${AAA.domain.api}")
    String apiUrl;

    @Override
    public void addCorsMappings(CorsRegistry registry) {

        registry.addMapping("/**")
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(true)
                .allowedOrigins(getOrigins());
    }

    public String[] getOrigins() {
        String activeProfile = StringUtils.defaultIfEmpty(System.getProperty("spring.profiles.active"), "");

        //테스트를 위하여 개발환경에는 프론트 로컬 URL 추가
        if(!activeProfile.equals("real")){
            return new String[]{ApplicationConstants.FRONT_LOCAL_URL, frontUrl, apiUrl };
        }

        return new String[]{frontUrl, apiUrl};
    }

}

```

개발을 하다보니 프론트 파트에서 로컬 서비스를 추가해 달라는 요청이 많아서 개발기로 실행할때는 로컬 URL도 포함시켰다.  
처음에는 CORS 설정이니까 개발기 host에도 프론트 로컬 도메인을 추가해야 되는지 착각을 했는데 굳이 그럴필요는 없다.  
위에 설정은 헤더 정보를 추가하는 것으로 보이고 단순 스트링비교로 체크를 하는 것 같다.

# 2. sameSite 문제 해결 방법

지금하고 있는 프로젝트에서는 쿠키를 공유할 일들이 가끔씩 생긴다. 시큐리티는 적용되어 있지만 내부 시스템이라는 핑계로 로그인 구현은 JWT가 아닌 세션기반으로 구현하였고 일부 타입과 접속기기 정보를 쿠키를 이용하여 전달하고 있다.  
이 때문인지 프론트 페이지과 통신을 할때 가끔씩 문제가 발생했고 크롬에서만 문제가 발생한 다는 것과 원인이 sameSite라는 걸 알게 되었다.

## 2.1. sameSite 타입 변경

크롬에서는 sameSite의 디폴트 값이 변경되었다. 아마 다른 브라우저에서도 보안을 위해 점점 디폴트 값을 변경할것으로 보인다.   sameSite 설정을 바꾸지 않고 문제를 해결하기 위해서는 프록시 서버를 이용하거나 별도의 쿠키 공유용 시스템을 구현하면 된다.  
 ~~(근데 말이 쉽지.. 프로젝트 중간에 이거하나 쓰자고 서버를 세팅을 해?)~~

그래서 해결방법으로 sameSite 타입을 변경하기로 하였다. 변경은 간단하게 application.yml에 설정만 하면 된다.

~~~
server:
  servlet:
    session:      
      cookie:
        domain: AAA.co.kr
        same-site: none
        secure: true
~~~

sameSite 설정만 바꾸면 되지 왜 secure 설정을 하고 도메인 까지 넣었는지 의문일수 있다. 이것도 크롬의 정책인데  
**same-site 가 none이라면 https 호출만 허용한다.** 그렇기 때문에 통신을 할때 secure: true 옵션을 추가하여 쿠키를 https로 통신할때만 보낼거라는 선언을 한다.  
이렇게 선언을 하고 난 이후에 프론트에서 쿠키의 정보를 읽을수 있어야 하기 떄문에 같은 서브도메인을 사용할거라는 선언으로  
도메인을 넣어주면 프론트엔드에서 쿠키를 읽을수 있다.

참고로 sameSite 옵션을 다음과 같은 것들이 있다.

* **same-site : none** : sameSite 가 적용되기 전과 같은 옵션이다. none일 경우에는 크로스 사이트의 요청이 있다면 쿠키를 전달한다.  
* **same-site : strict** : 가장 보수적인 옵션이다. 같은 도메인(퍼스트 파티 쿠키) 내부에서만 쿠키를 허용하고 외부로는 쿠키를 전달하지 않는다.  
* **same-site : lax** : 크롬의 기본 옵션이다. 다른 도메인으로는 대부분 쿠키를 전송하지 않지만 예외적인 경우에는 허용한다.  
lax에서 허용하는 경우는 $<a>$ 테그나 다른 링크를 통하여 다이렉트로 페이지 이동을 하는 경우에 허용을 한다.  
이마저도 iframe 같이 다른 사이트를 정보를 삽입하는 경우는 허용하지 않고 HTTP GET으로 호출된 경우만 허용을 한다.

우리팀에서는 none으로 변경하는 쪽으로 개발을 진행 했다.



## 2.2. 톰켓 설정
어플리케이션에서 설정하는 방법도 있지만 톰켓에 설정하는 방법도 있다. 물론 웹서버에도 설정할수 있다. 다만 웹서버는 관리권한이 없어서 톰켓에 설정하는 정도로 마무리 했다.  
톰켓 설정도 간단하다. 그냥 server.xml에 설정값 넣고 재부팅 시키면 된다.

~~~
<Context>
    <CookieProcessor sameSiteCookies="none"/>
</Context>
~~~

톰켓 설정에 따라 테크가 많을수도 있다. 
기존에 CookieProcessor가 있다면 sameSiteCookies="none"을 넣으면 된다.  
개인적으로는 어플리케이션에서 설정하는 것을 좀더 선호 한다.
