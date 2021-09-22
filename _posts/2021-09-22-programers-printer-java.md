---
title:  "프로그래머스 프린터(JAVA)"
categories:
  - Algorithm
tags:
  - Java
  - Programers
  - Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42587)



큐를 이용해서 푸는 것이 가장 좋은 방법이겠지만
우선순위 큐를 비교하는 과정에서 조건이 복잡하다고 생각했다.
결국 LinkedList를 이용해서 해결하였다.

개인적으로 문제를 풀때 함수를 따로 만들어 놓은 것을 좋아한다.
덕분에(?) 코드가 길어지기는 하지만..;;


```
class Solution {
	
	List<Print> printList = new LinkedList<Print>();
	
    public static int solution(int[] priorities, int location) {
        int answer = 0;
        
        List<Print> printList = new LinkedList<Print>();
        
        for(int i = 0; i<priorities.length; i++) {
        	printList.add(new Print(i, priorities[i]));
        }
        
        
        while (!printList.isEmpty()) {
			Print target = printList.get(0);
        	printList.remove(0); 
        	
        	Print max = maxValue(printList);
        	
        
    		if(target.priority >= max.priority) {
        		answer++;
                //원하는 location이라면 break
        		if(target.location == location) {        		
        			break;
        		}
        	}else {
        		printList.add(target);
        	}        	
		}
        return answer;
    }
    
    //리스트에서 가장 큰 Print 객체를 반환
    public static Print maxValue(List<Print> list ) {    	
    	if(list.isEmpty()) {
        	// 리스트가 비어 있다면 없는 값을 반환
    		return new Print(-1, 0);
    	}
    	
    	Print result = list.get(0);
    	
    	for(Print temp : list) {
    		if(temp.priority > result.priority) {
    			result = temp;
    		}
    	}    	
    	return result;
    }
    
}

class Print{	
	int location;
	int priority;
	
	public Print(int location, int priority) {
		this.location = location;
		this.priority = priority;
	}
}
```

