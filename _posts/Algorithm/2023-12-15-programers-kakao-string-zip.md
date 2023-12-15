---
layout: post
title: 프로그래머스[2020 KAKAO BLIND RECRUITMENT] / 문자열 압축

date: 2023-12-15
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://school.programmers.co.kr/learn/courses/30/lessons/60057)

카카오 문제 답게 문제 해석이 어렵고 반례에 많은 함정이 숨겨저 있다.
내가 해석한 풀이 과정은 다음과 같다.

1. 문자열을 1개 이상의 단위로 잘라라 -> 단, 잘라지지 않을 경우 남은 부분은 버리지 말고 뒤에 붙여라
2. 문자열을 자를때 무조건 같은 단위로 자를수 있다. (3개 2개 3개와 같은 형태로 자를수 없다.)
3. 문자열의 압축은 앞에서 부터 연속한 단어만 압축할 수 있다.
4. 압축된 문자열의 길이를 비교하면서 최소값을 구해라

문제해석에서만 최소 3번의 루프가 있고 문제 구현중에는 이중 루프도 포함되어 있어 성능상 좋지도 않지만
구현 하기도 다소 까다로운 형태였다. 
디버그모드를 보면서 해결하긴 했지만 실제 코딩테스트에서는 디버그모드를 못쓰게 하는 경우가 많아 풀기 쉽지 않아보인다.


### 문제 코드

```
import java.util.ArrayList;
import java.util.List;


class Solution {
    public int solution(String s) {
        int answer = s.length();

        for (int i = 1; i < s.length() - 1; i++) {

                int c = s.length() / i;
                
                if(c > 1 ){
                    String r = s.substring(c*i);
                    String sr = s.substring(0, c*i);

                    List<String> tList = new ArrayList<>();
                    for (int j = 0; j < c; j ++) {
                        tList.add(sr.substring(j * i , (j * i) + i ));
                    }

                    String key = tList.get(0);
                    int count = 1;
                    StringBuilder temp = new StringBuilder();
                    for (int k = 1; k < tList.size(); k++) {

                        if (key.equals(tList.get(k))) {
                            count ++;

                            if (k == tList.size()-1){
                                temp.append(count);
                                temp.append(key);
                            }

                        }else {
                            if(count > 1){
                                temp.append(count);
                            }
                            count = 1;

                            temp.append(key);
                            key = tList.get(k);

                            if (k == tList.size()-1){
                                temp.append(key);
                            }
                        }
                    }

                    if(!r.isEmpty()){
                        temp.append(r);
                    }

                    if(answer > temp.length()){
                        answer = temp.length();
                    }
                }
                
        }
        return answer;
    }
}

```
