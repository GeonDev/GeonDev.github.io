---
layout: post
title: Hazelcast Spring Boot 적용하기 
date: 2025-07-14
Author: Geon Son
categories: Spring
tags: [Spring]
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

![](/assets/images/spring/asdfjqwefqw-wefqwef-gsdfasdfasdf.png){: .align-center}

인스턴스 입장으로만 보면 이 프로젝트는 4개의 VM에 각각 3개의 인스턴스를 상시 실행하는 구조로 되어 있다.   
다행히 VM은 모두 같은 IDC에 있어서 사설 IP로 통신이 가능한 형태 이다.  
다만 VM에서 사용할수 있는 메모리 총량이 32G로 작은편이라 다소 위험할수 있지만 캐시의 백업은 설정하지 않았다.  

# 2. Hazalcast 설정
Hazalcast를 설정하면 첫번째로 정해야하는 것은 클러스터 이름이다. Hazalcast는 연결되 노드의 캐시를 구분할때
처음 확인하는 것이 클러스터 명이기 때문이다. 클러스터명을 설정하지 않으면 "dev"라는 클러스터 명으로 자동 설정된다.  
따라서 같은 네트워크 상에 있는 Hazalcast를 설정한다면 고유한 클러스터 명을 설정하여 캐싱이 겹치는 일을 막아야 한다.  

두번째로 인스턴스 명을 설정하는 것이다. 인스턴스 명은 노드를 연결하는데 직접적으로 사용되지는 않는다. 
인스턴스 명은 클러스터 내부에서 모니터링이나 캐시가 저장된 위치를 지정하는 확인하는 용도로 사용된다. 
반드시 필요하지는 않지만 운영에는 필요한 기능이다.  

## 2.1 Hazalcast 설정 - join
Hazalcast의 노드 끼리 서로 join을 하는 방법은 multi-cast와 tcp-ip 설정 하는 방법이 있다. 운영 환경에서는 
연결되는 노드의 조건을 조금 더 상세하게 설정할수 있기 때문에 여러가지 장점이 있다.  
운영중이던 프로젝트가 동작하는 서버는 모두 같은 네트워크에서 동작하고 있어 조인 설정을 할때 굳이 공인 IP를 사용할 필요가
없었기 때문에 사설 IP로 설정하였다.  

~~~
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
          - 192.168.171.117-120
~~~

## 2.2 Hazalcast 설정 - interfaces
이렇게 설정을 해주면 신기한 일이 생기는 경우가 간혹 있는데 하나의 노드가 셀프 조인을 하는 경우가 발생한다.  
이러한 일이 발생하는 이유는 네트워크 카드에 여러 IP가 설정되어 있을 경우 각각의 IP를 모두 탐지하기 때문이다.  
물론 auto-detection 설정을 안하고 member-list 까지 설정해주면 탐지 범위가 줄어들긴 하지만  
확실하게 노드에서 어떤 IP를 사용할지 명시해주는 것이 여러모로 좋다.

~~~
hazelcast:
  cluster-name: ${hazelcast.cluster} # 프로젝트마다 다르게 설정
  instance-name: ${hazelcast.instance}
  network:
    interfaces:
      enabled: true
      interfaces: # 허용 리스트 방식으로 아래 IP 중 하나라도 해당되면 통신 허용
        - 192.168.171.107
        - 192.168.171.73 
        - 192.168.172.31 
        - 172.27.11.*
    join:
      auto-detection:
        enabled: false
      multicast:
        enabled: false
      tcp-ip:
        enabled: true #tcp-ip 조인 허용
        member-list:
          - 192.168.171.117-120
~~~

사용하는 IP만 리스트로 설정할수도 있고 위에 처럼 범위를 지정하거나 하위 전체를 허용할 수도 있다.  
상황에 맞추어서 설정하면 된다. 

## 2.3 Hazalcast 설정 - properties
이 설정들은 필수 사항은 아니다. 다만 운영 서버에 너무 많은 로그를 남기지 않기 위하여 설정하는 기능이다.
대충 보면 어떤 기능인지 쉽게 확인할 수 있을 것으로 보인다. (jmx은 분석 기능이다.)
~~~
  properties:
    hazelcast.logging.type: log4j2  # 로깅 연동
    hazelcast.jmx: false
    hazelcast.health.monitoring.level: NOISY
    hazelcast.health.monitoring.delay.seconds: 600
    hazelcast.health.monitoring.threshold.memory-percentage: 70 # 메모리 임계값
~~~
어떤 설정을 할수 있는지는 hazelcast의 깃허브를 참고해서 작성하였다.


이렇게만 설정을 하고 인스턴스를 실행시켜 보면 로그를 통하여 각각의 노드들이 연결되었음을 확인할수 있다.

