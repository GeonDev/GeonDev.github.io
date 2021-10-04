---
title:  "CentOS 7 JAVA TOMCAT 환경 구축"
toc: true
toc_sticky: true
categories:
  - Linux
tags:
  - Java
  - Linux
  - OS
  - infra
  - tomcat
---



![centos](/assets/images/linux/Centos-logo-light.svg){: .align-center}

yum을 사용할 수 없는 폐쇠망에서 자바,tomcat 개발환경을 구축하던 방식이다.
최근에는 도커같은 유명한 시스템이 있지만 아주 가끔 인터넷이 연결되지 않는 환경도 있으니까
어떤 방식으로 세팅했는지 기록하였다.



# 1. 설치 환경


| 구분| 내용 | 비고 |
| -------- | -------- | -------- |
| O/S     | CentOS 7 64bit     |     |
| S/W    | jdk-8u171-linux-x64     | JDK1.8.202 버전까지 무료 |
| S/W     |Apache-tomcat-9.0.8     |     |



# 2. JDK 설치 및 환경 설정 방법

**1)  jdk설치 폴더 생성** 

- 설치 경로 : /usr/local/java

```
[root@localhost]# mkdir /usr/local/java
```



2) 설치 경로에 파일 복사 및 jdk 압축 해제 [root 권한]


- 설치 경로 : /usr/local/java
```
[root@localhost java]# tar -xvzf jdk-8u171-linux-x64.tar.gz
```



**3) java링크 폴더 생성**  

- /usr/local/java 폴더 안에 심볼릭 생성
```
[root@localhost java]# ln -s /usr/local/java/jdk1.8.0_171 java
```



**4) 심볼릭 링크 생성 및 자바 버전 설정** 

- 사용가능한 자바 버전을 추가한다.
```
[root@localhost]# alternatives --install /usr/bin/java java /usr/local/java/jdk1.8.0_171/bin/java 1
[root@localhost]# alternatives --install /usr/bin/javac javac /usr/local/java/jdk1.8.0_171/bin/javac 1
[root@localhost]# alternatives --install /usr/bin/javaws javaws /usr/local/java/jdk1.8.0_171/bin/javaws 1
```

- 어떤 버전을 사용할지 강제로 지정한다.
```
[root@localhost]# alternatives --set java /usr/local/java/jdk1.8.0_171/bin/java
[root@localhost]# alternatives --set javac /usr/local/java/jdk1.8.0_171/bin/javac
[root@localhost]# alternatives --set javaws /usr/local/java/jdk1.8.0_171/bin/javaws
```



**5) 환경설정 및 적용** 


- profile 설정 
```
[root@localhost]# vi /etc/profile
```

- 상단에 아래 내용 추가 및 저장
```
JAVA_HOME=/usr/local/java/java
CLASSPATH=$JAVA_HOME/jre/lib:$JAVA_HOME/lib/tools.jar
PATH=$PATH:$JAVA_HOME/bin
export JAVA_HOME CLASSPATH PATH
```

- 설정된 profile 적용 
```
[root@localhost]# source /etc/profile
```



**6) 설정 적용 확인** 

```
[root@localhost]# java -version
[root@localhost]# javac -version
```



# 3. tomcat 설치 및 환경 설정

**1) Tomcat 계정 생성** 
```
[root@localhost]# useradd tomcat
[root@localhost]# passwd tomcat
```

- tomcat 계정으로 변경
```
[root@localhost]# su - tomcat
```

Useradd 로 유저 생성시 옵션에 주의할 것 
(다른 리눅스 버전에서는 -d, -m 옵션을 이용하여 홈 디렉토리를 설정해야 한다.)

패스워드는 계정생성시 입력하지 않아도 되지만 차후 해당 계정으로 접속하기 위해서는 반드시 필요하기 때문에 계정 생성시 넣어주는 것을 추천한다. (패스워드가 짧다는 경고는 무시해도 된다.)



**2) Tomcat 설치 경로 생성** 

