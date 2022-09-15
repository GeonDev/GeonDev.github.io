---
layout: post
title: 맥북 루트 폴더 경로에 접근 할수 있도록 심볼릭 링크를 추가하기(big sur 이상)
date: 2022-09-15
Author: Geon Son
categories: IT
tags: [Tomcat, Apache, Web]
comments: true
toc: true
---

# 맥북 루트 경로에 폴더 추가
로컬에서 리눅스 서버와 비슷한 경로 세팅을 위하여 맥북 루트 경로에 폴더를 생성해 보았다.
Read only 라는 경고가 출력되고 폴더가 생성되지 않는다. 빅서 이후부터는
편법으로 사용하던 설정이 불가능하고 보안상 루트경로에 폴더 생성을 할수 없다.

![](/images/it/sdgt546ghfd-sdfg.png){: .align-center}

# 맥북 심볼릭 링크 추가
단 바로가기(심볼릭 링크)는 설정할수 있는데 리눅스 서버처럼 ln 명렁어가 아니라
별도의 파일에 기록을 하면 자동으로 심볼릭 링크를 만들어 준다.

심볼릭 링크의 실제 주소는 사용자 계정의 하위 폴더로 생성하면 된다.
폴더를 만드는 순서는 중요하지 않다. 원래 만들어져 있는 폴더에 심볼릭 링크를 추가하던
심볼릭 링크를 만들고 폴더를 새로 만들던 의미 없다.

~~~
sudo vi /etc/synthetic.conf

box     /Users/[사용자 계정명]/box
nas2    /Users/[사용자 계정명]/nas2
~~~
이렇게 파일을 작성하고 재부팅을 한후에 루트 폴더에서 확인을 해보면
![](/images/it/gh4r8g9hgerj3.png){: .align-center}
심볼링 링크가 적용된 것을 볼수있다.
