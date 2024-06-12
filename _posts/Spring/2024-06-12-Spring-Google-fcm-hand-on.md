---
layout: post
title: 앱 푸시 GCM -> FCM 적용하기 (FCM ADMIN)
date: 2024-06-12
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

>[FCM 공식 가이드](https://firebase.google.com/docs/cloud-messaging?hl=ko#update_the_usage_of_gcmpubsub) 
>[참고](https://herojoon-dev.tistory.com/23)

GCM/FCM type의 API가 2024년 6월 20일부로 서비스가 종료 된다는 소식을 들었다. 
당장 앱 푸시를 전송하기 위해서는 라이브러리를 교체 해야 한다. 심지어 기존에 사용하던 GCM 라이브러리는 Maven에서 다운로드 조차 되지 않는 상황이였다. 갑작스럽지만 일단 앱 푸시 시스템의 Sender를 변경하기로 하였다. 


# 1. GCM -> FCM
제목에는 전환이라고 했지만 GCM을 FCM으로 마이그레이션 할수 있을 것 같이 되어 있지만 사실 전환은 불가능하다. 
이유는 푸시발송을 위한 디바이스 토큰이 서로 호환 되지 않기 때문에 GCM에서 FCM으로 전환 하게 되면 디바이스 토큰을 전부 재발급해야 하는 이슈가 발생한다. 우리팀은 기존에 있던 디바이스 토큰을 전부 지우고(!) 앱에 강제 업데이트를 거는 방법으로 새로운 디바이스 토큰을 생성하도록 유도하였다.

FCM 디바이스 토큰에 유효기간은 없지만 [FCM 가이드](https://firebase.google.com/docs/cloud-messaging/manage-tokens?hl=ko&_gl=1*e4ts92*_up*MQ..*_ga*MTE5MjQ3NjA5Ny4xNzE4MTc5Njgw*_ga_CW55HF8NVT*MTcxODE3OTY4MS4xLjAuMTcxODE3OTY4MS4wLjAuMA..#update-tokens-on-a-regular-basis) 에서도 토큰은 정기적으로 갱신하는 것을 추천한다. 


# 2. FCM 프로젝트 등록(키생성) 및 라이브러리 추가
이 부분은 내가 진행하지 않고 AOS 개발자가 진행하였다. 프로젝트에 비공개 키를 요청하면 json 파일을 제공한다. 대략 아래와 같은 데이터가 담겨 있다. 프로젝트 관리에서 다시 발급을 받을수 있는 것 같지만 따로 보관하는 것을 추천한다. 처음 전달 받은 파일 이름이 너무 길어서 account.json으로 변경했다. 

~~~
{
  "type": "service_account",
  "project_id": "",
  "private_key_id": "",
  "private_key": " ",
  "client_email": "",
  "client_id": "",
  "auth_uri": "",
  "token_uri": "",
  "auth_provider_x509_cert_url": "",
  "client_x509_cert_url": "",
  "universe_domain": ""
}
~~~

FCM ADMIN의 의존성은 하나만 추가 하면 된다. 당연히 maven으로 적용할수도 있고 gradle로 추가 할수도 있다. 버전은 크게 가리지 않을 것 같지만 일단 많이 쓰는 버전으로 적용하였다.
~~~
    <!--firebase-admin -->
    <dependency>
        <groupId>com.google.firebase</groupId>
        <artifactId>firebase-admin</artifactId>
        <version>8.1.0</version>
    </dependency>

   //firebase admin
    dependencies {
        implementation 'com.google.firebase:firebase-admin:8.1.0'
    }
~~~


# 3. FCM Config 생성
~~~

@Configuration
public class FirebaseConfig {

    //리소스 경로에 key라는 디렉토리를 추가하였다.
    @Value("classpath:key/account.json")
    private Resource resource;

    @PostConstruct
    public void initFirebase() {
        try {
        
            FileInputStream serviceAccount = new FileInputStream(resource.getFile());
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setDatabaseUrl("https://{프로젝트명}.firebaseio.com")
                    .build();
            FirebaseApp.initializeApp(options);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
~~~

FCM 데이터베이스에 접속할수 있는 초기 정보를 세팅한다. 위에 정보는 firebase 콘솔에서 제공한다.
프로젝트가 바뀌어도 변경되는 부분은 setDatabaseUrl 부분 밖에는 없다. 위에 예시는 스프링 빈으로 세팅하는 방식이지만 굳이 스프링이 아니여도 동작한다. 실제로 내가 개발한 프로젝트도 스프링으로 구성되어 있지 않았기 때문에 FirebaseApp 객체를 초기화하는 메소드로 위에 과정을 처리하였다.

~~~
public class FcmAdminSender {

	private static FirebaseApp nFirebaseApp;

	public static void setFcmAdminApp() {
		try {
			if(nFirebaseApp == null){
			
				// Service Account를 이용하여 Fireabse Admin SDK 초기화
				InputStream nStream = loader.getResourceAsStream("key/account.json");

				File tempPath = File.createTempFile(String.valueOf(nStream.hashCode()), ".json");
				//임시 생성파일 삭제
				tempNewsPath.deleteOnExit();
				FileUtils.copyInputStreamToFile(nStream, tempNewsPath);

				FileInputStream serviceAccount =  new FileInputStream(tempPath);


				FirebaseOptions optionsNews = new FirebaseOptions.Builder()
						.setCredentials(GoogleCredentials.fromStream(serviceAccount))
						.setDatabaseUrl("https://XXXX.firebaseio.com")
						.build();

	
                //FirebaseApp 인스턴스를 생성할때 별명을 추가할수 있다.
				nFirebaseApp = FirebaseApp.initializeApp(optionsNews "n");
			
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
~~~

위에 파일을 읽는 과정은 레거시 프로젝트 구성이 특이하게 되어 있어 선택한 부득이한 방법이였다.
단순히 InputStream을 FileInputStream으로 변환하는 과정이다. 

FirebaseApp.initializeApp()을 활용하여 초기화된 데이터를 반환 받는데 이때 별명을 추가할수 있다. 별명을 추가한 이유는 하나의 서버에서 여러 앱의 FirebaseApp을 사용해야 할때 구분자로 사용하기 위함이다. 








