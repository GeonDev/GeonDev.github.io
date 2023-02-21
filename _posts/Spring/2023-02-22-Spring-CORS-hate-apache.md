---
layout: post
title: 망할 Spring CORS 설정하기(apache, nginx)
date: 2023-02-22
Author: Geon Son
categories: Spring
tags: [Springboot, CORS]
comments: true
toc: true    
---


![그만보자](/assets/images/spring/f13ohwg13-gh3_01.jpeg)

분명히 개발서버에서는 아무 문제 없던 CORS 문제가 등장했다.
서버에 Origin 설정을 안한 것 아니냐 라고 말한다면... 당연히 했다!
안했으면 개발서버에서 정상적으로 작동 되었을 리가 없다!

CURL로 CORS 확인도 해봤다! 통과 된다! 근데 웹에서는 안된다! 망.....

정말 너무 많이! 여러번! 계속! CORS 설정이 짜증나게 만들어서 체크 리스트를 만들었다.


# 1. 소스코드 CORS 설정 확인하기  
CORS 설정은 어디에나 비슷하다. WebMvcConfig에서 addCorsMappings를 Override 하면 된다.
허용할 URL, 메소드를 정의 하고 쿠키 사용 여부에 따라 Credentials를 추가한다.

나같은 경우에는 서버 application.yml 파일에 도메인 정보를 넣고 서버마다 관리하는 것을 선호한다.
테스트를 위한 로컬 URL의 경우 변수 정도로 추가하는 편이다.
가급적 *를 활용하여 모든 URL을 허용하는 것은 하지 않는다. (이번 뻘짓의 원인 이기도 했다.)

~~~
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private static final String LocalUrlHttp = "http://my-local.co.kr:3000";
    private static final String LocalUrlHttps = "https://my-dev.co.kr:3000";

    @Value("${jtbc.domain.front}")
    String frontUrl;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedMethods(
                        HttpMethod.HEAD.name(),
                        HttpMethod.OPTIONS.name(),
                        HttpMethod.GET.name(),
                        HttpMethod.POST.name()
                )
                .allowedHeaders("*")
                .allowCredentials(true)
                .allowedOrigins(getOrigins());

    }

    public String[] getOrigins() {
        String profile = StringUtils.defaultIfEmpty(System.getProperty("spring.profiles.active"), "");
        List<String> origins = new ArrayList<>();        
        origins.add(frontUrl);  

        if (!profile.equals("prod")) {
            origins.add(LocalUrlHttp);
            origins.add(LocalUrlHttps);        
        }

        return origins.stream().toArray(String[]::new);
    }
}
~~~
