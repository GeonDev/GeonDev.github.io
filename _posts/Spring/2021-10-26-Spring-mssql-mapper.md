---
layout: post
title: Mssql Mybatis DB툴과 웹에서 쿼리속도가 다를때 고려해 볼것
date: 2021-10-26
Author: Geon Son
categories: Spring
tags: [MyBatis, MSSQL, PreparedStatement, SQL, Index]
comments: true
toc: true
---

스카우터에서 특정 쿼리를 수행할때 속도가 너무 느리다는 알람이 계속 출력되었다. 출력하는 양이 많아서 그런지 테스트를 해보았는데 조회되는 수량이 없다. 물론 스캔 수가 많을수는 있다지만 쿼리 결과가 0인 쿼리가 속도가 타임아웃이 걸릴 정도로 속도가 느리다니 뭔가 이상하다고 생각했다. 그래서 Mybatis의 쿼리를 DB툴로 가지고 와서 돌려보면 0.01초 만에 해결이 된다. 왜지?!

# 1. MSSQL의 특징

문제가 발생한 조회 조건 컬럼은 `varchar`였다. SQL Server JDBC Driver는 `sendStringParametersAsUnicode`의 기본값이 `true`라 String 파라미터를 Unicode 타입으로 전송한다. `PreparedStatement.setString()`이나 MyBatis의 `jdbcType=VARCHAR`를 사용해도 드라이버가 `VARCHAR`를 `NVARCHAR`로 변환해 서버에 보낸다.

SQL Server에서는 `nvarchar`의 데이터 형식 우선순위가 `varchar`보다 높다. 따라서 nvarchar 파라미터와 varchar 컬럼을 비교하면 우선순위가 낮은 **컬럼 쪽에** `CONVERT_IMPLICIT(nvarchar, ...)`가 적용된다. 이 묵시적 변환 때문에 varchar 컬럼의 인덱스 seek이 막히고 scan으로 실행됐다.