~~~
2025-07-23 17:28:08 [hz.local-front-instance.generic-operation.thread-3] INFO  com.hazelcast.internal.cluster.ClusterService - [172.27.11.219]:5708 [local-cluster] [5.5.0] 

Members {size:4, ver:4} [
	Member [172.27.11.219]:5705 - 19432408-55ad-4841-8b0d-e564f6be9109
	Member [172.27.11.219]:5706 - 7d7c2a16-4112-4d69-b8eb-249b5089b4d2
	Member [172.27.11.219]:5707 - 01994248-de3e-4a42-8591-f3d743d364a4
	Member [172.27.11.219]:5708 - db580a64-0708-43c7-a9d0-a66c9a986359 this
]
~~~

# 3. Hazalcast를 이용한 mybatis cache

~~~
    <dependency>
        <groupId>org.mybatis.caches</groupId>
        <artifactId>mybatis-hazelcast</artifactId>
        <version>1.3.0</version>
    </dependency>
~~~

기존 프로젝트에 Hazalcast가 사용되던 이유는 mybatis mapper에 캐시를 사용하기 위해서 이다.
공식페이지에 단순하게 적용 법이 설명 되어 있는데 단순하게 mapper.xml 파일에 한줄만 추가하면 해당 매퍼와 
쿼리에 캐싱이 적용된다. 

~~~
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.jtbc.tv.persistence.mapper.BannerMapper">

    <!-- 사용하고자 하는 statement 에 useCache="true" 명시 필요. -->
    <cache type="org.mybatis.caches.hazelcast.HazelcastCache"/>
    
    <select id="selectSomeList" useCache="true">
        SELECT * FROM TB_MGT WITH (NOLOCK)
    </select>
</mapper>
~~~

**useCache="true"**를 명시해주면 해당 매퍼의 패키지 명으로 Map이 생성되고 쿼리 결과가 캐시에 저장된다.


# 4. 코드에서 Hazalcast 다루기
Hazalcast를 적용하면서 기대했던 것은 모든 인스턴스의 캐시가 공유 되고 원할때 갱신할수 있다는 점 이였다.
기본 버전에서도 일부 기능을 제공하지만  유로 버전을 사용하면 Management Center를 통하여 좀더 쉽게 상태 관리가 되었겠지만  
아쉽게도 지원을 받을수 없는 상황이라 상태를 확인하기 위한 API를 만들었다.

~~~
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
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            //Spring cache 추상화 데이터 삭제
            Cache cache = cacheManager.getCache(cacheMap);
            if (cache != null){
                cache.clear();
            }

            //Hazelcast 인스턴스 캐시 초기화
            IMap<Object, Object> map = hazelcastInstance.getMap(cacheMap);
            map.clear();

            return ResponseEntity.ok("Cache " + cacheMap + " cleared successfully.");
        }catch (Exception e){
            return ResponseEntity.ok("Cache " + cacheMap + " cleared fail.");
        }
    }
}
~~~
다만 아직 테스트 해봐야 할 요소는 많이 있는데 특히 캐시 갱신의 경우 인스턴스에서 캐시를 삭제하였지만
타 인스턴스에 캐시가 남아 있어 다시 이전 값으로 캐시를 채워지는 문제가 있어 추가로 수정이 필요해 보인다.



# 5. Hazalcast 배포시 문제 해결
Hazalcast의 조인은 여러부분에서 자동화 되어 있어 편리하지만   
그만큼 설정이 누락되면 조인을 하면서 여러 문제가 발생한다.  
가장 이해가 안됬던 문제는 포트 설정으로 인한 문제 였는데 기존 프로젝트에도 Hazalcast가 사용되어 있었지만 클러스터 명이 달라서 
괜찮을 거라고 생각했는데 서비스를 실행하면서 기존 Hazalcast가 디폴트 포트 범위에 설정되어 있어서 조인을 하려고 시도하였다.

포트 범위를 기본 값인 5705에서 약간 변경하는 것으로 해당 문제는 수정하였다.

또 Hazalcast가 조인을 하기 위해서 설정된 포트범위에 전부(!?) 통신을 시도하는데 이때 너무 많은 IP와 포트를 설정하면
통신을 시도하다가 인스턴스가 죽는 경우가 있다. 포트의 디폴트 범위는 100개로 되어 있으니 서비스에 따라 조절하는 것이 좋아 보인다. 

~~~
  network:
    port:
      port: 5715
      port-count: 10
      auto-increment: true 
~~~

# 6. 결론
적은 노력으로 많은 기능을 제공하는 라이브러리 이지만,  
잘 사용하기 위해서는 여러 사항을 고려 해야 하는 것으로 보인다.
