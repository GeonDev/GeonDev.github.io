---
layout: post
title: 시험이나 면접을 위한 IT 용어 정리
date: 2021-09-24
Author: Geon Son
categories: IT
tags: [OS, IT, DataBase, network]
comments: true
toc: true
---

모 게임회사 면접을 준비하면서 정리했던 용어집, 신기하게 코딩테스트를 보면서
IT 지식을 요구하는 객관식, 주관식 문제를 보는 회사가 있어서 준비하면서 정리했던 내용이다.


# 용어정리 - 네트워크


## 1)	네트워크 프로토콜 종류

### 1.1)	네트워크 전송 계층
* Ethernet : TCP/IP 계층의 네트워크 접속 계층은 OSI 7 계층에서  물리, 데이터링크, 네트워크 계층을 포괄하는 것, 이중 물리계층(예를 들어 케이블과 같은 물리적인 요소들)내에 속해 있는 IEEE에서 지정한 근거리 통신망 표준 동축 케이블 네트워크를 뜻함

* FDDI (Fiber Distributed Data Interface): LAN과 LAN 사이 또는 컴퓨터와 이외 호스트 사이를 연결하는 Ethernet 보다 빠른 고속 통신망에 쓰이는 인터페이스들, 즉 광케이블, Ethernet 케이블들은 속도가 10/100 MB 정도 나오는데 광케이블은 속도가 1/10 GB 이정도의 속도가 나오는 인터페이스입니다

* SLIP(Serial Line Interface Protocol) : 전화선과 모뎀을 이용하여 네트워크와 인터넷에 연결할 수 있게 해주는 프로토콜, SLIP는 PPP보다 오류 수정 등의 기능이 약간 덜한 프로토콜이며, PPP 가 쓰이기 이전에 많이 쓰였습니다.
* PPP(Point-to-Point Protocol) : 컴퓨터와 컴퓨터 사이에 SLIP와 같이 전화선과 모뎀을 이용하여 네트워크와 인터넷에 연결 할 수 있게 해주는 프로토콜, PPP는 CRC(Cyclic Redundancy Check)와 같은 오류 체크 기능을 지원해서 현재는 주로 SLIP보단 PPP가 쓰인다.
CHAP - PPP프로토콜에서 사용되는 보안 기법 중 하나

### 1.2)	인터넷 계층
* ICMP(Internet Control Message Protocol): TCP/IP 프로토콜에서 IP 네트워크에서의 IP전송상태 체크 또는 오류내용을 요청한 곳을 알려주는 역할을 하는 프로토콜
대표적인 기능 : ping, traceroute(목적지 장치로의 경로 확인)

* IGMP(Internet Group Management Protocol): 호스트 컴퓨터와 인접 라우터가 멀티캐스트 그룹을 구성하고, 같은 서브넷, 즉 같은 브로드캐스트 영역을 가지게 하는 프로토콜,  호스트 컴퓨터는 라우터에게 다른 브로드캐스트 영역에서 오는 멀티캐스트 데이터 수신 요청을 하기위해 IGMP 신호를 보내고, 만약 더이상 받을 데이터가 없다면 라우터 에게 중지 메시지를 보냅니다  라우터는 멀티캐스트 그룹안에 지정 되어있는 멤버들에게 IGMP 신호를 지속적으로 보내며 그룹 멤버인 호스트들을 감시합니다.

* IP(Internet Protocol): IP는 인터넷 상에서 한 호스트 컴퓨터에서 다른 (브로드캐스트 영역을 포함한) 호스트 컴퓨터로 정보를 전송할 수 있게 도와주는 프로토콜.

* ARP(Address Resolution Protocol): 목적지의 MAC 주소를 모를 때 목적지 호스트의 IP주소를 MAC주소로 변환해주는 프로토콜.

* RARP(Reverse Address Resolution Protocol): ARP와 반대로 목적지의 IP주소를 모를 때, 목적지 호스트의 MAC주소를 보고 MAC주소를 IP주소로 변환해 주는 프로토콜.

### 1.3)	전송 계층
* TCP(Transmission Control Protocol): 포트번호를 이용한 신뢰성 있는 통신방식을 지원하며, 연결 지향형인 프로토콜, 연결 지향형이란 응용 프로그램이 데이터를 교환하기 전에 먼저 응용 프로그램간 연결을 성립한 후 전송을 시작한다는 의미.

