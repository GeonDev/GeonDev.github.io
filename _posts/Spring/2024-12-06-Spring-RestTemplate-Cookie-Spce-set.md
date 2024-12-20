---
layout: post
title: RestTemplate 설정으로 인한 쿠키 경고 메세지 수정 (ResponseProcessCookies &#58; Invalid cookie)
date: 2024-12-06
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

최근 하나로 되어 있던 DB를 서비스 별로 분리하고 서비스간 연관이 있는 기능을 사용할때는 API를 통하여 데이터를 공유 하는 방식으로 서비스를 개선하고 있다. 

server to server 호출은 기존에도 사용하던 방식이지만 서비스 별로 요청 대기시간이나 비동기 호출을 요구하는 경우가 생겨서 RestTemplate을 분리하는 작업도 같이 진행하게 되었다.
서비스를 정상적으로 배포 하고 모니터링을 하다가 기존에는 없던 경고 문구를 확인하게 되었다.

~~~
2024-12-05 16:10:03.688  WARN 58830 --- [atalina-exec-36] o.a.h.c.protocol.ResponseProcessCookies  : Invalid cookie header: "Set-Cookie: SCOUTER=x5ddddsfsdf; Max-Age=2147483647; Expires=Tue, 23 Dec 2092 10:24:10 GMT; Path=/". Invalid 'expires' attribute: Tue, 23 Dec 2092 10:24:10 GMT
~~~

경고 문구 이니 무시하거나 로그레벨을 올릴수도 있지만 원인을 파악하고 제거 하는 방향으로 진행하게 되었다.

# 1. 경고 발생 원인 
해당 경고가 발생하는 원인은 api 통신시 쿠키에 형식이 다르다는 것으로 파악하였다. RestTemplate을 설정할때 별도의 설정을 추가하지 않았는데 타 서비스와 연동을 할때 httpClint를 통하여 RestTemplate를 설정하지 않은 경우 RequestConfig 설정이 비어있어 해당 문제가 발생한다고 한다.

~~~
        RestTemplate rest = new RestTemplateBuilder()
                .setConnectTimeout(3000)
                .setReadTimeout(1000)
                .build();
~~~

기존 소스의 경우 RestTemplateBuilder를 통하여 간단하게 설정을 한 상태로 사용하고 있었다. RestTemplate이 무겁기 때문에 이렇게 RestTemlate을 새로 생성하는 것은 좋지 않다. 
RequestConfig를 설정하기 위해서는 이부분에 변경이 필요하기 때문에 같이 수정하였다.


~~~

@Component
public class RestApiProcessor {

    private final RestTemplate restNewsTemplate;


    public RestApiProcessor() {
        restNewsTemplate = new RestTemplate(clientHttpNewsRequestFactory());
    }

    private HttpComponentsClientHttpRequestFactory clientHttpNewsRequestFactory() {
        return new HttpComponentsClientHttpRequestFactory(httpNewsApiClient());
    }

    private CloseableHttpClient httpNewsApiClient() {
        return HttpClientBuilder.create()
                .setDefaultRequestConfig(requestNewsConfig())
                .setMaxConnTotal(MAX_CONNECTIONS)
                .setMaxConnPerRoute(MAX_CONNECTIONS_PER_ROUTE)
                .build();
    }


    private RequestConfig requestNewsConfig() {
        return RequestConfig.custom()
                .setConnectTimeout(CONNECTION_TIMEOUT_NEWS)
                .setSocketTimeout(SOCKET_TIMEOUT)
                .setCookieSpec(CookieSpecs.STANDARD)
                .build();
    }
}
~~~

일단 RestTemlate 설정을 위한 Component을 생성하여 객체를 반복생성하지 않도록 처리 하였다. 기존에  RestTemplateBuilder를 사용할때 쓰던 ConnectTimeout과 ReadTimeout은
RequestConfig의 ConnectTimeout 과 SocketTimeout 으로 대체 하여 사용하였다.

추가적으로 RequestConfig에 **sCookieSpec** 이 추가된 것이다. 

~~~
@Immutable
public final class CookieSpecs {
    /** @deprecated */
    @Deprecated
    public static final String BROWSER_COMPATIBILITY = "compatibility";
    public static final String NETSCAPE = "netscape";
    public static final String STANDARD = "standard";
    public static final String STANDARD_STRICT = "standard-strict";
    /** @deprecated */
    @Deprecated
    public static final String BEST_MATCH = "best-match";
    public static final String DEFAULT = "default";
    public static final String IGNORE_COOKIES = "ignoreCookies";

    private CookieSpecs() {
    }
}
~~~

CookieSpecs 클래스는 Apache HttpClient 라이브러리의 일부로, HTTP 요청 및 응답에서 쿠키를 처리할 때 사용되는 여러 가지 쿠키 처리 규격(cookie specification)을 정의한 클래스이며 GPT를 통해 확인하면 각 상수는 아래 같은 기능을 하고 있다. 

*  BROWSER_COMPATIBILITY (deprecated)
이전에는 "브라우저 호환성" 규격으로 사용되었으나, 이제는 deprecated로 더 이상 사용되지 않는 규격입니다. 이 규격은 오래된 웹 브라우저들과의 호환성 문제를 해결하려는 목적이 있었으나, 최신 표준에서는 사용되지 않습니다.
*  NETSCAPE
Netscape 쿠키 규격을 따르는 처리 방식입니다. 이 규격은 Netscape 브라우저에서 처음 도입되었고, HTTP 쿠키의 초기 규격이었습니다. 현재는 거의 사용되지 않지만, 일부 레거시 시스템에서는 여전히 사용될 수 있습니다.
*  STANDARD
표준 쿠키 규격을 따르는 처리 방식입니다. 이는 기본적인 쿠키 처리 규격으로, 현재 RFC 6265 규격에 근거한 동작 방식을 제공합니다.
*  STANDARD_STRICT
STANDARD 규격의 엄격한 버전입니다. 이 규격은 쿠키 처리에 대해 더 엄격한 검사를 수행하며, 예를 들어 도메인이나 경로(path)에 대한 처리가 더욱 제한적입니다.
*  DEFAULT
기본 쿠키 처리 규격을 의미합니다. 일반적으로 STANDARD와 동일하지만, 사용 환경에 따라 다를 수 있습니다. HttpClient의 기본 설정으로 사용됩니다.
*  IGNORE_COOKIES
이 설정은 쿠키를 완전히 무시하는 규격입니다. 즉, 요청 및 응답에서 쿠키를 처리하지 않겠다는 의미입니다. 쿠키를 아예 사용하지 않거나, 테스트 환경에서 쿠키를 처리할 필요가 없을 때 사용됩니다.


내가 작업하는 환경에서는 쿠키를 사용하기 때문에 STANDARD 로 세팅을 하였고 서비에 배포 하면 기존에 있던 Invalid 'expires' 메세지는 사라지고 대신 쿠키 설정에 대한 메세지가 출력되었다

~~~
2024-12-06 10:20:36.504 DEBUG 618058 --- [atalina-exec-56] o.s.web.client.RestTemplate              : Setting request Accept header to [text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, text/plain, application/xml, text/xml, application/json, application/*+xml, application/*+json, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*, */*]
~~~

이 이슈는 쿠키 스팩과는 무관한 이슈 이고 RestTemplate pool을 사용하는 부분에서 발생한 이슈 였다. 

# 2. 오류 발생 상황

소스코드를 변경한 후 RestTemplete을 호출하는 부분에서 서버 기동후에는 정상적으로 동작하다가 일정 시간이 지나면 API를 호출하지 못하는 문제가 발생하였다.
로컬 테스트를 할때나 개발기에는 발견되지 않았었는데 발견되지 않은 이유는  **오류가 생길정도로 충분한 restTemplete 사용**이 이루어지지 않아서 였다.


## 2.1 Resttemplete 사용 위치

~~~
    public JSONObject getJsonData(String url, String key) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("application", "json", Charset.forName("UTF-8")));
        headers.setAccept(Arrays.asList(new MediaType[]{MediaType.APPLICATION_JSON}));

        //뉴스 API용 restTemplate 별도 세팅
        RestTemplate rest = new RestTemplateBuilder()
                .setConnectTimeout(3000)
                .setReadTimeout(2000)
                .build();

        rest.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

        ResponseEntity<String> result = null;
        try {
            result = rest.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!result.getStatusCode().is2xxSuccessful()) {
                LOGGER.error("GET 요청 실패. StatusCode:{}, Body:{}", result.getStatusCodeValue(), result.getBody());
                return null;
            }
        }catch (Exception exception){
            exception.printStackTrace();
        }

        return null;
    }
