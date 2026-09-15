---
layout: post
title: Hazelcast Spring Boot 적용하기 
date: 2025-07-14
Author: Geon Son
categories: Spring
tags: [Hazelcast, Cache, Spring Boot]
comments: true
toc: true    
---

>[신규 프로젝트 Hazelcast 도입기 (네이버)](https://www.youtube.com/watch?v=Ox2ehB8obx8)  
> [hazelcast 깃허브](https://github.com/hazelcast/hazelcast/blob/master/hazelcast/src/main/resources/hazelcast-default.yaml)
  

운영하던 서비스의 JDK17로 업데이트하는 프로젝트를 진행하였다. JDK을 업데이트 하면서 Spring Boot 버전도 3.3으로 업데이트 하는데
기존에 사용하던 ehcache 2가 JDK17을 지원하지 않았다. ehcache3로 변경하는 방법도 있지만 JDK17과 완벽하게 맞지는 않는다는 점,
이미 프로젝트에 Mybatis cache로 Hazalcast를 사용하고 있다는 점과 Hazalcast를 활용하면 여러 인스턴스에 캐시를 공유 하여 
일관된 캐시를 유지 할수 있다는 점도 장점 이라고 생각하여 기존 적용보다 확대 적용하기로 하였다.

이 글은 적용 과정과, 이후 운영하면서 런타임 값을 직접 확인해 찾아낸 세 가지 문제(2.5 / 4.1 / 5.2~5.4)를 함께 정리한 것이다.

# 1. 프로젝트 구성

![4개 VM에 나뉘어 뜬 front·api·bill·mobile 톰캣 인스턴스가 하나의 Hazelcast 캐시 클러스터에 조인하는 구성](/images/spring/asdfjqwefqw-wefqwef-gsdfasdfasdf.png){: .align-center}

인스턴스 입장으로만 보면 이 프로젝트는 4개의 VM에 인스턴스를 상시 실행하는 구조로 되어 있다.
front, mobile, api, bill은 어느 VM에나 뜰 수 있고, 부하가 늘어날 것 같으면 수동으로 인스턴스를 늘린다.
그래서 VM마다 올라가 있는 인스턴스 종류와 개수가 다르다. 위 구조도는 특정 시점의 배치다.
VM은 모두 같은 IDC에 있고, 사설 IP로 통신할 수 있는 구조다.
다만 VM에서 사용할수 있는 메모리 총량이 32G로 작은편이라 다소 위험할수 있지만 캐시의 백업은 별도로 설정하지 않았다.  

> ⚠️ 주의: **IMap의 `backup-count` 기본값은 0이 아니라 1이다.** 즉 백업을 따로 "설정하지 않아도"
> 클러스터에는 원본(primary) + 백업(backup) 1벌이 항상 유지되어 **같은 데이터를 사실상 2배로 저장**한다.
> 메모리가 빠듯한 환경(여기서는 32G)이라면 이게 오히려 부담이 될 수 있다.
> 캐시는 DB에서 다시 채울 수 있는 데이터이므로, 메모리를 아끼는 것이 우선이라면 `backup-count: 0`을 고려할 수 있다.
> (대신 노드가 죽으면 그 노드가 갖고 있던 캐시는 사라지고, 다음 조회 시 DB에서 다시 읽어온다.)
> 메모리 관리 설정은 아래 **2.4**에서 따로 정리했다.

# 2. Hazalcast 설정
Hazalcast를 설정하면 첫번째로 정해야하는 것은 클러스터 이름이다. Hazalcast는 연결되 노드의 캐시를 구분할때
처음 확인하는 것이 클러스터 명이기 때문이다. 클러스터명을 설정하지 않으면 "dev"라는 클러스터 명으로 자동 설정된다.  
같은 네트워크에 있는 Hazelcast를 설정한다면 고유한 클러스터 명을 써서 캐싱이 겹치지 않게 해야 한다.

두번째로 인스턴스 명을 설정하는 것이다. 인스턴스 명은 노드를 연결하는데 직접적으로 사용되지는 않는다. 
인스턴스 명은 클러스터 내부에서 모니터링이나 캐시가 저장된 위치를 확인하는 용도로 사용된다. 
반드시 필요하지는 않지만 운영에는 필요한 기능이다.  

> 인스턴스 명은 모니터링 용도로만 쓰이지 않는다. Spring Boot는 `instance-name`이 설정되어 있으면
> 인스턴스를 새로 만들지 않고 같은 이름의 인스턴스를 재사용한다. 4.1의 기동 순서 문제가 여기서 갈린다.

## 2.1 Hazalcast 설정 - join
Hazalcast의 노드 끼리 서로 join을 하는 방법은 multi-cast와 tcp-ip 설정 하는 방법이 있다. 운영 환경에서는 
tcp-ip 방식이 연결되는 노드의 조건을 조금 더 상세하게 설정할수 있기 때문에 여러가지 장점이 있다.  
운영중이던 프로젝트가 동작하는 서버는 모두 같은 네트워크에서 동작하고 있어 조인 설정을 할때 굳이 공인 IP를 사용할 필요가
없었기 때문에 사설 IP로 설정하였다.  

`member-list`를 개별 IP가 아니라 `10.0.1.11-14`처럼 범위로 적은 이유도 여기에 있다.
1장에서 적었듯 인스턴스는 부하에 따라 수동으로 늘리고, 어느 VM에 뜰지는 그때그때 다르다.
멤버를 하나씩 나열하면 인스턴스를 늘릴 때마다 설정을 고쳐야 하지만, VM 대역을 범위로 잡아두면 설정을 건드리지 않아도 된다.

~~~yaml
hazelcast:
  cluster-name: ${hazelcast.cluster} # 프로젝트마다 다르게 설정
  instance-name: ${hazelcast.instance}
  network:
    join:
      auto-detection:
        enabled: false
      multicast:
        enabled: false
      tcp-ip:
        enabled: true #tcp-ip 조인 허용
        member-list:
          - 10.0.1.11-14
~~~

## 2.2 Hazalcast 설정 - interfaces
이렇게 설정을 해주면 신기한 일이 생기는 경우가 간혹 있는데 하나의 노드가 셀프 조인을 하는 경우가 발생한다.  
이런 일이 생기는 이유는 네트워크 카드에 여러 IP가 설정되어 있을 때 각각의 IP를 모두 탐지하기 때문이다.
auto-detection을 끄고 member-list까지 설정하면 탐지 범위가 줄어들지만
확실하게 노드에서 어떤 IP를 사용할지 명시해주는 것이 여러모로 좋다.

~~~yaml
hazelcast:
  cluster-name: ${hazelcast.cluster} # 프로젝트마다 다르게 설정
  instance-name: ${hazelcast.instance}
  network:
    interfaces:
      enabled: true
      interfaces: # 허용 리스트 방식으로 아래 IP 중 하나라도 해당되면 통신 허용
        - 10.0.1.21
        - 10.0.1.22 
        - 10.0.2.31 
        - 10.0.3.*
    join:
      auto-detection:
        enabled: false
      multicast:
        enabled: false
      tcp-ip:
        enabled: true #tcp-ip 조인 허용
        member-list:
          - 10.0.1.11-14
~~~

사용하는 IP만 리스트로 설정할수도 있고 위에 처럼 범위를 지정하거나 하위 전체를 허용할 수도 있다.  
상황에 맞추어서 설정하면 된다. 

## 2.3 Hazalcast 설정 - properties
이 설정들은 필수 사항은 아니다. 다만 운영 서버에 너무 많은 로그를 남기지 않기 위하여 설정하는 기능이다.
설정 항목에서 기능을 확인할 수 있다. (JMX는 분석 기능이다.)
~~~yaml
  properties:
    hazelcast.logging.type: log4j2  # 로깅 연동
    hazelcast.jmx: false
    hazelcast.health.monitoring.level: NOISY
    hazelcast.health.monitoring.delay.seconds: 600
    hazelcast.health.monitoring.threshold.memory-percentage: 70 # 메모리 임계값
~~~
어떤 설정을 할수 있는지는 hazelcast의 깃허브를 참고해서 작성하였다.

## 2.4 Hazalcast 설정 - 메모리 관리 (backup / eviction)
앞서 1번에서 메모리(32G)가 빠듯하다고 했는데, 분산 캐시는 **아무 제한 없이 두면 계속 쌓여서 OOM**으로
이어질 수 있다. 그래서 메모리가 작은 환경일수록 맵 단위로 다음 3가지를 같이 정해주는 것이 안전하다.

* **`backup-count`** : 백업 개수. 기본값 1(원본+백업으로 2배 저장). 메모리를 아끼려면 0으로 줄일 수 있다.
* **`time-to-live-seconds`** : 항목이 일정 시간 뒤 자동 만료. 오래된 캐시가 무한정 남지 않게 한다.
* **`eviction`** : 맵이 일정 크기를 넘으면 정책(LRU/LFU)에 따라 오래된 항목부터 제거.

~~~yaml
hazelcast:
  map:
    default:                      # 모든 맵에 공통 적용 (맵별로 이름을 지정해 따로 둘 수도 있음)
      backup-count: 0             # 메모리 절약이 우선이면 0, 안정성이 우선이면 1
      time-to-live-seconds: 600   # 10분 뒤 자동 만료
      eviction:
        eviction-policy: LRU      # 가장 오래 사용되지 않은 항목부터 제거
        max-size-policy: PER_NODE
        size: 10000               # 노드당 맵 최대 엔트리 수
~~~

이렇게 상한을 정해두면 캐시가 메모리를 무한정 잠식하는 상황을 예방할 수 있다.
특히 캐시는 사라져도 DB에서 다시 읽어오면 되는 데이터이므로, **메모리 안정성을 위해 다소 공격적으로 만료/제거를
설정해도 큰 문제가 없다**는 점을 활용하면 좋다.

이렇게만 설정을 하고 인스턴스를 실행시켜 보면 로그를 통하여 각각의 노드들이 연결되었음을 확인할수 있다.

~~~
2025-07-23 17:28:08 [hz.local-front-instance.generic-operation.thread-3] INFO  com.hazelcast.internal.cluster.ClusterService - [10.0.3.50]:5708 [local-cluster] [5.5.0] 

Members {size:4, ver:4} [
	Member [10.0.3.50]:5705 - 19432408-55ad-4841-8b0d-e564f6be9109
	Member [10.0.3.50]:5706 - 7d7c2a16-4112-4d69-b8eb-249b5089b4d2
	Member [10.0.3.50]:5707 - 01994248-de3e-4a42-8591-f3d743d364a4
	Member [10.0.3.50]:5708 - db580a64-0708-43c7-a9d0-a66c9a986359 this
]
~~~

위 로그는 개발기에서 테스트하며 남긴 것이라 포트가 5705대다. 운영은 6장에서 정리한 대로 5715대를 쓴다.

## 2.5 map의 default는 상속이 아니라 폴백이다

여기부터는 위 설정으로 한동안 운영한 뒤, 실제 적용값을 확인하고 나서 고친 내용이다.

2.4처럼 `default` 블록에 `backup-count: 0`, `statistics-enabled: false`, LRU eviction을 적어두고
모든 맵에 적용된다고 보고 `# 캐시 백업 안함` 주석까지 달아뒀지만,
이름이 명시된 맵에는 이 값이 하나도 적용되지 않고 있었다.

Hazelcast의 `default`는 상속이 아니라 폴백이다.

* 자기 이름의 블록이 없는 맵 → `default` 값을 쓴다.
* 자기 이름의 블록이 있는 맵 → 그 블록에 적힌 속성만 쓰고, 적지 않은 속성은 `default`가 아니라 Hazelcast 내장 기본값을 쓴다.

내장 기본값은 `backup-count: 1`, `statistics-enabled: true`, eviction `NONE`이다.
이름을 붙인 맵은 `default`에 무엇을 적든 백업 1벌을 만들고, 에비션이 없어 TTL이 유일한 상한이었다.

### 확인 - MapConfig 덤프

YAML만 봐서는 드러나지 않는다. `YamlConfigBuilder`로 빌드한 `MapConfig`를 그대로 출력하면 확인된다.

~~~java
Config config = new YamlConfigBuilder("hazelcast-local.yaml").build();

config.getMapConfigs().forEach((name, map) ->
        System.out.printf("%-22s ttl=%-4d backup=%d stats=%-5b evict=%s/%d%n",
                name,
                map.getTimeToLiveSeconds(),
                map.getBackupCount(),
                map.isStatisticsEnabled(),
                map.getEvictionConfig().getEvictionPolicy(),
                map.getEvictionConfig().getSize()));
~~~

실제 출력이다.

~~~
default                ttl=60   backup=0 stats=false evict=LRU/10000
newsOnAirCache         ttl=10   backup=1 stats=true  evict=NONE/2147483647
eventPollEntryCache    ttl=3    backup=1 stats=true  evict=LFU/300
~~~

`default`만 의도대로 적용됐고, 명시 맵은 `backup=1`, `stats=true`, `evict=NONE`이다.
Spring `@Cacheable` 캐시 9개가 전부 이 상태였다. 엔트리마다 백업 복제본이 생기므로 메모리를 2배로 쓰고,
쓰기마다 백업 복제 ACK를 기다리는 비용이 붙는다.

### DB 읽기 캐시에 백업이 필요 없는 이유

백업은 노드가 죽어도 데이터가 남게 하는 장치다. 이 맵에 들어 있는 값은 DB에서 읽어온 조회 결과이고,
원본은 DB에 있다. 노드가 죽어 캐시가 사라져도 다음 조회 때 DB에서 다시 읽어 채운다.
잃을 것이 없는 데이터에 메모리 2배와 복제 지연을 지불하고 있었다.

### YAML 병합키는 쓸 수 없다

중복을 줄이려고 YAML 병합키(`<<: *anchor`)로 공통 속성을 묶으려 했으나 Hazelcast 스키마가 거부한다.

~~~
extraneous key [<<] is not permitted
~~~

맵마다 전부 명시하는 것 외에 방법이 없었다.

~~~yaml
newsContentCache:
  time-to-live-seconds: 100
  max-idle-seconds: 100
  backup-count: 0
  statistics-enabled: false
  eviction:
    eviction-policy: LRU
    max-size-policy: PER_NODE
    size: 10000
~~~

# 3. Spring Boot 연동

이 프로젝트에는 캐시가 두 종류 있고, 둘이 같은 Hazelcast 클러스터를 공유한다.

* Spring `@Cacheable` 캐시 - 9개
* mapper XML의 `<cache>`로 걸리는 MyBatis 2차 캐시 - 20개

버전은 Spring Boot 3.5.3 + Hazelcast 5.5.0 + mybatis-hazelcast 1.3.0 (MyBatis 3.5.9) 조합이고,
WAS 4대가 프로필별로 하나의 클러스터에 붙는다.

설정 파일은 프로필별로 `hazelcast-local.yaml`, `hazelcast-dev.yaml`, `hazelcast-stage.yaml`, `hazelcast-prod.yaml`
네 개를 두고 부팅할 때 `hazelcast.config` 시스템 프로퍼티로 지정한다. stage는 이번에 dev에서 분리했다.

~~~
-Dhazelcast.config=classpath:hazelcast-prod.yaml
~~~

이 시스템 프로퍼티는 Spring이 아니라 Hazelcast 자신의 설정 로딩 경로다.
`Config.load()`를 호출하는 쪽은 Spring이든 아니든 같은 파일을 읽는다. 4.1에서 이 성질을 그대로 이용한다.

Spring 쪽은 `@EnableCaching`만 켜두면 Hazelcast가 클래스패스에 있을 때 `HazelcastCacheManager`가 자동 구성된다.

~~~java
@EnableCaching
@SpringBootApplication
public class Application { ... }
~~~

`instance-name`이 설정되어 있으면 Spring Boot는 인스턴스를 새로 만들지 않고
`Hazelcast.getOrCreateHazelcastInstance()`를 호출한다. 같은 이름의 인스턴스가 이미 떠 있으면 재사용한다.
이 동작은 `HazelcastServerConfiguration`을 `javap`으로 확인했다.

# 4. Hazalcast를 이용한 mybatis cache

~~~xml
    <dependency>
        <groupId>org.mybatis.caches</groupId>
        <artifactId>mybatis-hazelcast</artifactId>
        <version>1.3.0</version>
    </dependency>
~~~

기존 프로젝트에 Hazalcast가 사용되던 이유는 mybatis mapper에 캐시를 사용하기 위해서 이다.
공식페이지에 단순하게 적용 법이 설명 되어 있는데 단순하게 mapper.xml 파일에 한줄만 추가하면 해당 매퍼와 
쿼리에 캐싱이 적용된다. 

~~~xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.tv.persistence.mapper.BannerMapper">

    <!-- 사용하고자 하는 statement 에 useCache="true" 명시 필요. -->
    <cache type="org.mybatis.caches.hazelcast.HazelcastCache"/>
    
    <select id="selectSomeList" useCache="true">
        SELECT * FROM TB_MGT WITH (NOLOCK)
    </select>
</mapper>
~~~

**useCache="true"**를 명시해주면 해당 매퍼의 패키지 명으로 Map이 생성되고 쿼리 결과가 캐시에 저장된다.
(위 `type`은 라이브러리 기본 구현이다. 최종적으로는 4.1에서 만든 자체 클래스로 교체했다.)

> 💡 한 가지 주의할 점은 **캐시에 담는 결과 객체(VO/DTO)는 직렬화가 가능해야 한다**는 것이다.
> 로컬 캐시(ehcache 등)일 때는 같은 JVM 메모리에 그대로 두면 되니 문제가 없지만,
> Hazelcast는 객체를 다른 노드로 네트워크 전송하기 위해 직렬화한다.
> 캐시 대상 객체에 `Serializable`을 구현하지 않으면 런타임에 직렬화 오류가 난다.
> (로컬 캐시에서 분산 캐시로 전환할 때 가장 흔히 겪는 함정이다.)

이 프로젝트에서 직접 겪지는 않았지만, 직렬화 방식을 고를 때 같이 보게 되는 조건이 두 가지 더 있다.

* `Serializable`은 동작하지만 Java 기본 직렬화라 느리고 페이로드가 크다. 엔트리 수가 많은 맵이라면
  Hazelcast의 Compact Serialization이나 `DataSerializable` 계열이 유리하다.
* 롤링 배포에서는 구/신 버전 인스턴스가 한 클러스터에 공존한다. 캐시 VO의 필드를 바꾸면
  한쪽이 쓴 엔트리를 다른 쪽이 역직렬화하다 `serialVersionUID` 불일치로 실패할 수 있다.
  필드를 바꾸는 배포라면 맵을 비우고 시작하거나 맵 이름으로 세대를 분리한다.

## 4.1 MyBatis 캐시가 Hazelcast 인스턴스를 따로 만들던 문제

`mybatis-hazelcast`의 `HazelcastCache`는 인스턴스를 이렇게 얻는다.

~~~java
// org.mybatis.caches.hazelcast.HazelcastCache
private static final HazelcastInstance CACHE = Hazelcast.newHazelcastInstance();
~~~

`newHazelcastInstance()`는 재사용하지 않고 항상 새로 만든다.
3장에서 본 대로 Spring Boot는 `instance-name`이 있으면 `getOrCreateHazelcastInstance()`를 쓴다.

두 경로가 같은 yaml, 같은 `instance-name`을 읽으므로 결과가 기동 순서에 따라 갈린다.

* MyBatis가 먼저 뜬다 → MyBatis가 인스턴스를 만들고 Spring이 재사용한다. 정상 동작한다.
* Spring이 먼저 뜬다 → MyBatis 쪽이 같은 이름으로 새로 만들려다 이름 충돌로 실패한다.

그동안 동작한 것은 설계가 맞아서가 아니라 기동 순서가 맞아떨어졌기 때문이다.

### 확인 - 로컬 멤버로 재현

로컬에 멤버를 하나 띄워두고 두 방식을 각각 호출했다.

~~~
getOrCreate 재사용? true
newHazelcastInstance 중복: InvalidConfigurationException - HazelcastInstance with name '...' already exists!
~~~

### 해결 - 인스턴스 획득만 교체

캐시 동작은 바꿀 이유가 없다. 라이브러리의 `AbstractHazelcastCache`를 그대로 상속하고
인스턴스를 얻는 부분만 `getOrCreateHazelcastInstance`로 바꾼 클래스를 만들었다.

~~~java
package com.example.global.cache;

import com.hazelcast.config.Config;
import com.hazelcast.core.Hazelcast;
import com.hazelcast.core.HazelcastInstance;
import org.mybatis.caches.hazelcast.AbstractHazelcastCache;

public final class AppHazelcastCache extends AbstractHazelcastCache {

    private static final HazelcastInstance INSTANCE =
            Hazelcast.getOrCreateHazelcastInstance(Config.load());

    public AppHazelcastCache(String id) {
        super(id, INSTANCE.getMap(id));
    }
}
~~~

`Config.load()`가 3장의 `hazelcast.config` 시스템 프로퍼티를 읽으므로, Spring이 읽는 설정 파일과 정확히 같은 파일을 본다.
그리고 mapper XML 20개의 `<cache type="...">`을 이 클래스로 교체했다.

~~~xml
<cache type="com.example.global.cache.AppHazelcastCache"/>
~~~

어느 쪽이 먼저 뜨든 인스턴스는 하나다. Spring `@Cacheable` 캐시와 MyBatis 2차 캐시가
같은 인스턴스, 같은 클러스터를 쓰고 기동 순서와 무관해진다.

# 5. 코드에서 Hazalcast 다루기
Hazalcast를 적용하면서 기대했던 것은 모든 인스턴스의 캐시가 공유 되고 원할때 갱신할수 있다는 점 이였다.
기본 버전에서도 일부 기능을 제공한다. 유료 버전에서는 Management Center로 상태를 관리할 수 있지만
지원받을 수 없는 환경이라 상태 확인용 API를 만들었다.

~~~java
@RestController
@RequiredArgsConstructor
@RequestMapping("/hazelcast")
public class HazelcastAdminController {

    private final CacheManager cacheManager;
    private final HazelcastInstance hazelcastInstance;


    // 현재 멤버 목록 확인
    @GetMapping("/cluster/members")
    public Set<Member> getClusterMembers(HttpServletRequest request) {
        if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
            return null;
        }
        return hazelcastInstance.getCluster().getMembers();
    }

    // 현재 클러스터의 맵 전체 목록
    @GetMapping("/cluster/cache")
    public ResponseEntity<Set<String>> getAllCacheNames(HttpServletRequest request) {
        if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Set<String> mapNames = hazelcastInstance.getDistributedObjects().stream()
                .filter(distributedObject -> distributedObject instanceof IMap)
                .map(DistributedObject ::getName)
                .collect(Collectors.toSet());

        return ResponseEntity.ok(mapNames);
    }


    // 특정 캐시맵 키 전체 조회
    @GetMapping("/cache/{cacheMap}/keys")
    public ResponseEntity<Set<Object>> getCacheKeys(HttpServletRequest request,
                                                    @PathVariable String cacheMap) {
        if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean exists = hazelcastInstance.getDistributedObjects().stream()
                .anyMatch(obj -> obj instanceof IMap && obj.getName().equals(cacheMap));

        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cache not found: " + cacheMap);
        }

        Set<Object> keys = hazelcastInstance.getMap(cacheMap).keySet();
        return ResponseEntity.ok(keys);
    }

    // 특정 캐시맵 전체 key-value 반환
    @GetMapping("/cache/{cacheMap}/entries")
    public ResponseEntity<Map<Object, Object>> getCacheEntries(HttpServletRequest request,
                                                               @PathVariable String cacheMap) {
        if (!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean exists = hazelcastInstance.getDistributedObjects().stream()
                .anyMatch(obj -> obj instanceof IMap && obj.getName().equals(cacheMap));

        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cache not found: " + cacheMap);
        }

        IMap<Object, Object> map = hazelcastInstance.getMap(cacheMap);
        Map<Object, Object> entries = map.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return ResponseEntity.ok(entries);
    }

    //비어 있는 캐시맵을 초기화 -> hazelcast는 맵을 조회만 해도 새로운 캐시맵을 생성함
    @GetMapping("/cache/empty/delete")
    public ResponseEntity<Set<String>> deleteEmptyCaches() {
        // 삭제한 Map 이름 목록 저장용
        Set<String> deletedMaps = hazelcastInstance.getDistributedObjects().stream()
                .filter(obj -> obj instanceof IMap<?, ?>)
                .map(obj -> (IMap<?, ?>) obj)
                .filter(map -> map.isEmpty())
                .peek(IMap::destroy)
                .map(IMap::getName)
                .collect(Collectors.toSet());


        return ResponseEntity.ok(deletedMaps);
    }


    // 특정 캐시맵을 초기화
    @GetMapping("/cache/{cacheMap}/delete")
    public ResponseEntity<String> clearCache(HttpServletRequest request, @PathVariable String cacheMap) {
        if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
            return null;
        }
        IMap<Object, Object> map = hazelcastInstance.getMap(cacheMap);
        int size = map.size();
        map.clear();

        //남아 있는 데이터가 있을 경우 map 강제 제거
        if(map.size() > 0){
            map.destroy();
        }

        //캐시 매니저의 전체 값 삭제 (@CacheEvict와 동일 기능)
        cacheManager.getCache(cacheMap).clear();

        return ResponseEntity.ok(cacheMap + "( size : "+ size +" ) cleared successfully.");
    }

    //특정 캐시의 key, value 삭제
    @GetMapping("/cache/{cacheName}/{key}/evict")
    public ResponseEntity<String> evictCache(HttpServletRequest request, @PathVariable String cacheName, @PathVariable String key) {
        if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
            return null;
        }
        cacheManager.getCache(cacheName).evict(key);
        return ResponseEntity.ok("Cache " + cacheName + "-" + key + " evict successfully.");
    }
}
~~~