* UDP(User Datagram Protocol): 포트번호를 이용하고 약간 신뢰성이 떨어지지만 비연결 지향형이며, 헤더의 용량이 적어 전송속도가 빠른 프로토콜, 비 연결 지향형이란 포트만 확인하고 보내는 방식이며, 전송했을 시 목적지 포트에서 못 받을 수도 있다.

### 1.4)	응용 계층
* SMTP(Simple Mail Transfer Protocol): 인터넷상에서 전자 우편(E-Mail)을 보낼 때 사용하는 표준 통신 규약 프로토콜.

* POP3(Post Office Protocol version 3): SMTP와는 반대로 인터넷 상에서 전자우편을 받을 때 사용하는 프로토콜. Gmail이나 야후 등의 메일 클라이언트 서비스 등에서 지원.

* IMAP(Internet Message Access Protocol): POP3와 같이 전자우편을 받을 때 사용하는 프로토콜이며, POP3와 다른 점은 IMAP은 다른 호스트로부터 온 메일을 서버에 보관하고 나중에 지울 수가 있으며, 다른 환경의 컴퓨터에서 서로 다른 이메일 클라이언트가 같은 메일을 불러오게 할 수 있다는 장점을 지니고 있다.

* FTP(File Transfer Protocol): 서버와 클라이언트 사이에 파일을 전송할 수 있도록 해주는 프로토콜. FTP 서버를 이용하여 데이터를 저장하거나, 불러올 수 있습니다.

* Telnet: 클라이언트가 서버에 원격으로 접속하여 작업을 할 수 있도록 해주는 프로토콜.  Telnet은 데이터가 암호화되어 전송되지 않는 등 보안에 취약하다는 단점이 있다.

* SSH(Secure Shell): Telnet과 같이 클라이언트가 원격으로 서버에 접속하여 작업 할 수 있도록 해주는 프로토콜이며, SSH는 Telnet과 달리 데이터를 암호화 처리하기 때문에 보안에 취약하지 않습니다.

* DNS(Domain Name Service/Server): 도메인 네임을 IP주소로 변환하여 특정 웹서버, FTP 서버등의 도메인 네임이 설정 되어있는 서버에 접속할 수 있도록 도와주는 프로토콜. DNS가 없었을 때는 특정 웹사이트에 방문할 때 IP주소를 직접 외워서 접근해야 했는데, DNS 서버가 생기면서 이러한 불편함이 없어졌습니다.

* SNMP(Simple Network Management Protocol): 네트워크 장비를 감시하기 위해 사용하는 프로토콜로, 네트워크관리자가 네트워크의 성능을 점검하고 유지보수 하는데 도움을 주는 프로토콜.

* TFTP: FTP와 마찬가지로 파일 전송을 위해 사용하는 프로토콜이지만, FTP보다 더 단순한 방식으로 구현하여 파일 전송이 가끔 불안정하다는 단점을 가지고 있습니다. 하지만 FTP보다 프로토콜을 더 많이 사용하지 않기 때문에 구현이 더 간편하다.

* NFS(Network File System): 네트워크 상에서 서버 측에서는 공유, 클라이언트 상에서는 마운트를 적용하여 네트워크상에서 파일 공유 등을 도와주는 파일 시스템입니다. NFS는 RPC를 기반으로 하여 구현 되어있다.

* RPC(Remote Procedure Call): 네트워크 내에서 컴퓨터 상의 프로그램이 다른 컴퓨터 상에 있는 서브프로그램, 즉 동일한 기능을 하는 프로그램의 부분 기능을 불러내는 기술을 의미한다.

* TLS/SSL : 사용자와 웹 브라우저 간 암호화에 사용되는 프로토콜/ 공개키와 개인키를 교환하여 보안세션을 활용한 후 통신을 암호화합니다. 서버는 공개키가 포함된 서버인증서를 클라이언트에 전송한다. 클라이언트는 서버에서 전달받은 인증을 확인한 후 공개키를 전송하고 서버에서는 공개키를 이용하여 복호화를 한다. 클라이언트와 서버가 모두 같은 대칭키를 갖게 된 후에 통신이 끝나면 키를 폐기한다.

### 1.5)	기타 용어
* AAA – 인증(authentication), 권한 부여(authorization), 계정관리(accounting)