~~~

기존에 RestTemplate을 사용할때는 대략 이런 식으로 호출 할때마다 RestTemplateBuilder()를 사용하여 호출 하였다. 
이걸 쿠키 스팩을 적용하면서 RestTemplate pool을 사용하는 형태로 변경 하였다. 

~~~
@Component
public class RestApiProcessor {

    private final RestTemplate restNewsTemplate;


    public RestApiProcessor() {
        restNewsTemplate = new RestTemplate(clientHttpNewsRequestFactory());
    }

    private HttpComponentsClientHttpRequestFactory clientHttpNewsRequestFactory() {
        return new HttpComponentsClientHttpRequestFactory(httpNewsApiClient());
    }

    private CloseableHttpClient httpNewsApiClient() {
        return HttpClientBuilder.create()
                .setDefaultRequestConfig(requestNewsConfig())
                .setMaxConnTotal(MAX_CONNECTIONS)
                .setMaxConnPerRoute(MAX_CONNECTIONS_PER_ROUTE)
                .build();
    }


    private RequestConfig requestNewsConfig() {
        return RequestConfig.custom()
                .setConnectTimeout(CONNECTION_TIMEOUT_NEWS)
                .setSocketTimeout(SOCKET_TIMEOUT)
                .setCookieSpec(CookieSpecs.STANDARD)
                .build();
    }

