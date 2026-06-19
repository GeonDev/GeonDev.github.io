---
layout: post
title: 맥북 M1에서 Mysql 사용법, 도커 이미지 설치
date: 2022-02-02
Author: Geon Son
categories: DB
tags: [MySQL, Docker, Apple Silicon, macOS]
comments: true
toc: true
---

> [Docker 설치](https://geondev.github.io/mongo-db-basic-1/)
> [참고 블로그](https://junghyungil.tistory.com/201)

> 이 글은 2022년 초에 정리한 내용이다. 그때는 MySQL 공식 Docker 이미지가 ARM64를 지원하지 않아서 `linux/amd64` 플랫폼을 직접 지정해줘야 했다. 지금은 공식 이미지가 ARM64를 지원하기 때문에 이 옵션 없이도 M1/M2 맥에서 바로 실행된다.

평상시(?)에 mysql을 잘 사용하지는 않지만(보통은 mariaDB를 쓴다.) 예제 프로그램에서 mysql을 사용해서 도커에 설치해 보려고 했다.
간단하게 docker pull mysql을 입력하면 당연히 실패 한다. 왜 이러는 건지 알아보다가 m1 칩을 지원하지 않는다는 것을 알게 되었다.
(이 상황은 mysql ARM 버전을 설치하더라도 동일하다. 설치는 되지만 권한 문제, 버전 문제 등으로 서비스 실행이 되지 않는다.)

다른 방법이 있는 것인지 알아보다가 로컬 설치가 어렵다면 차라리 도커에 설치해 사용하는 것이 좋을 것 같아
도커에 설치하는 방법을 정리한다.

# 1. 이미지 다운로드

이전 포스팅에서 도커 설치 방법은 정리 했기 때문에 이미지 다운로드를 진행하면 된다.

```bash
docker pull mysql

Using default tag: latest
latest: Pulling from library/mysql
no matching manifest for linux/arm64/v8 in the manifest list entries
```
이렇게 입력하면 아래 메시지에서 출력되듯이 매칭되는 데이터가 없다고 나온다.
사실 메세지에 힌트가 있는데, M1은 arm64라서 기본으로는 arm64 이미지를 찾다가 실패한다. 그래서 amd64 이미지를 받도록 platform을 직접 지정해주면 된다.


```bash
docker pull --platform linux/amd64 mysql
```
이렇게 플랫폼을 amd64로 지정해주면 정상적으로 이미지가 다운받아진다.



# 2. 컨테이너 생성

```bash
docker run --platform linux/amd64 -p 3306:3306 --name mysql-container -v ~/data:/data/mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=DB_BATCH -e MYSQL_USER=batch -e MYSQL_PASSWORD=batch@21 -d mysql
```
이미지가 다운받아졌다면 컨테이너를 생성해주면 된다. 컨테이너를 생성하는 과정에서 볼륨을 생성하였고 데이터베이스와 비밀번호를 같이 생성하였다.
위 명령어에서는 스프링 배치 테스트를 위하여 생성하였기 때문에 배치라는 이름의 DB를 생성하였다.
(추가로 -v는 볼륨을 설정하여 컨테이너가 삭제되어도 데이터를 유지한다.)

여기서 주의할 점이 하나 있다. MySQL 공식 이미지는 `MYSQL_PASSWORD`만 준다고 일반 사용자가 생기지 않는다. `MYSQL_USER`와 `MYSQL_PASSWORD`를 함께 줘야 그 이름의 사용자가 만들어지고, 위에서 지정한 `MYSQL_DATABASE`에 권한도 부여된다. 루트만 쓸 거라면 두 옵션은 생략해도 된다.

```bash
docker run --platform linux/amd64
-p 3306:3306
--name [컨테이너 이름]
-e MYSQL_ROOT_PASSWORD=[루트 유저 비밀번호]
-e MYSQL_DATABASE=[데이터베이스 이름]
-e MYSQL_USER=[일반 사용자 이름]
-e MYSQL_PASSWORD=[일반 사용자 비밀번호]
-d mysql
```


# 3. Mysql 컨테이너 접속
```bash
docker exec -it mysql-container bash
root@3a7b0ca25392:/# mysql -u root -p
Enter password:
```
위에서 입력한 root 계정의 패스워드를 입력하면 mysql에 접근이 가능해 진다.

## 3.1. Mysql 외부접속 허용
mysql을 내부에서 접속하는 것이 아닌 다른 IP에서 접속할수 있도록 설정을 해주어야 한다.

```sql
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root';
```
계정별, DB별 접속가능한 IP를 개별 설정해주는 것이 보안에는 유리하겠지만 여기서는
루트 계정으로 접속시 모든 IP 접속을 허용하였다.

## 3.2. Mysql 데이터베이스 확인 및 생성
```sql
show databases;

+--------------------+
| Database           |
+--------------------+
| DB_BATCH           |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.11 sec)
```

현재 생성된 데이터베이스를 확인한다. root 계정으로 실행시 시스템 데이터베이스를 포함한 모든 데이터베이스가 표시된다.

```sql
mysql> CREATE DATABASE task_agile default CHARACTER SET UTF8;
Query OK, 1 row affected, 1 warning (0.05 sec)
```

신규 데이터베이스를 생성한다. 한글을 사용할수 있도록 UTF8을 기본 문자열 형식으로 사용하였다.
이후에는 `USE task_agile;`처럼 사용할 데이터베이스를 선언한 뒤 테이블을 생성하면 된다. 여기까지 하면 M1 맥에서 도커로 mysql을 띄워 쓸 준비가 끝난다.