* AS - 하나의 네트워크 관리자에 의해 하나의 관리체계로 움직이는 영역, AS 간의 라우팅 프로토콜은 주로 BGP를 이용해서 일어난다.


* ASBR- AS 간의 연결을 위한 라우터


* ASC11 - 미국 정보교환 표준코드, 문자를 표현하는데 쓰이는 8비트 코드 체계


* backbone - 중심이 되는 경로, 네트워크에서 다른 네트워크로부터 가장 자주 송수신 대상이 되는 통신의 주 경로 역할을 하는 부분


* bandwidth - 대역폭, 네트워크 신호용으로 사용될 수 있는 가장 높은 주파수와 가장 낮은 주파수 사이의 차이, 네트워크에서 주로 속도를 나타낼 때 많이 사용되는 말


* ATM - 비동기 전송 모드/음성, 비디오, 데이터 등과 같은 다양한 유형의 서비스를 고정 길이(53바이트)셀에 넣어 전달하는 국제 셀 릴레이(cell relay) 표준


* Broadband - 광대역 - 다수의 독립적인 신호를 하나의 케이블로 멀티플렉싱하는 전송 시스템, 아날로그 신호 처리 방식을 사용하는 동축케이블 , 음성 수준 채널 (4kHz)보다 더 큰 대역폭을 가지는 모든 채널


* channel - 통신 경로를 의미, 요즘은 하나의 케이블에 여러 개의 채널을 전송하는 기술 또는 여러 개의 케이블을 묶어서 하나의 채널 전달에 이용하는 경우가 많다.


* checksum - 전송된 데이터가 이상 없이 전송되었는지를 확인하기 위한 방법 중 하나, 즉 데이터와 같이 데이터를 가지고 만든 checksum이라는 정수 값을 보내는데 수신 측에 이 값을 다시 계산해서 보내온 checksum과 비교하는 것이다. 두 값이 서로 같으면 데이터에 이상이 없다는 것을 확인하다.

* compression - 데이터를 전송할 때보다 적은 대역폭을 사용하기 위해 사용하는 압축 기술

* congestion - 네트워크 용량을 초과하는 트래픽이 발생할 경우 네트워크에 컨제션이 발생했다고 함

* connectionless - 통신시에 전송 대상 간의 연결을 먼저 하지 않고 데이터를 전송하는 방식 <->connection oriented

* CPE -  전화 회사로부터 정보 서비스를 받기 위해 사용자의 사무실 또는 집에 설치되는 장비, 주로 터미널, 전화기 ,모뎀 등과 같은 통신 단말기 등이 여기에 속한다.

* CRC - 데이터의 전송 시 수신측에서 오류 점검을 위해 사용하는 기법

* CSU - 전용선 설치m시 라우터와 회선 사이에서 연결자 역할을 수행, 일반적으로 DSU와 함께 사용되어 CSU/DSU라고 불리어 진다. 우리나라에서는 주로 속도가 낮은 것은 DSU를 속도가 높은 것에는 CSU를 사용한다.

* DCE - 사용자-네트워크 인터페이스의 네트워크 측으로 구성되는 통신 네트워크 장비의 연결 수단, DCE는 네트워크로 연결되는 물리적인 수단이 되며, 트래픽을 전송하고, DCE장비와 DTE 장치 사이에서 데이터 전송을 동기화v시키는 데 사용되는 클럭 처리 신호를 제공한다. 모뎀과 인터페이스 카드는 DCE의 예이다.

* DTE - 사용자-네트워크 인터페이스의 사용자 측에서 데이터 발신 장치나 수신 장치, 또는 두 가지 겸용으로 사용되는 장치

* DDR - 라우팅이 필요할 때만 자동으로 세션을 연결하고 라우팅이 종료되면 자동으로 세션을 끊는 방식, 주로 전화 회선이나 ISDN등에 사용된다.

* Default route - 라우팅 테이블이 지정되지 않은 목적지를 찾아가는 경우 사용하는 경로이다. 즉 목적지가 라우팅 테이블이 존재하지 않을 때 라우터는 디폴트 라우트로 경로를 배정한다.

* Domain - 인터넷에서, 조직체 종류나 지형을 기초로 네트워크를 분류하는 일반적인 방법을 말함

