---
title:  "프로그래머스 신규아이디(JAVA)"
description: This page demonstrates typography in markdown.
header: Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/72410) 



정규식을 사용하면 문제를 빠르고 간단하게 해결 할 수 있다.
전체 규칙을 알수는 없고 간단한 몇개는 기억하면 좋을 거 같아 작성한다.

```
class Solution {
    public String solution(String new_id) {
        String answer = new_id.toLowerCase(); 
		
        //0-9, a-z, -, _, . 을 제외한 모든 문자를 ""으로 변경
        answer = answer.replaceAll("[^-_.a-z0-9]", ""); 
        
        //.이 연속해서 2개 이상 이어지면 "."으로 변경
        answer = answer.replaceAll("[.]{2,}", "."); 
        
        //시작이 .이거나 끝이 .이면 ""로 변경
        answer = answer.replaceAll("^[.]|[.]$", "");    
        
        if (answer.equals("")) {   
            answer += "a";
        }

        if (answer.length() > 15) {   
            answer = answer.substring(0, 15);
            answer = answer.replaceAll("[.]$","");
        }

        if (answer.length() <= 2) {  // 7단계
            while (answer.length() < 3) {
                answer += answer.charAt(answer.length()-1);
            }
        }

        return answer;
    }
}
```
