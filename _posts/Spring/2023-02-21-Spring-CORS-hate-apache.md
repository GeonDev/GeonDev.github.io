---
layout: post
title: 나를 괴롭히는 Spring CORS 해결하기(apache, nginx)
date: 2023-02-21
Author: Geon Son
categories: Spring
tags: [Springboot, CORS]
comments: true
toc: true    
---


![그만보자](/images/spring/f13ohwg13-gh3_01.jpeg)

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
가급적 *를 활용하여 모든 URL을 허용하는 것은 하지 않는다. (뒤에서 이야기 하겠지만 이번 뻘짓의 원인 이기도 했다.)

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


이때 허용 메소드에 OPTIONS는 추가해 주는 것이 좋다. 프론트 서버에서 허용되는 URL을 호출할때 OPTIONS를 호출하여 체크한다.
보안 규정에 OPTIONS를 막으라는 경우가 있는데 프론트와 백엔드가 분리 된 환경에서는 대부분 (거의 100%) OPTIONS가 필요하기 때문에
허용하도록 설정해야 한다.



# 2. cURL을 이용하여 설정된 CORS 확인하기

 cURL은 리눅스나 맥에 기본 설치 되어 있는 라이브러리이다. 프로토콜을 이용하여 서버에서 url로 데이터를 전달할 수 있다고 하는데
 이를 이용하여 원하는 url를 호출하여 테스트 할 수 있다. 심지어 반드시 해당 서버에서 호출을 하지 않아도 테스트는 할 수 있다.

맥이나 리눅스라면 콘솔(또는 터미널에서) 아래 명령어를 호출 하면 CORS가 허용되는지 알수 있다.

~~~
curl \
--verbose \
--request OPTIONS \
'여기에 서버 URL' \
--header 'Origin: 여기에 프론트 URL' \
--header 'Access-Control-Request-Headers: Origin, Accept, Content-Type' \
--header 'Access-Control-Request-Method: 호출 메소드'
~~~


이번 경우에 cURL을 호출 하면 결과가 **HTTP/2 200** 으로 나와
AAAA-api.co.kr 와 BBBBB.co.kr 의 CORS가 허용되어 있다는 것을 알 수 있다.
하지만 정작 웹에서 실행을 시키면 CORS 가 허용되었다고 나오지 않는다.  

~~~
* Using HTTP2, server supports multiplexing
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x7f7de680ca00)
> OPTIONS / HTTP/2
> Host: AAAA-api.co.kr
> user-agent: curl/7.79.1
> accept: */*
> origin: https://BBBBB.co.kr
> access-control-request-headers: Origin, Accept, Content-Type
> access-control-request-method: POST
>
* Connection state changed (MAX_CONCURRENT_STREAMS == 128)!
< HTTP/2 200
< date: Mon, 20 Feb 2023 06:22:23 GMT
< set-cookie: SCOUTER=z1h339ti138518; Expires=Sat, 10-Mar-2091 09:36:30 GMT; Path=/
< vary: Origin
< vary: Access-Control-Request-Method
< vary: Access-Control-Request-Headers
< access-control-allow-origin: https://BBBBB.co.kr
< access-control-allow-methods: HEAD,OPTIONS,GET,POST
< access-control-allow-headers: Origin, Accept, Content-Type
< access-control-allow-credentials: true
< access-control-max-age: 36000
< allow: GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS, PATCH
< x-content-type-options: nosniff
< x-xss-protection: 1; mode=block
< cache-control: no-cache, no-store, max-age=0, must-revalidate
< pragma: no-cache
< expires: 0
< server: JWS
< strict-transport-security: max-age=31536000
~~~

# 3. addMapping의 패스를 잘게 잘라라

위에서 addCorsMappings을 Override 한것을 확인해 보면 addMapping에 *를 이용하여 전체 허용을 한 것을 알수 있다.

~~~
  registry.addMapping("/**")
~~~

전체 경로를 허용했으니 모든 URL이 허용될거 같지만 실제로는 아니다.
이번에 CORS가 발생했던 경로는 AAAA-api.co.kr/poll/CCCC/DDDD 와 같은 경로에서 발생하였다.
그래서 위에 cURL로 테스트 할떄 AAAA-api.co.kr/poll 을 host로 입력했다면 CORS가 허용되지 않았다고 나왔을 것이다.

문제는 apache 웹서버 에서는 "/`*``*`" 으로 매핑을 해도 전체 경로가 허용되지만 nginx 에서는 "/`*``*`" 을 허용하지 않아 발생한 문제였다.
개발서버는 apache로 되어 있어서 전체 매핑이 되었지만 운영서버는 nginx라 매핑이 안되었던 것!

결국에 허용해야 되는 URL에 앞부분을 입력해 놓은 것으로 해결 되었다.

~~~
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/poll/**")
            .allowedMethods(
                    HttpMethod.HEAD.name(),
                    HttpMethod.OPTIONS.name(),
                    HttpMethod.GET.name(),
                    HttpMethod.POST.name()
            )
            .allowedHeaders("*")
            .allowCredentials(true)
            .allowedOrigins(getOrigins());

            registry.addMapping("/key/**")
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

~~~

정말 어처구니 없지만 이렇게 설정을 해주니 CORS가 허용되었다.
