---
layout: post
title: 프로그래머스 단속카메라 (JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42884)



문제풀이 방식이 기발하다고 생각했다. 처음에 들어오는 routes를 정렬한다는 생각을 못하고
단속카메라의 위치를 기록하면서 풀었는데 너무 복잡하게 풀렸다.

routes를 정렬해 놓고 출구 위치에 단속카메라를 설치하고
시작위치와 마지막 단속 카메라의 위치를 비교하면 아주 간단한 로직으로 풀수 있다.

 (이런걸 생각하다니 대단...)

```
import java.util.Arrays;

class Solution {
    public int solution(int[][] routes) {
        int answer = 0;  
        int camera = -30001;
        Arrays.sort(routes, (a, b) -> Integer.compare(a[1], b[1]));

        for (int[] route : routes) {
            if (camera < route[0]) {
                camera = route[1]; answer++;
            }
        }

        return answer;
    }
}
```
