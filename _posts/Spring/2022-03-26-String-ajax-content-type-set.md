---
layout: post
title: ContentType이 정상적으로 들어오지 않는 경우(FORM 전송)
date: 2022-03-26
Author: Geon Son
categories: Spring
tags: [Springboot, ContentType]
comments: true
toc: true    
---

시청자 참여 이벤트를 생성했는데 문제가 발생했다. 페이지에서 &#60;form&#62;태그의 데이터를 ajax로 전송하는데
데이터는 컨트롤러에 정상적으로 들어왔는데 문제가 발생했다. 분명히 ajax로 데이터를 전송할때 ContentType을 application/json으로 설정했다.
그런데 서버에서 application/x-www-form-urlencoded로 메세지를 받았다고 경고를 한다.

**org.springframework.web.HttpMediaTypeNotSupportedException: Content type 'application/x-www-form-urlencoded;charset=UTF-8' not supported**

데이터 파싱이 안되고 저장이 안됬다면 잘못된 부분을 좀 더 알수 있었을거 같은데 저장이 잘 되었고 성공 메세지를 보냈다. 이게 뭔 상황일까?

# 1. 현상 발생 원인 &#60;form&#62; 내부 &#60;button&#62; 테그
&#60;form&#62; 테그를 이용해서 데이터를 전달할 때 내부에 &#60;button&#62;테그를 누르면 디폴트로 데이터를 지정된 URL로 전송한다.
attributes를 이용하여 다양한 설정을 할수 있다. action을 설정하여 어느 페이지로 전송할지, target을 이용하여 어느 URl로 보낼지 등을 설정할수 있다.
이런 모든 요소를 선택하지 않으면 디폴트로 현재 페이지, 현재 URL을 기준으로 데이터를 전송한다.

> [form 참고](https://velog.io/@ye050425/html-form-%EC%A0%95%EB%A6%AC)

이때 디폴트로 데이터를 전달할때 데이터를 전달하는 형식이 application/x-www-form-urlencoded;charset=UTF-8 이다.
&#60;form&#62; 내부에 &#60;button&#62;에 별다른 설정을 하지 않게 되면 디폴트로 &#60;button&#62;의 type=submit으로 되어 있다.
이러면 별다른 스크립트 없이 버튼을 누르면 디폴트 설정의 데이터를 'application/x-www-form-urlencoded;charset=UTF-8'의 형식으로 전달한다.

# 2.현상 발생 과정

~~~
<form id="form-poll-entry" method="post">

    <input id="vote1" type="checkbox" name="key1" value="option1"/>
    <input id="vote2" type="checkbox" name="key2" value="option2"/>
    <input id="vote3" type="checkbox" name="key3" value="option3"/>

    <button class="poll-submit" >제출</button>
</form>
~~~

 대략 이런 방식으로 from을 만들어 전송한다. form 내부에 버튼이 있는 형태로 만들어져 있기 때문에
 버튼을 누르게 되면 디폴트로 현재 페이지에 URL에 form 데이터를 전달한다.
 여기서 form을 전달하면 'application/x-www-form-urlencoded;charset=UTF-8'로 데이터를 전달한다.

 문제는 이 페이지에서는 데이터 전송을 form페이지에 의지한 것이 아니라 ajax로 호출 된 데이터를 이용해서 데이터를 전달했다는 것이다.

~~~
var postData = $('#form-poll-entry').serializeArray();
  var postPayload = { userPollEntry: [] };

  $.ajax(window.location.href , {
      contentType: 'application/json',
      data: JSON.stringify(postPayload),
      method: 'POST',
      dataType: 'json',
      processData: true,
      crossDomain: true,
      xhrFields: {
          withCredentials: true
      }
~~~

 실제 코드와는 다르지만 이 스크립트를 통하여 특정 테그를 가진 &#60;button&#62; 또는 &#60;a&#62; 테그를 누르면
 ID가 form-poll-entry인 데이터를 불러와서 저장하고 Ajax 호출을 실행한다.
 그리고 서버에서 &#64;ResqustBody 를 이용하여 데이터를 파싱한다.

 이때 호출을 2번하게 된것이다. 첫번째 호출에서는 ajax를 통하여 정상적으로 application/json형태의 데이터를 호출한다.
 당연히 정상 처리된 데이터를 정상적으로 파싱하여 데이터를 정리한다.

 두번째 &#60;form&#62; 내부의 &#60;button&#62;에서 호출된 데이터는 위에 설정되어 있는 POST 방식으로 디폴트(현재 페이지, 현재 URL)로 전달한다.
 이때는 'application/x-www-form-urlencoded;charset=UTF-8' 형태로 데이터가 전달되고
 위에 ajax의 컨트롤러와 같은 컨트롤러로 데이터가 전달되면서 application/json의 데이터를 처리하도록 만들어진 컨트롤러에서
 에러를 발생 시켰던 것이다.

 어처구니 없는 실수 였지만 솔직히 당시에는 생각도 못했고... 결국 선배님께 요청을 하여 원인을 알게 되었다.

 # 3. 해결 방법

 &#60;form&#62; 테그 버튼에서 값을 전송하지 않게 만들면 된다.
 디폴트값으로  &#60;form&#62; 내부의 &#60;button&#62;은 type ="submit" 으로 되어 있다.
 이때 버튼을 누르면 &#60;form&#62;을 호출하게 된다.

 이를 막기 위해서 &#60;button type="button"&#62; 으로 설정을 하면 버튼의 역할만 수행하고
 &#60;form&#62; 호출은 하지 않는다. 위에 html에서는 다음과 같이 변경하면 된다.

~~~
 <form id="form-poll-entry" method="post">

     <input id="vote1" type="checkbox" name="key1" value="option1"/>
     <input id="vote2" type="checkbox" name="key2" value="option2"/>
     <input id="vote3" type="checkbox" name="key3" value="option3"/>

     <button class="poll-submit" type="button">제출</button>
 </form>
~~~
