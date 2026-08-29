---
layout: post
title: 맥북 M1에서 mariaDB 완전 삭제 하기
date: 2023-01-01
Author: Geon Son
categories: DB
tags: [MariaDB, Homebrew, Apple Silicon, macOS]
comments: true
toc: true
---

m1 칩이 나오고 심지어 m2 칩이 나온 상태인데 아직도 DB들은 apple silicon 에서 네이티브로 동작되지 않거나 동작이 되더라도 이상한 버그들이 있다.

설정 문제일 수 있지만 설치 후 인텔리제이 연동이 계속 실패했다. mariaDB가 M1을 지원한다고 해서 네이티브로 설치했지만, 개발 DB는 도커에 두는 편이 관리하기 수월했다. 이 글에서는 네이티브 설치를 완전히 삭제하는 방법을 다룬다.


# 1. 서비스 정지 및 삭제

~~~bash
kada@kadaui-MacBookAir ~ % brew services stop mariadb
Stopping `mariadb`... (might take a while)
==> Successfully stopped `mariadb` (label: homebrew.mxcl.mariadb)
kada@kadaui-MacBookAir ~ % brew uninstall mariadb
Uninstalling /opt/homebrew/Cellar/mariadb/10.10.2... (927 files, 208.5MB)
~~~

이런 메시지가 나오면 삭제가 완료 되었지만 완전삭제를 위해서는 내부에 설정 및 생성된 DB도 삭제 해야 한다.
이 과정 없이 DB를 다시 설치하면 이전에 생성했던 DB와 계정을 다시 볼 수 있기 때문에 완전 삭제가 아니다.

# 2. 데이터 및 설정 파일 삭제

~~~bash
kada@kadaui-MacBookAir % cd /opt/homebrew/var
kada@kadaui-MacBookAir var % rm -rf mysql


kada@kadaui-MacBookAir % cd /opt/homebrew/etc
kada@kadaui-MacBookAir etc % rm -rf my.cnf*
~~~

다른 블로그를 찾아보면 여러 위치에 나누어져 있는 파일을 삭제하는데 **brew uninstall mariadb** 를 수행할때
연결된 링크도 삭제되었는지 bin폴더는 따로 삭제할 필요는 없었다.

이렇게 삭제한 뒤 도커로 설치하면 네이티브 환경은 아니지만 DB 연결을 구성할 수 있다.
