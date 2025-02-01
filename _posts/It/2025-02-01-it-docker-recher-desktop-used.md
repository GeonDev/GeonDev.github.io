---
layout: post
title: Dooker Desktop 대체를 위한 Rancher Desktop 세팅(mac + apache )
date: 2025-02-01
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---

회사 프로젝트에서 개발을 할떄 맥북에 있는 내장 아파치에 도메인 세팅을 한후 로컬 개발을 진행하고 있다. 
문제는 맥북의 OS가 버전 업 될떄 마다 내장 아파치의 설정이 초기화 되어 다시 세팅해야 한다는 번거로움이 있었다. 
이를 조금 개선해보고자 도커를 도입해보려고 했으나 기업에서 Dooker Desktop이 유료화 되어 여러 대안을 찾다가 아직 도커에 익숙하지 않은 팀에서 GUI를 사용할수 있다는 점에서 Rancher Desktop을 사용해보기로 하였다. 

# 1. 도커 클라이언트 설치

~~~
brew install docker
brew install docker-compose
~~~
Homebrew 를 이용하여 도커 클라이언트를 설치한다. 도커 서버는 Rancher Desktop이 대체 하게 된다.

# 2. Rancher Desktop 다운로드

> 공식 사이트 https://rancherdesktop.io/

Rancher Desktop은 도커 이미지 및 컨테이너 관리를 GUI를 통하여 할수 있도록 해준다. 다만 도커 이미지를 직접 실행하는 것은 어렵고 CLI를 활용하여야 한다. 

간혹 설치중 디렉토리 관련 에러가 발생할 경우 필요한 디렉토리를 만들어 주면 된다.

> Insufficient permission to manipulate /usr/local/bin: Error: EACCES: permission denied,access '/usr/local/bin'  

Rancher Desktop이 요구하는 디렉토리 생성
~~~
sudo mkdir -p /usr/local/bin
sudo chown $USER /usr/local/bin
~~~

## 2.1. Apple M3 호환성 이슈(1.17.1 버전)
> 이슈 https://github.com/rancher-sandbox/rancher-desktop/issues?q=M3

m1 초기에도 호환성 이슈가 있었는데 Rancher Desktop에서 도커의 실행 기반이 되는 QEMU가 애플 실리콘과 여러 이슈가 있는 상태이다. 다행히 VZ로 변경하면 사용이 가능하다.
GUI에서 변경해도 되지만 간혹 동작하지 않는 경우가 있어 명령어 수정을 권장한다.

* 설정 초기화 
~~~
rdctl factory-reset
~~~

* VZ 변경 
~~~
 "/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin/rdctl" start --
experimental.virtual-machine.type vz
~~~

GUI에서는 **Preferences-Virtual Machine-Eumlation** 에서 Virtual Machine type을 VZ로 변경하면 된다.

![](/images/it/lhoihiiylkl-1.png){: .align-center}

# 3. 도커 실행 테스트

터미널에서 도커 실행 명령어를 입력하여 도커가 정상적으로 동작하는지 확인한다. "hello-world" 라는 이미지는 다운받지 않았기 때문에 도커 실행시에 해당 이미지가 있는지 검색하고 도커 레파지토리에서 해당 이미지를 다운 받은후 실행하게 된다. 

~~~
docker run hello-world
~~~

아래와 같이 "Hellow from Docker" 라는 메세지를 확인하면 정상적으로 작동한 것이다. 

![](/images/it/sag893hqqwfqe34h3-1.png){: .align-center}

도커가 정상적으로 실행되면 Rancher Desktop에서 도커 컨테이너가 실행되는 것을 확인할 수 있다. 

![](/images/it/asdfawf89341-1.png){: .align-center}

## 3.1 도커 데몬 이슈
터미널에 'docker run hello-world'를 압력했지만  도커가 실행되지 않을수 있다. 아래 메세지는 도커 서비스가 미실행 일 경우 도커 데몬이 작동되고 있지 않다는 메시지가 출력된다. 
> Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker
daemon running?

도커 데몬을 실행시켜 주면 되는 이슈인데 맥OS에서는 공식 문서에 적혀있는 명령어를 인식하지 못하기 때문에 도커 데몬을 동작시킬 수 없다.

~~~
systemctl start docker
service docker start
~~~

위에 명령어는 리눅스 환경에서 도커 데몬을 실행시키는 명령어로 맥OS에서는 해당 커멘드가 없다는 메세지를 확인할수 있다. 위에 명령어 외에 dockerd라고 하는 도커를 포그라운드(foreground) 상태로 실행시키는 명령어가 있지만 이 명령어를 사용하는 것 또한 docker Desktop 설치가 필요하다. 그래서 도커를 실행시키는 colima SDK를 설치하여 도커를 실행시켰다. 

colima도 docker desktop의 유료화를 대체 하기 위한 소프트워어 이기 때문에 도커만 실행 시키려고 했다면 오히려 Rancher Desktop은 필요 없을 수 있다. 다만 GUI를 사용하기 위한 더 좋은 대안이 없기 때문에 중복이지만 추가로 colima를 설치하였다.  

~~~
brew install colima
~~~

colima 설치후 데몬으로 실행 옵션을 추가하면 이후 재부팅시 자동으로 백그라운드에서 도커 데몬이 실행된다

~~~
colima start --daemon
~~~