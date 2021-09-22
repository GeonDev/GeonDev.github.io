---
title:  "프로그래머스 섬 연결하기(JAVA)"
categories:
  - Algorithm
tags:
  - Java
  - Programers
  - Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42861)
> [크루스칼 알고리즘](https://m.blog.naver.com/PostView.nhn?blogId=ndb796&logNo=221230994142&proxyReferer=https:%2F%2Fwww.google.com%2F) 



유명한 최소 신장 트리를 만드는 알고리즘 이라고 한다. 결국 스스로 해결하지는 못했고
알고리즘을 구현하는 것을 보고 만들었다. 대부분 해답의 풀이는 비슷할 것이라고 생각한다.


```
public class Solution {
	 public int solution(int n, int[][] costs) {
	    	
	    	int answer = 0;
	    	int[] parent = new int[n];
	    	
	    	
	    	for(int i =0; i < n; i++) {
	    		parent[i] = i;
	    	}
	    	
	    	
	    	//오름차순 정렬
	    	Arrays.sort(costs,(o1,o2)-> {
	    		return o1[2] -o2[2];
	    	});
	    	
	    	
	    	for(int[]t : costs ) {
	    			
	    		if(!checkUnion(parent, t[0], t[1]) ) {
	    			answer += t[2];
	    			setUinon(parent, t[0], t[1]);
	    		}
	    		
	    	}
	        return answer;
	    }
	    
	    //부모를 찾는다.
	    public int getParent(int[] parent, int a) {    	
			if(parent[a] == a ) {
				return a;
			}else {
			  return getParent(parent, parent[a]);
			}
	    }
	    
        //두 노드를 연결
	    public void setUinon(int[] parent, int a, int b) {
	    	a = getParent(parent, a);
	    	b = getParent(parent, b);
	    	
	    	if(a < b) {
	    		parent[b] = a;
	    	}else {
	    		parent[a] = b;
	    	}
	    }
	    
        //부모가 같은지 체크(연결되어 있는지 확인)
	    public boolean checkUnion(int[] parent, int a, int b) {
	    	a = getParent(parent, a);
	    	b = getParent(parent, b);
	       	
	    	return a==b;
	    }	
}
```

이 문제를 해결하기 위해서는
1. 자식에서 부모를 찾는법

2. 부모가 서로 같은지 확인

3. 두개를 서로 링크 시키는 방법(부모가 작은쪽으로 연결)

이렇게 3가지를 알고 있어야 풀 수 있는 문제이다.



