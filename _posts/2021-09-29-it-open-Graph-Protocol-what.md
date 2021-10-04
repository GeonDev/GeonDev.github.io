---
title:  "오픈 그래프 프로토콜(OpenGraphProtocol)이 뭐지?"
toc: true
toc_sticky: true
categories:
  - IT
tags:  
  - Web
  - OpenGraphProtocol  
---

> 오픈 그래프 프로토콜 공식 문서 
https://ogp.me/

> 한글로 잘 설명해주신 블로그 
https://nowonbun.tistory.com/517

외부에 공개되는 회사 웹페이지에 생전 처음보는 클래스가 있었다. OpenGraphProtocol 이라고 되어 있기도 하고 OG라고 되어 있기도 한 생전 처음보는 프로토콜 클래스를 웹페이지가 갱신될때 마다 계속 날리고 있었다. 무슨기능을 하는 프로코톨인지 찾아 보다가 페이지 공유를 위한 기능이라는 것을 알게 되었다.



# 1. 공유용 기능?

요즘 보이는 대부분의 웹사이트를 공유하면 아주 깔끔한 형태로 사이트가 출력된다. 
카톡도 그러하고 웹사이트 상에서 공유를 해도 대부분 이런형태로 사이트 링크가 공유되는 것을 알수 있다.

그런데 가끔 앱을 통해서 웹페이지를 공유하거나 일부 사이트를 공유하게 되면 이렇게 깥끔하지 않은 형태로 URl을 통째로 보여주는 경우가 간혹 있다. 이 웹사이트의 차이가 오픈그래프 프로코톨을 적용했는지 안했는지에 따라 나뉘게 된다고 한다. 



# 2. 오픈 그래프 프로토콜 적용
이런 기능을 어떻게 적용하는지 어떤 라이브러리를 사용해야 하는지 찾아보면 아무것도 안나온다. 별도의 라이브러리 없이 html 테그인 &lt;meta&gt; 를 이용하면 된다.  &lt;meta&gt;는 html의 기본 테그이기 때문에 별도의 처리를 할 필요 없이 내용을 넣으면 된다. 

오픈 그래프 프로토콜의 설명을 들어가보면 정말 별 내용이 없다.
그냥 헤더나 푸터 부분에 메타데이터를  넣으면 된다. &lt;meta&gt;는 웹페이지에서는 보이지 않기 때문에 어느 위치에 들어가도 사실 부담은 없다. 그렇지만 페이지 정리를 위해서 헤더 쪽에 넣은 것을 추천한다. 


![](/assets/images/it/l_7c694acc.png){: .align-center}
예제로 제공된 코드를 보면 어떻게 작동되는지 좀더 명확하게 알수 있다.
(더락 이라는 영화를 소개하는 페이지 이다)

```
<title>The Rock (1996)</title>
<meta property="og:title" content="The Rock (1996) - IMDb" />
<meta property="og:type" content="video.movie" />
<meta property="og:url" content="https://www.imdb.com/title/tt0117500/" />
<meta property="og:image" content="https://ia.media-imdb.com/images/rock.jpg" />
<meta property="og:description"  content="hThe Rock: Directed by Michael Bay. With Sean Connery, Nicolas..."/>
```



**og:title** 부분은 말 그대로 공유되는 제목이 들어가는 부분 
**og:type**은 어떤 콘텐츠를 제공하는지 알려주는 부분 (없어도 크게 문제는 없어 보인다.)
**og:url**은 실제 공유하는 URL 주소
**og:image**는 공유할 때 어떤 이미지를 표시하는지 알려주는 방식으로 사용된다. 
**og:description**는 부가적인 설명(그런데 잘리는거 같은데....?)

이외에 사용할수 있는 테그는 엄청 많지만 간단하게 사용하면 될 것 같다. 



# 3. 실제 적용 하기
```
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Open Graph Protocol 적용하기 -->
    <meta property="og:title" content="PROP TECH" />
    <meta property="og:url" content="https://www.imdb.com/title/tt0117500/" />
    <<meta property="og:type" content="website" />
    <meta property="og:image" content="https://ia.media-imdb.com/images/rock.jpg" />


    <title>PROP TECH</title>

    <link rel="icon" href="/img/favicon.ico">

    <link rel="stylesheet" href="/css/sb-admin-2.min.css">
    <link href="/vendor/fontawesome-free/css/all.min.css" rel="stylesheet" type="text/css">

    <!-- Bootstrap-select CSS-->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">

    <link href="https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i" rel="stylesheet">

    <!-- Tempus Dominus CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.0.1/css/tempusdominus-bootstrap-4.min.css" />


</head>

```

프로젝트에 적용할때는 이렇게 분리된 헤더파일에 적용하면 된다. 이렇게 공통된 부분에 오픈그래프프로토콜을 적용하면 어느 페이지던 공유를 할 때 이쁜 형태를 유지할수 있다. 



# 4. 아쉬운 점
이렇게 오픈 그래프 프로토콜을 적용하고 나면 귀찮은 일이 한가지 발생한다.
페이지마다 URL이 다를테니 이에 맞춘 형태로 URL을 제공해야 하고 모든 컨트롤러에서 데이터를 전달해야 한다. 매우 귀찮다....



물론 해결 방법이 없는 것은 아니다. AOP를 이용하여 모든 컨트롤러에 공통로직을 적용하는 방법과
회사에서 사용하는 **HandlerMethodArgumentResolver**를 적용하는 방법이다. 
다음에는 HandlerMethodArgumentResolver를 적용하여 귀찮은 작업을 해결하는 방법을 작성해 보려고 한다. 
