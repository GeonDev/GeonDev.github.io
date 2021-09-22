---
title:  "프로그래머스 - 수식 최대화"
categories:
  - Algorithm
tags:
  - Java
  - Programers
  - Algorithm
---

> [프로그래머스 링크](https://programmers.co.kr/learn/courses/30/lessons/67257) 


### 기본적인 전략
1. 정규식을 이용하여 계산식에서 숫자만/ 기호만 남게 만든다.
2. 기호가 남긴 스트링에서 중복된 글자를 뺀 list를 만든다.
3. 리스트를 순열로(계산의 순서를 정하는 것임으로) 작성하여 경우의 수를 모두 구한다.
4. 최초 문자열을 숫자와 기호로 분리하여 계산할 위치를 결정한다. (기호의 포지션 앞뒤에 반드시 숫자가 있을 것이다.)
5. 3번에서 출력된 문자열을 가지고 연산순서 데로 계산을 한다.
6. 마지막 남은 글자의 절대값을 비교 한다.

연산을 어떻게 계산해야 하는 것인지 고민이 많았다. for루프를 돌리면 중간에 인자가 사라지기 때문에 반드시 에러가 발생할 것이라고 생각하였다. 결국에 숫자 배열과 기호 배열을 리스트로 변경하고 while문을 돌려서 뒷번호 인자에 앞번호 값을 합치고 앞번호 인덱스 요소를 지워버리는 방법을 사용하여 연산하였다.

처음에 Integer로 숫자를 변환하였는데 70점이 나와서 힌트를 보니 Long로 연산하여야 한다고 한다. (범위를 초과하는 것 같다.) Long으로 값을 변경하니 통과 되었다.

```
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;


class Solution {
	
    public long solution(String expression) {
        long answer = 0;
        
        //수식에서 숫자 제거
        String sign = expression.replaceAll("[0-9]", "");

        //같은 문자가 있으면 넣지 않음
        List<String> list = new ArrayList<String>();
        
        for(int i =0; i< sign.length(); i++) {
        	if(!list.contains(  sign.charAt(i)+"" ) ) {
        		list.add(sign.charAt(i)+"");
        	}
        }
        
        boolean[] visited = new boolean[list.size()];
        
        //수식의 순서를 넣어놓을 리스트
        List<String> orderList = new ArrayList<String>();
        
        
        code(list, list.size(), visited, "", orderList);

                
        
        for(String order : orderList ) {
                	
        	List<String> numbers = new ArrayList<String>();
        	String[] temp1 =  (expression.replaceAll("[+*-]", " ")).split(" ");
        	
        	for(String t1 : temp1 ) {
        		numbers.add(t1);
        	}
        	
        	List<String> signs  = new ArrayList<String>();      
        	String[] temp2 =  (expression.replaceAll("[0-9]", "")).split("");
        	
        	for(String t2 : temp2 ) {
        		signs.add(t2);
        	}
        	
        	        	
        	for(int  i =0; i< order.length(); i++ ) {
        		while (signs.contains(order.charAt(i)+"") ) {
        			int pos =0;
        			
        			//첫번째 타겟 위치 찾기
					for(int k =0;  k<signs.size(); k++) {						
						if(signs.get(k).equals(order.charAt(i)+"") ) {
							pos = k;
							break;
						}
					}
        			
					long valus = 0;
					
					// 연산자에 따라서 연산 수행
					
					if(order.charAt(i) == '+') {
						valus = Long.parseLong(numbers.get(pos)) +  Long.parseLong(numbers.get(pos+1)); 
						
					}else if(order.charAt(i) == '-' ) {
						valus = Long.parseLong(numbers.get(pos)) - Long.parseLong(numbers.get(pos+1)); 
						
					}else {
						valus = Long.parseLong(numbers.get(pos)) * Long.parseLong(numbers.get(pos+1)); 
					}					
					
					numbers.set(pos+1, String.valueOf(valus));  
					numbers.remove(pos);
					signs.remove(pos);
				}
        	}
    
        	//System.out.println(numbers.get(0));
        	answer = Math.max(Math.abs(answer) ,Math.abs(Long.parseLong(numbers.get(0)))   );
        }
        
        
        return Math.abs(answer);
    }
        
  
	
	public void code(List<String> list, int r,  boolean[] visited , String val, List<String> rs ) {
		
		if(r == 0 ) {
			rs.add(val);
			return;
		}
		
		for( int i =0; i< list.size(); i++) {
			if(!visited[i]) {
				visited[i] = true;
				code(list,r-1, visited, val + list.get(i), rs );
				visited[i] = false;				
			}
		}

	}
 
```
