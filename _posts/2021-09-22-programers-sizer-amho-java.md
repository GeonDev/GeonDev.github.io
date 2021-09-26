---
title:  "프로그래머스 시저 암호(JAVA)"
toc: true
toc_sticky: true
categories:
  - Algorithm
tags:
  - Java
  - Programers
  - Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/12926) 



아주 간단한 문제 인데 구현이 잘 안되서 기록한다.
아스키문자로 A-Z 는 65-90 a-z는 97-122 인 것을 참고해서 글자를 밀어주면 된다.

특이점으로 해당 문자가 대문자 인지 소문자 인지 확인하고 시작점을 정한다음
이동할 만큼 거리를 계산한다. 알파벳은 26글자 임으로 %26으로 나누면 루프를 돌게 할수 있다.

간단한 내용인데 생각이 잘 안났다.

Character.isUpperCase(문자) 를 이용하면 해당 글자가 대문자인지 소문자 인지 알수 있다.

```
public class Solution {
    public String solution(String s, int n) {
        String answer = "";
        
        for(int i =0; i<s.length(); i++) {
        	char temp =s.charAt(i);
        	if(temp != ' ') {
        		if(temp >90) {
        			temp = (char)('a' + (temp+n-'A')%26);
        			
        		}else {
        			temp = (char)('a' + (temp+n-'a')%26);
        		}        		
        	}
        	answer += temp;
        }
        
        return answer;
    }
}
```