* EMI - 전자 간섭을 뜻함, 통신 채널에서 데이터 무결성을 줄이고 오류율을 증가시킬 수 있는 전자기 신호에 의한 간섭 등을 나타내는 수치

* encapsulation - 데이터를 특정한 프로토콜 안에 감싸는 것을 말함, 이렇게 되면 밖에서는 안에 있는 내용에 관계없이 사용 프로토콜에 따라 처리를 해주게 된다.

* encryption - 데이터를 볼 권한이 없는 사람들은 이해할 수 없는 형태로 암호화하는 것을 뜻함.

* FECN - 프레임 릴레이 네트워크에서 프레임을 수신하는 장비에게 전송 중에 통신 폭주가 발생했음을 알려주기 위해 설정하는 비트

* Finger - 어떤 특정 유저가 특정한 인터넷 사이트에 계정이 있는지 여부를 알아내는 소프트웨어 툴을 말함

* flooding - 주로 브리지에서 사용되는 용어로 브리지나 스위치가 목적지를 알 수 없는 패킷을 수신하거나 브로드캐스트 패킷을 수신했을 때 이 패킷을 자신의 모든 포트로 뿌리는 것을 말함

* fragment - 비교적 큰 패킷을 보다 작은 단위로 분해한 조각을 말함

* frame - 데이터 링크 계층에서 전송되어지는 단위

* full duplex - 통신을 하는 양쪽에서 동시에 송신과 수신이 일어나는 것을 말함

* full mesh - 각 네트워크 장비들이 서로간 직접 연결 회선을 가지고 있는 경우를 나타냄

* GNS - 가장 가까운 IPX 서버를 찾는 요청 패킷

* half duplex - 반이중, 통신 시에 송신이나 수신 중 어느 한 순간에는 둘 중 하나만 일어날 수 있는 방식, 무전기가 이와 같은 통신의 예이다.

* handshake - 통신에 필요한 여러 가지 메시지를 통신 전에 서로 교환하는 것을 일컫는다. TCP 통신의 경우 3 way handshake 방식을 사용한다.

* HDLC - 시스코 라우터에서 시리얼 라인에 디폴트로 적용되는 데이터 링크 계층의 프로토콜

* header - 데이터를 인캡슐레이션 할 때 데이터 앞에 넣는 제어 정보를 말함

* IETF - 인터넷 표준을 개발하는 것을 담당하는 특별 위원회

* ILMI - 네트워크 관리 기능을 ATM UNI에 내장시키기 위해 ATM 포럼이 개발한 규격

* Inverse ARP - ARP 가 IP 주소 등 논리주소를 이용해서 MAC 주소를 알아내는 방식인데 비해 MAC 주소를 이용해서 IP 주소와 같은 논리 주소를 자동으로 알아내는 기술

* ISP -  인터넷 서비스 제공자, 다른 기업체나 개인들이 인터넷을 액세스 하게 해주는 기업체

* LMI - 기본적인 프레임 릴레이 규격을 확장

* load balancing - 전송에 있어서 여러 개의 경로를 통해 데이터를 보냄으로써 전송의 속도를 올리는 방식

* MD5 - Message Digest 5의 약어로, SNMP v.2 에서 메시지 인증에 사용되는 알고리즘, MD5는 통신의 무결성을 검증하고, 발신지를 인증하며, 적시성을 확인하는 일을 한다.

* Mesh - 많은 리던던시(redundancy) 상호 연결 장치들을 네트워크 노드 사이에 전략적으로 배치해 장치들을 관리하기 쉽고 세그먼트로 나누어서 조직하는 네트워크 토폴로지, 보통 메시를 구분할 때 full mesh(완전매시형)와 partial mesh(부분매시형)로 나누어서 말한다.

* MOSPF - Multicast OSPF 의 약어, OSPF 네트워크에서 사용하는 도메인 내부의 멀티캐스트 라우팅 프로토콜이다.

* MPLS - Multiprotocol Label Switching, 태그 스위칭 기법으로 보다 빠른 라우팅 성능을 위해 개발되었다.

* MTU - 최대 전송단위의 약어, 특정한 인터페이스가 처리할 수 있는 최대 패킷 크기, 바이트 단위로 표시

* multicast - 네트워크 주소상의 특정한 그룹에게 보내는 단일(동일한) 패킷

* NBMA - non broadcast multi access , 브로드캐스팅을 지원하지 않는 네트워크를 말하며 주로 x.25나 프레임 릴레이 망에서 사용된다.

