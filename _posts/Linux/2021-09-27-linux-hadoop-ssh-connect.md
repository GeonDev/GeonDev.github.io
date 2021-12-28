---
layout: post
title: VirtualBox에서 Hadoop실행을 위한 SSH 설정
date: 2021-09-27
Author: Geon Son
categories: Linux
tags: [Linux, VirtualBox, Hadoop]
comments: true
toc: true
---

hadoop 설치를 하다가 너무 삽질을 많이 해서 기록합니다.
하둡을 설치하면서 착각한 것이 있는데 네임노드에서 만 모든 데이터 노드에 SSH를 설정하면 될줄 알았는데 알고보니 모든 데이터 노드들도 네임노드와 서로 다른 데이터 노드에 SSH를 설정해야 한다는 것, 그리고 방화벽을 꺼야 한다는 점입니다.



# 1. host 설정
hosts 파일은 DNS이전에 다른 컴퓨터로 접근하기 위해 미리 IP를 지정해 놓는 파일이였다고 합니다. 서로 다른 노드들과 간단하게 접근하기 위하여 기록합니다.
ip뒤에 이름은 호스트 이름을 구분하기 위해서 일뿐 특별하게 규칙을 갖지는 않지만 모든 노드들에 같은 설정을 해줍니다.

```
vi /etc/hosts
```

![](/images/linux/48f4067de5fe-image1.png){: .align-center}


# 2. SSH 키 설정

> SSH 설정하기
> https://opentutorials.org/module/432/3742


```
ssh-keygen
```

![](/assets/images/linux/48f4067de5fe-image2.png){: .align-center}

ssh-keygen는 ssh키를 설정하는 명령어로 공개키와 개인키를 만든다. 옵션으로 암호화 방법을 제공하는데 아무것도 입력하지 않으면 rsa로 암호화를 수행한다.

처음에 경로를 지정하고 하는데 엔터를 누르면 디폴트 경로에 파일을 생성한다.
하둡을 설정하면서 비밀번호 없이 다른 SSH에 접근하는 것이 목적이기 때문에 비밀번호를 따로입력하지 않고 엔터를 누르고 확인하라는 메서지가 나오면 다시 엔터를 누른다.
(그냥 모두 엔터 누른다고 생각하면 된다.)

# 3. SSH 인증 키 전달
```
ssh-copy-id -i ~/.ssh/id_rsa.pub hadoop@hadoop01
```

![](/images/linux/48f4067de5fe-image3.png){: .align-center}

SSH 인증을 위해서는 내가 접속하려는 서버에 공개키를 전달하여야 합니다.
전달된 공개 키는 authorized_keys 파일에 전달받은 ssh 키를 입력해야 합니다.

공개키를 전달하는 방법은 여러가지가 있지만 다른 서버에서 전달한 공개키를 삭제하지 않고
전달하기 위한 명령어가 **ssh-copy-id -i [공개키 위치] [계정명]@[서버]** 입니다.

ssh-copy-id -i 명령어를 입력한 후 현재 접속을 유지할지 물어보는 입력창에 yes를 입력하고
접속하려는 계정의 비밀번호(내 비밀번호가 아니라 상대 계정의 비밀번호)를 입력하면 ssh 키가 전달 됩니다.

테스트를 위하여 ssh hadoop01 을 입력하면 비밀번호 없이 접속 가능합니다.
![](/images/linux/48f4067de5fe-image4.png){: .align-center}

# 4. 방화벽 중지


```
// 실행 중인 방화벽 중지 (재 시작시 다시 방화벽 작동)
systemctl stop firewalld
```


```
// 재 시작에도 방화벽 켜지지 않음
systemctl disable firewalld
```

![](/images/linux/48f4067de5fe-image5.png){: .align-center}

방화벽을 끄려면 root 계정 권한을 요구 하기 때문에 root 비밀번호를 입력합니다.
방화벽을 끄지 않으면 ssh 인증 또는 hadoop 구동시에 연결이 되지 않는 경우가 발생하기 때문에 방화벽을 꺼서 hadoop 사용시 통신이 가능하도록 설정합니다.
