---
layout: post
title: Springboot 데이터베이스 Connection 다중 연결 (mybatis)
date: 2021-10-07
Author: Geon Son
categories: Spring
tags: [Springboot, Mybatis]
comments: true
toc: true
---

>참고 한 블로그
> https://dev-overload.tistory.com/30


보통의 경우 스프링부트로 작성된 어플리케이션은 하나의 DB만 접근하여 사용한다. 아주 가끔 다른 DB의 정보를 가져오거나 역할 분리를 위해 서로 다른 DB에 접근하기도 하는데 어떻게 설정하는지 정의한다.

# 1. application.yml 설정
```
spring:
  master:
    datasource:
      jdbc-url: jdbc:mariadb://localhost:3306/proptech
      username: ENC(LyzpWYaIfBHycYC0uOJw6w==)
      password: ENC(/j9TCvgQDkpQWHi2dq56ag==)
      driver-class-name: org.mariadb.jdbc.Driver
---

spring:
  slave:
    datasource:
      jdbc-url: jdbc:mariadb://localhost:3306/proptech
      username: ENC(LyzpWYaIfBHycYC0uOJw6w==)
      password: ENC(/j9TCvgQDkpQWHi2dq56ag==)
      driver-class-name: org.mariadb.jdbc.Driver

```

단일 연결시 사용하던 URL부분을 jdbc-url로 번경/ connetion 구분을 위한 master, slave 테그 추가 (이름은 임의로 설정할 수 있다./ IDE에서 올바르지 않는 설정으로 출력될 수 있다.) Slave의 경우 여러 개가 될수도 있다.

로그관리를 위해 HikariCP를 활용하여 작성하는 방법도 있는 것 같지만 일단 사용하지 않고 작성한다.

# 2. DataBase Config 작성
각 커넥션에 접속하기위한 Config를 작성한다. @Primary 를 활용하여 해당 DB가 기본값 (Master) 라는 것을 설정할 수 있다.
```
@MapperScan(value = "com.example.demo.mapper.master", sqlSessionFactoryRef = "masterSqlSessionFactory")
```


@MapperScan 어노테이션을 활용하여 어떤 경로의 Mapper를 connection에 연결할지 정의한다. 해당 경로에는 Mapper 인터페이스가 들어가게 된다.
설정한 경로 이외에 영역에서 코드를 작성하면 당연히 인식되지 않음으로 주의한다.

```
sqlSessionFactoryBean.setMapperLocations(applicationContext.getResources("classpath:com/example/demo/mybatis/master/*.xml"));
```
sqlSessionFactory 에서 어떤 경로를 통하여 쿼리문 (xml)을 불러오게 될지 결정한다.

## 2.1. MasterDatabaseConfig.java
```
@Configuration
@MapperScan(value = "com.example.demo.mapper.master", sqlSessionFactoryRef = "masterSqlSessionFactory")
@EnableTransactionManagement
public class MasterDataBaseConfig {
    @Primary
    @Bean(name = "masterDataSource")
    @ConfigurationProperties(prefix = "spring.master.datasource")
    public DataSource masterDataSource() {
        //application.properties에서 정의한 DB 연결 정보를 빌드
        return DataSourceBuilder.create().build();
    }

    @Primary
    @Bean(name = "masterSqlSessionFactory")
    public SqlSessionFactory masterSqlSessionFactory(@Qualifier("masterDataSource") DataSource masterDataSource, ApplicationContext applicationContext) throws Exception {
        //세션 생성 시, 빌드된 DataSource를 세팅하고 SQL문을 관리할 mapper.xml의 경로를 알려준다.
        SqlSessionFactoryBean sqlSessionFactoryBean = new SqlSessionFactoryBean();
        sqlSessionFactoryBean.setDataSource(masterDataSource);
        sqlSessionFactoryBean.setMapperLocations(applicationContext.getResources("classpath:com/example/demo/mybatis/master/*.xml"));
        return sqlSessionFactoryBean.getObject();
    }

    @Primary
    @Bean(name = "masterSqlSessionTemplate")
    public SqlSessionTemplate masterSqlSessionTemplate(SqlSessionFactory masterSqlSessionFactory) throws Exception {
        return new SqlSessionTemplate(masterSqlSessionFactory);
    }
}

```

