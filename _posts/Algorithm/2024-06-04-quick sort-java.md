---
layout: post
title: Quick sort 구현

date: 2024-06-04
Author: Geon Son
categories: Algorithm
tags: [Algorithm]
comments: true
toc: true
---


### 퀵 정렬 구현 코드 

```
import java.io.IOException;


public class Main {

    public static void main(String args[]) throws IOException {
        int[] arr = {6,4,1,8,9,2,7,5,3};
        quickSort(arr, 0, arr.length-1);
    }

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
}

```
