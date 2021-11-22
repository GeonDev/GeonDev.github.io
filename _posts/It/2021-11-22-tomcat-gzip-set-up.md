---
title:  "톰켓 세팅으로 response 크기를 줄여보자 - Gzip 설정"
toc: true
toc_sticky: true
categories:
  - IT
tags:   
  - Tomcat
  - Gzip
  - Web 
---

# 웹 페이지의 성능을 개선하는 방법
아무래도 백엔드를 공부하고 있기 때문에 웹페이지를 개선하는 작업을 수행하면 대부분 쿼리 수정 정도로 끝나게 되는 것 같다. 하시만 웹 페이지 성능 개선을 하면서 당연히 백엔드 부분만 개선해서는 한계가 있어 다른 방법을 찾아 보다가 respose 되는 리소스 사이즈를 줄이는 방법이 있다고 해서 적용해 보았다. 

## Gzip

이름에서 알수 있듯이 압축 시스템이다 . 리눅스 시스템에서 제공하는 기본 시스템(?)인지는 모르겠지만 Http 1.1에서 기능을 지원하고 브라우저에서 압축 해제가 가능한 경우 사용이 가능 한 것으로 보인다. 크롬은 이미 해당 기능을 지원하고 있고 엣지도 크롬 기반으로 변경되었기 때문에 많은 브라우저에서 지원하는 기능이다. 
아마존이나 넷플릭스에서도 적용되어 있는 것을 보면 호환성에 큰 문제는 없을 것이라고 생각한다.

## Gzip 적용
톰켓 7부터 자체적으로 기능을 지원한다고 한다. 웹서버에서 적용할수 있고 서블릿에서 적용할 수 있다. 굳이 톰켓에 기능을 적용한 이유는 웹서버는 별도로 관리해주는 팀이 있기 때문에 내가 직접 해보기에는 약간 부담스러웠다는 이유 정도이다. (상대적으로 간단해 보이기도 했다)

tomcat/conf/ 폴더를 찾고 server.xml을 찾아 Connector 테그에 아래 3개 속성( compressableMimeType, compression, compressionMinSize ) 을 추가 한다.

```
<Connector 
URIEncoding="UTF-8"        
noCompressionUserAgents="gozilla, traviata" 
connectionTimeout="20000" 
port="80" 
protocol="HTTP/1.1" 
redirectPort="8443"

compressableMimeType="text/html,text/xml,text/plain,text/javascript,text/css,application/javascript" 
compression="on" 
compressionMinSize="2048"
/>
```

이렇게 속성을 추가하고 톰켓을 껐다 키면 적용된다. 그러면 어떻게 확인할까? postman을 활용하면 데이터 값을 확인 할수 있다. 다른 방법으로 웹사이트에서 압축 전후 데이터 차이를 비교해 주는 곳이 있다.

[참고 사이트](https://www.whatsmyip.org/http-compression-test/?url=d3d3Lm5hdmVyLmNvbQ==)

네이버를 넣어보면 무려 72%를 줄였다고 나오고 내가 관리하는 사이트를 보더라도 66% 정도 감소되었다고 출력된다. 이정도로 완벽하게 웹 페이지 성능이 개선된다고 할수는 없겠지만 적어도 도움이 된다는 것은 알수 있다.

## 왜 이미지는 압축하지 않을까?
위에 compressableMimeType를 보면 어떤 파일을 압축할지 결정하는 부분이다. 텍스트만 압축하고 이미지는 압축하지 않는 것을 알수 있다. 왜냐 하면 이미지는 이미 압축된 형태(jpg)이기 때문에 이미 압축된 형태의 데이터를 또 압축하여 오히려 문제가 발생할수도 있다(압축 푸는 속도 때문에 더 오래 처리될수도 있다.)
이런 문제가 있기 때문에 이미지를 최적화 할때는 이미지 맵을 만들어 활용한다고 한다. 