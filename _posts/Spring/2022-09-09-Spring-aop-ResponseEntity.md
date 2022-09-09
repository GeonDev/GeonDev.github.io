---
layout: post
title: Spring REST API 예외처리 - Http code를 변경하여 반환(ResponseEntity)
date: 2022-09-09
Author: Geon Son
categories: Spring
tags: [Springboot, REST, API,  ResponseEntity]
comments: true
toc: true    
---

신규 시스템의 API를 만들면서 오류 처리나 반환값에 대해서 고민하게 되었다. 어떻게 전달하는게 가장 깔끔한 방법일지 고민 했다.
이전 프로젝트에서는 AOP를 이용하여 컨트롤러에서 특정값을 반환하면 해당 값에 따라 메세지를 던지는 방식으로 반환값을 일관되게 처리하였다.
이렇게 반환값을 지정하였을때 문제점은 잘못된 값을 반환하더라도 HTTP 상태 코드가 200으로 내려오는 경우가 발생하다는 것이다.
메세지는 잘못되었다고 하는데 반환은 200인 상황이 마음에 들지 않아 방법을 찾아봤다.

# 1. ResponseEntity를 활용한 상태값 반환

HTTP 상태 코드를 원하는 값으로 전달할수 있는 클래스는 ResponseEntity 이다 사용법도 간단하다.
미리 정해져 있는 메소드를 사용하고 메소드를 넣은 방법으로 원하는 작업을 수행할 수 있다.

우선 클래스 결과값 반환할 클래스를 하나 만들었다. 메세지와 데이터를 전달 할수 있도록 생성한 간단한 클래스를 생성하였다
이렇게 만들어준 이유는 DTO 반환시 프론트엔드에서 상태에 대한 설명을 요청했기 때문이다.
~~~
@Getter
@Setter
@Schema(description = "API 응답 DTO")
public class ResultDto {

    @Schema(description = "메세지")
    String message;

    @Schema(required = false, description = "반환 데이터 오브젝트")
    Object data;

}
~~~

위에 생성한 클래스를 이용하여 컨트롤러에서 결과를 반한한다.
만들었던 API중에 간단한 형태의 API를 찾아 첨부하였다. 코드를 보면 위에서 생성한 ResultDto를 ResponseEntity에 전달하여 값을 보낸다.
아래에서 ResponseEntity.ok()라고 하면 HTTP code 200 을 반환한다.

~~~
@AllowWithOutLogin
@RequestMapping(value = {"/", "/index"} ,method = RequestMethod.GET)
@Operation(description = "접속 서버 확인용")
public ResponseEntity index(HttpServletRequest request){

		ResultDto result = new ResultDto();

		String profile = StringUtils.defaultIfEmpty(System.getProperty("spring.profiles.active"), "");
		result.setMessage("[SERVER START] profile : " + profile);

		return ResponseEntity.ok(result);
}
~~~

ResponseEntity.ok 외에도 ResponseEntity.badRequest(), ResponseEntity.accepted() 와 같은 HTTP CODE를 직접 반환하는 메소드나
빌더를 사용하여 HttpStatus, HttpHeaders, HttpBody를 설정하여 값을 반환할수 있다. ResponseEntity는 결국에 반환값을 감싸는 클래스 라고 생각할수 있다.

# 2. RuntimeException을 상속 받아 예외 처리 하기
위에서 ResponseEntity를 반환하는 컨트롤러를 만들었다면 상태에 따라 에러를 반환하는 코드를 만들어서 일관된 메세지를 전달 할수 있도록 처리한다.
우선 Exception을 담을 클래스를 생성한다.

~~~
import org.springframework.http.HttpStatus;

public abstract class BaseException extends RuntimeException{

    private static final long serialVersionUID = 1L;

    public BaseException() {
        super();
    }

    public BaseException(String msg) {
        super(msg);
    }

    public BaseException(Throwable e) {
        super(e);
    }

    public BaseException(String errorMessage, Throwable e) {
        super(errorMessage, e);
    }