* NAS - network access server, 주로 리모트 지역에서 들어오는 접속을 받아서 내부 네트워크로 연결해주는 기능을 하는 장비로 커뮤니케이션 서버라고도 불린다.

* NAT - 네트워크 주소 변환, 내부에서는 비 공인 주소를 사용하고 외부 인터넷으로 나갈 때는 공인 주소를 사용하는 경우 이들 주소를 중간에서 서로 바꾸어 주고 매핑해 주는 기능이 필요한데 바로 NAT가 이 역할을 한다.

* neighboring routers - 인접 라우터, OSPF에서 공통 네트워크로 연결되는 인터페이스가 있는 두 대의 라우터

* NetBIOS - 네트워크 기본 입/출력 시스템, 하위 레벨 네트워크 프로세스들의 서비스를 요청하기 위해 IBM LAN의 애플리케이션들이 사용하는 API

* NetWare - 노벨이 개발한 일반적인 분산형 network operating System이다.

* NLSP -NetWare 링크 서비스 프로토콜의 약어, ISIS에 기초한 link-state 라우팅 프로토콜로 IPX 라우팅에 사용된다.

* NOS- 네트워크 운영체제, 진정한 분산형 파일 시스템을 가리키는데 사용되는 용어

* packet - 제어 정보가 들어 있는 헤더와 사용자 데이터가 포함되어 있는 논리적인 정보 그룹이다. 패킷은 네트워크 계층 데이터 단위를 언급할 때 가장 자주 사용되는 용어이다.

* parity check - 문자의 무결성을 검사하는 프로세스, 문자나 단어 내의 바이너리 1 숫자의 총 수를 홀수나 짝수로만 들어서 에러가 발생했는지를 검사

* ping - packet internet groper, ICMP는 메시지와 메시지의 응답을 이용한 프로그램이다. 네트워크 장치의 도달 능력을 테스트하기 위해 IP네트워크에서 사용된다.

* poison reverse update - 어떤 네트워크를 업데이트에 포함시키지 않음으로써 그 네트워크에 도달할 수 없음을 간접적으로 나타내는 것이 아니라, 명시적으로 그 네트워크나 서브넷을 도달할 수 없는 것으로 표시하는 라우팅 업데이트 방식이다. 로이즌 리버스 업데이트는 커다란 라우팅 루프에 빠지는 것을 방지하기 위해 사용되었다.

* PSDN - 패킷 스위칭 방식 데이터 네트워크

* QoS- 전송 품질과 서비스 가용성을 알려주는 전송 시스템의 수행 성능 척도

* redistribution - 재분배, 한 라우팅 프로토콜을 통해 발견한 라우팅 정보를 다른 라우팅 프로토콜의 업데이트 메시지에 분산시키는 것, 즉 RIP 정보를 IGRP쪽으로 뿌린다거나 OSPF 정보를 RIP쪽으로 뿌리는 것을 말함

* redundancy - 인터네트워킹에서 장치, 서비스, 연결 통로 등을 여러 개 두어 장애가 발생하는 경우에 다른 경로를 이용할 수 있게 하는 것이다.

* relay - 둘 이상의 네트워크나 네트워크 시스템을 연결하는 장치를 가리키는 OSI 용어로, 데이터 링크 계층(2계층) 릴레이는 브리지이고, 네트워크 릴레이는 라우터가 된다.

* reliability - 신뢰도 - 링크에서 수신된 keepalive 의 예상 비율로, 이 비율이 높으면, 그 회선은 신뢰할 수 있다.

* remote bridge -  원격 부리지, WAN 링크를 통해 물리적으로 분리되어 있는 네트워크 세그먼트를 연결하는 브리지

* RFC - 인터넷에 관한 정보를 전달하는 것에 대한 주된 자료로 사용되는 문서 시리즈

* routed protocol - 라우터가 라우팅할 수 있는 프로토콜, 라우터는 라우티드 프로토콜이 지정하는 노리적 인터네트워크를 해석할 수 있어야 한다. 라우티드 프로토콜의 예로는 애플토크, DECnet, IP 등이 있다.

* router- 하나 이상의 매트릭을 사용해 네트워크 트래픽을 포워딩해야 하는 최적 경로를 결정하는 네트워크 레이어 장치, 라우터는 네트워크 레이어 정보를 기초로 한 네트워크에서 다른 네트워크로 패킷을 포워딩하는 역할을 한다.

