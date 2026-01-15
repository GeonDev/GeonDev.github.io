---
layout: post
title: 프로그래머스 단체 사진(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/1835)

순열을 통하여 {A, C, F, J, M, N, R, T}로 만들수 있는 전체 경우의 수를 구한 다음 조건에 따라 분리하면 된다.
처음에는 아주 어려운 문제라고 생각했는데 순열을 구하기만 하면 되기 때문에 익숙해지면 빠르게 풀수 있을것 같다.

문제의 조건에서 두 프렌즈 사이의 간격은 실제 두 프렌즈의 위치(인덱스) 차이와 다릅니다. 예를 들어, "A~C=0"은 A와 C 사이에 아무도 없다는 의미이므로, 두 프렌즈는 바로 옆에 위치해야 합니다. 즉, 위치 차이는 1이 됩니다. 따라서 코드에서는 조건의 숫자 값에 1을 더해서 실제 위치 차이와 비교합니다.

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
재귀 호출을 이용한 순열(Permutation) 알고리즘입니다. `visit` 배열을 사용하여 이미 사용한 문자인지 확인하고, 모든 문자를 한 번씩 사용하여 가능한 모든 순서의 조합을 생성합니다. '해당 글자를 선택하지 않는 경우'는 백트래킹(backtracking) 과정(`visit[i] = false;`)을 의미하며, 이를 통해 다른 순서의 조합을 만들 수 있습니다.


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
