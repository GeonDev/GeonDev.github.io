---
layout: post
title: 쿠키 공유/ 서브 도메인
date: 2022-01-12
Author: Geon Son
categories: Spring
tags: [Springboot, Cookie]
comments: true
toc: true    
---

"다른 서버에서도 최근 검색어를 공유하게 해주세요." 이번에 회사 업무에서 나왔던 요구사항인데 차장님이 힌트를 주셨다.
"쿠키에 넣어서 써요" 처음 들었을때 생각은 "응? 서버가 다른데 그게 되나???" 근데 당연히 된다....


# 1. 쿠키 공유 조건
사실 쿠키를 공유 할수 있는 방법은 생각보다 많았다. 서버 별로 쿠키를 만들고 생성된 쿠키마다 같은 내용을 업데이트 하거나
심지어 다른 서버에 쿠키를 생성하라고 명령할수도 있긴 있었다. 이런 방법은 사실 복잡하고 약간의 편법인데 진짜 지원해주는 방법이 있다.
쿠키는 서브도메인이 같다면 공유 할 수 있다. 그럼 서브 도메인은 또 뭐지....

## 1.1 서브 도메인

> [서브 도메인 설명](https://gentlysallim.com/%EB%8F%84%EB%A9%94%EC%9D%B8-%EC%9D%B4%EB%A6%84%EA%B3%BC-%EC%A2%85%EB%A5%98-%EC%B5%9C%EC%83%81%EC%9C%84-%EB%8F%84%EB%A9%94%EC%9D%B8%EB%B6%80%ED%84%B0-%EC%84%9C%EB%B8%8C%EB%8F%84%EB%A9%94%EC%9D%B8/)

간단하게 생각하면 사이트에서 겹쳐지는 URL 이다. 쿠키를 생성할때 도메인을 입력하면
해당 도메인과 겹치는(?) 도메인 끼리는 쿠키를 공유 하게 된다.

그럼 모든 사이트에서 쿠키를 공유할수 있게 서브도메인을 .com, .net 같은 것으로 설정하면? 당연히 안된다.
서브도메인은 최상위 도메인으로는 사용할수 없다. 단순하게 생각하면 최소한 점(.)이 2개는 되야 서브 도메인 이라고 생각해면 된다.   


# 2. 쿠키 생성

```
private void setCookies()  {     
    HttpServletResponse response = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getResponse();

    Cookie cookie = new Cookie("CookiesName", "TEST");
    cookie.setPath("/");
    cookie.setDomain("example.com");
    cookie.setMaxAge(60*60*24*7);
    response.addCookie(cookie);
}
```

간단하게 쿠키를 저장하는 메소드를 만들어보면 쿠키를 새로 생성하면서 쿠키의 이름과 넣을 값을 결정한다.
여기서는 "CookiesName" 이라는 이름을 갖는 쿠키에 "TEST" 라는 내용을 넣었다.  
setPath는 접속할수 있는 경로 인데 보통 쿠키는 "/"로 설정하여 전체 접근이 가능하게 하는 것으로 보인다.
setDomain 에는 접속 가능한 도메인을 넣는다. 많은 블로그에서 서브도메인을 **.example.com** 처럼
도메인 앞에 (.)을 넣으라고 하는데 만약 톰켓 7이상을 사용할 경우 에러가 발생한다.
그냥 앞에 (.)이 없어도 서브도메인으로 인식하기 때문에 (.)을 빼고 입력한다.
이외 setMaxAge은 유효시간을 입력한다.

response에 생성된 쿠키를 저장하면 끝!

# 기타. 도메인이 없는데...?

공부를 할때는 도메인을 사용한 웹 사이트를 구성해 본적이 없고
심지어 SI에서 일할때는 내부 시스템이라고 IP를 입력하는 시스템만 만들어서 도메인을 딱히 설정해 본적이 없다...

도메인이 없을때 간단하게 테스트트를 할수 있는 방법은 host 파일을 설정하는 것이다. DNS 타기 전에 먼저
PC 내부에 호스트 파일을 타기 때문에 여기에 도메인을 설정하면 비슷한(?) 효과를 쓸수 있다.
맥북 기준으로 터미널에 **sudo vi /etc/hosts** 를 입력하고 원하는 URL을 설정하면 된다.

![](/images/spring/g5lhqzgqj03.jpg){: .align-center}