    public JSONObject getJsonData(String url, String key) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("application", "json", Charset.forName("UTF-8")));
        headers.setAccept(Arrays.asList(new MediaType[]{MediaType.APPLICATION_JSON}));

        // 클래스 필드로 선언한 restNewsTemplate 으로 변경   
        restNewsTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

        ResponseEntity<String> result = null;
        try {
            result = restNewsTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!result.getStatusCode().is2xxSuccessful()) {
                LOGGER.error("GET 요청 실패. StatusCode:{}, Body:{}", result.getStatusCodeValue(), result.getBody());
                return null;
            }
        }catch (Exception exception){
            exception.printStackTrace();
        }

        return null;
    }
}
~~~
 코드를 보면  **restNewsTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));** 부분이 있는데 여기서 문제가 발생하였다.
getJsonData() 를 호출 할때마다 스프링 빈이 된 restNewsTemplate 객체에 동일한 설정이 쌓이는 문제가 발생하였고 일정 수가 넘어가게되면 길이를 초과하여 통신 불능 상태가 되었다.

GPT에게 물어보면 이런 답변이 온다.

---
RestTemplate에서 StringHttpMessageConverter 추가 방식 수정
현재 코드에서 StringHttpMessageConverter를 직접 추가하는 방식은 RestTemplate을 초기화할 때 설정하는 것이 더 바람직합니다. 이렇게 함으로써 코드의 일관성을 높일 수 있습니다.

**해결책: RestTemplate 초기화 시 MessageConverters 설정을 변경하는 방식으로 개선합니다.**

--- 

~~~
public RestApiProcessor() {
    restNewsTemplate = new RestTemplate(clientHttpNewsRequestFactory());

    //초기화시 1번만 실행되도록 수정
    restNewsTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
}
~~~

생성자에서 MessageConverters를 추가하여 이슈를 수정하였고 더이상 로그가 발생하지 않게 되었다.