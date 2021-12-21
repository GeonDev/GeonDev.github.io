---
title:  "프로그래머스 이중우선큐(JAVA)"
description: This page demonstrates typography in markdown.
header: Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42628)



이렇게 풀라는건 아닐거 같은데 큐를 사용하지 않고 그냥 풀어버렸다....
보통은 우선순위 큐를 2개를 사용해서 한쪽은 오름차순, 다른 쪽은 내림차순으로 정렬하게 하는
방식으로 구현하는 것으로 보인다.


```
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Solution {
    public int[] solution(String[] operations) {
        int[] answer = new int[2];
        
        List<Integer> list = new ArrayList<Integer>();
        
        
        for(String operation : operations) {
        	String[] keys = operation.split(" ");
        	
        	if(keys[0].equals("I")) {
        		list.add(Integer.parseInt(keys[1]));
        		Collections.sort(list);
        	} else {        		
        		if(list.size() > 0 ) {

            		if(keys[1].equals("1") ) {        			
            			list.remove(list.size()-1);
            		}else {
            			list.remove(0);
            		} 
        		}        		
        	}
        } 
        
        
        if(list.size() > 0) {
        	answer[1] = list.get(0);
        	answer[0] = list.get(list.size()-1);
        }
        
        return answer;
    }

}
```
