---
layout: post
title: 톰켓 세팅으로 response 크기를 줄여보자 - Gzip 설정
date: 2021-11-22
Author: Geon Son
categories: IT
tags: [Tomcat, Gzip, HTTP Compression, Performance]
comments: true
toc: true
---

# 웹 페이지의 성능을 개선하는 방법
아무래도 백엔드를 공부하고 있기 때문에 웹페이지를 개선하는 작업을 수행하면 대부분 쿼리 수정 정도로 끝나게 되는 것 같다. 하지만 웹 페이지 성능 개선을 하면서 당연히 백엔드 부분만 개선해서는 한계가 있어 다른 방법을 찾아 보다가 response 되는 리소스 사이즈를 줄이는 방법이 있다고 해서 적용해 보았다.

## Gzip

이름에서 알 수 있듯이 압축 시스템이다. 리눅스 시스템에서 제공하는 기본 시스템(?)인지는 모르겠지만 Http 1.1에서 기능을 지원하고 브라우저에서 압축 해제가 가능한 경우 사용이 가능한 것으로 보인다. 크롬은 이미 해당 기능을 지원하고 있고 엣지도 크롬 기반으로 변경되었기 때문에 많은 브라우저에서 지원하는 기능이다.
아마존이나 넷플릭스에서도 적용되어 있는 것을 보면 호환성에 큰 문제는 없을 것이라고 생각한다.

## Gzip 적용
톰켓 7부터 자체적으로 기능을 지원한다고 한다. 웹서버에서 적용할수 있고 서블릿에서 적용할 수 있다. 굳이 톰켓에 기능을 적용한 이유는 웹서버는 별도로 관리해주는 팀이 있기 때문에 내가 직접 해보기에는 약간 부담스러웠다는 이유 정도이다. (상대적으로 간단해 보이기도 했다)

tomcat/conf/ 폴더를 찾고 server.xml을 찾아 Connector 태그에 아래 3개 속성( compressibleMimeType, compression, compressionMinSize ) 을 추가한다.

```xml
<Connector
URIEncoding="UTF-8"        
noCompressionUserAgents="gozilla, traviata"
connectionTimeout="20000"
port="80"
protocol="HTTP/1.1"
redirectPort="8443"

compressibleMimeType="text/html,text/xml,text/plain,text/javascript,text/css,application/javascript"
compression="on"
compressionMinSize="2048"
/>
```

이렇게 속성을 추가하고 톰켓을 껐다 키면 적용된다.

## <span style="background-color:#fff5b1; color:red ">⚠️ 속성명 변경 주의 (Tomcat 8.5 이상)</span>

> 이 글을 처음 쓸 때는 `compressableMimeType`(compress**a**ble) 으로 적었는데,
> **Tomcat 8.5부터 속성명이 `compressibleMimeType`(compress**i**ble) 로 바뀌었다.**
> 철자 하나(a → i) 차이라 놓치기 쉽다. 최신 Tomcat(9/10)에서는 옛 이름을 인식하지 못해
> **설정이 조용히 무시**되므로(에러도 안 난다) 압축이 안 먹는다면 이 철자부터 확인하자.
> 본문 예시는 최신 철자로 수정해 두었다.

### 각 속성의 의미

| 속성 | 의미 |
|------|------|
| `compression` | `off`(기본) / `on` / `force` / 숫자. `on`은 조건이 맞을 때만 압축, `force`는 거의 항상 압축, 숫자를 주면 그 값이 곧 최소 압축 크기가 된다. |
| `compressionMinSize` | 이 크기(byte) 이상인 응답만 압축한다. 기본 2048. 너무 작은 응답은 압축해도 이득보다 CPU 비용이 커서 거른다. |
| `compressibleMimeType` | 압축 대상 MIME 타입 목록. 텍스트 계열만 지정한다. |
| `noCompressionUserAgents` | 압축을 지원한다고 신고하지만 실제로는 버그가 있는 구형 UA를 정규식으로 제외한다. (예시의 gozilla, traviata는 아주 오래된 클라이언트다.) |

## 동작 원리 (Accept-Encoding ↔ Content-Encoding)

Gzip 압축은 서버가 일방적으로 하는 게 아니라 **브라우저와의 협상**으로 이뤄진다.