* routing - 목적지 호스트로 연결되는 경로를 찾는 프로세스, 라우팅은 대형 네트워크에서는 매우 복잡해지는데 패킷이 수신 호스테에 도달하기 전에 통과하게 되는 잠재적인 중개 수신 장치가 많고 경로가 다양하기 때문

* routing domain - 동일한 관리 규칙 세트에 따라 작동하는 앤드 시스템과 중개 시스템 그룹, 각 라우팅 도메인 내에는 하나 이상의 영역이 있으며, 각 영역은 영역 주소에 의해 고유하게 구분이 된다.

* routing meric-  라우팅 알고리즘이 한 경로가 다른 경로보다 더 낫다고 판단하는 방식, 이 정보는 라우팅 테이블에 저장된다. 메트릭에는 대역폭, 통신 비용, 지연 시간, 홉 카운트, 부하 MTU, 경로 비용, 신뢰도 등이 포함된다.

* routing table-  라우터나 특정한 네트워크 수신 장치로 연결되는 경로를 추적하는 다른 인터네트워킹 장치에 저장되는 테이블

* routing update- 네트워크 도달 가능성 및 관련된 비용 정보를 알려주기 위해 라우터에서 보내는 메시지, 라우팅 업데이트는 일반적으로 일정한 간격으로 보내며, 네트워크 토폴로지를 변경한 후에도 보내게 된다.

* session - 둘 이상의 네트워크 장치 사이에서 이루어지는 관련된 통신 트랜잭션 세트, SNA에서 두  NAU가 통신을 할 수 있는 논리적인 연결 통로

* stub area - default roue, intra-area route, inter-area route 등은 가지고 있지만 외부 경로는 소유하지 않은 OSPF 영역이다. 스텁 영역 상에서는 가상 링크를 구성할 수 없으며, ASBR도 포함시킬 수 없다.

* stub network - 라우터로 연결되는 통로가 하나만 존재하는 네트워크로, subarea(하위영역) SNA네트워크에서 하위 영역노드와 연결되 링크와 주변 노드로 구성된 부분

* subnet address -  IP 주소에서 서브넷 마스크에 의해 서브 네트워크로 지정되는 부분

* subnet mask - IP에서 서브넷 주소로 사용되고 있는 IP 주소의 비트를 표시하기 위해 사용되는 32비트 주소 마스크이다. 때때로 간단하게 mask라고도 한다.

* subnetwork - IP네트워크에서 특정한 서브넷 주소를 공유하는 네트워크이다. 서브 네트워크는 네트워크 관리자들이 다중 레벨로 된 계층형 라우팅 구조를 제공하면서 연결된 네트워크들의 복잡한 주소 지정 구조를 알 필요가 없게 하기 위해 임의로 분할한 네트워크이다. 때때로 subnet이라고도 한다.




* 웹 서비스
웹이라는 네트워크 환경에 연결된 서로 다른 컴퓨터들이 동적으로 연결되고 소통하고 실행할 수 있도록 하는 동적환경구성을 위한 소프트웨어 컴포턴트 묶음

* 단순객체 접근 프로토콜(SOAP)
HTTP, HTTPS SMTP등을 활용하여 XML기반의 메시지를 네트워크 상태에서 교환하는 프로토콜

* 웹서비스 기술언어(WSDL)
공표된 웹 서비스가 실제 어디에 위치하고 있고, 그 웹 서비스를 이용하기 위한 Biding 정보를 담고 있는 XML 마크업 언어, WSDL 정보를 해석하면 비로서 SOAP를 사용해 해당 서비스에 필요한 객체를 실행할 수 있음

* 전역 비즈니스 레지스트리(UDDI)
웹서비스를 등록하고 검색하기 위한 저장소, WSDL을 등록하여 서비스와 서비스 제공자를 검색하고 접근하는 기능을 제공한다.

# 용어정리 – 데이터 베이스
* OLTP(OnLine Transaction Processing): 네트워크상의 여러 이용자가 실시간으로 데이터베이스의 데이터를 갱신하거나 조회하는 등의 단위 작업을 처리하는 방식을 말한다. 주로 신용카드 조회 업무나 자동 현금 지급 등 금융 전산 관련 부문에서 많이 발생하기 때문에 ‘온라인 거래처리’라고도 한다. (효율적 처리 중심)

