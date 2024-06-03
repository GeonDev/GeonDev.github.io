---
layout: post
title: Jasypt를 활용하여 서버 설정 암호화 하기
date: 2022-12-06
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

서버 설정을 하면서 자주(?) 하게되는 암호화 설정, 다시 하려고 하면 까먹어서 정리


# 1. Jasypt dependency 추가
특별한 설정 없이 메이븐에 추가하면 된다. 플러그인 설정 없음, 추가 후 메이븐빌드 수행

```
<dependency>
  <groupId>com.github.ulisesbocchio</groupId>
  <artifactId>jasypt-spring-boot-starter</artifactId>
  <version>2.1.2</version>
</dependency>
```


# 2. JasyptConfig 추가


~~~
import org.jasypt.encryption.pbe.PooledPBEStringEncryptor;
import org.jasypt.encryption.pbe.config.SimpleStringPBEConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JasyptConfig {

    private static final String JASYPT_PASSWORD = "암호 코드";

    //선택한 알고리즘
    private static final String JASYPT_ALGORITHM = "PBEWithMD5AndDES";

    @Bean
    public PooledPBEStringEncryptor jasyptStringEncryptor() {
        PooledPBEStringEncryptor encryptor = new PooledPBEStringEncryptor();
        SimpleStringPBEConfig config = new SimpleStringPBEConfig();
        config.setPassword(JASYPT_PASSWORD);
        config.setAlgorithm(JASYPT_ALGORITHM);
        config.setKeyObtentionIterations(1000);
        config.setPoolSize(1);
        config.setProviderName("SunJCE");
        config.setSaltGeneratorClassName("org.jasypt.salt.RandomSaltGenerator");
        config.setStringOutputType("base64");
        encryptor.setConfig(config);
        return encryptor;
    }
}
~~~

암호화 수행을 할 config를 추가한다. 특이사항으로 JASYPT_PASSWORD를 사용하여 암호화를 하는데  
서버 설정으로 지정하거나 환경 변수로 설정하는게 좀더 안전하기는 하다. 다만 담당자가 변경되다 분실되는 경우가 있어 코드에 추가(권장하지는 않음)



## 2.1. JasyptConfig bean 등록

bean을 등록하는 방법은 다양하게 있지만 간단하게 application.yml에 추가하여 등록하였다.
~~~
jasypt:
  encryptor:
    bean: jasyptStringEncryptor
~~~

# 3. Jasypt Encoding Test

설정한 코드를 웹사이트에 넣으면 테스트 가능
> https://www.devglan.com/online-tools/jasypt-online-encryption-decryption

다만 bean 설정이 잘 되었는지 테스트 겸 테스트 코드에 넣어서 보기도 한다.

~~~
import org.jasypt.encryption.pbe.PooledPBEStringEncryptor;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;


@RunWith(SpringRunner.class)
@SpringBootTest
@ActiveProfiles("local")
public class JasyptTest {

    @Autowired
    PooledPBEStringEncryptor jasyptStringEncryptor;

    @Test
    public void jasyptEncryptTest() {
        System.out.println("***** enc: " + jasyptStringEncryptor.encrypt("암호화 할 키"));
    }

    @Test
    public void jasyptDecryptTest() {
        System.out.println("***** dec:" + jasyptStringEncryptor.decrypt(" 암호화된 키 "));
    }
}
~~~



# 4. 암호화된 코드 적용

~~~
datasource:
  url: jdbc:sqlserver://127.0.0.1:1433;databaseName=DB_BASE
  driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
  username: ENC(EDasdfvCxkGv3GHG8EDGHjw3geRoFBh9C+B3pVVCuiY=)
  password: ENC(FcdZgvCxkGvHjw0t2vVtBe3EUARoFBh9C+B3pVVCuiY=)
~~~

별도의 설정 없이 ENC() 암호화된 문구 를 추가하면 설정 끝