위 코드는 수정 전 상태다. 응답은 정상으로 나가지만 실제 동작이 다른 부분이 세 군데 있었다.
아래 5.1~5.5가 그 내용이고, 5.6은 일반적인 주의점이다.

## 5.1 캐시 갱신이 안 되는 이유 - 캐시 계층이 두 개다
첫 번째 원인은 이 프로젝트에 캐시 추상화가 두 겹으로 존재한다는 점이다.

* MyBatis 캐시 - mapper.xml의 `<cache type="..."/>`. 맵 이름은 mapper의 namespace다.
* Spring `CacheManager` - `@Cacheable`/`@CacheEvict`나 `cacheManager.getCache(name)`로 다루는 계층.

두 계층 모두 같은 Hazelcast 인스턴스의 `IMap`을 쓰지만 맵 이름이 달라 서로 다른 맵이 된다.
그래서 `cacheManager.getCache(name).clear()` 로 지워도
MyBatis가 실제로 쓰는 namespace 맵은 그대로 남고, 다음 조회 때 그 값이 다시 쓰여 "이전 값으로 복구"되는 것처럼 보인다.

Hazelcast의 `IMap.clear()`/`destroy()`는 그 자체로 클러스터 전체에 전파된다(분산 맵이라 노드별로 따로 지울 필요가 없다).
갱신할 때는 실제 데이터가 들어 있는 맵 이름(MyBatis namespace)을 찾아 그 IMap을 비우는 쪽이 확실하다.
즉 "어느 계층의 어떤 맵 이름에 값이 들어 있는가"를 먼저 맞춰야 갱신이 동작한다.
(위 컨트롤러의 `getAllCacheNames`로 실제 생성된 맵 이름을 확인한 뒤 그 이름으로 비우면 진단이 쉽다.)

