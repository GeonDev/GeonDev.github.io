---
layout: post
title: 로컬 개발 환경에 HTTPS 세팅 방법 (apache)
date: 2024-07-25
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---

## <span style="background-color:#fff5b1; color:red ">최초 작성 시 동작하지 않던 문서를 보강했습니다.</span>

처음 이 방법을 따라 했을 때 HTTPS가 정상 동작하지 않았다.
원인을 추적해보니 설정에 몇 가지 빠진 부분이 있었고, 아래 본문에 그 보강 내용을 반영했다.
실패 원인 요약은 맨 아래 **"실패 원인과 보강 포인트"** 에 따로 정리해두었다.

>[인증서 구조](https://brunch.co.kr/@sangjinkang/47)


로컬 개발 도중에 React로 개발된 프론트엔드 개발서버와 연동을 할때 HTTP 프로토콜 문제로 CORS 에러가 발생하였다. 개발서버에는 SSL 인증서가 적용되어 있지만 로컬에는 적용되어 있지 않기 때문이다.
개발서버에 있는 인증서를 빼오는 방법도 있겠지만 어차피 로컬 서버에 사용할 인증서 이기 때문에 인증서를 생성해서 로컬 웹서버에 등록하는 방식으로 문제를 해결하려고 한다. 

로컬 개발을 할때 여러 인스턴스를 한번에 띄운 상태에서 개발을 하는 환경으로 구성되어 있다.
대부분 예제는 이런 문제를 어떻게 해결했는지에 대한 내용이 없는데 리버스 프록시를 활용하여 외부 에서는 443 포트로 접근하고 내부에서는 알맞은 포트로 접근하도록 수정하였다. 

# mkcert 설치
원래 HTTPS를 적용하려면 공인된 실제 인증 기관(Certificate Authority, CA)으로부터 서명이 된 인증서를 사용하여야 한다. 만약에 인증된 서명이 없는 인증서를 사용한다면 브라우저에 경고를 주기 때문에 인증서를 등록한 수고가 의미없을 수 있기 때문이다.

매우 신기하게도 이런 문제를 해결해주는 라이브러리가 바로 [mkcert](https://github.com/FiloSottile/mkcert) 이다. 맥에서는 homebrew를 이용하여 설치할 수 있다. 

~~~bash
brew install mkcert
brew install nss # Firefox 지원을 위해 필요
~~~

간혹 설치를 하다가 에러가 발생하는 경우가 있다. 터미널에 보면 이미 리포팅된 버그라고 나오는 내용이 있을 것이다. [reporting-bugs](https://github.com/Homebrew/homebrew-cask#reporting-bugs) 해당 깃으로 들어가서 안내에 따라 homebrew의 업데이트를 지우고 다시 설치하면 된다. 

~~~bash
brew update-reset
brew update
~~~

# 루트 인증서 생성
인증서를 적용하려고 하는 최상위 디렉토리로 이동후에 mkcert를 설치해준다. (mkcert -install 명령어 사용) 이렇게 설치를 하면 해당위치에 인증서가 생기게 된다.

디렉토리를 이동하지 않고 인증서를 생성해도 상관은 없다. 단 리프 인증서가 생성되는 위치는 명령어를 실행한 경로 위치 이기 때문에 나중에 관리를 위하여 인증서를 옮겨야 해서 인증서를 저장할 위치에서 실행해 주는 것이 편리하다. 

설치하면서 많은 보안경고가 나오게 되는데 전부 허용해 주면 된다. 마지막으로 keytool이 없다는 경고가 나오지만 무시해도 상관은 없다.

~~~text
MacBookPro-3 IdeaProjects % mkcert -install
Created a new local CA 💥
Sudo password:
The local CA is now installed in the system trust store! ⚡️
Warning: "keytool" is not available, so the CA can't be automatically installed in Java's trust store! ⚠️
~~~


이렇게 명령어를 실행하면 CA ROOT 인증서가 생성되게 된다. 루트인증서의 경로는  mkcert -CAROOT 명령어로 확인할 수 있다. (루트 인증서는 인증 회사에서 발행한 인증서로 인증회사의 서명을 가지고 있다.)
~~~text
MacBookPro-3 IdeaProjects % mkcert -CAROOT
/Users/name/Library/Application Support/mkcert
~~~

![](/images/it/3djprgop2hfgergtgegerh.svg.png){: .align-center}

이제 루트 인증서를 참조하는 Leaf 인증서를 생성한다. 일반적으로 사용자가 구입하는 SSL 인증서는 Leaf 인증서를 의미한다. HTTPS를 위해 등록할 인증서도 Leaf 인증서 이다.
Leaf 인증서 생성할때 와일드 카드 도메인을 지정하여 생성할 수 있다. 

~~~bash
mkcert "*.aaa.co.kr" localhost 127.0.0.1
~~~

**&#42;.aaa.co.kr** 부분에 원하는 도메인을 입력하면 되고 인증서 명령어를 실행시키면 다음과 같은 결과가 나오게 된다. 

~~~text
MacBookPro-3 IdeaProjects % mkcert "*.aaa.co.kr" localhost 127.0.0.1
Note: the local CA is not installed in the Java trust store.
Run "mkcert -install" for certificates to be trusted automatically ⚠️

Created a new certificate valid for the following names 📜
 - "*.aaa.co.kr"
 - "localhost"
 - "127.0.0.1"

Reminder: X.509 wildcards only go one level deep, so this won't match a.b.aaa.co.kr ℹ️

The certificate is at "./_wildcard.aaa.co.kr+2.pem" and the key at "./_wildcard.aaa.co.kr+2-key.pem" ✅

It will expire on 25 October 2026 🗓

~~~

명령어 실행 위치에 가면 2개의 파일이 생성된 것을 알 수 있다
_wildcard.aaa.co.kr+2.pem
_wildcard.aaa.co.kr+2-key.pem


# Apache httpd 적용
mac 에는 Apache web 서버가 기본으로 설치되어 있고 로컬 개발을 할때 웹서버에 가상 도메인(vhost)을 등록하여 개발하고 있었다. 
아파치 설치 위치는 다를수 있지만 하위 경로는 대부분 비슷하게 설정되어 있다. 먼저 httpd에서 SSL 설정을 읽을수 있도록 허용하여야 한다.

## httpd.conf 설정 
~~~bash
cd /etc/apache2/

sudo vi httpd.conf
~~~

httpd-ssl.conf을 찾아보면 주석처리 되어 있을텐데 httpd-ssl.conf, mod_ssl.so, mod_socache_shmcb.so의 주석을 제거한다.

~~~apache

# Secure (SSL/TLS) connections
Include /private/etc/apache2/extra/httpd-ssl.conf
~~~

~~~apache
#LoadModule slotmem_plain_module libexec/apache2/mod_slotmem_plain.so
LoadModule ssl_module libexec/apache2/mod_ssl.so
#LoadModule dialup_module libexec/apache2/mod_dialup.so
~~~

~~~apache
#LoadModule cache_socache_module libexec/apache2/mod_cache_socache.so
LoadModule socache_shmcb_module libexec/apache2/mod_socache_shmcb.so
#LoadModule socache_dbm_module libexec/apache2/mod_socache_dbm.so
~~~

### ⚠️ 프록시 모듈 주석 해제 (최초 실패 원인 ①)

여기가 처음에 빠뜨려서 실패했던 부분이다.
이 글의 목적은 단순 HTTPS가 아니라 **443으로 받아 내부 포트로 넘기는 리버스 프록시**이므로,
SSL 모듈만으로는 동작하지 않고 **프록시 모듈**도 함께 켜야 한다.
프록시 모듈이 없으면 아래 `ProxyPass` 지시어를 만났을 때 아파치가 설정 오류로 기동에 실패한다.

`httpd.conf`에서 아래 두 모듈의 주석도 함께 제거한다.

~~~apache
LoadModule proxy_module libexec/apache2/mod_proxy.so
LoadModule proxy_http_module libexec/apache2/mod_proxy_http.so
~~~


### 인증서를 아파치가 읽을 위치로 복사 (최초 실패 원인 ②)

`mkcert`로 만든 인증서는 명령어를 실행한 위치(예: `~/IdeaProjects`)에 생성된다.
하지만 vhost 설정에서는 보통 `/etc/apache2/ssl/` 같은 고정 경로를 참조하므로,
**생성 위치와 설정에서 참조하는 경로가 다르면** 아파치가 인증서를 찾지 못해 기동에 실패한다.
인증서를 참조할 경로로 먼저 복사하고, 파일명을 정확히 맞춘다.

~~~bash
sudo mkdir -p /etc/apache2/ssl
sudo cp _wildcard.aaa.co.kr+2.pem      /etc/apache2/ssl/
sudo cp _wildcard.aaa.co.kr+2-key.pem  /etc/apache2/ssl/
~~~

> ⚠️ 처음 작성한 설정에서는 생성한 파일명(`_wildcard.aaa.co.kr+2.pem`)과
> vhost에서 참조한 파일명이 서로 달랐다. **생성한 파일명과 설정의 경로/파일명은 반드시 일치**해야 한다.

### /etc/hosts 도메인 매핑

브라우저가 `local.aaa.co.kr` 같은 도메인을 로컬로 해석하도록 `/etc/hosts`에 매핑이 있어야 한다.

~~~bash
sudo vi /etc/hosts
~~~

~~~text
127.0.0.1   local.aaa.co.kr tvlocal.aaa.co.kr vodlocal.aaa.co.kr onairlocal.aaa.co.kr
~~~

## httpd-ssl.conf 설정 

~~~bash
cd /etc/apache2/extra
sudo vi httpd-ssl.conf
~~~

처음 httpd-ssl.conf 파일을 열면 여러 설명이 있는 것을 알수 있다.
먼저 파일 상단에 **`Listen 443`** 이 있는지 확인하고(없으면 추가), 기본으로 들어 있는
`<VirtualHost _default_:443>` 예시 블록은 우리가 추가할 블록과 충돌할 수 있으므로 주석 처리한다.

그 다음 아래와 같이 vhost를 작성한다. `SSLCertificateFile`/`SSLCertificateKeyFile`은
위에서 복사한 경로와 정확히 같게 지정한다.

~~~apache
Listen 443

<VirtualHost *:443>
    ServerName local.aaa.co.kr
    ServerAlias tvlocal.aaa.co.kr vodlocal.aaa.co.kr onairlocal.aaa.co.kr

    SSLEngine on
    SSLCertificateFile    "/etc/apache2/ssl/_wildcard.aaa.co.kr+2.pem"
    SSLCertificateKeyFile "/etc/apache2/ssl/_wildcard.aaa.co.kr+2-key.pem"

    ProxyRequests Off
    ProxyPreserveHost On

    <Proxy *>
        Require all granted
    </Proxy>

    # ⚠️ 최초 실패 원인 ③ — 같은 도메인(자기 자신)이 아니라
    # 실제 애플리케이션이 떠 있는 내부 포트로 넘긴다. (예: Tomcat 8180)
    ProxyPass        / http://127.0.0.1:8180/
    ProxyPassReverse / http://127.0.0.1:8180/

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
~~~

도메인이 여러 개라면 위 블록을 도메인·포트별로 복사해 추가하면 된다.
(`ServerName`과 `ProxyPass` 대상 포트만 바꿔주면 된다.)

## 설정 검사 후 재시작

설정을 바꾼 뒤에는 문법 검사를 먼저 하고, 통과하면 아파치를 재시작한다.
`configtest`에서 `Syntax OK`가 나오지 않으면 그 메시지가 곧 실패 원인이다.

~~~bash
sudo apachectl configtest
sudo apachectl restart
~~~

브라우저에서 `https://local.aaa.co.kr` 로 접속해 자물쇠 표시와 함께 정상 응답이 오면 성공이다.

# 실패 원인과 보강 포인트

처음 따라 했을 때 동작하지 않았던 이유는 결국 아래로 정리된다.

| 구분 | 증상 | 원인 | 보강 |
|------|------|------|------|
| ① 프록시 모듈 | 아파치 기동 실패 / ProxyPass 무시 | `mod_proxy`, `mod_proxy_http` 미적재 | 두 모듈 주석 해제 |
| ② 인증서 경로 | 기동 실패(인증서 못 찾음) | 생성 위치·파일명과 설정 참조 경로 불일치 | 참조 경로로 복사 후 파일명 일치 |
| ③ 프록시 대상 | 무한 루프 / 빈 응답 | `ProxyPass`가 자기 도메인(80)을 가리킴 | 실제 백엔드 포트(`127.0.0.1:8180`)로 지정 |
| ④ 기타 | 연결 안 됨 / 접근 거부 | `Listen 443` 누락, 기본 vhost 충돌, 2.2 구문(`Order/Allow`) | `Listen 443` 확인, 기본 블록 주석, 2.4 구문 `Require all granted` |

> 참고: 이후에는 OS 업데이트마다 내장 아파치 설정이 초기화되는 문제 때문에,
> 같은 리버스 프록시를 **Docker 컨테이너**로 옮겨 관리하는 방식으로 전환했다.