1. 브라우저가 요청에 `Accept-Encoding: gzip, deflate, br` 를 실어 "압축 받을 수 있다"고 알린다.
2. 서버는 조건(크기·MIME 타입 등)이 맞으면 응답을 압축하고 `Content-Encoding: gzip` 헤더를 붙인다.
3. 브라우저가 그 헤더를 보고 압축을 해제해 렌더링한다.

그래서 압축 여부는 응답 헤더의 **`Content-Encoding: gzip`** 으로 판별한다.

## 제대로 적용됐는지 확인 (curl)

postman이나 외부 사이트도 좋지만, 터미널에서 `curl`로 헤더만 보면 가장 확실하다.
`Accept-Encoding: gzip`을 직접 보내고 응답 헤더를 확인한다.

```bash
curl -s -o /dev/null -D - -H "Accept-Encoding: gzip" https://example.com/
```

응답에 아래 헤더가 보이면 압축이 적용된 것이다.

```
Content-Encoding: gzip
Vary: Accept-Encoding
```

압축 전후 용량을 직접 비교하고 싶다면 헤더 없이/있이 두 번 받아 크기를 비교하면 된다.

```bash
# 압축 미요청 (원본 크기)
curl -s -o /dev/null -w "no-gzip:  %{size_download} bytes\n" https://example.com/
# 압축 요청
curl -s -o /dev/null -w "gzip:     %{size_download} bytes\n" -H "Accept-Encoding: gzip" https://example.com/
```

웹사이트에서 압축 전후 차이를 비교해 주는 곳도 있다.

[참고 사이트](https://www.whatsmyip.org/http-compression-test/?url=d3d3Lm5hdmVyLmNvbQ==)

네이버를 넣어보면 무려 72%를 줄였다고 나오고 내가 관리하는 사이트를 보더라도 66% 정도 감소되었다고 출력된다. 이정도로 완벽하게 웹 페이지 성능이 개선된다고 할 수는 없겠지만 적어도 도움이 된다는 것은 알 수 있다.

## 이미지 압축 제외 이유
위에 compressibleMimeType를 보면 어떤 파일을 압축할지 결정하는 부분이다. 텍스트만 압축하고 이미지는 압축하지 않는 것을 알 수 있다. 왜냐하면 이미지는 이미 압축된 형태(jpg)이기 때문에 이미 압축된 형태의 데이터를 또 압축하여 오히려 문제가 발생할 수도 있다(압축 푸는 속도 때문에 더 오래 처리될 수도 있다.)
이런 문제가 있기 때문에 이미지를 최적화 할때는 이미지 맵을 만들어 활용한다고 한다.

## 실무에서 알아두면 좋은 점

* **압축은 보통 앞단(웹서버/CDN)에서 처리하는 게 더 흔하다.** 이 글에서는 웹서버를 다른 팀이 관리해서 톰켓에 적용했지만, 일반적으로는 리버스 프록시인 Apache(`mod_deflate`)·Nginx(`gzip on`)나 CDN 레이어에서 압축하는 편이 정적 리소스까지 함께 처리하기 좋다. 앞단에서 이미 압축한다면 톰켓에서 중복으로 켤 필요는 없다.
* **요즘은 gzip보다 Brotli(`br`)가 더 좋은 압축률을 낸다.** 브라우저 대부분이 지원하므로 웹서버/CDN을 직접 다룰 수 있다면 Brotli를 우선 고려할 만하다. (톰켓 자체는 gzip만 지원한다.)
* **정적 파일 + sendfile 조합에서는 압축이 안 걸릴 수 있다.** 톰켓이 sendfile로 파일을 그대로 내보내는 경로에서는 압축 단계를 건너뛰므로, 정적 파일까지 압축하려면 앞단에서 처리하는 편이 확실하다.
* **HTTPS + 압축은 BREACH 공격 관점에서 주의가 필요하다.** 응답 안에 비밀값(토큰 등)과 사용자가 제어하는 입력이 함께 반사되는 페이지라면 압축이 정보 노출 측면에서 약점이 될 수 있으니, 민감한 응답에는 무분별하게 적용하지 않는 것이 좋다.
