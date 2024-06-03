---
layout: post
title: 데이터베이스 이중화 란?
date: 2021-10-10
Author: Geon Son
categories: DB
tags: [DB]
comments: true
toc: true  
---



# 데이터베이스 이중화 개요
시스템 오류로 인한 데이터베이스 중단이나 물리적인 손상 발생시 이를 복구하기 위해 데이터베이스를 복제하여 관리하는 것

## ORACLE RAC(Real Application Cluster)
 ![](/images/it/faf261c1image1.png)
서로 다른 인터페이스를 사용하여 사용자가 다른 인터페이스로 접속하더라도 같은 데이터를 조회하고 변경할 수 있게 구성한다. 서로 다른 인터페이스에서 변경된 데이터도 디스크를 거치지 않고 바로 조회할 수 있어 속도가 빨라졌다. 인터페이스에서 다른 인터페이스의 변경된 내용을 가지고 올 수 있는 기술을 Cache Fusion(캐시 퓨전) 이라고 한다. 인터페이스는 private Network로 서로 연결되어 있고 연결된 인터페이스의 작업은 물리적인 작업에 관계없이 작동하게 된다.
### SAN Network
  ![](/images/it/faf261c1image2.png)
SAN Network는 여러 개의 서버 또는 컴퓨터에 연결할 수 있는 스토리지 디바이스 네트워크, 여러 개의 디스크 어레이, 스위치, 서버로 구성되어 있기 때문에 일부가 다운되더라도 데이터에 접근하는 것이 가능하고 운영체제 에서는 하나의 드라이브로 인식한다.

## Mysql Replication
 ![](/images/it/faf261c1image3.png)
데이터베이스 서버 별도 데이터를 저장하고 Master의 데이터를 복제하는 방식으로 이중화를 구성한다. 이 경우에 Slave 서버는 Master서버의 로그기록을 읽고 데이터를 업데이트 하는 방식으로 데이터를 업데이트함으로 Slave 서버는 읽기만 가능하고 쓰기는 Master 서버에서만 수행한다.
Master 서버 장애시 Slave 중 1개가 Master로 전환 되고 Master 서버에 부하가 많이 발생하면 Master 서버는 쓰기만 Slave 서버는 읽기만 수행한다.

Master : 데이터 베이스 복사를 하는 메인 DB
Slave :  Master의 데이터를 받아 동기화하는 보조 DB, 여러대 사용 가능
Slave는 Master와 동기화 되어 있다. Master는 Slave와 동기화 되어있지 않다.


## 데이터베이스 이중화 종류
Eager 기법: 트랜젝션 수행 중 데이터 변경이 발생하면 이중화된 모든 데이터베이스에 직시 전달하여 변경 내용이 즉시적용되는 기법
LAZY 기업: 트랜젝션 수행이 종료되면 변경 사실을 새로운 트랜잭션에 작성하여 각 데이터베이스에 전달하는 기법 -> 데이터베이스마다 새로운 트랜잭션이 수행됨

## 데이터베이스 이중화 구성방법
Active-Standby : 한 DB가 활동상태로 서비스를 하고 있으면 다른 DB는 대기하고 있다가 활동 DB에 장애가 발생하면 자동적으로 모든 서비스를 대신 수행한다. 구성과 관리가 쉽다.

Active-Active : 두개의 DB가 서로 다른 서비스를 제공하다 둘 중 한쪽 DB에 문제가 발생하면 나머지 DB가 다른 서비스를 제공한다. 처리율을 높지만 구성이 어렵다.

# Query-off Loading 개요
 ![](/images/it/faf261c1image4.png)
데이터 베이스에서 update 트랜젝션과 Read 트랜젝션을 구분하여 DB처리량을 증가시키는 기술
Update 트랜젝션(Create/Update/Delete)은 전체 트랜젝션에 10%~30% Read 트랜젝션은 전체 트랜젝션에 70~90%인 경우가 많은 점을 활용하여 read 데이터베이스를 많이 배치하는 방법으로 DB처리량을 늘린다.

 Master DB(CDC수행) -> Staging DB(경유지) -> Slave DB(Read only, HA) 로 구성한다.
이를 위해 Application에서 쓰기 로직과 읽기 로직을 분리하여야 하며 분리된 로직은 쓰기DB로 접근하기 위한 DB Connection과 읽기DB로 접근하기 위한 DB Connection을 별도로 관리하여야 한다.
일반적으로 Appication 서버에서 Connection Pool을 관리하기 때문에 읽기 DB의 경우 N개의 Slave DB로 접근하기 때문에 Load Balancing을 제공하여야 한다.
또한 특정 Slave DB 장애시 다른 Slave DB 인스턴스에 접근할 수 있도록 HA(High Availability) 기능을 제공해야 하는데 Connection Pool 자체에 Load Balancing과 HA 기능을 가지고 있는 Connection Pool을 이용하거나 또는 JDBC Driver와 같이 DBMS용 Driver 자체에 Load Balancing과 HA 기능을 사용한다.

## Query-off Loading 구성
Master DB : update 트랜젝션만 수행
Staging DB : Slave DB로 데이터를 복제하기 위한 경유지 역할, Master DB에서 Slave DB로 바로 데이터를 복제할 경우 성능이 저하되기 때문에 이를 방지하기 위하여 Staging DB를 사용
(master DB가 쓰기 이외의 동작을 수행하는 것을 방지해준다.)
Slave DB : Read 트랜젝션만 수행, N개의 Slave DB로 구성, Slave DB 장애시 다른 Slave DB로 접근이 가능하도록 HA기능을 제공한다.

### Redo log file
 ![](/images/it/faf261c1image5.png)
오라클에서 발생한 모든 데이터의 변경 사항을 기록하는 파일. 오라클에서 실제 데이터를 변경시키는 DBWR이 작동하기 전에 lGWR이 먼저 리두로그 캐쉬에 리두 로그를 작성한다. 이후에 로그  버퍼가 일정 수준 채워지면 로그 파일을 작성한다.

Redo log file은 장애 발생시 복구를 위해 매우 중요하기 때문에 복사본을 가지고 있다. 동일한 내용을 가지고 있는 Redo log file을 리두로그 그룹이라고 한다. 첫번째 리두로그 그룹에 있는 맴버파일에 로그를 기록하고 해당 파일이 가득차면 다름 그룹으로 이동한다.(log Switch ) 모든 그룹에 파일이 다 기록되면 첫번째 그룹으로 기록이 다시 순환된다.
오라클에서는 최소 그룹개수는 2, 각 그룹별 최소 맴버는 1개를 갖도록 규정한다.

### CDC(Change Data Capture)
DBMS는 공통적으로 Create/Update/Delete와 같은 쓰기 작업을 수행할 때 데이터를 저장하기 전에 request 를 BackLog에 저장한다. (Backlog는 일반적으로 local 파일) 이 로그파일은 실제 데이터를 쓰기 전에 에러가 발생하였을 때 Restart를 하면서 BackLog를 읽어 복구하는데 사용한다.

CDC는 Backlog를 이용하여 SourceDB에 Backlog를 읽어서 TagetDB에 replay 하는 방식으로 작동한다. 따라서 Master DB에서 Staging DB로 데이터를 복사할 때 Master DB가 수행하는 내용은 없다.

주요 솔루션은 Oracle의 Golden Gate, Quest의 Share Flex가 있고, 오픈소스 제품으로는 Galera라는 제품이 있다.
