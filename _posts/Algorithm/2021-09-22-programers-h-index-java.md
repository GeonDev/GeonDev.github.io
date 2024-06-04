---
layout: post
title: 프로그래머스 H-index (JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42747)



문제 자체는 간단하다. 작성한 논문보다 인용된 개수가 많은 경계를 구하면 된다.
처음에는 '논문 인용수 <= 논문 개수' 가 되는 점을 구하면 된다고 생각했는데

'논문 n편 중, h번 이상 인용된 논문이 h편 이상이고
나머지 논문이 h번 이하 인용되었다면 h의 최댓값'

이라는 조건을 만족하려면 3가지 경우가 발생한다는 것을 알게되었다.

- 논문의 수와 인용된 수가 같을 때
- 논문의 수가 인용된 개수보다 많을 때
- 모든 논문의 인용수가 논문의 수보다 많을 때

조건을 분리하면 이후부터는 간단하게 작성하면 된다.
(아직도 조건을 해석하는 능력이 부족해서 많이 해맸다.)


```
class Solution {
 public int solution(int[] citations) {
        int answer = 0;


        //전체 논문수
        int n = citations.length;

        //내림차순 정렬을 위하여 Integer 배열로 변경
        Integer[] conv = Arrays.stream(citations).boxed().toArray(Integer[]::new);

        //내림차순 정렬
        Arrays.sort(conv, Collections.reverseOrder());        

        for(int i = 0; i<conv.length; i++) {
        	if(conv[i] == i+1 ) {
        		answer = i+1;
        		break;
        	}else if(conv[i] < i+1){
                answer = i;
        		break;
            }

            //모든 논문의 인용수가 작성한 개수보다 많을때
            if(i+1 ==  conv.length){
                answer = i+1;
            }
        }
        return answer;
    }
}
```
