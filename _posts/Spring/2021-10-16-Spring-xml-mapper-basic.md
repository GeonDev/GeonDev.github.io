---
layout: post
title: Spring xml mapper로 xml 만들기
date: 2021-10-16
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true
---

>[참고 페이지](https://stackify.com/java-xml-jackson/)

이번에 업무를 진행하면서 여러 검색엔진에 데이터 파일 정보를 전달하는 업무를 하게 되었습니다. 어떻게 서버에 있는 정보를 전달할 수 있을지 궁금했는데 URL을 호출하면 데이터를 XML로 만들어서 전달하게 되어 있었습니다. 최근 깃페이지로 블로그를 만들면서 생성한 sitemap.xml과 비슷한 기능입니다만 해본 적이 없는 기능이기 때문에 사용법을 정리합니다.

# 1. pom.xml 설정

```
<dependency>
    <groupId>com.sun.xml.bind</groupId>
    <artifactId>jaxb-impl</artifactId>
    <version>3.0.2</version>
</dependency>

<dependency>
    <groupId>com.sun.xml.bind</groupId>
    <artifactId>jaxb-core</artifactId>
    <version>3.0.2</version>
</dependency>

<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
    <version>2.13.0</version>
</dependency>

```
XmlMapper를 사용하기 위해서는 세개의 라이브러리를 추가하여야 합니다. 이 라이브러리는 자바 클래스를 XML로 변경해주는 기능을 합니다. 특히 jackson-dataformat-xml은 xml 속성을 주는 방법을 가지고 있기 때문에 반드시 추가하여야 합니다.


# 2. xml로 변환 할 모델(POJO) 생성

자바 모델을 생성할 때 xml의 구조를 생각하면서 모델을 생성합니다. xml의 상하 관계(어떤 Xml 테그 안에 있는 지 확인)를 표현하는 방법은 해당 자바 모델을 내부에서 소유하고 있는 관계로 생성하면 됩니다.
예시를 들어 모델을 구성해 보겠습니다.

## 2.1. 루트 모델 생성
```
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@JacksonXmlRootElement(localName = "root")
public class XmlRoot {

    @JacksonXmlElementWrapper(useWrapping = false)
    List<XmlData> dataList = new ArrayList<>();


	@JacksonXmlCData
    @JacksonXmlProperty(localName = "type")
    private String type;


}
```
@JacksonXmlRootElement(localName = "root") 어노테이션을 보면 xml의 최상단 루트를  "root" 라는 테그로 하겠다는 선언이고
List<XmlData> data 데이터를 소유하는 있는 구성이기 때문에 root 아래에 XmlData이 반복되는 형태(테그 data)로 구성됩니다.

@JacksonXmlElementWrapper(useWrapping = false)값을 주게 되면 아래 있는 테그를 하나로 묶는 것이 아니라 개별적으로 떨어지게 구성할 수 있습니다.

```
<root>
    <names>John</names>
    <names>Paul</names>
    <names>George</names>
    <names>Ringo</names>
</root>
```
@JacksonXmlElementWrapper(useWrapping = true)값을 주게 되면 아래 있는 XML 테그를 하나로 묶어서 출력됩니다.
```
<root>
    <dataList>
        <names>John</names>
        <names>Paul</names>
        <names>George</names>
        <names>Ringo</names>
    </dataList>
</root>
```
## 2.2. 하위 모델 생성

```
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlCData;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class XmlData {

    @JacksonXmlCData
    @JacksonXmlProperty(localName = "name")
    private String name;

    @JacksonXmlCData
    @JacksonXmlProperty(localName = "code")
    private String code;
}
```
루트 내부에 들어가는 데이터는 XmlData라고 합니다.
@JacksonXmlCData를 선언해주면 XML 값을 넣을때  <![CDATA[ XML 값]]> 같은 형태로 데이터를 넣어주어
혹시 기호나 부등호 같은 특수문자가 표시되지 않는 것을 방지해 줍니다.

@JacksonXmlProperty는 xml의 구성요소 라는 것을 알려주는 어노테이션입니다. 만약에 해당 값을 테그의 속성으로 넣고 싶다면
@JacksonXmlProperty(isAttribute = true)로 설정해 주면 됩니다.

# 3. 컨트롤러 생성 (XML 반환)

이제 XML을 반환할 컨트롤러를 만들면 작업이 완료 됩니다.  주목할 부분은 XmlMapper mapper 로 실제 자바 클래스를 XML형태로 만들어주는 역할을 수행합니다. 반환값은 단순 스트링 이기 때문에 중간에 값을 바꾸거나 삽입을 하더라도 결과 자체에는 큰 이상은 없습니다.

저같은 경우는 xml 상위에 XML 스키마 (xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance")를 삽입하거나 필요한 설정을 넣어서 만드는 편입니다. (@JacksonXmlProperty만으로는 모든 설정을 만들기는 힘들었습니다. )

```

import com.example.jwt.model.xml.XmlRoot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
public class XmlController {

    @RequestMapping("/xml")
    public ResponseEntity<String> xmlMaker( ){

        XmlRoot root = new XmlRoot();

        XmlMapper mapper = new XmlMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        String result = null;
        try {
            result = mapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }

        return new ResponseEntity<>(result, HttpStatus.OK);
    }
}
```

이런식으로 result를 반환하게 되면 웹 URL을 호출하였을때 XML의 형식을 전달 할 수 있고
실제 개발자 도구를 통해서 데이터를 확인하면 XML 테그 구조를 확인 할수 있습니다.
