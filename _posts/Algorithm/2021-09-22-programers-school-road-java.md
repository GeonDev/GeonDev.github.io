---
layout: post
title: 프로그래머스 등굣길(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42898)



처음에는 DFS로 푸는게 더 간단하게 해결될거 같아서 DFS로 풀었다.
정확성은 통과하지만 효율성에서 0점을 맞았다.....

```
public class Sol13 {

	int[] xp = {0,1};
	int[] yp = {1,0};
	int answer = 0;

    public int solution(int m, int n, int[][] puddles) {

    	dfs(m,n,puddles,1,1);

        return (answer);
    }

    private void dfs(int m, int n, int[][] puddles, int x, int y ) {


    	//도착점에 왔는지 체크
    	if(x == m && y == n ) {
    		answer++;
    		return;
    	}

    	//장애물에 도달했는지 체크
    	for(int[] t : puddles ) {
    		if(x == t[0] && y == t[1]) {
    			return;
    		}
    	}

    	for(int i =0; i<2; i++) {

    		if(x + xp[i] <= m && y+yp[i] <= n) {
    			dfs(m, n, puddles, x + xp[i], y+yp[i]);
    		}
    	}
    }

}
```

dfs로는 안될거 같아서 DP로 문제를 해결하려 배열에 이동 가능한 값을 저장하고 계산하였다.
그런데 DP로 풀어도 효율성에서는 0점이 나왔다.

이 문제에서는 특이하게도 최단경로의 개수를 1,000,000,007로 나눈 나머지를 return 라는 말이 있는데 질문 게시판에 보니 int 범위를 넘는 값이 나오게 된다는 것을 보게 되었다.

계산되는 값들에 %1000000007을 하면 효율성이 통과 된다.....
이건 좀....

```
public class Sol13_1 {

    public int solution(int m, int n, int[][] puddles) {
        int answer = 0;

        int[][] dp = new int[m][n];

        //물 웅덩이를 표시
        for(int[] t: puddles) {        	
        	dp[t[0]-1][t[1]-1] = -1;
        }


        dp[0][0] = 1;

        for(int i =0; i< m; i++) {
        	for(int j =0; j< n; j++) {

        		if(dp[i][j] != -1) {

        			//오른쪽에서 올수 있는 길이 있는지 확인
            		if(i-1 > -1 ) {            			
            			if(dp[i-1][j] != -1) {
            				dp[i][j] += dp[i-1][j]%1000000007;
            			}        			
            		}


            		//위에서 올수 있는 길이 있는지 확인
            		if(j-1 > -1) {
            			if(dp[i][j-1] != -1 ) {
            				dp[i][j] += dp[i][j-1]%1000000007;
            			}        			
            		}
        		}
        	}
        }

        answer = dp[m-1][n-1]%1000000007;

        return answer;
    }
}
```