- 로그저장을 위한 폴더

```
[tomcat@localhost]# mkdir -p /home/tomcat/logs/tomcat
[tomcat @localhost]# mkdir -p /home/tomcat/webapps
```
mkdir에 -p 옵션을 주어야 하위 디렉토리가 한번에 생성된다.



**3) 톰켓 파일 설치** 

```
[tomcat@localhost]# tar -xvzf apache-tomcat-9.0.41.tar.gz
```



**4) Tomcat 심볼릭 링크 생성** 

```
[tomcat@localhost]# ln -s /home/tomcat/apache-tomcat-9.0.41/ tomcat
```
심볼릭 링크는 바로가기 역할을 수행한다. 정상적으로 링크가 설정되었을 때 계정의 홈 디렉토리에서 ls -al 명령어를 수행하였을 때 다음과 같이 나와야 정상적으로 심볼릭 링크가 지정된 것이다.

```
drwx------. 5 tomcat tomcat      152 Apr 29 15:01 .
drwxr-xr-x. 3 root   root         20 Apr 29 13:39 ..
drwxrwxr-x. 9 tomcat tomcat      220 Apr 29 15:00 apache-tomcat-9.0.45
-rw-r--r--. 1 tomcat tomcat       18 Apr  1  2020 .bash_logout
-rw-r--r--. 1 tomcat tomcat      193 Apr  1  2020 .bash_profile
-rw-r--r--. 1 tomcat tomcat      231 Apr  1  2020 .bashrc
drwxrwxr-x. 3 tomcat tomcat       20 Apr 29 14:58 logs
lrwxrwxrwx. 1 tomcat tomcat       34 Apr 29 15:01 tomcat -> /home/tomcat/apache-tomcat-9.0.45/
-rw-rw-r--. 1 tomcat tomcat 11486964 Apr 29 14:56 tomcat.tar.gz
drwxrwxr-x. 2 tomcat tomcat        6 Apr 29 14:58 webapps

```



**5) 톰캣 시작/정지 스크립트 심볼릭 설정** 

```
[tomcat@localhost]# ln -s /home/tomcat/tomcat/bin/startup.sh /home/tomcat/startup
[tomcat@localhost]# ln -s /home/tomcat/tomcat/bin/shutdown.sh /home/tomcat/shutdown
```
심볼릭 링크를 설정하고 ls-al 을 입력하면 다음과 같이 확인할수 있다.    
```
drwx------. 5 tomcat tomcat      183 Apr 29 15:38 .
drwxr-xr-x. 3 root   root         20 Apr 29 13:39 ..
drwxrwxr-x. 9 tomcat tomcat      220 Apr 29 15:00 apache-tomcat-9.0.45
-rw-r--r--. 1 tomcat tomcat       18 Apr  1  2020 .bash_logout
-rw-r--r--. 1 tomcat tomcat      193 Apr  1  2020 .bash_profile
-rw-r--r--. 1 tomcat tomcat      231 Apr  1  2020 .bashrc
drwxrwxr-x. 3 tomcat tomcat       20 Apr 29 14:58 logs
lrwxrwxrwx. 1 tomcat tomcat       35 Apr 29 15:38 shutdown -> /home/tomcat/tomcat/bin/shutdown.sh
lrwxrwxrwx. 1 tomcat tomcat       34 Apr 29 15:38 startup -> /home/tomcat/tomcat/bin/startup.sh
lrwxrwxrwx. 1 tomcat tomcat       34 Apr 29 15:01 tomcat -> /home/tomcat/apache-tomcat-9.0.45/
-rw-rw-r--. 1 tomcat tomcat 11486964 Apr 29 14:56 tomcat.tar.gz
drwxrwxr-x. 2 tomcat tomcat        6 Apr 29 14:58 webapps

```

톰켓 실행 및 정지는 
/home/tomcat/startup
/home/tomcat/shutdown
을 입력하면 작동된다. 

