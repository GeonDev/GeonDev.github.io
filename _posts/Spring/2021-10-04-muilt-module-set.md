---
layout: post
title: Spring boot 멀티 모듈 (Multi Module) 생성하기 + Maven
date: 2021-10-04
Author: Geon Son
categories: Spring
tags: [Springboot, MultiModule, Maven]
comments: true
toc: true
---

지금까지 프로젝트를 하면서 멀티모듈을 사용해본적이 없다.
멀티모듈은 인터넷강의에서 잠깐 보고 넘어 갔던 부분이였는데 최근 환경이 바뀌면서 멀티모듈로 구성된 프로젝트에 참여하게 되었다.
새롭게 배울것이 많아 좋기도 하지만 동시에 약간 걱정이 되어서 간단하게 기능을 정리해본다.




# 1. 멀티 모듈?


멀티모듈을 사용하는 이유 중 가장 큰 이유는 공통되는 코드를 재사용하고 프로젝트 관리를 용이하기 하기 위해 입니다.
프로젝트를 진행하면서 어드민 페이지와 일반 유저 페이지가 같이 있어야 하는 경우 같은 DB에 접속하기 때문에 서비스 코드들은 대부분 동일하게 작동하는데 프로젝트를 2개로 만들자니 비효율적이면서
동시에 관리하기도 힘들기 때문에 멀티 모듈을 활용하여 화면 영역만 분리하여 사용할수 있게 되고 별도의 서버에서 운영하는 것도 쉬워지게 됩니다.

실무에서는 각 프로젝트별(PC, 모바일) 톰켓 서버를 분리하되 DAO, Service와 같은 공통 기능은 하나로 개발하기 위해서
멀티모듈을 사용한 것으로 보입니다.

![](images/it/1ee73c57image1.png){: .align-center}

테스트 에서는 root-parent라는 프로젝트에 아래에 root-service, root-web이라는 스프링 프로젝트가 모듈로 있는 형태로 제작하였습니다.
이름처럼 service를 수행하는 프로젝트와 web(화면) 부분을 분리하였습니다.




# 2. 프로젝트 구조
일반적인 방식으로 프로젝트를 생성합니다. 저는 인텔리제이를 사용하고 있지만 무료버전을 사용하고 있기 때문에 Spring initializr를 사용하여 프로젝트를 생성하였습니다.

생성된 프로젝트에서 모듈은 간단하게 생성할 수 있습니다.

![](/images/it/1ee73c57image2.png){: .align-center}
인텔리제이 기준으로 FILE - New - Moudle 에 들어가서 모듈을 생성합니다.
이렇게 프로젝트를 생성하면 새로 생성된 모듈은 완전히 비어있는 상태로 생성되기 때문에 src, resource 부분의 값은 넣어 주어야 합니다.
특히 모듈 또한 스프링부트 이기 때문에 WebApplication 클래스 처럼 스프링부트를 시작하기 위한 main 클래스가 반드시 있어야 합니다.

부모영역에 있는 src/resourc는 사용하지 않기 때문에 삭제해주면 됩니다. 결과적으로는 아래와 같은 구조로 프로젝트가 생성됩니다.
![](/images/it/1ee73c57image3.png){: .align-center}




# 3. 프로젝트 의존성

멀티 모듈 프로젝트에서 service 모듈은 다른 모듈이 사용할수 있어야 합니다.
다른 모듈이 service를 사용하기 위해서는 dependency를 추가해 주게 됩니다. 일반적인 라이브러리를 추가하는 방법 처럼 service 모듈을 추가하게 되면 다른 모듈에서 service의 기능을 참조하여 사용할 수 있게 됩니다.

```
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <artifactId>root-parent</artifactId>
        <groupId>com.example</groupId>
        <version>0.0.1-SNAPSHOT</version>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>root-web</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>

    <dependencies>
        <!-- root-service를 참조하도록 설정 -->
        <dependency>
            <groupId>com.example</groupId>
            <version>0.0.1-SNAPSHOT</version>
            <artifactId>root-service</artifactId>
            <scope>compile</scope>
        </dependency>
    </dependencies>


</project>
```

이렇게 pom.xml를 수정하더라고 실제 사용하기 위해 root-web프로젝트에서 @Autowired를 수행하면 com.example.service를 찾을 수 없다는 메세지를 받게 됩니다. 이유는 **스프링부트의 자동검색은 자기 클래스 하위에 있는 것만 검색하기 때문**입니다.

root-web의 하위 패키지는 com.example.web부터 검색하기 때문에 com.example.service를 찾으라고 하면 검색되지 않습니다. 그렇기 때문에 WebApplication 클래스에서 컴포넌트를 어디부터 스켄 할지 지정해 주어야 합니다.

```
@ComponentScan("com.example")
@SpringBootApplication
public class WebApplication {
    public static void main(String[] args) {
        SpringApplication.run(WebApplication.class, args);
    }
}
```
이부분은 간단하게 @ComponentScan()을 추가하는 것으로 해결할 수 있습니다.



# 4. 작동 테스트

먼저 root-service 모듈에 TestService 클래스를 생성합니다.
지금은 테스트 이기 때문에 따로 DB를 연결하지는 않고 간단히 서비스 기능이 동작하게만 제작하였습니다.
```
package com.example.service;

import org.springframework.stereotype.Service;

@Service
public class TestService {

    public String getMessage(){
        return "HELLO";
    }
}
```

이후에 root-web에서 @Autowired를 이용해서 TestService를 사용하는 controller를 제작합니다.

```
package com.example.web;

import com.example.service.TestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class testController {

    @Autowired
    private TestService testService;

    @RequestMapping("/")
    public String index(Model model){
        model.addAttribute("message", testService.getMessage());

        return "index";
    }
}
```

마지막으로 WebApplication을 실행하고 브라우저에서 매핑한 URL로 접근하면 메세지가 출력됩니다.

![](/images/it/1ee73c57image4.png){: .align-center}