    public abstract HttpStatus getHttpStatus();
}
~~~

이 BaseException 클래스는 RuntimeException을 상속받아 코드 실행중 에러가 발생할 만한 상황에 맞춰서 클래스가 생성되면서
에러를 처리할수 있다. 그런데 public abstract HttpStatus getHttpStatus()를 보면 에러는 발생 시킬수 있지만 어떤 HTTP CODE를 반환할지는 결정되어 있지 않다.
따라서 이  BaseException를 상속 받는 클래스를 만들어서 원하는 HTTP CODE를 반환하게 생성하면 된다.
물론 클래스 이름은 어떻게 지정하여도 상관은 없다.

## 2.1. BaseException을 상속받아 HTTP CODE를 반환
아래 있는 3개의 클래스의 차이점은 getHttpStatus() 밖에는 없다.
프로그램에 따라 원하는 값을 선택하여 생성하면 된다. 나같은 경우  
조회 권한이 없을때, 파라메터 등 오류가 있을때, 찾는 값이 없을때 이렇게 3개의 상황에 대한 상태값을 추가하였다.

~~~
import org.springframework.http.HttpStatus;

public class ForbiddenException extends BaseException{

    private static final long serialVersionUID = 1L;

    public ForbiddenException() {
        super();
    }

    public ForbiddenException(Throwable e) {
        super(e);
    }

    public ForbiddenException(String errorMessage) {
        super(errorMessage);
    }

    public ForbiddenException(String errorMessage, Throwable e) {
        super(errorMessage, e);
    }

    public HttpStatus getHttpStatus() {
        return HttpStatus.FORBIDDEN;
    }
}
~~~
조회 권한이 없을때 FORBIDDEN(403)을 출력

~~~
import org.springframework.http.HttpStatus;

public class InvalidRequestException extends BaseException{

    private static final long serialVersionUID = 1L;

    public InvalidRequestException() {
        super();
    }

    public InvalidRequestException(Throwable e) {
        super(e);
    }

    public InvalidRequestException(String errorMessage) {
        super(errorMessage);
    }

    public InvalidRequestException(String errorMessage, Throwable e) {
        super(errorMessage, e);
    }

    public HttpStatus getHttpStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
~~~
파라메터 등 전달 값에 오류가 있을 경우 BAD_REQUEST(400)

~~~
public class NoFoundException extends BaseException{

    private static final long serialVersionUID = 1L;

    public NoFoundException() {
        super();
    }

    public NoFoundException(Throwable e) {
        super(e);
    }

    public NoFoundException(String errorMessage) {
        super(errorMessage);
    }

    public NoFoundException(String errorMessage, Throwable e) {
        super(errorMessage, e);
    }

