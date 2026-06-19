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

# 1. 프로젝트 구성

![](/images/spring/asdfjqwefqw-wefqwef-gsdfasdfasdf.png){: .align-center}

인스턴스 입장으로만 보면 이 프로젝트는 4개의 VM에 각각 3개의 인스턴스를 상시 실행하는 구조로 되어 있다.   
다행히 VM은 모두 같은 IDC에 있어서 사설 IP로 통신이 가능한 형태 이다.  
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
따라서 같은 네트워크 상에 있는 Hazalcast를 설정한다면 고유한 클러스터 명을 설정하여 캐싱이 겹치는 일을 막아야 한다.  

두번째로 인스턴스 명을 설정하는 것이다. 인스턴스 명은 노드를 연결하는데 직접적으로 사용되지는 않는다. 
인스턴스 명은 클러스터 내부에서 모니터링이나 캐시가 저장된 위치를 확인하는 용도로 사용된다. 
반드시 필요하지는 않지만 운영에는 필요한 기능이다.  

## 2.1 Hazalcast 설정 - join
Hazalcast의 노드 끼리 서로 join을 하는 방법은 multi-cast와 tcp-ip 설정 하는 방법이 있다. 운영 환경에서는 
tcp-ip 방식이 연결되는 노드의 조건을 조금 더 상세하게 설정할수 있기 때문에 여러가지 장점이 있다.  
운영중이던 프로젝트가 동작하는 서버는 모두 같은 네트워크에서 동작하고 있어 조인 설정을 할때 굳이 공인 IP를 사용할 필요가
없었기 때문에 사설 IP로 설정하였다.  

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
이러한 일이 발생하는 이유는 네트워크 카드에 여러 IP가 설정되어 있을 경우 각각의 IP를 모두 탐지하기 때문이다.  
물론 auto-detection 설정을 안하고 member-list 까지 설정해주면 탐지 범위가 줄어들긴 하지만  
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
대충 보면 어떤 기능인지 쉽게 확인할 수 있을 것으로 보인다. (jmx은 분석 기능이다.)
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

# 3. Hazalcast를 이용한 mybatis cache

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

> 💡 한 가지 주의할 점은 **캐시에 담는 결과 객체(VO/DTO)는 직렬화가 가능해야 한다**는 것이다.
> 로컬 캐시(ehcache 등)일 때는 같은 JVM 메모리에 그대로 두면 되니 문제가 없지만,
> Hazelcast는 객체를 다른 노드로 네트워크 전송하기 위해 직렬화한다.
> 따라서 캐시 대상 객체에 `Serializable`을 구현하지 않으면 런타임에 직렬화 오류가 난다.
> (로컬 캐시에서 분산 캐시로 전환할 때 가장 흔히 겪는 함정이다.)


# 4. 코드에서 Hazalcast 다루기
Hazalcast를 적용하면서 기대했던 것은 모든 인스턴스의 캐시가 공유 되고 원할때 갱신할수 있다는 점 이였다.
기본 버전에서도 일부 기능을 제공하지만  유료 버전을 사용하면 Management Center를 통하여 좀더 쉽게 상태 관리가 되었겠지만  
아쉽게도 지원을 받을수 없는 상황이라 상태를 확인하기 위한 API를 만들었다.

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
다만 아직 테스트 해봐야 할 요소는 많이 있는데 특히 캐시 갱신의 경우 인스턴스에서 캐시를 삭제하였지만
타 인스턴스에 캐시가 남아 있어 다시 이전 값으로 캐시가 채워지는 문제가 있어 추가로 수정이 필요해 보인다.

## 4.1 캐시 갱신이 안 되는 이유 — 캐시 계층이 두 개다
위 문제의 핵심 원인은 **이 프로젝트에 캐시 추상화가 두 겹**으로 존재한다는 데 있다.

* **MyBatis 캐시** — mapper.xml의 `<cache type="...HazelcastCache"/>`. 맵 이름은 **mapper의 namespace**다.
* **Spring `CacheManager`** — `@Cacheable`/`@CacheEvict`나 `cacheManager.getCache(name)`로 다루는 계층.

