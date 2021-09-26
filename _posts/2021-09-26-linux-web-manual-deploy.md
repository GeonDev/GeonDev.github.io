---
title:  "Springboot WAR 수동 배포하기"
categories:
  - Linux
tags:
  - IT
  - Linux
  - DataBase 
  - web
  - war
---

스프링부트에서는 기본적으로 Jar 파일을 지원하지만 외부 톰켓을 사용하기 위해(JSP를 사용하기 때문에) war를 사용하는 경우가 있었다. 지금 회사 프로젝트는 모두 외부 톰켓을 사용하기 때문에 수동으로 배포하는 법을 기록 해놓는다.

# 프로젝트를 war로 export
pom.xml에서 war 파일 설정

```
<packaging>war</packaging>
```
pom.xml을 수정하였다면 Maven을 통해 빌드하거나 수동으로 프로젝트를 추출한다. 나같은 경우에는 메이븐을 사용하여 추출하지는 않았다.


![](/assets/images/linux/2cdf6514e528-1.jpg)

프로젝트 -> export-> web-> WAR file 선택

이후에 프로젝트 이름과 경로를 지정하면 지정된 위치에 프로젝트명.war 파일이 생김

# FTP 프로그램을 사용하여 프로젝트 전송
파일질라, WinSCP 어느 프로그램을 사용하여도 상관 없음
설치된 리눅스 서버에 접근할수 있는 프로그램에서 프로젝트를 전송한다.
회사에서는 톰켓 내부경로를 사용하지 않고 별도의 톰켓폴더를 만들어서 넣어주고 있어 해당 위치에 파일을 넣었다.
![](/assets/images/linux/2cdf6514e528-2.jpg)

기존에 배포가 되고 있는 프로젝트가 있다면 ROOT 폴더와 배포되고 있는 WAR 파일이 있을텐데 삭제하여야 톰켓이 작동할떄 새로 프로젝트를 업데이트 한다.

# Tomcat Server.xml 수정
vi 편집기를 이용하여 톰캣설치경로/conf/server.xml의 내용을 수정한다.
![](/assets/images/linux/2cdf6514e528-3.jpg)


별도 경로가 설정되어 있지 않다면 host 부분의 appBase=webapp 으로 되어 있을 텐데 이부분을 원하는 경로로 변경해 주어야 한다.

그리고 추가할 프로젝트의 값을 넣어준다. 
```
<Context path="" docBase="프로젝트명" reloadable="true">
```

톰켓에 프로젝트 파일을 옮겼다면 톰켓을 다시 실행시킨다.
![](/assets/images/linux/2cdf6514e528-4.jpg)

# Tomcat log 실시간 확인
배포중 문제가 생겨서 톰켓의 로그를 확인하고 싶다면 다음 명령어를 실행하면 된다.
tail -f home/tomcat/logs/tomcat/catalina.out 

톰캣 로그 경로를 별도 설정하였기 때문에 이런 상태이고 상황에 맞추어 catalina.out을 tail -f로 열면 실시간으로 로그를 볼수 있다.
![](/assets/images/linux/2cdf6514e528-5.jpg)

실시간으로 보는 것을 중지하려면 Ctrl + c 를 누르면 된다.