그냥 startup, shutdown을 입력하면 **bash: startup: command not found**를 출력하니 주의






**6) 환경 변수 생성 <span style="color:red">[root 권한]</span>** 

- profile 설정

```
[root@localhost]# vi /etc/profile
```

- 기존에 추가된 설정을 변경

```
JAVA_HOME=/usr/local/java/java
CATALINA_HOME=/home/tomcat/tomcat
CLASSPATH=.:$JAVA_HOME/lib/tools.jar:$CATALINA_HOME/lib/jsp-api.jar:$CATALINA_HOME/lib/servlet-api.jar
PATH=$PATH:$JAVA_HOME/bin:$CATALINA_HOME/bin
export JAVA_HOME CLASSPATH PATH CATALINA_HOME JRE_HOME
```

- profile 설정 적용

```
[root@localhost]# source /etc/profile
```

- profile 설정 완료 테스트

```
[root@localhost]# echo $CATALINA_HOME
```



**7) tomcat 로그 및 webapp 설정 변경** 

- catalina.sh 수정

```
[tomcat@localhost ~]$ vi /home/tomcat/tomcat/bin/catalina.sh
```



- “catalina.out” 검색하여 경로 아래 내용으로 수정(Vi 편집기에서 :/ catalina.out을 입력)

```
CATALINA_OUT=/home/tomcat/logs/tomcat/catalina.out
```



- server.xml 수정

```
[tomcat@localhost ~]$ vi /home/tomcat/tomcat/conf/server.xml
```



- “logs” 검색하여 경로 아래 내용으로 수정

```
directory=”/home/tomcat/logs/tomcat”
```



- Webapp 적용 폴더 위치 변경 (해당 경로의 폴더에 있는 war파일을 자동으로 풀고 적용한다.)

```
<Host name="localhost"  appBase="/home/tomcat/webapps"
            unpackWARs="true" autoDeploy="true" deployIgnore=".*">
```

deployIgnore=".*"는 리눅스 서버에 배포할때 컨텍스트 루트를 “/”로 하기위한 설정이다. 단 이렇게 설정을 할 경우 빌드를 변경하고 재 배포시에 ROOT디렉토리를 삭제하여야 한다.



- logging.properties 수정

```
[tomcat@localhost ~]$ vi /home/tomcat/tomcat/conf/logging.properties
```




- “logs” 검색하여 경로 아래 내용으로 수정(3개)

```
1catailna.org.apache.juil./AsyncFileHandlerdirectory = home/tomcat/logs/tomcat
2localhost.org.apache.juil./AsyncFileHandlerdirectory = home/tomcat/logs/tomcat
3manager.org.apache.juil./AsyncFileHandlerdirectory = home/tomcat/logs/tomcat
```



**8) 80, 443포트 방화벽 설정 [root 권한]**

```
[root@localhost]# firewall-cmd --permanent --zone=public --add-port=80/tcp
[root@localhost]# firewall-cmd --permanent --zone=public --add-port=443/tcp
[root@localhost]# firewall-cmd --reload
```



**9) 80 -> 8080, 443 -> 8443 포트 포워딩 설정 [root 권한]**

- 포트 포워딩 허용 여부 확인

```
[root@localhost]# sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```




- net.ipv4.ip_forward  값이 1이 아닐 경우

```
[root@localhost]# echo 1 > /proc/sys/net/ipv4/ip_forward
```



- 포트 포워딩 설정

```
[root@localhost]# firewall-cmd --zone=public --add-forward-port=port=80:proto=tcp:toport=8080 --permanent 

[root@localhost]# firewall-cmd --zone=public --add-forward-port=port=443:proto=tcp:toport=8443 --permanent 

[root@localhost]# firewall-cmd --reload
```



- 기타 방화벽 관련 명령어 

  - 허용된 방화벽 포트 확인

  ```
  firewall-cmd --list-all
  ```

  

  - 방화벽 상태 확인

  ```
  firewall-cmd --state
  ```

    

