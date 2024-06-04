---
layout: post
title: 프로그래머스[PCCP 기출문제] 1번 / 붕대 감기
date: 2023-12-06
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [프로그래머스 링크](https://school.programmers.co.kr/learn/courses/30/lessons/250137?language=java)

오랜만에 코테 문제를 풀어봤다. 특별한 알고리즘이 있는지는 잘 모르겠다. 
값 범위가 적은편이기 때문에 시간을 지나면서 카운트 되도록 풀었다.

### 문제 코드

```
class Solution {
    public int solution(int[] bandage, int health, int[][] attacks) {
              int time = attacks[attacks.length-1][0];
      int aCount = 0;
      int sp = 0;
      int cHealth = health;

      for(int i =1; i <= time; i++ ){
          if(i % attacks[aCount][0] == 0){
              cHealth -= attacks[aCount][1];
              aCount++;
              sp = 0;
              if(cHealth <= 0 ){
                  return -1;
              }
          }else {
              sp++;
              cHealth += bandage[1];

              if(bandage[0] == sp ){
                  cHealth += bandage[2];
                  sp = 0;
              }

              if(cHealth > health){
                  cHealth = health;
              }
          }
      }
        return cHealth;
    }
}

```
