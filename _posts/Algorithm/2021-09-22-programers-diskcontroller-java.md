---
title:  "프로그래머스 디스크컨트롤러(JAVA)"
description: This page demonstrates typography in markdown.
header: Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42627) 



완벽하게 해결되지 않아 다시 확인 필요

```
import java.util.Arrays;
import java.util.PriorityQueue;

class Solution {
	
	public int solution(int[][] jobs) {
		
		int answer = 0;
		//수행 직후 시간
		int end =0;
		// jobs배열의 인덱스
		int jobIdx = 0;
		//수행된 요청 개수
		int count =0;
		
		//요청시간에 따라 정렬
		Arrays.sort(jobs, (o1,o2) ->(o1[0] - o2[0] ));
		
		PriorityQueue<int[]> pq = new PriorityQueue<int[]>((o1, o2) ->(o1[1] - o2[1]) );
		
		
		while (count < jobs.length ) {
			
			while ( (jobIdx < jobs.length) && (jobs[jobIdx][0] <= end) ) {
				pq.add(jobs[jobIdx++]);
			}
			
			if(pq.isEmpty()) {
				end = jobs[jobIdx][0];
			}else {
				int[] temp = pq.poll();
				answer += temp[1] +end - temp[0];
				end += temp[1];
				count++;
			}
			
		}		
		
		return (int)Math.floor(answer/jobs.length) ;
	}
}
```