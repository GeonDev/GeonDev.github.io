---
layout: post
title: 로컬 개발 환경에 HTTPS 세팅 방법 (apache)
date: 2024-07-32
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---


>[인증서 구조](https://brunch.co.kr/@sangjinkang/47)


로컬 개발 도중에 React로 개발된 프론트엔드 개발서버와 연동을 할때 HTTP 프로토콜 문제로 CORS 에러가 발생하였다. 개발서버에는 SSL 인증서가 적용되어 있지만 로컬에는 적용되이 있지 않기 때문이다.
개발서버에 있는 인증서를 빼오는 방법도 있겠지만 어차피 로컬 서버에 사용할 인증서 이기 때문에 인증서를 생성해서 로컬 웹서버에 등록하는 방식으로 문제를 해결하려고 한다. 


# mkcert 설치
원래 HTTPS를 적용하려면 공인된 실제 인증 기관(Certificate Authority, CA)으로부터 서명이 된 인증서를 사용하여야 한다. 만약에 인증된 서명이 없는 인증서를 사용한다면 브라우저에 경로를 주기 때문에 인증서를 등록한 수고가 의미없을 수 있기 때문이다.

매우 신기하게도 이런 문제를 해결해주는 라이브러리가 바로 [mkcert](https://github.com/FiloSottile/mkcert) 이다. 
맥에서는 homebrew를 이용하여 설치할 수 있다. 

~~~
brew install mkcert
~~~

간혹 설치를 하다가 에러가 발생하는 경우가 있다. 터미널에 보면 이미 리포팅된 버그라고 나오는 내용이 있을 것이다. [reporting-bugs](https://github.com/Homebrew/homebrew-cask#reporting-bugs) 해당 깃으로 들어가서 안내에 따라 homebrew의 업데이트를 지우고 다시 설치하면 된다. 

~~~
brew update-reset
brew update
~~~

추가로 FireFox를 사용하고 있다면 NSS 라는 것을 설치해 주어야 한다고 한다. 

~~~
brew install nss
~~~

# 인증서 생성
인증서를 적용하려고 하는 최상위 디렉토리로 이동후에 mkcert를 설치해준다. (mkcert -install 명령어 사용) 이렇게 설치를 하면 해당위치에 인증서가 생기게 된다. 디렉토리를 이동하지 않고 인증서를 생성해도 상관은 없다. 단 인증서 가 생성되는 위치는 명령어를 실행한 경로 위치 이기 때문에 인증서를 옮겨야 하기 때문에 인증서 적용 위치에서 설치하는 것이 편리하다. 

설치하면서 많은 보안경고가 나오게 되는데 전부 허용해 주면 된다. 마지막으로 keytool이 없다는 경고가 나오지만 무시해도 상관은 없다.

~~~
jnote@Jnote-MacBookPro-3 IdeaProjects % mkcert -install
Created a new local CA 💥
Sudo password:
The local CA is now installed in the system trust store! ⚡️
Warning: "keytool" is not available, so the CA can't be automatically installed in Java's trust store! ⚠️
~~~


이렇게 명령어를 실행하면 CA ROOT 인증서가 생성되게 된다. 루트인증서의 경로는  mkcert -CAROOT 명령어로 확인할 수 있다. 
(루트 인증서는 인증 회사에서 발행한 인증서로 인증회사의 서명을 가지고 있다.)
~~~
jnote@Jnote-MacBookPro-3 IdeaProjects % mkcert -CAROOT
/Users/jnote/Library/Application Support/mkcert
~~~


이제 루트 인증서를 참조하는 Leaf 인증서를 생성한다. 일반적으로 사용자가 구입하는 SSL 인증서는 Leaf 인증서를 의미한다. HTTPS를 위해 등록할 인증서도 Leaf 인증서 이다.
Leaf 인증서 생성할때 와일드 카드 도메인을 지정하여 생성할수 있다. 

~~~
mkcert "*.aaa.co.kr" localhost 127.0.0.1
~~~

**&#42;.aaa.co.kr** 부분에 원하는 도메인을 입력하면 되고 인증서 명령어를 실행시키면 다음과 같은 결과가 나오게 된다. 

~~~
jnote@Jnote-MacBookPro-3 IdeaProjects % mkcert "*.aaa.co.kr" localhost 127.0.0.1
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
~~~
cd /etc/apache2/

sudo vi httpd.conf
~~~

httpd-ssl.conf을 찾아보면 주석처리 되어 있을텐데 httpd-ssl.conf, mod_ssl.so, mod_socache_shmcb.so의 주석을 제거한다.
~~~

# Secure (SSL/TLS) connections
Include /private/etc/apache2/extra/httpd-ssl.conf

# Note: The following must must be present to support
#       starting without SSL on platforms with no /dev/random equivalent
#       but a statically compiled-in mod_ssl.
#
<IfModule ssl_module>
~~~

~~~
#LoadModule slotmem_plain_module libexec/apache2/mod_slotmem_plain.so
LoadModule ssl_module libexec/apache2/mod_ssl.so
#LoadModule dialup_module libexec/apache2/mod_dialup.so
~~~

~~~
#LoadModule cache_socache_module libexec/apache2/mod_cache_socache.so
#LoadModule socache_shmcb_module libexec/apache2/mod_socache_shmcb.so
#LoadModule socache_dbm_module libexec/apache2/mod_socache_dbm.so
~~~


## httpd-ssl.conf 설정 

~~~
/etc/apache2/extra
sudo vi httpd-ssl.conf
~~~

처음 httpd-ssl.conf 파일을 열면 여러 설명이 있는 것을 알수 있다. 


~~~
<VirtualHost _default_:443>
    DocumentRoot "/var/www/example"
    ServerName example.dev:443

    SSLEngine on
    SSLCertificateFile "/usr/local/apache2/ssl/example.dev.pem"
    SSLCertificateKeyFile "/usr/local/apache2/ssl/example.dev-key.pem"

    ...
</VirtualHost>
~~~