4.1을 고치기 전에는 인스턴스가 둘로 갈릴 수 있어 어느 맵을 비웠는가뿐 아니라
어느 인스턴스의 맵을 비웠는가까지 어긋났다. 지금은 Spring `@Cacheable` 캐시와 MyBatis 2차 캐시가
같은 인스턴스, 같은 클러스터를 쓰므로 남은 문제는 맵 이름 하나로 좁혀진다.

## 5.2 접근 차단이 200 빈 응답으로 나가던 문제

엔드포인트 7곳 중 6곳은 권한 체크에서 막힐 때 `return null`이었고, 나머지 하나(`deleteEmptyCaches()`)는
권한 체크 자체가 없었다.

~~~java
if(!HazelcastConstants.ACCESS_IP.contains(RequestHelper.getRequestRemoteIp(request))){
    return null;
}
~~~

`@RestController`에서 `null`을 반환하면 200 OK에 빈 본문이 나간다.
호출한 쪽에서는 권한 없음이 데이터 없음으로 보인다. 캐시 목록이 비어서 온 경우
캐시가 없는 상태와 차단된 상태를 구분할 수 없다.
빠져 있던 `deleteEmptyCaches()`에 검증을 추가하고, 차단 시 403을 반환하도록 7곳 전부 통일했다.