* OLAP(OnLine Analytical Processing): 사용자가 다양한 각도에서 직접 대화식으로 정보를 분석하는 과정을 말한다. OLAP 시스템은 단독으로 존재하는 정보 시스템이 아니며, 데이터 웨어하우스나 데이터 마트와 같은 시스템과 상호 연관된다. (데이터 분석 중심)

* 트랜잭션 격리수준(Isolation Level): 동시에 여러 트랜잭션이 실행될 때, 트랜잭션 끼리 서로 얼마나 고립 되어 있는지를 확인하는 것, 특정 트랜잭션이 다른 트랜잭션에서 변경한 데이터를 조회할 수 있는지 없는지 판단한다. 격리수준이 내려갈수록 성능이 좋아지지만 오류가 발생할 가능성이 커진다.

* READ UNCOMMITTED: 어떤 트랙잭션의 변경내용이 COMMIT이나 ROLLBACK에 상관없이 모두 노출된다. 데이터의 정합성 문제로 RDBMS 표준에서는 인정하지 않는다.

* READ COMMITTED: 어떤 트랜잭션의 변경내용이 COMMIT되어야만 다른 트랜잭션에서 조회할 수 있다. NON-REPETABLE READ 부정합 문제가 발생할 수 있다.

* REPETABLE READ: 트랜잭션이 시작되기 전에 COMMIT된 내용에 대해서만 조회할 수 있는 격리 수준이다. MySQL의 디폴트 격리수준으로 Update 부정합(업데이트를 수행해야하는 컬럼을 잠글 수 없어 업데이트가 실행되지 않음), Phantom READ(데이터 조회 중 INSERT가 발생하여 없던 결과가 출력되는 현상)가 발생할 수 있다.

* SERIALIZABLE: 가장 강력한 격리수준으로 읽기 작업에도 잠금을 발생시켜 다른 트랜잭션이 레코드를 변경할 수 없도록 한다. 동시처리 능력이 떨어지고 성능이 저하된다.

* 데이터베이스 파티셔닝: DB에 저장되는 데이터 규모가 대용량화 되면서 기존에 사용하던 DB시스템의 용량의 한계와 성능저하를 가지고 오게 되어 TABLE을 파티션(Partion)이라는 작은 단위로 나누어 관리하는 기법, 가용성, 관리용이성, 성능 등 이점이 있지만 JOIN 비용이 늘어난다.

* 정규화: 하나의 릴레이션에 여러 앤티티의 애트리뷰트들을 혼합하게 되면 정보가 중복 저장되며, 저장공간이 낭비되고 갱신이상이 발생한다. 이를 해결하기 위해 거치는 과정
삽입이상, 삭제이상, 갱신(수정)이상이 발생할 수 있다.

* 함수적 종속: X와 Y를 임의의 애트리뷰트 집합이라고 할 때 X의 값이 Y의 값을 유일하게 결정한다면 “X는 Y를 함수적으로 결정한다” 고 한다.
정규화를 수행하였을 때 D는 무손실 조인과 함수적 종속을 보장하여야 한다.

* 클러스터: 디스크로부터 데이터를 읽어오는 시간을 줄이기 위해 조인이나 자주 사용하는 테이블의 데이터를 디스크의 같은 위치에 저장시키는 것, 데이터 조회 속도는 향상시키지만 저장, 수정, 삭제 또는 한 테이블 전체 Scan의 성능은 감소한다.
(주로 조회에 사용되고 컬럼안에 많은 중복데이터를 가지는 테이블,  join을 자주 하는 테이블에 클러스터링을 한다.)

* 클러스터 인덱스: 물리적으로 행을 재배열, 넌 클러스터 인덱스보다 작은 사이즈, 30%이내에서 사용해야 좋다. 테이블당 1개를 갖으며 Primary Key 설정 시 해당 칼럼은 자동적으로 클러스터 인덱스 생성

* 논클러스터 인덱스: 물리적으로 재배치하지 않음, 클러스터 인덱스 용량이 큼, 3% 이내에서 사용해야 좋은 선택도를 갖는다. 테이블당 249개를 갖으며 논클러스터 인덱스를 따로 명시해야 한다(인덱스 페이지를 따로 만듬)

