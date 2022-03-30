---
layout: post
title: 맥북에서 vhost를 설정하여 로컬에서 도메인으로 접속하기
date: 2022-03-31
Author: Geon Son
categories: IT
tags: [Tomcat, Apache, Web]
comments: true
toc: true
---

# 로컬 URL도 포트없이 출력하는 방법
내부 프로젝트가 여러 도메인의 서버가 동시에 돌아가며 작업되는 서버이다 보니 로컬 테스트 하기가 까다로웠다.
가장 큰 이유는 도메인 호출시 뒤에 붙는 :8080 과 같은 포트번호를 부여하는 것 때문에 자바스크립트로 AJAX를 호출할 때 등
로컬에서 도메인을 직접 호출해야 하는 일이 발생해서 어떻게 해결해야 하는지 정리해보았다.

## 아파치 vhost 사용 설정

~~~
sudo vi /etc/apache2/httpd.conf
~~~

맥북에는 기본적으로 아파치가 설치되어 있다. 설치된 아파치에서 가상호스트 설정(vhost)을 열어주는 설정과
프록시를 사용하겠다는 설정을 열어준다. 해당 페이지를 열어보면 #으로 vhost 설정과 프록시 설정이 주석처리 되어 있다.
해당 내용을 해제 하면 된다. (/vhost , /proxy를 입력하여 해당 내용을들 찾아 수정하면 된다.)

~~~
# vhost 사용
Include /private/etc/apache2/extra/httpd-vhosts.conf

# 프록시 허용
LoadModule proxy_html_module libexec/apache2/mod_proxy_html.so
LoadModule proxy_module libexec/apache2/mod_proxy.so
LoadModule proxy_http_module libexec/apache2/mod_proxy_http.so
~~~


## 포트 포워딩
웹에서 http 통신이 포트번호 없이 호출하는 방법은 생략 가능한 *80 포트로 포트포워딩 설정을 진행하면 된다.
위에서 풀어놓은 vhost 설정을 지정하면 된다.

~~~
# Virtual Hosts
#
# Required modules: mod_log_config
# If you want to maintain multiple domains/hostnames on your
# machine you can setup VirtualHost containers for them. Most configurations
# use only name-based virtual hosts so the server doesn't need to worry about
# IP addresses. This is indicated by the asterisks in the directives below.
#
# Please see the documentation at
# <URL:http://httpd.apache.org/docs/2.4/vhosts/>
# for further details before you try to setup virtual hosts.
#
# You may use the command line option '-S' to verify your virtual host
# configuration.
#
# VirtualHost example:
# Almost any Apache directive may go into a VirtualHost container.
# The first VirtualHost section is used for all requests that do not
# match a ServerName or ServerAlias in any <VirtualHost> block.
#
<VirtualHost *:80>
    ServerAdmin webmaster@dummy-host.example.com
    DocumentRoot "/usr/docs/dummy-host.example.com"
    ServerName dummy-host.example.com
    ServerAlias www.dummy-host.example.com
    ErrorLog "/private/var/log/apache2/dummy-host.example.com-error_log"
    CustomLog "/private/var/log/apache2/dummy-host.example.com-access_log" common
</VirtualHost>
<VirtualHost *:80>
    ServerAdmin webmaster@dummy-host2.example.com
    DocumentRoot "/usr/docs/dummy-host2.example.com"
    ServerName dummy-host2.example.com
    ErrorLog "/private/var/log/apache2/dummy-host2.example.com-error_log"
    CustomLog "/private/var/log/apache2/dummy-host2.example.com-access_log" common
</VirtualHost>

# 이 부분이 추가 되었다.
<VirtualHost *:80>
    ServerName local.abc.com
    ServerAlias tv.local.abc.com vod.local.abc.com onair.local.abc.com
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8180/
    ProxyPassReverse / http://127.0.0.1:8180/
</VirtualHost>
~~~

httpd-vhosts.conf 파일 내부에 새로운 &lt;VirtualHost &#42;&#58;80&gt; 테그를 추가한다.
ServerName은 로컬 호스트 파일 내부에 설정한 도메인을 넣는다.
ServerAlias는  ServerName과 같은 서버이지만 호출 가능한 도메인(별명)을 추가해준다.

ProxyPass에 ServerName을 호출 했을때 불러올 실제 URL을 지정한다.
ProxyPassReverse는 ServerName로 호출했을때 반환할 리버스 프록시 URL을 지정한다.



## 로컬 호스트 파일 변경
위에서 설정한 도메인 들은 로컬에서 실행하는 서버의 도메인 임으로 당연히 DNS서버에서는 불러올수 없다.
따라서 로컬 호스트 파일에 내용을 추가하여야 한다.
~~~
sudo vi /etc/Hosts


## # Host Database #
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
##

127.0.0.1 localhost
127.0.0.1 local.abc.com

~~~

위와 같이 도메인을 추가하고 재부팅 또는 **dscacheutil -flushcache** 를 입력한다.
추가로 아파치를 재시작 명령어 **sudo apachectl start** 를 입력하면
아파치를 재시작하면서 웹브라우저에 local.abc.com만 입력해서 로컬 서버에 접속할수 있게 된다.
