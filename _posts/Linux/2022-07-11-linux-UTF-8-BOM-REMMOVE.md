---
layout: post
title: 리눅스에서 UTF-8 BOM 삭제하는 방법
date: 2022-07-11
Author: Geon Son
categories: Linux
tags: [Linux, ENCODING]
comments: true
toc: true
---

닷넷 배포를 하다가 로컬에서는 잘 작동하던 파일이 서버에 올라가면 에러를 발생시킨다.
그것도 매우 이상한 단어를 뿜어내면서 파일이 잘못되었다고 한다. 특히 한글이 깨지는 걸 보면 99% 인코딩 문제다.
그런데 왜? 깨지는 걸까?



# 1. BOM (Byte Order Mark)
이전에 게임을 만들때 BOM이 문제가 된적이 있다. 윈도우에서 cocos2d를 이용하여 어플리케이션을 빌드하고 안드로이드로 넘기면 데이터가 깨진다.
이런 문제가 발생한 이유는 윈도우에서 인코딩 방식을 구분하기 위해 추가한 BOM 때문이다.

![](/images/linux/utf-8-bom-ex-dasg521d46d.png){: .align-center}

위키피디아에서 관련 내용을 찾아보면 인코딩 방식별 추가되는 BOM이 모두 다르다. 처음에는 이 BOM으로 어떤 작업을 할수 있을 줄 알았는데
맥 ->  윈도우로 작업해야 하는 환경에서는 오히려 문제를 발생시키는 골치거리이다. 실제로 **UTF-8 인코딩에 반드시 필요한 것이 아니다.**
그저 보조 정보로 활용되기 때문에 제거 해준다.  

# 2. 맥에서 BOM (Byte Order Mark) 제거 방법
윈도우에서는 notepad++ 라는 좋은 툴이 있는데 맥은 없다. 그냥 vi 편집기로 명령어에서 제거 해주면 된다.
일단 수정하기 원하는 문서(또는 코딩된 파일)을 vi로 열고 시작한다.

~~~
vi 2021-09-29-it-open-Graph-Protocol-what.md
~~~

문서 파일이 열리면 :set nobomb? 을 입력하여 해당 파일에 BOM이 있는지 확인할 수 있다.

```
:set nobomb?

bomb
```

해당파일에 BOM이 있을 경우 bomb 가 출력되고 없을 경우 nobomb가 출력된다.
bomb가 출력된 파일에서 아래 명령어를 입력한 후에 파일을 저장한다.

~~~
:set nobomb
:w
~~~

다시 :set nobomb?를 입력하면 해당파일에 BOM이 삭제 된 것을 알수 있다.
단건 파일에 대해서는 이렇게 처리하면 된다. 만약 파일이 많을 경우에는
별도의 스크립트를 만들어서 실행하는 것이 편리할 것 같다.