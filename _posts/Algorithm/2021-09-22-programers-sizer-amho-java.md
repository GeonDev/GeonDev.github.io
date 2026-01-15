---
layout: post
title: 프로그래머스 시저 암호(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/12926)



아주 간단한 문제인데, 문자의 순환 처리 구현이 헷갈려 기록한다.
핵심은 각 문자가 대문자인지 소문자인지 확인하고, 알파벳의 시작점('a' 또는 'A')을 기준으로 얼마나 떨어져 있는지 계산하는 것이다.

여기에 이동할 거리 `n`을 더한 후, 전체 알파벳 개수인 26으로 나눈 나머지 연산(`% 26`)을 하면 순환 이동을 구현할 수 있다. 마지막으로 다시 알파벳 시작점을 더해 원래의 문자 코드로 변환한다.

Character.isLowerCase()와 Character.isUpperCase()를 사용하면 ASCII 코드 값 없이 명확하게 대소문자를 구분할 수 있다.

```
public class Solution {
    public String solution(String s, int n) {
        String answer = "";

        for(int i =0; i<s.length(); i++) {
        	char temp =s.charAt(i);
        	if(Character.isLowerCase(temp)) {
                temp = (char) ((temp - 'a' + n) % 26 + 'a');
            } else if (Character.isUpperCase(temp)) {
                temp = (char) ((temp - 'A' + n) % 26 + 'A');
            }
        	answer += temp;
        }

        return answer;
    }
}
```
