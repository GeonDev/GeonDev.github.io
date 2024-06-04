---
layout: post
title: 프로그래머스[PCCE 기출문제] 9번 / 이웃한 칸

date: 2023-12-06
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://school.programmers.co.kr/learn/courses/30/lessons/250125)

문제의 의도는 이차원 배열의 길이를 체크하면서 넘어가는 것이였을 것이라고 생각하지만 굳이 그렇게 할 필요는 없어보인다.
예외 처리를 이용하여 Exception이 발생하면 결과를 무시하는 방식으로 수정하였다.

### 문제 코드

```
class Solution {
    public int solution(String[][] board, int h, int w) {

        String target = board[h][w];

       int answer = check(board, target, h+1, w) + check(board, target, h-1, w) + check(board, target, h, w+1) + check(board, target, h, w-1);

        return answer;
    }


    private int check(String[][] board, String value, int h, int w) {

        try {
            if(board[h][w].equals(value) ){
                return 1;
            }
            return  0;
        }catch (IndexOutOfBoundsException e){
            return 0;
        }
    }
}

```
