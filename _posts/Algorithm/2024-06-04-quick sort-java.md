---
layout: post
title: 간단하고 반복적인 문제들 

date: 2024-06-04
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---

> [참고](https://velog.io/@rhdguswlx/ofjwsqq0)


## 퀵 정렬 구현 코드 

```

public static int[] quickSort(int[] arr, int left, int right ){
    if(arr == null){
        return null;
    }

    int[] result = arr;
    if(left >= right){
        return result;
    }

    int pivot = partition(result, left, right);

    result = quickSort(result, left ,pivot- 1);
    result = quickSort(result, pivot+1 ,right);

    return  result;
}

private static int partition(int[] arr, int left, int right){
    if(arr == null || left < 0){
        return -1;
    }

    int pivotVal = arr[right];
    int endPos = left -1;

    for(int i = left; i< right; i++){
        if(pivotVal > arr[i]){
            endPos +=1;
            swapValue(arr, i, endPos);
        }
    }
    endPos +=1;
    swapValue(arr, right, endPos);
    return endPos;
}

public static int[] swapValue(int[] arr, int a, int b) {
    int temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
    return arr;
}

```



## 최대 공약수 최소공배수  
~~~
//최대공약수
private int gcd(int a, int b) {
    if (b == 0)
        return a;
    return gcd(b, a % b);
}


// 두 수의 곱을 최대 공약수로 나누면 최소 공배수
private int lcm(int a, int b) {
    return a * b / gcd(a, b);
}
~~~

## 피보나치 (재귀)
~~~
 private int fibo(int n) {
        if (n < 2) 
            return n;
        return fibo(n - 1) + fibo(n - 2);
    }
~~~

## 피보나치(DP)
~~~
 private int fibo(int n) {
        int[] dp = new int[n + 1];
        dp[0] = 0;
        dp[1] = 1;

        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        return dp[n];
    }
~~~

## 팩토리얼
~~~
int fact(int n) {
    if(n==1) 
        return 1;
    return n * fact(n-1);
}
~~~

## 스텍 2개로 구현하는 큐
 삽입보다는 제거에 집중, inStack에 있는 정보를 OutStack으로 옮기면서 데이터 순서를 바꾼다.
 ~~~
 public class Que {

    public Stack<Integer> inStack = new Stack<>();
    public Stack<Integer> outStack = new Stack<>();


    public void setInStack(Integer num){
        inStack.push(num);
    }

    public Integer outStack(){
        if(outStack.empty()){
            if(inStack.empty()){
                return null;
            }else {
                return deQue();
            }
        }else {
            if(inStack.empty()){
                return outStack.pop();
            }else {
                return deQue();
            }
        }
    }

    private Integer deQue() {
        while (!inStack.isEmpty()){
            Integer temp = inStack.pop();
            outStack.push(temp);
        }
        return outStack.pop();
    }
}
 ~~~   