이 둘은 **서로 다른 맵**을 가리킨다. 그래서 `cacheManager.getCache(name).clear()` 로 지워도
MyBatis가 실제로 쓰는 namespace 맵은 그대로 남고, 다음 조회 때 그 값이 다시 쓰여 "이전 값으로 복구"되는 것처럼 보인다.

Hazelcast의 **`IMap.clear()`/`destroy()`는 그 자체로 클러스터 전체에 전파**되므로(분산 맵이라 노드별로 따로 지울 필요가 없다),
갱신할 때는 **실제 데이터가 들어 있는 맵 이름(MyBatis namespace)을 정확히 찾아 그 IMap을 비우는 것**이 확실하다.
즉 "어느 계층의 어떤 맵 이름에 값이 들어 있는가"를 먼저 맞춰야 갱신이 동작한다.
(위 컨트롤러의 `getAllCacheNames`로 실제 생성된 맵 이름을 확인한 뒤 그 이름으로 비우면 진단이 쉽다.)

## 4.2 관리 API 작성 시 주의점
위 컨트롤러는 동작하지만, 운영에 두기 전에 아래는 보완하는 것이 좋다.

* **삭제/초기화를 GET으로 노출하지 말 것.** `delete`, `evict`, `clear` 같은 상태 변경 동작을 `@GetMapping`으로 두면
  브라우저 프리페치·크롤러·캐시에 의해 의도치 않게 호출될 수 있다. `@DeleteMapping`/`@PostMapping`을 쓰는 것이 안전하다.
* **IP 검증이 빠진 엔드포인트가 있다.** `deleteEmptyCaches()`에는 다른 메서드에 있는 `ACCESS_IP` 체크가 빠져 있어
  접근 제어가 일관되지 않다. 가능하면 인터셉터/필터나 Security 설정으로 한 곳에서 일괄 처리하는 편이 누락이 없다.
* **IP 화이트리스트만으로는 부족할 수 있다.** 리버스 프록시 뒤에 있으면 `getRemoteAddr()`이 프록시 IP로 잡히고,
  `X-Forwarded-For`는 위조가 가능하다. 신뢰할 수 있는 프록시 헤더 처리나 별도 인증을 함께 두는 것이 좋다.
* **`cacheManager.getCache(name)`의 null 처리.** 존재하지 않는 캐시명을 넣으면 `null`이 반환되어 NPE가 날 수 있으니
  사용 전에 null 체크가 필요하다.



# 5. Hazalcast 배포시 문제 해결
Hazalcast의 조인은 여러부분에서 자동화 되어 있어 편리하지만   
그만큼 설정이 누락되면 조인을 하면서 여러 문제가 발생한다.  
가장 이해가 안 됐던 문제는 포트 설정으로 인한 문제 였는데 기존 프로젝트에도 Hazalcast가 사용되어 있었지만 클러스터 명이 달라서 
괜찮을 거라고 생각했는데 서비스를 실행하면서 기존 Hazalcast가 디폴트 포트 범위에 설정되어 있어서 조인을 하려고 시도하였다.

> 📌 **Hazelcast의 기본 포트는 5701이다.** (글 초안에 "5705"로 적었었는데 정확히는 5701이 맞다.)
> 그리고 **`port-count` 기본값이 100**이라, 아무 설정도 안 하면 한 호스트에서 **5701~5800** 범위를 점유한다.
> 중요한 점은 **클러스터 명이 달라도, TCP-IP 조인 단계에서는 일단 그 포트로 연결을 시도한다**는 것이다.
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

# 6. 결론
Hazalcast 를 도입하게 되어 기존 로컬 캐시로 운영되었던 프로젝트의 콘텐츠를 운영자의 요구사항에 맞추어 정리할수 있게 되었다.
캐싱을 일괄로 관리하고 캐싱을 갱신하는 별도의 API을 운영툴에 적용하여 콘텐츠 생산 즉시 운영 반영이 가능한 환경으로 변경되었다.
