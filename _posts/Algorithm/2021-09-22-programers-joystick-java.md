---
layout: post
title: 프로그래머스 조이스틱(JAVA)
date: 2021-09-22
Author: Geon Son
categories: Algorithm
tags: [Java, Algorithm]
comments: true
toc: true)
---

>[프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/42860)



대부분의 코딩테스트 문제가 친절하지 않지만 개인적으로 이번 문제는 특히 친절하지 않다고 생각한다.
이 문제는 탐욕법을 이용하여 해결하는데 문제에는 설명이 없지만
마지막 테스트 케이스를 해결하기 위해서는 **이동량이 같으면 오른쪽으로 커서를 이동**시켜야 한다.

타겟이 되는 단어를 A에서 부터 올라갈지 Z에서 부터 내려갈지 결정하고
현재 커서 위치에서 가장 가까운 변경이 필요한 단어로 가는 방법을 찾아 카운트를 추가한다.

지금 생각하면 간단하지만 처음에는 **변경이 필요없는 단어(A)가 있을수 있다**는
생각을 못해서 어떻게 할지 막막했다. 코드가 깔끔하지는 않지만 공유한다.


```
class Solution {

	private int nowPos = 0;
	private int count = 0;
	private int[] correct;		

	public int solution(String name) {

		correct = new int[name.length()];

		//글자 변경 횟수 계산(상하)
		for(int i=0; i<name.length(); i++) {
			correct[i] = countAlpha(name.charAt(i));	 	    
		}

		//최종 글자 변경 횟수 계산(좌우)
		while (isNotEnd()) {

			countMove(name.length()-1);
			System.out.println("pos" + nowPos);
		}

		return count;
	}


	//현재 위치에서 가장 가까운 변경이 필요한 위치
	public void countMove(int end) {

		int rPos = 0, lPos = 0;
		int rcount = 0, lcount = 0;

		//오른쪽으로 이동중 첫번째로 만나는 변경점
		if(nowPos != end) {	    		
			for(int i = nowPos; i<end+1; i++) {	    		
				if(correct[i] != 0) {
					rPos = i;
					break;
				}
				rcount++;
			}
		}else {
			if(correct[nowPos] != 0) {
				rPos = 0;	    			
			}else{
				rcount = end;
			}
		}


		//왼쪽으로 이동중 첫번째 만나는 변경점
		for(int j = nowPos; j>-2; j--) {	    		
			if(j < 0) {
				j = end;	    	
			}
			if(correct[j] != 0) {
				lPos = j;
				break;
			}	    		
			lcount++;
		}	    	

		if(lcount < rcount) {                
			nowPos = lPos;
			count += lcount;
			count += correct[lPos];
			correct[lPos] = 0;	    


		}else {               
			nowPos = rPos;
			count += rcount;
			count += correct[rPos];
			correct[rPos] = 0;	    		
		}


	}


	//알파벳 변경
	public int countAlpha(char A) {

		int plus = (int)A - 65;
		int minus = (90 - (int)A)+1;	    	

		return Math.min(plus, minus);
	}


	//바꿀것이 있는지 확인
	public boolean isNotEnd() {

		for(int t : correct) {
			if(t !=0) {
				return true;
			}
		}	    	
		return false;
	}    
}
```