## 5.3 IP 화이트리스트 - String.contains의 부분 문자열 매칭

허용 IP가 파이프로 구분된 문자열 상수에 하드코딩되어 있었다.

~~~java
- public static final String ACCESS_IP = "x.x.x.x|x.x.x.x|x.x.x.x|...";
~~~

`String.contains()`는 부분 문자열 매칭이다. `10.0.1.2`가 목록에 있으면
`10.0.1.20`, `10.0.1.21`도 통과한다. 의도는 IP가 목록에 있는지 확인하는 것이었지만
실제로는 그 문자열이 어딘가에 포함되는지를 확인하고 있었다.

목록을 프로필 설정으로 빼고 `List.contains`로 정확히 일치하는지 보도록 바꿨다.

~~~java
+ private boolean isAllowed(HttpServletRequest request) {
+     String remoteIp = RequestHelper.getRequestRemoteIp(request);
+     return allowedIps.contains("*") || allowedIps.contains(remoteIp);
+ }
~~~

## 5.4 evict 실패 - MyBatis CacheKey와 문자열 키의 타입 불일치

없는 키를 지워도 200 `evict successfully`가 돌아왔다. 확인해보니 있는 키도 지워지지 않고 있었다.

원인은 키 타입이다. MyBatis는 캐시 키를 문자열이 아니라 `CacheKey` 객체로 저장한다(`cacheMap.set(key, value)`).
관리 API는 URL 경로에서 받은 문자열로 `map.delete(key)`를 호출한다.
타입이 다르므로 `equals`가 성립하지 않아 어떤 키도 지워지지 않는다. 예외는 나지 않으니 200이 나간다.
키 하나를 지울 방법이 없으니 실제 운영에서는 `clearCache`로 맵을 통째로 비워 우회하고 있었다(5.5).

