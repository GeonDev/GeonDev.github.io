---
layout: post
title: 단일 실행되는 jar maven 빌드 설정하기 (dependency 포함)
date: 2023-03-25
Author: Geon Son
categories: Project
tags: [Project]
comments: true
toc: true
---


프로젝트에서 싱글 배치 기능을 만들게 되었다. 처음에는 스프링 프로젝트로 제작하다가 빌드된 프로그램을 다른 배치 프로그램에서 실행시키기 위해서 스프링 프로젝트가 아닌 일반 java 프로젝트로 혼자 실행가능한 jar 파일로 빌드하기로 하였다.
우여곡절 끝에 빌드를 했는데 클래스가 없다고 한다....? 알고보니 maven 기본 빌드 설정에서는 외부 jar는 포함하지 않는다고 한다. (스프링 프레임워크가 많은 일을 해주고 있다는걸 다시 알게 되었다.)
여러가지 세팅을 하다가 적용한 방법을 소개 한다. 

# maven-assembly-plugin 플러그인

위에 플러그인은 프로그램에서 사용하는 jar를 빌드시에 루트 경로에 포함시켜 주는 플러그인 이다.
해당 플러그인을 빌드를 할때는 명령어를 다르게 사용하는데   **assembly:assembly**,  **assembly:single**
이렇게 두가지의 명령어를 사용한다.  또 빌드를 하게 되면 빌드된 프로젝트에 **jar-with-dependencies** 라는 접미사(?)가 추가 된다.  

~~~
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-assembly-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <descriptorRefs>
            <descriptorRef>jar-with-dependencies</descriptorRef>
        </descriptorRefs>
    </configuration>
</plugin>
~~~

위에 설정이 maven-assembly-plugin의 기본 설정이다. 
descriptorRef 에는 jar-with-dependencies, project ,src 등이 있는데 

jar-with-dependencies : jar  파일을 프로젝트 내부에 포함
project : target ,src, resource 디렉토리에 있는 파일을 빌드 

이렇게 설정에 따라 빌드에 포함하는 데이터를 구분할수 있다. project를 설정할수도 있지만 나는 jar-with-dependencies로 설정을 하였다. 이렇게 빌드를 하면 또다른 문제가 발생한다. 바로 메니페스트 파일이 겹치면서 초기화가 된다. maven-jar-plugin으로 설정을 해도 순서에 상관없이 무시된다. 
방법은 maven-assembly-plugin 내부에 추가로 설정하는 것이다.

## manifest 설정

~~~

<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-assembly-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <descriptorRefs>
            <descriptorRef>jar-with-dependencies</descriptorRef>
        </descriptorRefs>
    </configuration>
    <archive>  
	   <manifest>
		  <mainClass>com.java.main</mainClass>  
	      <addClasspath>true</addClasspath>  
	      <addExtensions>true</addExtensions>  
	      <packageName>com.java</packageName>  
	   </manifest>
	</archive>
</plugin>
~~~
 
위에 소스 처럼 manifest를 추가하면 특정 메인 클래스를 추가하여 실행시킬수 있다. 다만 main 클래스를 여러개로 만드는 것은 실패 했다. 


## 프로젝트 접미사 제거

assembly 명령어로 빌드를 하면 jar 파일이 2개가 생성되는데 하나는 기존 처럼 dependencies 미포함 파일, 또하나는 테그가 붙어 있는 dependencies가 포함된 파일이다. 상황에 따라 기본 파일을 생성할 필요도 있지만 없을수도 있다. 나는 bamboo를 사용하여 빌드를 하고 있고 다른 프로젝트들은 모두 프로젝트 이름으로 jar 빌드를 하기 떄문에 테그 제거를 해주려고 했다. 

~~~
<finalName>${project.artifactId}-${project.version}</finalName>  
<!-- 생성된 jar에 접미사 없이 프로젝트 이름만 출력되도록 설정 -->  
<appendAssemblyId>false</appendAssemblyId>
~~~

테그 제거는 위에 테그를 추가 해주면 된다.

## 명령어 GOAL 설정
명령어 goal 은  maven에 설정된 기본 명령어를 다른 역할로 수행하도록 변경하는 것이다. 이 설정을 추가한 이유는 다른 프로젝트를 수행하던 사람이 해당 프로젝트를 유지 관리 하게 되었을때 혼란을 갖지 않고 이전에 사용하던 명령어를 그대로 사용할수 있도록 하기 위함이다.

~~~
   <executions>  
      <execution>
               <phase>package</phase>  
         <goals>
                <goal>single</goal>  
         </goals>
               </execution>
    </executions>
~~~



## 전체 설정
~~~
<plugin>  
   <groupId>org.apache.maven.plugins</groupId>  
   <artifactId>maven-assembly-plugin</artifactId>  
   <version>3.3.0</version>  
  
   <configuration>      
   <descriptorRefs>
            <descriptorRef>jar-with-dependencies</descriptorRef>  
      </descriptorRefs>  
      <archive>
	<manifest>           
	 <mainClass>com.jtbc.news.process.IJamArticleReceiver</mainClass>  
            <addClasspath>true</addClasspath>  
            <addExtensions>true</addExtensions>  
            <packageName>com.jtbc.news</packageName>  
         </manifest>     
          </archive>
                <finalName>${project.artifactId}-${project.version}</finalName>  
      <!-- 생성된 jar에 접미사 없이 프로젝트 이름만 출력되도록 설정 -->  
      <appendAssemblyId>false</appendAssemblyId>  
   </configuration>  
   <!-- mvn package 명령어 실행시 maven-assembly-plugin의 명렁인 assembly:single이 실행되도록 설정 -->
     
   <!-- 다른 프로젝트와 명령어를 동일하게 사용하기 위하여 설정 -->  
   <executions>  
      <execution>
               <phase>package</phase>  
         <goals>
                <goal>single</goal>  
         </goals>
               </execution>
        </executions>
</plugin>
~~~








