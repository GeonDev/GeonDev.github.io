---
layout: post
title: Spring Swagger를 세팅하여 API 를 전달하기
date: 2022-08-21
Author: Geon Son
categories: Spring
tags: [Springboot, Swagger, API]
comments: true
toc: true    
---

신규 시스템을 만들면서 프론트엔트 파트와 협업을 하게 되었다. 이제는 드디어 백엔드 작업만 수행하면 되는데
협업을 빠르게 수행하기 위해여 API 전달을 문서가 아니라 Swagger를 통하여 전달하기로 하였다.
생각보다 간단해서 다른 프로젝트에도 적용하면 좋을것 같다.

# 1. 의존성 주입
```
<dependency>
		<groupId>org.springdoc</groupId>
		<artifactId>springdoc-openapi-ui</artifactId>
		<version>1.4.1</version>
</dependency>
```
기존 swagger를 사용하려고하면 springfox-swagger-ui', 'springfox-swagger2' 이렇게 2가지를 추가하여야 한다.
swagger3로 넘어오게 되면 springdoc-openapi-ui라는 한가지 의존성만 추가 하면 된다


# 2. Application Yml 설정

~~~
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    tags-sorter: alpha
    disable-swagger-default-url: 'true'
    path: /swagger-ui.html

spring:
  mvc:
    pathmatch:
      matching-strategy: ANT_PATH_MATCHER		
~~~

swagger-ui.path 의 경우 스웨거를 실행할때 필요한 경로를 지정한다.
지정하지 않았을 경우에는 localhost:{port}/swagger-ui/index.html 로 접속된다고 한다.

spring.mvc.pathmatch.matching-strategy의  경우 아래 오류를 해결하기 위하여 추가하였다.

*No more pattern data allowed after {&#42;...} or &#42;&#42; pattern element*

스프링 2.6버전 이상에서는 요청 경로를 ControllerHandler에 매칭시키기 위한 전략의 기본 값이
spring.mvc.pathmatch.matching-strategy 기본 값이 ant_path_matcher 에서 path_pattern_parser 로 변경된다.
보통의 경우는 문제가 없겠지만 스웨거를 사용하려고 하면 문제가 발생한다.



## 2.1. SwaggerConfig 설정


~~~
@Configuration
@Profile({"local", "dev"})
public class SwaggerConfig {

    @Value("${spring.profiles.active}")
    private String profile;

    @Bean
    public OpenAPI openAPI() {
        Info info = new Info().title("membership BackOffice API")
                .description("");

        OpenAPI openAPI = new OpenAPI()
                .info(info);


        if (StringUtils.equals("dev", profile)) {
            Server server = new Server();
            server.setUrl("http://mem-cmsdev.co.kr");
            openAPI.servers(new ArrayList<Server>(){{add(server);}});
        }

        return openAPI;
    }
}
~~~

SwaggerConfig를 추가하면 각 상황에 맟추어서 Swagger의  설명을 추가하거나 옵션을 줄수 있다.
여기서는 Swagger API에 타이틀과 프로필에 따라 서버 URL을 다르게 지정하는 기능을 추가하였다.  


# 3. Controller 구현

```
@RestController
@RequiredArgsConstructor

@Tag(name = "어드민 등록 관련 API")
public class RegisterController


...

@RequestMapping(value = "/regist/admin" , method = RequestMethod.POST)
@Operation(description = "어드민 계정 가입 API")
@ApiResponses({
				@ApiResponse(responseCode = "200", description = "성공"),
				@ApiResponse(responseCode = "400", description = "중복된 ID" )
public ResponseEntity registAdminUser(HttpServletRequest request,
						@Parameter(name = "name", description = "이름", required = true) @RequestParam("name") String name,
						@Parameter(name = "id", description = "로그인 ID", required = true) @RequestParam("id") String id
...						


```
전체 코드를 첨부하지는 않았지만 이정도면 어떻게 동작을 하고 있는지 파악할수 있을 것이다.
@Tag(name = "어드민 등록 관련 API")의 경우 스웨거 컨트롤러에 대한 간단한 설명을 작성한다.

@Operation(description = "어드민 계정 가입 API")의 경우 스웨거에서 실제 테스트 해볼 메소드를 지정한다.
@Parameter(name = "name", description = "이름", required = true) 의 경우 각 파라메터에 대한 설명과 필수값 등을 지정한다.

개별적으로 파라메터 마다 설명 작성하는게 귀찮다고 생각할수도 있다. 그러나 API를 만들고 문서 파일을 수정하는 과정을 반복하는 것 보다
버전 관리 등에서 훨씬 수월하고 스웨거에서 직접 API를 테스트 할수 있다는 점에서 당연히 유용하다.

@ApiResponse의 경우 결과값을 반환하였을떄 어떤 메세지를 전달할지 지정할수 있다. 다만 실제 API반환값을 지정하는 것은 아니고
스웨거의 반환 결과 값을 지정하는 것이다.

이외에도 스키마를 지정하거나 다양한 설정들이 있어 찾아보면서 적용하면 될것 같다.


# 4.Swagger 확인

로컬에서 스워거를 실행 시켜보면 다름과 같은 화면이 나온다.

![](/images/spring/s2dff425ahoo.png){: .align-center}

여기서 API 하나를 눌러서 확인해보면 이렇게
![](/images/spring/ge46geety.png){: .align-center}

어떤 파라메터를 넣을지, 결과값은 어떤지 바로 확인할수 있어 프론트엔트 개발자와 소통할때 좀더 편하게 작업 할수 있게 되었다.  
