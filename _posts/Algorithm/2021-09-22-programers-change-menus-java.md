---
layout: post
title: 프로그래머스 메뉴 리뉴얼(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/72411)



주어진 배열에서 특정 개수로 이루어진 조합을 구하고
해당 조합을 포함하는 주문이 가장 많은 것만 모아서 가지고 온다는 문제로
아주 어려운 알고리즘을 사용하지는 않았는데 구현하는 량이 많은 문제 였다.

### 조합 알고리즘

```
private static void combination(List<Character> list,  int r, int start, String result, List<String> temp) {
	if (r == 0) {
		temp.add(result);
		return;
	}

	for (int i = start; i < list.size(); i++) {
		// 재귀 호출을 통해 다음 문자를 포함하는 새로운 조합을 만든다.
		// result + list.get(i)는 새로운 문자열을 생성하여 전달하므로, 현재 함수의 result 변수에는 영향을 주지 않는다.
		combination(list, r - 1, i + 1, result + list.get(i), temp);
	}
}
```

재귀 호출을 이용한 조합(Combination) 알고리즘입니다. DFS(깊이 우선 탐색)와 백트래킹을 이용하여 가능한 모든 문자 조합을 생성합니다.

`start` 파라미터를 이용해 한번 사용한 요소는 다시 사용하지 않도록 하여 중복 조합을 방지합니다. 예를 들어, 'A'를 사용했다면 다음 요소는 'A' 이후의 문자부터 탐색을 시작합니다.

이후에 특별한 문제는 없는데 소팅을 여러번 요구한다는 점과 메뉴가 주문되었는지를 확인할 때
순서에 상관없이 해당 메뉴 묶음이 모두 포함되어 있다면 주문되었다고 한다는 점이 특이하다.



### 문제 해결 코드

```
public class Solution {

    public String[] solution(String[] orders, int[] course) {        


    	List<Character> menuList = new ArrayList<Character>();

    	List<String> cookList = new ArrayList<String>();

    	Map<String, Integer> courseList = new LinkedHashMap<String, Integer>();

    	List<String> answer = new ArrayList<String>();


    	for(int  i=0; i< orders.length; i++) {
    		for(int j =0; j< orders[i].length(); j++) {
    			if(!menuList.contains(orders[i].charAt(j))) {
    				menuList.add(orders[i].charAt(j));
    			}
    		}
    	}

    	Collections.sort(menuList);


		for (int j = 0; j < course.length; j++) {
			combination(menuList, course[j], 0, "", cookList);
		}


        //해당 조합이 몇번이나 주문되었는지 체크
        for(int i =0; i < cookList.size(); i++ ) {     	
        	for(int j =0; j<orders.length; j++) {        	 
	        	if(isContains(orders[j], cookList.get(i))) {
	        		courseList.put(cookList.get(i), courseList.getOrDefault(cookList.get(i),0)+1 );
	        	}        		
        	}
        }

       for(String key : courseList.keySet() ) {
    	   int max = maxValues(courseList, key.length());

    	   if(max == courseList.get(key) && max >=2 ) {
    		   answer.add(key);
    	   }
       }

       Collections.sort(answer);


        return answer.toArray(new String[answer.size() ]);

    }


    private boolean isContains(String origin, String val ) {

    	boolean flag = true;

    	char[] vals = val.toCharArray();

    	for(int i =0; i<vals.length; i++) {
    		if(!origin.contains(String.valueOf(vals[i])) ){
    			flag = false;
    			break;
    		}

    	}

    	return flag;    	
    }



	private static void combination(List<Character> list,  int r, int start, String result, List<String> temp) {
		if (r == 0) {
			temp.add(result);
			return;
		}

		for (int i = start; i < list.size(); i++) {
			combination(list, r - 1, i + 1, result + list.get(i), temp);
		}
	}

    //특정 문자열 개수 중에 가장 많이 겹친 개수
    private int maxValues(Map<String, Integer> map, int size) {

    	int count =0;

    	for(String key : map.keySet()  ) {
    		if(key.length() == size  ) {
        		if(count < map.get(key)) {
        			count = map.get(key);
        		}
    		}
    	}

    	return count;
    }
}
```

다만 이렇게 풀경우 연산량이 기가 단위로 찍히기 때문에
아주 좋은 풀이 방법은 아니다.
