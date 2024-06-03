---
layout: post
title: SSL 인증서 남은 기간 확인 하는 방법
date: 2022-12-06
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---

# openSSL 명령어 사용
notAfter 를 보고 남은 SSL 기간 확인 가능

~~~
echo '' | openssl s_client -connect 도메인 명:443 | openssl x509 -noout -dates
~~~

예시 naver.com 입력시
notAfter=Jun  7 23:59:59 2023 GMT -> 23년 6월 7일 까지
~~~
jmac@Jmacui-MacBookPro-3 ~ % echo '' | openssl s_client -connect naver.com:443 | openssl x509 -noout -dates
depth=2 C = US, O = DigiCert Inc, OU = www.digicert.com, CN = DigiCert Global Root CA
verify error:num=19:self signed certificate in certificate chain
verify return:1
depth=2 C = US, O = DigiCert Inc, OU = www.digicert.com, CN = DigiCert Global Root CA
verify return:1
depth=1 C = US, O = DigiCert Inc, CN = DigiCert TLS RSA SHA256 2020 CA1
verify return:1
depth=0 C = KR, ST = Gyeonggi-do, L = Seongnam-si, O = NAVER Corp., CN = www.naver.net
verify return:1
DONE
notBefore=May 23 00:00:00 2022 GMT
notAfter=Jun  7 23:59:59 2023 GMT
~~~