실험으로 확인했다.

~~~
저장 후 size=1, CacheKey.toString()=-549761774:106266181:...selectSchedule:0:100
문자열 evict 후 size=1      ← 안 지워짐
CacheKey evict 후 size=0
~~~

### 저장 키를 문자열로 바꾸면 안 되는 이유

저장할 때부터 키를 `String`으로 바꾸는 방법이 가장 쉬워 보이지만, 이 방식은 캐시를 망가뜨린다.

MyBatis의 `CacheKey`는 statement id, 파라미터, RowBounds 등을 조합한 값 기반 키다.
이를 `toString()` 결과로 대체하면 `toString()`을 오버라이드하지 않은 파라미터 POJO가 끼는 순간
`com.example.Param@1b6d3586`처럼 호출마다 다른 키가 만들어진다.
캐시 히트가 나지 않고 맵은 계속 커진다. 캐시가 아니라 메모리 누수다.

저장 포맷은 그대로 두고 조회 쪽에서 문자열로 대조하는 방식으로 해결했다.

~~~java
private Object findKey(IMap<Object, Object> map, String key) {
    if (map.containsKey(key)) {
        return key;
    }
    return map.keySet().stream()
            .filter(candidate -> key.equals(String.valueOf(candidate)))
            .findFirst()
            .orElse(null);
}
~~~

