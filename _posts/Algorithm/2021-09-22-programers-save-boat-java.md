---
title:  "프로그래머스 구명보트(JAVA)"
description: This page demonstrates typography in markdown.
header: Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42885) 



가장 적은 횟수로 이동하는 방법을 계산하는 문제
간단하게 몸무게 순으로 정렬한 뒤 가장 무거운 사람 + 가장 가벼운 사람이 무게제한을 초과 하는지 계산하면 되는 간단한 문제인데
진짜 문제는 **효율성을 체크**해야 한다는 것이다.



최대한 적은 횟수로 계산해야 되기 떄문에 while문을 1번만 써도 통과 되지 않는다. 그래서 필요한 전략은

- 가장 무거운 사람의 무게/2 가 무게제한 보다 크면 무조건 몸무게가 가벼운 사람과 합칠 수 있다
- 불필요한 연산을 최소화, 예를 들어 (array -> list)로 바꾸는 것 조차 안한다.



처음 통과하지 못한 코드에서도 연산량을 줄이기 위해 첫번째 방법을 적용했지만
sort, array to list 같은 연산들이 많아 효율성에서 탈락이 되었다.


```
public int Solution(int[] people, int limit) {
	int count =0;

	List<Integer> wl = new ArrayList<Integer>();
	for(int t : people) {
		wl.add(t);
	}
	
	Collections.sort(wl,Collections.reverseOrder());

	while (wl.size() > 1) {
		
		if(wl.get(0) > limit/2 ) {
				int temp = wl.get(0) + wl.get(wl.size()-1);
					
					if(temp >limit) {
						wl.remove(0);
					}else {
						wl.remove(0);
						wl.remove(wl.size()-1);
					}    		
				count++;	
		}else {
			break;
		}
	}


	count += (int)Math.ceil((double)wl.size()/2);
	return count;
 }
```

이후에 변수를 늘리더라도 주어진 int[] 를 이용하여 해결하는 방향으로 통과
개인적으로는 직관적으로 값을 삭제하지 않았기 때문에 이 코드가 더럽다고 생각한다

```
public int Solution(int[] people, int limit) {
		 
	 int count = 0;
	 int remain = people.length;
	 int start = 0;
	 int end = people.length-1;
	 
	 Arrays.sort(people);
	 
	 
	 while (remain > 1) {
		 if(people[end] > limit/2 ) {
			
			 int temp = people[start] + people[end];
			 
			 if(temp <= limit) {
				 start++;
				 end--;
				 remain -=2;
				 
			 }else {
				 end--;
				 remain -=1;
			 }
			 
			 count++;	 
		 }else {
			 break;
		 }
	 }
	 
	 count += (int)Math.ceil((double)remain/2);
	 
	return count;
}
```