JDBC Driver의 변환은 [Microsoft의 `sendStringParametersAsUnicode` 문서](https://learn.microsoft.com/en-us/sql/connect/jdbc/reference/setsendstringparametersasunicode-method-sqlserverdatasource)에 명시되어 있다. 묵시적 변환 방향은 [SQL Server 데이터 형식 우선순위](https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-type-precedence-transact-sql)를 따른다.

# 2. Mybatis의 특징

MyBatis의 `#{value}`는 `PreparedStatement` 파라미터로 바인딩된다. 문제는 `PreparedStatement` 자체가 아니라 SQL Server JDBC Driver가 String 파라미터를 전송하는 방식이었다.

당시에는 `${value}`를 사용하면 값이 SQL 문자열에 그대로 들어가므로 드라이버의 파라미터 바인딩을 우회할 수 있다고 생각했다. `#{value}`와 `${value}`의 실행 결과가 달랐던 이유도 여기에 있었다.

다만 `${value}`는 작은따옴표나 LIKE 패턴까지 직접 조합해야 한다. 사용자 입력이 포함되면 SQL Injection도 발생할 수 있다. Service나 Controller에서 문자열을 검사하는 방식만으로는 완전히 막을 수 없으므로 최종 해결책으로 사용할 수는 없다.

# 3. 처음 시도한 `${}` 치환

처음에는 `#{value}`를 `${value}`로 바꿨다. String과 LIKE 조건을 사용하려면 작은따옴표와 `%`도 SQL에 직접 넣어야 했다.

```sql
SELECT * FROM table WHERE id LIKE '%' + '${value}' + '%'
```

이 방식에서는 느린 조회가 사라졌지만 SQL Injection 위험이 생겼다. 현재 기준으로는 이 코드를 사용하지 않고 `#{value}`를 유지한다.

# 4. 강제 Typecasting 검토

Mybatis 에는 파라미터의 타입을 명시해줄수 있는 기능이 있다. #{value, jdbcType=VARCHAR}

![](/assets/images/spring/4qui89abgdf-1.png){: .align-center}

`#{value, jdbcType=VARCHAR}`로 지정해도 해결되지 않았다. `sendStringParametersAsUnicode=true`이면 SQL Server JDBC Driver가 `VARCHAR` 파라미터를 `NVARCHAR`로 변환해 전송하기 때문이다. MyBatis의 `jdbcType`과 JDBC Driver의 전송 옵션은 서로 다른 단계의 설정이다.

> https://mybatis.org/mybatis-3/ko/sqlmap-xml.html

## 4.1 강제로 타입 캐스팅 하기

Statement로 쿼리를 넣기에는 보안상 문제가 생길 것 같아 조금 더 조사했다. 첫 번째로 적용한 방법은 `CONVERT()`나 `CAST()`를 사용해 비교할 파라미터의 타입을 `VARCHAR`로 고정하는 것이었다.

```sql
SELECT * FROM table WHERE name = CAST(#{value} AS VARCHAR(50));
SELECT * FROM table WHERE name = CONVERT(VARCHAR(50), #{value});
```

실제로 적용했을 때 Statement로 실행한 것보다는 느렸지만 타임아웃이 발생하는 수준은 벗어났다. 그래서 당시에는 이 방식으로 쿼리를 정리했다.

이 접근 자체가 잘못된 것은 아니다. Unicode로 전달된 파라미터를 비교 전에 `VARCHAR`로 변환하므로 varchar 컬럼 쪽의 묵시적 변환을 피할 수 있다. 단, **컬럼이 아니라 파라미터를 변환해야** 인덱스 seek을 유지할 수 있다.

쿼리마다 캐스팅을 반복해야 하고 길이를 잘못 지정하면 값이 잘릴 수 있다는 한계가 있다. DB collation에서 표현할 수 없는 유니코드 문자도 손실될 수 있다. JDBC 연결 설정을 바꿀 수 없는 상황에서 사용할 임시 대응에 가깝다.

두 번째로 아래와 같은 `/*+ RULE */`도 시험했다. 당시에는 옵티마이저가 쿼리를 바꾸지 않도록 하는 힌트로 이해했다.

```sql
SELECT /*+ RULE */
       e.empno,
       e.ename,
       d.dname
FROM dept d, emp e
WHERE e.deptno = d.deptno;
```

나중에 다시 확인해보니 `RULE`은 Oracle의 과거 옵티마이저 힌트이며 SQL Server 해결책이 아니다. SQL Server에서는 일반 주석으로 처리되므로 당시 성능 변화가 있었다면 `RULE` 힌트 때문은 아니다.

## 4.2 VARCHAR 변수 선언

이렇게 바꾼 뒤에도 느린 쿼리가 남아 있어 아예 `VARCHAR` 변수를 선언해 값을 넣는 방법도 시도했다. 원래 LIKE 문에서 `%`와 작은따옴표가 섞여 가독성이 나쁠 때 사용하던 방식이었다.

```sql
DECLARE @Name VARCHAR(50);
SET @Name = #{value};

SELECT e.empno,
       e.ename
FROM emp e
WHERE e.ename = @Name;
```

미리 선언한 변수에 MyBatis 값을 넘기면 비교 전에 타입을 고정할 수 있었다. 다만 변수 선언 방식이 DBMS마다 다르고 쿼리도 불필요하게 길어진다. 당시에도 정석이라고 보기는 어려웠고, 지금은 원인을 JDBC 연결 설정에서 해결하므로 이 방식을 쓰지 않는다.

## 4.3 JDBC URL 수정

해결은 JDBC URL에 `sendStringParametersAsUnicode=false`를 추가하는 것이다. `#{value}`는 그대로 사용한다.

```yaml
spring:
  datasource:
    jdbc-url: jdbc:sqlserver://DB_HOST:1433;databaseName=DB_NAME;sendStringParametersAsUnicode=false
```

이 설정에서는 `setString()`과 `VARCHAR` 파라미터가 데이터베이스 collation에 맞는 비유니코드 형식으로 전송된다. varchar 컬럼과 파라미터 타입이 같아지므로 컬럼 쪽 묵시적 변환이 사라진다.

반대로 nchar, nvarchar, ntext 컬럼에는 `setNString()` 같은 national character API를 사용해야 한다. JPA에서는 nvarchar 엔티티 필드에 Hibernate `@Nationalized`를 적용했다. 자세한 매핑은 [JPA 적용 과정]({% post_url 2021-11-02-Spring-boot-jpa-set-model %})에 정리했다.