문자열 키로 먼저 찾고(Spring 캐시 쪽은 여기서 맞는다), 없으면 키를 순회하며
`String.valueOf()` 결과로 대조해 실제 키 객체를 찾은 뒤 그 객체로 지운다.
어느 쪽으로도 못 찾으면 200이 아니라 404를 반환한다. 삭제됐는지 아닌지가 응답에 그대로 드러나야 한다.

맵 전체를 순회하므로 엔트리가 많으면 느리다. 관리용 API에만 쓰는 경로라 이 비용은 감수했다.

## 5.5 우회로 넣었다가 걷어낸 코드

`clearCache`에는 5.4 때문에 들어간 코드가 있었다. 키 단위 삭제가 동작하지 않으니
캐시를 통째로 비워서 우회하려던 것이다. 5.4를 고치면서 둘 다 제거했다.

* **`cacheManager.getCache(name).clear()`** - 두 계층을 다 비우려고 넣었지만 실제로는 같은 맵을 두 번 비운다.
  `HazelcastCacheManager.getCache(name)`은 `hazelcastInstance.getMap(name)`을 감싼 `HazelcastCache`를 돌려주고,
  그 `clear()`는 그대로 `IMap.clear()`다. 바로 윗줄에서 비운 맵을 다시 비우는 것이라 남는 효과가 없었다.
  덧붙여 이 호출은 `CacheManager.getCache`가 `@Nullable`이라는 계약에 기대고 있다.
  현재 구현은 없는 이름이면 새로 만들어 돌려주므로 `null`이 아니지만, 구현이 바뀌면 깨진다.
