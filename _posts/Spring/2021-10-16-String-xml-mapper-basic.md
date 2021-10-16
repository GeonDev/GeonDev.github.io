---
title:  "Spring xml mapper로 xml 만들기"
toc: true
toc_sticky: true
categories:
  - Spring
tags:  
  - Web
  - Java
  - SpringBoot
  - Xml
  - XmlMapper
---

>[참고 페이지](https://stackify.com/java-xml-jackson/)


이번에 업무를 진행하면서 여러 검색엔진에 데이터 파일 정보를 전달하는 업무를 하게 되었습니다. 어떻게 서버에 있는 정보를 전달할 수 있을지 궁금했는데
URL을 호출하면 데이터를 XML로 만들어서 전달하게 되어 있었습니다. 최근 깃페이지로 블로그를 만들면서 생성한 sitemap.xml과 비슷한 기능입니다.

1. pom.xml 설정

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
XmlMapper를 사용하기 위해서는 두개의 라이브러리를 추가하여야 합니다. 이 라이브러리는 자바 클래스를 XML로 변경해주는 기능을 합니다.

#2. xml로 변환 할 모델(POJO) 생성
자바 모델을 생성할 때 xml의 구조를 생각하면서 모델을 생성합니다. xml의 상하 관계(어떤 Xml 테그 안에 있는 지 확인)를 표현하는 방법은
해당 자바 모델을 내부에서 소유하고 있는 관계로 생성하면 됩니다. 예시를 들어 모델을 구성해 보겠습니다.

##2.1 루트 모델 생성
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

##2.2 하위 모델 생성

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


#3. 컨트롤러 생성 (XML 반환)

이제 XML을 반환할 컨트롤러를 만들면 작업이 완료 됩니다. 
```
import com.example.jwt.model.xml.XmlRoot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
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