    public HttpStatus getHttpStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
~~~
찾는 값이 없을때 NOT_FOUND(404)를 반환한다.

## 2.2. 기타 공통 Exception을 처리할 AOP 설정
당연한 이야기 이지만 모든 Exception를 처리할 클래스를 만든다는 것은 쉽지도 않고
효율적인 선택도 아니다. 따라서 공통으로 Exception을 처리할수 있는 기능을 만들어 두는 것이 가장 편리하다
스프링에서 이런 기능은 Interceptor나 AOP로 처리하는 것이 편리한데 여기서는 클래스 실행 전후에 처리할 과정이 있어 AOP로 처리하였다.


~~~
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiredLogin {
}
~~~
AOP를 사용할때 이런게 커스텀 어노테이션을 생성해 두면 좀더 편하게 옵션을 관리할수 있다.
AOP코드 내부에 if문을 계속 추가하는 것보다는 더 깔끔하기 때문에 이쪽을 선호한다.

~~~

@Around("execution(* com.tt.controller.*.*(..)) && @annotation(com.tt.aspect.option.RequiredLogin)")
public ResponseEntity addResponseAccAdvice(ProceedingJoinPoint joinPoint) {

		try {
				HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
				HttpSession session = request.getSession(true);
				String adminId = (String)session.getAttribute(ApplicationConstants.ADMIN_LOGIN_SESSION_ID);
				String allowIp = (String)session.getAttribute(ApplicationConstants.ADMIN_LOGIN_SESSION_IP);


				if(StringUtils.isEmpty(adminId) || StringUtils.isEmpty(allowIp)){
						return ResponseEntity.status(HttpStatus.FORBIDDEN).body("로그인 정보 없음");
				}else if(!StringUtils.isEmpty(allowIp) && !allowIp.equals(RequestHelper.getRequestRemoteIp(request)) ){
						return ResponseEntity.status(HttpStatus.FORBIDDEN).body("허용되지 않은 IP 접속");
				}else{
						if(!adminUserService.checkAdminMenuAuth(adminId, menuId)){
								return ResponseEntity.status(HttpStatus.FORBIDDEN).body("조회 권한 없음");
						}
						return commonResponseEntity(joinPoint);
				}
		}catch (Exception e){
				e.printStackTrace();
				return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("API 서버에서 오류가 발생되었습니다.");
		}

}
~~~
위에 코드를 보면 @Around를 사용하여 컨트롤러에 반환값을 처리한다. 이 코드에서는 로그인 체크를 하기 위해 컨트롤러에 접근하기 전에
세션에 있는 로그인 정보를 체크한다. @Around에서는 joinPoint.proceed() 이전이 @Before 와 동일하고 이후는 @After로 적용된다.

코드의 try ~ catch를 보면 위에서 생성하지 않는 나머지 Exception의 경우 모두 INTERNAL_SERVER_ERROR(500)으로 반환하는 것을 확인할수 있다.
물론 상황에 따라서 좀더 세밀하게 분류하는 것도 가능하지만 일단 일관성을 유지하는 정도에서 끝냈다.


~~~
private ResponseEntity commonResponseEntity(ProceedingJoinPoint joinPoint){

		ResponseEntity response = ResponseEntity.status(HttpStatus.OK).build();
		ResultDto result = new ResultDto();

		try {
				response = (ResponseEntity) joinPoint.proceed();
				result = (ResultDto)response.getBody();
				if(StringUtils.isEmpty(result.getMessage())){
						result.setMessage("정상 처리되었습니다.");
				}

		} catch (BaseException ex) {
				ex.printStackTrace();
				return ResponseEntity.status(ex.getHttpStatus()).body(ex.getMessage());

		}catch (Throwable t ){
				t.printStackTrace();
				result.setMessage("API 서버에서 오류가 발생되었습니다.");
		}

		return ResponseEntity.status(response.getStatusCode()).body(result);
}
~~~

위에 코드를 보면 @Before에서 확인할 내용을 보고 난후 미리 정의해 둔 BaseException의 대한 처리나
ResultDto에 별도의 메세지가 없을 경우 어떻게 처리를 하는지 정의 된 내용을 확인할수 있다.
이 코드를 작성하면서 가장 중점을 둔 부분은 전달 메세지를 일관적이게 주는 것 이였기 때문에 이런 과정을 거졌다.


# 3. Exception 발생 시키기

~~~
@Override
public AdminDetailDto getAdminDetail(String adminId) {
		AdminUser adminUser = adminRepository.findByAdminId(adminId);

		if(adminUser != null){
				return AdminDetailDto.builder()
								.actName(adminRepository.findByAdminId(adminUser.getActId()).getAdminId())
								.id(adminId)
								.department(adminUser.getDepartment())

								.build();
		}else {
				throw new InvalidRequestException("해당 계정 정보가 없습니다.");
		}
}
~~~

위에서 생성한 BaseException은 이렇게 서비스 코드 중간에 throw new를 이용해서 발생 시킬수 있다.
이렇게 코드를 작성하여 작성하다보면 컨트롤러에서 if문을 적게 사용하여 코드의 실행 방향을 일관적이게 구성할수 있고
가독성 면에서도 더 유리하다는 것을 알수 있다. 