* **`if (map.size() > 0) { map.destroy(); }`** - `clear()` 실패에 대비한 방어였는데 그렇게 동작하지 않는다.
  `clear()`가 예외를 던지면 이 줄에 도달하지 못하고, 성공하면 `size()`는 0이다.
  참이 되는 경우는 `clear()`와 `size()` 사이에 다른 노드가 새 엔트리를 넣었을 때뿐이다.
  막으려던 상황이 아니라 캐시가 정상적으로 다시 채워지는 중일 때만 걸리면서 맵 전체를 `destroy`한다.

남은 본문은 이게 전부다. 쓰이지 않게 된 `CacheManager` 주입과 import도 같이 걷어내 10줄이 빠지고 1줄이 늘었다.

~~~java
// 캐시 매니저가 주는 캐시도 같은 이름의 IMap 을 감싼 것이라 여기서 한 번만 비우면 된다.
IMap<Object, Object> map = hazelcastInstance.getMap(cacheMap);
int size = map.size();
map.clear();

return ResponseEntity.ok("( size : " + size + " ) cleared successfully.");
~~~

> `destroy()`를 뺀 이유가 MyBatis가 잡아둔 `IMap` 참조를 깨기 때문은 아니다.
> Hazelcast가 프록시를 다시 만들어 destroy 직후에도 기존 참조로 put/get이 된다. 이건 띄워서 확인했다.

