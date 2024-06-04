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
	} else {

		for (int i = start; i < list.size(); i++) {
                 	//임시로 이전 결과를 저장하고
			String t = result;
			combination(list, r - 1, i + 1, result + list.get(i), temp);
                       //조합이후에 다시 원래 결과로 되돌린다.
			result = t;
		}

	}
}
```

DFS와 비슷한 형태 백트래킹 이라고 하던데.. 보통 인터넷에 조합 알고리즘은
따로 프린트를 두거나 결과를 저장하는 경우가 많아 조금 수정하였다. 매일 까먹으니 기록한다.

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
		} else {

			for (int i = start; i < list.size(); i++) {
				String t = result;
				combination(list, r - 1, i + 1, result + list.get(i), temp);
				result = t;
			}

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
