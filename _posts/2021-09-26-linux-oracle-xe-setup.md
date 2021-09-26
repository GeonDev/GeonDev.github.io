---
title:  "CentOS 7 Oracle 11g xe 설치 및 환경설정"
categories:
  - Linux
tags:
  - IT
  - Linux
  - DataBase 
  - Oracle
---

# 1. 오라클 xe 최소 사항

| 구분| 내용 | 비고 |
| -------- | -------- | -------- |
| DATA  |최대 11Gbyte |시스템 데이터 미포함 |
| RAM |최대 1Gbyte     |     |

-  기타 : 단일 인스턴스로 제한, 하나의 프로세서(CPU)에서 실행


# 2. 오라클 설치

**1) 계정 생성 및 계정 변경**


[root@localhost]# useradd oracle
[root@localhost]# su oracle

데이터 베이스를 관리용 계정을 만들때 따로 그룹을 만들기도 한다. 지금은
간단한 형태의 실습이기 때문에 따로 계정의 기능을 분리하지 않고 하나의 계정을 생성하였다.

 

**2) oracle 설치 폴더 및 테이블스페이프 폴더 생성**


- 설치 경로 : /home/oracle
[oracle@localhost]$ mkdir /home/oracle/tablespace


**3) 파라미터 설정 [root 권한]**


- 커널 파라미터 값 설정
[root@localhost]# vi /etc/sysctl.conf


- 기존 내용 삭제 혹은 주석처리 후 아래 내용 추가 후 저장
  #Controls the maximum shared segment size, in bytes
  kernel.shmmax = 68719476736

  #Controls the maximum number of shared memory segments, in pages
  kernel.shmall = 10523004
  kernel.shmmni = 4096
  kernel.sem = 250 32000 100 128

  fs.aio-max-nr = 1048576
  fs.file-max = 6815744

  net.ipv4.ip_local_port_range = 9000 65500

  net.core.rmem_default = 262144
  net.core.rmem_max = 4194304
  net.core.wmem_default = 262144
  net.core.wmem_max = 1048586

- 커널 파라미터 값 적용
[root@localhost]# /sbin/sysctl -p




**4) 설치 경로에 파일 복사 및 파일 압축 해제 [oracle 권한]**

- 설치 경로 : /home/oracle
[oracle@localhost oracle]$ unzip oracle-xe-11.2.0-1.0.x86_64.rpm.zip

**5) Oracle 설치 [root권한]**

- Disk1 디렉토리로 이동
[root@localhost]# cd /home/oracle/Disk1

- 설치 시작
[root@localhost Disk1]# rpm –ivh oracle-xe-11.2.0-1.0.x86_64.rpm

 


# 3. Oracle-xe 설정

CentOS를 최소 설치하였다면 net-tools가 설치되어 있지 않아 포트 번호를 설정할때 문제가 발생 할 수 있다. 미리 설치하여 문제를 방지할 것
(설치가 되어 있지 않다면 루트 계정에서 yum install net-tools 입력)

**1) oracle configure 설정**
- oracle-xe configure 실행
[root@localhost]# /etc/init.d/oracle-xe configure

- 설정 프롬프트에 해당 내용 입력
1. Specify the HTTP port that will be used for Oracle Application Express [8080]: 9090
2. Specify a port that will be used for the database listener [1521]: 엔터
3. Specify a password ... This can be done after initial configuration : **SYSTEM**
   Confirm the password : **SYSTEM**
4. Do you want Oracle Database 11g Express Edition to be started on boot (y/n) : y


당연히 SYSTEM이라고 입력한 비밀번호는 상황에 따라 변경할 수 있다.

 

**2) oracle 계정 환경변수 설정 [oracle 권한]**


- .bash_profile 설정
[oracle@localhost ~]$ vi /home/oracle/.bash_profile

- 아래 내용 추가 및 저장
export ORACLE_BASE=/u01/app/oracle
export ORACLE_HOME=$ORACLE_BASE/product/11.2.0/xe
export ORACLE_SID=XE
export PATH=$ORACLE_HOME/bin:$PATH

- 설정 값 적용
[oracle@localhost ~]$ source /home/oracle/.bash_profile 


# 4. 오라클 설치 확인
**1) sqlplus 접속 확인**


[oracle@localhost]$ sqlplus /nolog
SQL> conn sys/ as sysdba;
Enter password: Avaya123$
