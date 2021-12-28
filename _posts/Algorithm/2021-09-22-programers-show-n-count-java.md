---
layout: post
title: 프로그래머스 N으로 표현 (JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42895)

문제 설명에는 사칙연산이라고 되어 있지만 실제로는 사칙연산 + NN(숫자를 이어 붙이는 것)이 포함되어 있다.
처음에는 그냥 한단계 씩 내려가면서 전단계 결과에 사칙연산과 NN을 해주면 된다고 생각했는데
그냥 전단계결과값 + 사칙연산을 하면 (NN +N+N) 이나 (NN +NN+ N+N) 과 같은 결과 N을 일부 연속으로 사용하고 나머지 연산은 사칙연산으로 계산하는 경우를 구할수가 없었다.

결국 해답을 보고서야 왜 이런 식으로 계산 했는지 알게 되었다.

```
public class Solution {
	int answer = -1;

    public int solution(int N, int number) {


    	if(N == number) {
    		return 1;
    	}

    	dfs(N,number,1, N);

        return answer;
    }


    private void dfs(int N, int number, int count, int value) {

    	if(count > 8) {
    		return;    		
    	}

    	if( count < answer || answer == -1) {
    		if(value == number ) {
    			answer = count;
    			return;
    		}
    	}

    	int temp = N;

        //NN +N +N과 같은 연산도 계산하기 위하여
        //NN + 나머지 6단계의 계산을 수행한다.
    	for(int i = 0; i<8-count; i++ ) {
    		dfs(N,number,count+1+i, value+temp);
        	dfs(N,number,count+1+i, value-temp);
        	dfs(N,number,count+1+i, value*temp);
        	dfs(N,number,count+1+i, value/temp);

        	temp = (temp*10)+N;

    	}
    }

}
```
