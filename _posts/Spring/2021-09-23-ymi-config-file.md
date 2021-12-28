---
layout: post
title: Springboot yml 파일 config로 활용하기
date: 2021-09-23
Author: Geon Son
categories: Spring
tags: [Springboot, Config]
comments: true
toc: true
---



테이블 표시를 위한 항목명을 DB에 저장할지 별도 파일로 저장할지 고민하다가 페이지를 로드 할때마다
DB를 조회하는 것이 싫어서 별도 파일에 저장하기로 하고 알아보다
yml파일을 파싱하여 저장하는 방법을 알게 되었다.

application.yml 파일에 데이터를 저장하면 별도의 팩토리클래스를 만들 필요가 없지만
내가 저장할 데이터는 시스템 설정이 아니라 단순 상수 데이터 이기 때문에
별도 파일을 만들어 관리하고 싶었기 때문에 tableConfig.yml 이라는 파일을 만들고 데이터를 넣었다.

# 1. yml 파일 생성
```
table:
  userColumn:
    - 사용자명
    - 이메일
    - 전화번호
    - 가입
    - 권한
    - 상태
    - 가입일
    - 최근 로그인
    - 탈퇴일
  userSearch:
    - 전체
    - 권한
    - 상태
    - 사용자명
  associateColumn:
    - 조합명
    - 진행 단계
    - 설립일
    - 예상 종료일
    - 실제 종료일
    - 수수료(%)
    - 사업비용
    - 모금비용
    - 토지구매비용
    - 시
    - 구
    - 주소
  associateSearch:
    - 전체
    - 단계
    - 주소
    - 이름
```
사실 yml 파일에는 특별한 기능은 없다. 기존과 비슷하게 계층(?)을 주어 데이터를 넣으면 된다.
아마 properties 형식으로 데이터를 넣었다면 userSearch=전체,권한,상태 ... 와 같은 형태로 데이터를 넣고 Service 단에서 파싱을 하는 방식으로 작업하였을 텐데
yml은 데이터를 넣을 별도의 클래스를 생성하고 이 클래스를 불러오는 방식으로 작업을 한다.

경로는 resource 하위에 바로 넣어주었다. 지금은 yml 파일이 많지 않기 때문에 따로 디렉토리 까지 필요할 것이라고 생각하지는 않았다.



# 2. PropertySourceFactory 생성
```
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PropertySourceFactory;
import org.springframework.lang.Nullable;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Properties;



public class YamlPropertySourceFactory implements PropertySourceFactory {
    @Override
    public PropertySource<?> createPropertySource(@Nullable String name, EncodedResource resource) throws IOException {
        Properties propertiesFromYaml = loadYamlIntoProperties(resource);
        String sourceName = name != null ? name : resource.getResource().getFilename();
        return new PropertiesPropertySource(sourceName, propertiesFromYaml);
    }

    private Properties loadYamlIntoProperties(EncodedResource resource) throws FileNotFoundException {
        try {
            YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
            factory.setResources(resource.getResource());
            factory.afterPropertiesSet();
            return factory.getObject();
        } catch (IllegalStateException e) {
            // for ignoreResourceNotFound
            Throwable cause = e.getCause();
            if (cause instanceof FileNotFoundException)
                throw (FileNotFoundException) e.getCause();
            throw e;
        }
    }
}
```

yml 파싱을 하기전에 먼저 파싱을 위한 팩토리클래스를 만들어야 한다.
사실 이부분의 코드는 크게 신경쓰지 않고 인터넷에 있는 예제코드를 그대로 활용하였다.
대부분의 경우는 yml의 규칙을 잘 지켰다면 큰 문제 없이 사용할 수 있을 것이라고 생각한다.




# 3. TableColumnConfig 생성
```
import com.apt.proptech.util.YamlPropertySourceFactory;
import lombok.Getter;

import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "table")
@PropertySource(value = "classpath:tableConfig.yml", factory = YamlPropertySourceFactory.class)

public class TableColumnConfig {

    private List<String> userColumn;

    private List<String> userSearch;

    private List<String> associateColumn;

    private List<String> associateSearch;

}
```
이제 yml을 파싱하여 저장할 클래스를 생성한다. @Configuration를 선언하여 스프링 빈으로 만들어 스프링에서 관리할수 있도록 선언해주고 @ConfigurationProperties(prefix = "table")를 통하여 yml의 최상위 기호(?)가 어떤 것인지 알려준다.

@PropertySource(value = "classpath:tableConfig.yml", factory = YamlPropertySourceFactory.class) 는 어떤 파일을 파싱할지, 어떠한 팩토리를 사용할지 명시하는데 위에서 생성한 tableConfig.yml, YamlPropertySourceFactory를 불러오도록 한다.

코드에 List들을 보면 userColumn, userSearch으로 tableConfig.yml에서 선언한 이름과 동일하게 변수명을 정의하였다. 이름을 보고 파싱을 하기 때문에 이름이 변경되면 오류가 발생한다.

@Getter @Setter는 파싱을 하고 데이터를 받아오는데 필요하다. @Setter를 설정하지 않으면 파싱된 데이터를 넣을 수 없고 @Getter가 없다면 다른 클래스에 데이터를 전달할 수 없다.




# 4. 테스트 코드 생성

```
@SpringBootTest
class ProptechApplicationTests {

    @Autowired
    private TableColumnConfig tableConfig;

    @Test
    void tableConfig() {

        for(String t1 : tableConfig.getUserColumn()){
            System.out.println("UserCol : " +t1 );
        }

        for(String t2 : tableConfig.getAssociateColumn()){
            System.out.println("AssociateCol : " +t2 );
        }
    }
}

```

간단하게 어떻게 받아온 데이터를 사용하는지 보면 @Autowired를 이용하여 TableColumnConfig를 생성하고 받아오면 된다.
@Autowired를 사용하기 때문에 일반적으로 스프링이 관리하고 있는 클래스에는
큰 무리없이 작동하게 될 것이다.

![centos](/assets/images/it/image-ymi-config-1.png){: .align-center}

테스트를 수행하면 이런 식으로 결과가 나오게 된다.