* CDC (Change Data Capture): 마지막으로 추출한 이후 변경된 데이터만 골라내는 기술, 데이터 백업이나 통합작업시 처리할 데이터가 방대할 경우 최근 변경된 데이터만 골라 옮기게 되면 생산성을 향상시킬 수 있다. 24시간 운영하는 시스템에서 사용시 다운타임 없이 실시간 백업/데이터 통합이 가능하다.

* 데이터 무결성: 데이터의 정확성, 일관성, 유효성을 유지하는 것, RDBMS의 중요한 기능으로 주로 데이터에 적용하는 연산을 제한하여 무결성을 유지한다.

* 개체 무결성(Entity integrity): 모든 테이블이 기본키로 선택된 필드를 가지고 있어야 한다. 기본키로 선택된 필드는 NULL을 허용하지 않는다.

* 참조 무결성(Referential integrity): 참조관계에 있는 두 테이블의 데이터가 항상 일관된 값을 갖도록 유지하는 것

* RESTRICTED: 레코드를 변경 또는 삭제하고자 할 때 해당 레코드를 참조하고 있는 개체가 있다면, 변경 또는 삭제 연산을 취소한다.
* CASCADE: 레코드를 변경 또는 삭제하면, 해당 레코드를 참조하고 있는 개체도 변경 또는 삭제된다.
* SET NULL: 레코드를 변경 또는 삭제하면, 해당 레코드를 참조하고 있는 개체의 값을 NULL로 설정한다.

* 슈퍼키(Super Key): 테이블에 존재하는 필드의 부분집합으로 유일성을 만족하여야 한다.

* 후보키(Candidate key): 기본키가 될 수 있는 키, 유일성과, 최소성을 모두 만족하여야 한다.

* 기본키(Primary key): 테이블에서 특정 레코드를 구분하기 위하여 후보키 중 선택된 고유한 식별자, 유일성과 최소성을 만족하여야 하고 NULL값을 갖을 수 없다. 자주 변경되지 않는 값, 단순한 값을 선택하여야 한다.

* 외래키(Foreign key): 한 테이블의 키 중 다른 테이블을 유일하게 식별할 수 있는 키, 중복된 값과 NULL을 갖을 수 있다. 참조되는 테이블에서 유일한 값을 참조해야 한다.


# 용어정리 – 운영체제
* 비선점 스케줄링: 이미 할당된 CPU를 다른 프로세스가 강제로 빼앗아 사용할 수 없는 스케줄링 기법, 프로세스가 CPU를 할당 받으면 해당 프로세스가 완료될 때까지 CPU를 사용한다. 프로세스 응답 시간 예측이 용이하며, 일괄 처리 방식에 적합

* HRN : 긴 작업 시간과 짧은 작업시간의 불평등을 어느정도 보장, 수행시간의 길이와 대기시간을 모두 고려하여 우선순위를 정함

* SJF: 큐 안에 있는 프로세스 중 수행시간이 짧은 것을 먼저수행, 평균 대기시간을 감소
우선순위 스케줄링: 프로세스에게 우선순위를 동적, 정적으로 부여하여 우선순위가 높은 순으로 처리, 동적으로 우선순위 부여시 오버헤드가 많음, 효율은 증가

* FIFO: 프로세스들은 Ready 큐에 도착한 순서데로 CPU를 할당 받는다. 작업완료 예측이 용이하다.

* 선점 스케줄링: 하나의 프로세스가 CPU를 할당 받아 실행하고 있을 때 우선순위가 높은 다른 프로세스가 CPU를 강제로 빼앗아 사용할 수 있는 스케줄링 기법. 우선순위가 높은 프로세스를 빠르게 처리할 수 있다.

* SRT: 짧은 시간동안 순서대로 프로세스를 수행한다. 남은 처리시간이 더 짧은 프로세스가 들어오면 해당 프로세스가 바로 선점된다.

* 라운드로빈: 각 프로세스는 같은 크기의 CPU를 할당 받고 선입선출에 의해 실행된다.
할당시간이 너무 크면 선입선출처럼 동작하고 너무 짧으면 오버헤드가 발생

* 다단계 큐: Ready큐를 여러 개 사용하는 기법, 각 큐는 자신의 스케줄링 알고리즘을 수행하며 큐와 큐 사이에도 우선순위가 있다.