## 2.2. SlaveDatabaseConfig.java
```
@Configuration
@MapperScan(value = "com.example.demo.mapper.slave", sqlSessionFactoryRef = "slave1SqlSessionFactory")
@EnableTransactionManagement
public class SlaveDataBaseConfig {
    @Bean(name = "slave1DataSource")
    @ConfigurationProperties(prefix = "spring.slave-1.datasource")
    public DataSource masterDataSource() {
        //application.properties에서 정의한 DB 연결 정보를 빌드
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "slave1SqlSessionFactory")
    public SqlSessionFactory slaveSqlSessionFactory(@Qualifier("slave1DataSource") DataSource slave1DataSource, ApplicationContext applicationContext) throws Exception {
        // 세션 생성 시, 빌드된 DataSource를 세팅하고 SQL문을 관리할 mapper.xml의 경로를 알려준다.
        SqlSessionFactoryBean sqlSessionFactoryBean = new SqlSessionFactoryBean();
        sqlSessionFactoryBean.setDataSource(slave1DataSource);
        sqlSessionFactoryBean.setMapperLocations(applicationContext.getResources("classpath:com/example/demo/mybatis/slave1/*.xml"));
        return sqlSessionFactoryBean.getObject();
    }

    @Bean(name = "slave1SqlSessionTemplate")
    public SqlSessionTemplate slaveSqlSessionTemplate(SqlSessionFactory slave1SqlSessionFactory) throws Exception {
        return new SqlSessionTemplate(slave1SqlSessionFactory);
    }
}

```

# 3. Mapper xml파일 정의
Xml 파일 또한 config 에서 설정한 경로에 저장 하여 설정한다

## 3.1. MasterDataBaseMapper.xml
```
<?xml version="1.0" encoding="UTF-8"?>
 <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

 <mapper namespace="com.example.demo.mapper.master.MasterDataBaseMapper">
	<select id="getSalary" resultType="com.example.demo.model.SalaryModel">
		SELECT * FROM SALARY;
	</select>
</mapper>

```

## 3.2. SlaveDataBaseMapper.xml
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.example.demo.mapper.slave1.Slave1DataBaseMapper">
	<select id="getCountry" resultType="com.example.demo.model.CountryModel">
		SELECT * FROM COUNTRY;
	</select>
</mapper>
```

# 4. Mapper interface 정의
config에서 정의한 경로에 Mapper 클래스를 생성, Config에서 경로를 설정해주었기 때문에  @Repository @Mapper 어노테이션이 필요하지 않다.
```
package com.example.demo.mapper.master;

import java.util.List;
import com.example.demo.model.SalaryModel;

public interface MasterDataBaseMapper {
    public List<SalaryModel> getSalary() throws Exception;
}

```

```
package com.example.demo.mapper.slave;

import java.util.List;
import com.example.demo.model.CountryModel;

public interface Slave1DataBaseMapper {
    public List<CountryModel> getCountry() throws Exception;
}

```



# 5. Service 클래스 정의

정의한 mapper 클래스를 활용하여 Service 클래스 작성, Service 클래스 부터는 단일 커넥션으로 작성한 방식과 크게 다르지 않게 정의하여 사용한다. 클래스를 분리하여도 되고 분리하지 않아도 상관없다.
```
@Service
public class MasterDataBaseService {
   @Autowired
   MasterDataBaseMapper masterDataBaseMapper;

   @Autowired
   Slave1DataBaseMapper slave1DataBaseMapper;

   public List<SalaryModel> getSalary() throws Exception {
      return masterDataBaseMapper.getSalary();
   }

   public List<CountryModel> getCountry() throws Exception {
      return slave1DataBaseMapper.getCountry();
   }

```
