---
layout: post
title: 프로그래머스 단체 사진(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/1835)

순열을 통하여 {A, C, F, J, M, N, R, T}로 만들수 있는 전체 경우의 수를 구한 다음 조건에 따라 분리하면 된다.
처음에는 아주 어려운 문제라고 생각했는데 순열을 구하기만 하면 되기 때문에 익숙해지면 빠르게 풀수 있을것 같다.

나같은 경우에는 >, < 조건이 아닐때 를 체크할때 =을 조건에 주지 않거나 break;문을 넣지 않아서 시간 초과가 났다...


### 순열 알고리즘
```
private void perm(String[] arr, boolean[] visit,  int r, String result, List<String> temp) {
	if (r==0) {
	   temp.add(result);
		return;
	}

	for (int i=0; i<arr.length; i++) {
		if (visit[i] != true) {
			visit[i] = true;	            
			perm(arr, visit, r-1, result+arr[i] ,temp);  

			// 해당 글자를 선택하지 않는 경우도 계산해야하기 떄문에 다시 되돌린다.
			visit[i] = false;
		}
	}
}
```
순열 알고리즘은 순서를 지키면서(loop를 돌면서) 해당 글자를 선택할지 선택하지 않을지만 넣어준다.


### 문제 코드

```
import java.util.ArrayList;
import java.util.List;

class Solution
{
    public int solution(int n, String[] data) {
    	int answer = 0;
    	List<String> temp = new ArrayList<String>();

    	String[] arr = {"A", "C", "F", "J", "M", "N", "R", "T"};
    	boolean[] visit = new boolean[arr.length];

    	//나올 수 있는 모든 경우의 수 구하기
    	perm(arr, visit, arr.length, "",temp );

    	System.out.println(temp.size() );

    	for(String result : temp ) {
    			boolean flag = true;

    		for(int i =0; i<n; i++) {   
    			int fp = Math.abs(result.indexOf( String.valueOf(data[i].charAt(0))) - result.indexOf( String.valueOf(data[i].charAt(2))));    					

    			String order = String.valueOf(data[i].charAt(3));
    			int value = Integer.parseInt(String.valueOf(data[i].charAt(4)))+1;

    			if(order.equals("=") ) {
    				if( fp != value ) {
    					flag = false;
    					break;
    				}    				

    			}else if( order.equals(">")) {
    				if( fp <= value ) {
    					flag = false;
    				}

    			}else if(order.equals("<") ) {
    				if( fp >= value ) {
    					flag = false;
    				}
    			}
    		}  

			if( flag) {
				answer++;
			}
    	}

        return answer;
    }

	private void perm(String[] arr, boolean[] visit,  int r, String result, List<String> temp) {
	    if (r==0) {
	       temp.add(result);
	        return;
	    }

	    for (int i=0; i<arr.length; i++) {
	        if (visit[i] != true) {
	            visit[i] = true;	            
	            perm(arr, visit, r-1, result+arr[i] ,temp);    	      
	            visit[i] = false;
	        }
	    }
	}
}

```
