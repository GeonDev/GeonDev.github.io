---
layout: post
title: Jdk8 에서 Apple App Store Connect API 사용하기
date: 2025-03-14
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

>애플 스토어 라이브러리
https://developer.apple.com/kr/videos/play/wwdc2023/10143/

애플에서 기존에 사용하던 인앱결제 상품을 검증하는 [API](https://developer.apple.com/documentation/appstorereceipts/verifyreceipt)를 deprecated 시켜서 업데이트가 필요한 상황이 생겼다.

에플에서 기존 Api를 대체하는 API(App Store Connect API) 공개하였고 보다 쉬운 마이그래이션을 위하여 애플스토어 라이브러리를 공개하고 java, node  등 주요 언어에서 라이브러리를 사용하는 방법을 제공한다.
java의 경우 해당 라이브러리는 최소 동작은 Jdk11 이상부터 지원하지만 내가 유지보수 하고 있는 프로젝트는 JDK8로 구현되어 있기 때문에 라이브러리를 사용하는 것은 불가능하고 애플에서 요구하는 API 호출 방식(JWT 토큰 증명)을 수동으로 만들고 결과로 전달 받은 JWS를 파싱하여 원하는 값을 갖고 오는 과정이 필요하다.

# 1. 사용 세팅
당연하게도 App Store Connect는 애플 스토어에 출시된 앱에 사용하기 위해 만들어진 값이다. 따라서 API을 호출할때 애플 개발자 콘솔에서 발급 받는 키값과 어떤 앱에서 API를 호출했는지에 대한 정보가 필요하다.

## 1.1. 인앱 결제 키 발급
인앱 결제 키는 애플 개발자 콘솔에서 사용자 및 엑세스 > 통합 > 앱내 구입 부분에서 발급 받을수 있다. 나같은 경우 IOS개발자가 등록 해준 키를 받았다.

키를 발급 받으면 최초 1회 .p8확장자로 생성된 키를 다운 받을수 있게 된다. 키의 유효기간은 없지만 키를 분실하였을 경우 수정이 불가능 하고 재발급을 받아야 하기 때문에 잘 보관하여야 한다. 
키를 발급 받았을때 Issuer ID 와 Key ID도 생성되는데 해당 키도 API 호출시에 필요 하기 때문에 기억해 두어야 한다.


## 1.2. 앱 bundle Id 확인
키가 발급되었다면 API를 어떤 앱에서 호출하였는지 구분값인 bundle Id를 확인하여야 한다. 번들 ID는 앱 정보에서 확인할수 있고 Xcode에서 사용한 ID와 일치 하여야 한다고 하는데 나는 이 부분도 앱 개발자가 확인해 주었다.

# 2. API 호출 
기존에 애플에서 결제 트랜젝션을 확인하던 verifyreceipt API를 호출할때는 별도의 인증을 요구하지 않았다. 그저  TLS (Transport Layer Security) protocol 1.2 이상의 호출 정도를 요구 하여 비교적 쉽게 API를 활용할수 있었는데 이제는 사용 할수 없고 같은 기능을 하는 
**[Get Transaction Info](https://developer.apple.com/documentation/appstoreserverapi/get-v1-transactions-_transactionid_)** 라는 신규 API가 대신하게 되었다. 기본 API 처럼 사용하면 401 에러를 리턴하게 되는데 이제는 호출을 할때 JWT토큰을 전달하여야만 정상적인 호출을 지원하기 때문이다. 

App Store Connect Library는 이때 필요한 토큰 생성과 전달받은 JWS의 파싱 및 검증 과정을 보다 쉽게 할수 있도록 지원해 준다. 하지만 JDK 8를 사용한다면 모든과정을 수동으로 만들어야 한다.

## 2.1 JWT 생성
애플에서 요구하는 JWT를 생성하기 위해서는 아래 요구사항을 맞추어야 한다.

* 해더 keyID에 App Store Connect에서 발급 받은 ID 사용 
* 알고리즘은 ES256을 사용
* 토큰 페이로드에 Issuer ID,  appstoreconnect 버전, bundle Id 입력
* 토큰의 만료 시간은 필수 

위 조건에 맞추어 JWT 토큰을 생성하면 된다. 

우선 아래 dependency를 추가 하여야 한다.
~~~
        <!-- 토큰 생성 및 해석에 사용 -->
        <dependency>
            <groupId>com.nimbusds</groupId>
            <artifactId>nimbus-jose-jwt</artifactId>
            <version>10.0.2</version>
        </dependency>

        <!-- 토큰 생성시 인증서 해석 및 암호화에 사용 -->
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk15on</artifactId>
            <version>1.70</version>
        </dependency>
~~~

dependency를 추가 하였으면 JWT 토큰을 생성하는 함수를 만들어 준다.

~~~

    /**
    * JWT 토큰을 생성하는 메소드
    * @param keyId 키 정보
    * @param bundleId 번들 키
    * @param privateKeyPath 인증서 파일 경로.
    * @return 인증서 키파일
    */
    public String generateJWT(String keyId, String issuerId, String bundleId, String privateKeyPath) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(keyId)
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer(issuerId)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000))
                .audience("appstoreconnect-v1")
                .claim("bid", bundleId)
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claimsSet);

        ECPrivateKey privateKey = loadECPrivateKey(privateKeyPath);

        //JWT 시그니처 서명
        JWSSigner signer = new ECDSASigner(privateKey);
        signedJWT.sign(signer);

        // 최종 JWT 토큰 반환
        return signedJWT.serialize();
    }

        
        /**
        * 애플 인증서를 파싱하여 시그니처를 만들기 위한 메소드.
        * @param privateKeyPath 인증서 파일 경로.
        * @return 인증서 키파일
        */
        public static ECPrivateKey loadECPrivateKey(String privateKeyPath) throws Exception {
        try (FileInputStream keyFile = new FileInputStream(privateKeyPath)) {
            byte[] keyBytes = new byte[keyFile.available()];
            keyFile.read(keyBytes);

            String keyContent = new String(keyBytes);
            keyContent = keyContent.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s","");

            // Base64 디코딩
            byte[] decodedKey = Base64.getDecoder().decode(keyContent);

            // PKCS#8 형식으로 EC 개인 키 로드
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance("EC");
            return (ECPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (IOException e) {
            throw new Exception("Failed to load EC private key", e);
        }
    }

~~~










