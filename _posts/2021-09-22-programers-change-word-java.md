---
title:  "프로그래머스 단어변환(JAVA)"
categories:
  - Algorithm
tags:
  - Java
  - Programers
  - Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/43163) 



DFS를 이용하여 문제를 풀었는데 덕분에 넘겨 주어야 하는 값들이 다소 많아 깨끗하지는 않다.
기본적인 문제 풀이는 특별하지는 않다. 현재 변경 가능한 단어 리스트 중 하나를 골라서 가장 작은 횟수로 타겟과 일치하는 것을 고르면 된다.

문제에서 단어의 글자수는 3~10개라고 하는데 단어의 글자수에 따라 비교하고 현재값과 차이가 1개인 글자를 고르면 된다. 이걸 못봐서 처음에 틀렸다.

```
class Solution {
    int answer = 51;
    
    public int solution(String begin, String target, String[] words) {
    	boolean t = false;
    			
    	
    	for(int i = 0; i< words.length; i++) {
    		if(target.equals(words[i])){
    			t = true;
    		}
    	}
    	
    	
    	if(t) {
            boolean[] change = new boolean[words.length];
            
            checkWord(begin, target, words, change, 0);
            
            
            return answer;
    	}else {
    		return 0;
    	}
    }
    
        public void checkWord(String begin, String target, String[] words, boolean[] change, int count) {
    	    	
    	if(target.equals(begin) ) {
    		answer = Math.min(answer, count);
    		return;
    	}
    	
    	count++;
    	
    	for(int i =0; i<change.length; i++ ) {
    		
    		if(change[i] != true) {
    			
    			if(comString(begin, words[i]) ) {        			
        			temp[i] = true;  
        			checkWord(words[i], target, words, temp, count);
                    temp[i] = false;
    			} 
    		}
    	}
	}
    
    
    public boolean comString(String t1, String t2 ) {
    	
    	int count = 0;
    	
    	for(int i =0; i < t1.length(); i++) {
    		if(t1.charAt(i) == t2.charAt(i)) {
    			count++;
    		}
    	}
    	
    	if(count == t1.length()-1) {
    		return true;
    	}
    	
    	return false;
    }
}
```
