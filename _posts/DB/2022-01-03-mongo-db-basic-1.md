---
layout: post
title: 맥북 M1에서 MongoDB 사용해 보기
date: 2022-01-03
Author: Geon Son
categories: DB
tags: [DB]
comments: true
toc: true
---

> [Doker 설치](https://codewagon.tistory.com/2)
> [MongoDB 설치](https://poiemaweb.com/docker-mongodb)

이 글은 2022년 초에 쓴 것인데, 그때는 M1 맥에서 몽고 DB를 네이티브로 쓰기가 마땅치 않아 도커로 올리는 게 일반적이었다. 지금은 몽고 DB가 ARM64(애플 실리콘)를 공식 지원해서 네이티브로 설치해도 되지만, 그래도 도커로 환경을 격리해 두는 건 여전히 편하다.

지금까지 업무적인 이유로 몽고DB를 사용해볼 일이 없었다.
최근에 로그 시스템을 인수인계 받으면서 내부 시스템에서 몽고 DB를 이용하여 데이터를 수집하고 있다는 것을 알게 되었다.
차후에는 이전될 시스템이기 때문에 아주 깊게 학습할 필요는 없어 보이지만 그래도 알아두면 손해 볼건 없기 때문에
몽고 DB를 어떻게 사용하는지 간단하게 정리해 보려고 한다.

# 1. 도커 설치
첫 설치부터 약간 고생이 생겼는데 지금 사용하는 노트북이 맥북 m1 이라 몽고 DB를 네이티브로 지원하지 않는 것 같다
가상머신으로 리눅스 위에 몽고 DB를 설치해서 돌려보려고도 했는데, 그때는 M1(ARM64)용 가상화나 도구 지원이 부족해서 쉽지 않았다. 리눅스 자체는 ARM64를 지원하지만 그 시점엔 주변 툴들이 아직 못 따라왔던 것 같다.
생각한 방법은 먼저 도커를 설치하고 도커에 MongoDB를 올리는 방법이다.
홈페이지에서 다운로드 하는 방법도 있지만 더 간단한 homebrew를 사용하였다.  

## 1.1. homebrew 최신버전 업데이트
먼저 homebrew를 업데이트 한다. (homebrew는 설치 되어 있다고 생각한다. )

```bash
brew update
```
명령어를 입력하면 homebrew가 최신버전으로 업데이트 된다.
인터넷을 찾아보니 패키지 업데이트가 뜬다는 말이 있던데 나는 발생하지 않았다

## 1.2. Docker 설치

homebrew에 도커가 없을 것 같지는 않지만 검색을 해보면 잘 출력되는 것을 알 수 있다.
```bash
brew search docker
```
![](/images/db/docker_set-eqfrf44d-1.jpg){: .align-center}

이 상태에서 도커를 설치하라는 명령어를 입력한다.  

```bash
brew install --cask docker
```
명령어를 입력해주면 자동으로 도커가 설치되는 것을 확인할 수 있다.
설치가 완료되었다면 command +  space 를 눌러서 docker를 검색해 본다.
최초 실행시에는 권한을 설정하기 위해서 비밀번호를 입력하라고 한다.
비밀번호를 입력하면 다음과 같이 도커 데스크탑이 실행되는 것을 확인할 수 있다.
(물론 도커 데스크탑 앱을 꼭 쓰지 않아도 터미널 명령만으로 컨테이너를 다룰 수 있어서 상관은 없다.)

![](/images/db/docker_set-eqfrf44d-2.jpg){: .align-center}


# 2. MongoDB 설치

도커가 설치되었다면 MongoDB 이미지를 다운 받는다. 터미널에 아래 명령어를 입력한다.
```bash
docker pull mongo
```
실행해보면 약간 반응이 느릴수 있는데 조금 기다리면 다운로드가 완료된다.
완료가 되었다면 터미널에서 도커 이미지를 확인하거나 Docker desktop을 실행해서
다운 받은 도커 이미지를 확인 할 수 있다.

# 3. MongoDB 컨테이너 생성
```bash
docker run --name mongodb-container -v ~/data:/data/db -d -p 27017:27017 mongo
```
다운 받은 이미지를 이용하여 도커 컨테이너를 설정한다. 도커에 익숙하지 않아서 DB를 도커에 설치하면 컨테이너를
삭제했을때 어떻게 데이터를 관리하는지 몰랐는데 마운트를 해서 데이터를 유지할 수 있는 방법이 있었다...

## 3.1. MongoDB 컨테이너 실행
아래 명령어를 이용하거나 도커 데스크탑을 이용하여 컨테이너를 실행, 중지 시킬 수 있다.

```bash
# Docker 컨테이너 확인
$ docker ps -a

# MongoDB Docker 컨테이너 중지
$ docker stop mongodb-container

# MongoDB Docker 컨테이너 시작
$ docker start mongodb-container

# MongoDB Docker 컨테이너 재시작
$ docker restart mongodb-container
```

# 4. MongoDB 컨테이너 접속
생성된 컨테이너 이름을 입력하면 도커 컨테이너에 접속할 수 있다.
```bash
$ docker exec -it mongodb-container bash
root@073c229db4e5:/# mongo
```
![](/images/db/docker_set-eqfrf44d-3.jpg){: .align-center}
정상 실행되면 실행 정보와 함께 mongodb 명령어를 사용할 수 있게 된다.
참고로 이 글을 쓸 당시 mongo 이미지에는 `mongo` 셸이 들어 있었는데, 최신 이미지(6.0 이상)에서는 `mongo` 셸이 빠지고 `mongosh`를 쓰게 바뀌었다.
