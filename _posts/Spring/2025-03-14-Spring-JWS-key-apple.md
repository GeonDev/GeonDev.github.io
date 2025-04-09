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

JWT 토큰을 생성하기 위해선 우선 아래 dependency를 추가 하여야 한다.
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

헤더에 명시되어 있는데로 애플 인증서는 EC256 알고리즘으로 암호화 하여야 한다. 여기에 JAVA에서 인증서 파일을 인코딩 할때 인증서 파일의 앞뒤 표시(-----BEGIN PRIVATE KEY-----, -----END PRIVATE KEY-----)는 단순 표시임으로 제거 하여야 정상적인 키로 활용할 수 있다.

실제 키의 내용은 Base64로 인코딩 되어있기 때문에 시그니처에 사용할때는 다시 디코딩하여 사용하여야 한다. 
(여러 시스템간 데이터 형식으로 인해서 파일이 깨지는 것을 방지하기 위하여 - 호환성을 위해 base64로 인코딩되어 있다.)

이렇게 인증서를 읽어 EC256 알고리즘으로 ECPrivateKey 객체를 생성하고 JWT 시그니처에 서명을 한다.
이렇게 토큰을 생성하면 최종적으로 애플 스토어 API와 통신할 준비가 되었다



## 2.2 JWT 사용 및 호출

~~~
    public void AppStoreLibraryTest() {

        try {
            String issuerId = "--------- issuerId --------";
            String keyId = "--------keyId-------";
            String bundleId = "-----------bundleId--------";
            String privateKeyPath = "-----인증서 경로------"

            String transactionId = "--transactionId---";

            String jwt = generateJWT(keyId, issuerId, bundleId, privateKeyPath);

            String urlString = "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/" + transactionId;

            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + jwt);
            connection.setRequestProperty("Content-Type", "application/json");

            log.debug(String.valueOf(connection.getResponseCode()));

            if(connection.getResponseCode() == HttpURLConnection.HTTP_OK){
                BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuffer sb = new StringBuffer();

                String temp = "";
                while ( (temp = br.readLine()) != null ){
                    sb.append(temp);
                }

                JSONParser parser = new JSONParser();
                JSONObject object = (JSONObject) parser.parse(sb.toString());
                String signedTransactionInfo = object.get("signedTransactionInfo").toString();

                // JWS 오브젝트로 반환
                JWSObject jwsObject = JWSObject.parse(signedTransactionInfo);

                JWSHeader jwsHeader = jwsObject.getHeader();
                List<com.nimbusds.jose.util.Base64> cert =  jwsHeader.getX509CertChain();

                log.debug(cert.get(0).decodeToString() + "\n");
                log.debug(cert.get(1).decodeToString() + "\n");
                log.debug(cert.get(2).decodeToString() + "\n");

                ObjectMapper objectMapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

                //JWS 페이로드를 반환
                SignedTransactionInfo transactionInfo = objectMapper.readValue(jwsObject.getPayload().toString(), SignedTransactionInfo.class);

                log.debug(transactionInfo.toString());

            }else {
                log.debug(connection.getResponseMessage());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
~~~


테스트 코드를 살펴 보면 어떻게 페이로드를 반환 하고 사용하였는지 알수 있다. 애플 라이브러리를 사용했다면 SignedPayloadData 클래스나 SignedTransactionInfo 클래스 같은 경우 미리 정의된 데이터를 사용할수 있을 것이다. 여기서는 임의로 클래스를 정의해서 사용하였다. 
애플 개발자 문서를 확인하고 필요한 데이터만 필드로 남겨서 클래스를 생성하길 바란다. 

전체적인 로직을 설명하면 다음과 같다. 
   * generateJWT() 메소드를 활용하여 발급된 애플 인증서와 필요한 정보를 모아 JWT 토큰을 만든다.
   * 만들어진 토큰을 Authorization 에 "Bearer "를 붙여 storekit API를 호출한다. (토큰을 request에 포함한다.)
   * 응답 값이 정상으로 왔을 경우 InputStream 데이터를 파싱하여 JSON 형태로 변환한다. (애플의 응답은 JSON 형태로 전달된다.)
   * signedTransactionInfo 키 값의 데이터를 JWS 오브젝트로 반환한 후에 헤더, 페이로드, 시그니쳐 값을 활용한다.

 애플의 헤더에 인증서는 총 3개 들어 있다. JWS는 BASE 64로 인코딩 되어 있기 때문에 List<com.nimbusds.jose.util.Base64> cert 형태로 값을 받아 간단하게 출력하였다. 검증을 하려고 한다면 이 헤더에 있는 인증서 값이 애플인증서가 맞는지 검증하면 된다. 
 애플 라이브러리를 사용하면 검증 과정에 대한 로직을 미리 지원하기 때문에 가급적이면 검증을 하는 것을 추천한다. 
 (물론 환경이 JDK8이라면 스스로 검증 로직을 만들어야 한다.)

 JWS 페이로드에는 애플 결제 로직에 활용할수 있는 각종 정보들이 들어있다. 파싱된 데이터를 내부 로직에서 활용하면 된다.  

## 3. 결론
간단하게 애플 스토어 라이브러리를 사용하지 않고 API를 사용하는 방법을 알아 보았다. 코드를 보면 알겠지만 모델을 따로 만들어야 하고 검증 로직을 별로도 만들어야 하는 등 많은 불편함이 있어 개발환경이 JDK11 이상 이라면 라이브러리 사용을 권장한다.