## 5.6 캐시 관리 API를 만들 때 같이 볼 것

위 컨트롤러를 두고 확인한 것들이다.

* **삭제/초기화를 GET으로 노출하지 말 것.** `delete`, `evict`, `clear` 같은 상태 변경 동작을 `@GetMapping`으로 두면
  브라우저 프리페치·크롤러·캐시에 의해 의도치 않게 호출될 수 있다. `@DeleteMapping`/`@PostMapping`을 쓰는 것이 안전하다.
* **접근 제어를 엔드포인트마다 복사하지 말 것.** 같은 `if` 블록을 7곳에 붙여두면 5.2처럼 한 곳이 빠져도 드러나지 않는다.
  인터셉터/필터나 Security 설정으로 한 곳에서 처리하면 누락 자체가 생기지 않는다.
* **IP 화이트리스트만으로는 부족하다.** 리버스 프록시 뒤에 있으면 `getRemoteAddr()`이 프록시 IP로 잡히고,
  `X-Forwarded-For`는 위조가 가능하다. 신뢰할 수 있는 프록시 헤더 처리나 별도 인증을 함께 둔다.

# 6. Hazalcast 배포시 문제 해결
Hazalcast의 조인은 여러부분에서 자동화 되어 있어 편리하지만   
그만큼 설정이 누락되면 조인을 하면서 여러 문제가 발생한다.  
가장 이해가 안 됐던 문제는 포트 설정으로 인한 문제 였는데 기존 프로젝트에도 Hazalcast가 사용되어 있었지만 클러스터 명이 달라서 
괜찮을 거라고 생각했는데 서비스를 실행하면서 기존 Hazalcast가 디폴트 포트 범위에 설정되어 있어서 조인을 하려고 시도하였다.

> 📌 **Hazelcast의 기본 포트는 5701이다.**
> 그리고 **`port-count` 기본값이 100**이라, 아무 설정도 안 하면 한 호스트에서 **5701~5800** 범위를 점유한다.
> 핵심은 **클러스터 명이 달라도 TCP-IP 조인 단계에서는 일단 그 포트로 연결을 시도한다**는 점이다.
> 연결이 맺어진 뒤 클러스터 명이 다르면 멤버로 합류하지 않을 뿐, "연결 시도 자체"는 일어나기 때문에
> 같은 호스트/네트워크에 다른 Hazelcast가 떠 있으면 포트 범위가 겹쳐 위와 같은 혼선이 생긴다.

그래서 포트 범위를 기본값(5701~)과 겹치지 않게 5715대로 옮기고 범위도 좁히는 것으로 해당 문제는 수정하였다.

또 Hazalcast가 조인을 하기 위해서 설정된 포트범위에 전부(!?) 통신을 시도하는데 이때 너무 많은 IP와 포트를 설정하면
통신을 시도하다가 인스턴스가 죽는 경우가 있다. 포트의 디폴트 범위는 100개로 되어 있으니 서비스에 따라 조절하는 것이 좋아 보인다.
(아래처럼 `port-count`를 줄이면 조인 시 시도하는 포트 수가 줄어 불필요한 연결 시도를 막을 수 있다.)

~~~yaml
  network:
    port:
      port: 5715
      port-count: 10
      auto-increment: true 
~~~

2.1에서 `member-list`는 범위로 넓게 잡았는데 포트는 반대로 좁힌다.
조인할 때 시도하는 연결 수는 IP 개수 × 포트 개수라서, 어느 한쪽이 넓으면 다른 쪽은 실제 쓰는 만큼만 남기는 편이 안전하다.

# 7. 결론
Hazalcast 를 도입하게 되어 기존 로컬 캐시로 운영되었던 프로젝트의 콘텐츠를 운영자의 요구사항에 맞추어 정리할수 있게 되었다.
캐싱을 일괄로 관리하고 캐싱을 갱신하는 별도의 API을 운영툴에 적용하여 콘텐츠 생산 즉시 운영 반영이 가능한 환경으로 변경되었다.

이후 찾은 세 가지 문제는 원인이 같다. `default` 블록은 상속처럼 보이지만 폴백이고,
MyBatis 캐시는 Spring이 만든 인스턴스 대신 자기 인스턴스를 만들며, 관리 API는 200을 반환하면서 아무것도 지우지 않았다.
셋 다 설정 파일과 주석이 말하는 의도와 런타임에 적용된 값이 달랐고,
값을 덤프하거나 재현해보고 나서야 드러났다.
