---
title:  "프로그래머스 입양 시각 구하기(2)"
categories:
  - Algorithm
tags:
  - SQL
  - Programers
  - Algorithm
  - Mysql
  - Oracle
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/59413?language=mysql)



이 문제의 핵심은 0~23을 값으로 갖고 있는 테이블과 결과를 Join 시키는 것이다.

Mysql과 Oracle 풀이 방법이 다른데 Mysql은 변수를 생성하여 연산을 해주고 
Oracle은 Level을 이용하여 0~23까지의 값을 만들어 준다.

### MySql 풀이

```
SET @hour := -1;

SELECT (@hour := @hour + 1) as HOUR,
(SELECT COUNT(*) FROM ANIMAL_OUTS WHERE HOUR(DATETIME) = @hour) as COUNT
FROM ANIMAL_OUTS
WHERE @hour < 23;
```

### Oracle 풀이

```
SELECT D.lv, NVL(E.cnt,0) 
    FROM
        (SELECT TO_CHAR(DATETIME,'HH24') as HOUR ,COUNT(*) cnt 
            FROM ANIMAL_OUTS GROUP BY TO_CHAR(DATETIME,'HH24')
                ORDER BY HOUR)E, 
        (SELECT (LEVEL-1)lv FROM dual CONNECT BY LEVEL <=24)D
WHERE D.lv = E.HOUR(+) ORDER BY D.lv
```
