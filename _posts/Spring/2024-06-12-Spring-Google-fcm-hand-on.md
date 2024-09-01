---
layout: post
title: 앱 푸시 GCM -> FCM 적용하기 (FCM ADMIN) 버전 업데이트
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

-----
구글 FCM 메세지에 24년 8월 7일 에러가 발생하였다.( [에러 리포트](https://status.firebase.google.com/incidents/PVuFPhjjgCiQhjzFRjZQ))  이번 에러 이후 구글에서는 이전에 deprecate 하기로 하였던 전송 메소드의 기능을 중지시켰고 이전에 발생하지 않던 에러를 리턴으로 포함하여 전송하였다.

결국 메세지 전송을 위해서는 라이브러리 버전 업데이트가 강제 되었는데 이때 전송 메소드가 sendMulticast 에서 sendEachForMulticast 로 변경되었다. 

이 메서드는 기존 메소드보다 성능이 좋지 않고 공식문서에서 1회 **벌크 전송시 전달 할수 있는 메서지 건은 500건이라고 하지만 실제 발송 테스트를 하게 되면 500건 발송시 발송 결과 리턴이 되지 않는 문제**가 발생하였다.

내가 관리하는 운영서비스도 동일한 에러를 경험하였고 라이브러리 버전을 9.3.0으로 올린 후 운영 서버스에서 메세지 **발송 횟수를 500건에서 30건으로 줄어 발송**하자 정상적으로 푸시가 발송되었다.
비슷한 문제로 시스템 에러를 처리해아 하는 사람들을 위해 기록을 남겨둔다.


-----

# 1. GCM -> FCM
제목에는 전환이라고 했지만 GCM을 FCM으로 마이그레이션 할수 있을 것 같이 되어 있지만 사실 전환은 불가능하다. 
이유는 푸시발송을 위한 디바이스 토큰이 서로 호환 되지 않기 때문에 GCM에서 FCM으로 전환 하게 되면 디바이스 토큰을 전부 재발급해야 하는 이슈가 발생한다. 우리팀은 기존에 있던 디바이스 토큰을 전부 지우고(!) 앱에 강제 업데이트를 거는 방법으로 새로운 디바이스 토큰을 생성하도록 유도하였다.

FCM 디바이스 토큰에 유효기간은 없지만 [FCM 가이드](https://firebase.google.com/docs/cloud-messaging/manage-tokens?hl=ko&_gl=1*e4ts92*_up*MQ..*_ga*MTE5MjQ3NjA5Ny4xNzE4MTc5Njgw*_ga_CW55HF8NVT*MTcxODE3OTY4MS4xLjAuMTcxODE3OTY4MS4wLjAuMA..#update-tokens-on-a-regular-basis) 에서도 토큰은 정기적으로 갱신하는 것을 추천한다. (FCM에서 정확한 날짜를 지정하지는 않았지만 대략 2달정도 되면 토큰이 삭제 되는 것 같다)


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
        <version>9.3.0</version>
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
스프링 프로젝트 내부의 resource 하위 폴더에 있는 FCM 키 파일에 접근하기 위해 InputStream 으로 파일을 읽어
File 객체를 생성하고 이를 FileInputStream으로 변환하는 과정이다. 

FirebaseApp.initializeApp()을 활용하여 초기화된 데이터를 반환 받는데 이때 별명을 추가할 수 있다. 별명을 추가한 이유는 하나의 서버에서 여러 앱의 FirebaseApp을 사용해야 할때 구분자로 사용하기 위함이다. 
(실제 서비스 에서도 하나의 배치에서 2개 이상의 앱의 푸시를 담당하고 있다.)



# 4. FCM 푸시 발송

~~~
	private static BatchResponse FirebaseMessagingSender (Integer apiNo, List<String> devices, Map<String, String> data , boolean delayWhileIdle, int timeToLive) throws FirebaseMessagingException {
		MulticastMessage message = MulticastMessage.builder()
				.setNotification(Notification.builder()
						.setTitle("푸시 타이틀 입력")
						.setBody("푸시 메세지 입력")
						.build())
				.putAllData(data)
				.addAllTokens(devices)
				// 안드로이드 메세지 옵션 지정
				.setAndroidConfig(AndroidConfig.builder()
						//잠금 모드에서 전송되지 않는 경우가 발생하여 중요도 높음으로 세팅
						.setPriority(AndroidConfig.Priority.HIGH)
						.setTtl(timeToLive != 0 ? (long) timeToLive : 86400L)
						.setNotification(AndroidNotification.builder()
								.setPriority(AndroidNotification.Priority.HIGH)
								//푸시 액션 지정
								.setClickAction("android.intent.action.VIEW")
								//각진 아이콘 형식으로 전송(앱파트 요청)
								.setIcon("ic_status")
								.build())
						.build())
				.build();

				return FirebaseMessaging.getInstance(newsFirebaseApp).sendEachForMulticast(message);		
	}
~~~

푸시 발송 방식은 생각보다 간단하게 이루어진다. 
FCM으로 메세지를 보내려면 디바이스 키(토큰)에 메세지를 매칭 시켜 주면 된다. 다만 모든 디바이스를 순회 하면서 1건 씩 메세지를 발송하게 되면 서버 부하, 네트워크 트래픽 상승 등 여러가지 않좋은 점이 있기 때문에 많은 양의 디바이스에 푸시를 날려야 할때는 500개 씩 묶어 전송할수 있는 MulticastMessage 객체를 FirebaseApp에 전달 하면 된다. 
(이때도 최대 수용치가 있기 때문에 한꺼번에 너무 많은 데이터를 전송하는 것은 오류가 발생할수도 있다.)


 FCM에서는 Notification 이라는 객체 형태로 메세지를 전송한다. 
Notification 객체를 열어보면 아래와 같은 데이터를 갖고 있는 것을 알수 있다. 타이틀과 내용, 이미지가 FCM 푸시의 기본 형태로 해당 데이터를 설정해주면 앱에서 데이터를 읽어 표시해 주게 되어 있다.

~~~

public class Notification {
    @Key("title")
    private final String title;
    @Key("body")
    private final String body;
    @Key("image")
    private final String image;

    //이하 생략
    ....
}

~~~

앱마다 특정한 메세지를 추가하거나 다른 메세지 타입을 넣고 싶은 경우 MulticastMessage.putAllData(data) 를 통하여 커스텀 메세지를 설정할 수 있다. 위에 함수에서 보여지듯  data는 Key-value 형식으로 전달 할수 있다. 
Notification 없이 메세지를 전송할수도 있다. 다만 데이터를 파싱하는 과정에서 Notification이 없는 경우 일부 앱에서 FCM 푸시를 정상적으로 읽어들이지 못하는 경우가 발생 할수도 있어 포멧을 맞추어 주는 것을 추천한다.

공식 문서를 찾아 보면 상세하게 나와 있지만 각각의 디바이스 타입별로 설정을 추가할수 있다. 
나 같은 경우는 안드로이드만을 대상으로 하기 때문에 안드로이드 설정만을 추가하였다. setAndroidConfig 설정을 통하여 각 다바이스에 설정을 넣을수 있는데 이 부분의 설정은 테스트를 해보면서 적절값을 찾아야 한다. 

발송할 푸시 설정이 끝나면 FirebaseMessaging.getInstance(newsFirebaseApp).sendEachForMulticast(message)에 설정한 메세지를 넣으면 Firebase에서 메세지를 발송하고 결과를 반환 해준다.



# 5. FCM 결과 반환 후처리

FCM 결과 값은 몇가지 특이한 점이 있다. 
  * 발송한 디바이스 토큰 정보를 포함하고 있지 않다.
  * FCM의 결과는 서버 처리 결과이다. 디바이스에 도달하였다는 것을 보장하지 않는다.

따라서 FCM의 발송결과만 완전히 믿을수는 없다. 진짜 푸시가 수신되었는지는 앱에서 확인을 해야하고, 앱의 상황(무음모드, 비활성화 된앱, 최대 절전모드 등)에 따라 수신이 아예 안될 수 있다. 아래 코드는 반환된 FCM 결과를 저장하는 예시이다.  

~~~
	private static void saveSendResponse(BatchResponse response) {
		List<SendResponse> responses = response.getResponses();

		for(SendResponse sendResponse : responses){
			DataMap item = new DataMap();
			item.put("status", 200);
			if (!sendResponse.isSuccessful()) {
				item.put("status", 500);
				item.put("reason", "unknown");

				FirebaseMessagingException messagingException = sendResponse.getException();
				if (messagingException != null) {
					MessagingErrorCode errorCode = messagingException.getMessagingErrorCode();
					if (errorCode != null) {
						switch (errorCode) {
							case UNREGISTERED:
								//토큰이 만료된 경우
								item.put("status", 404);
								item.put("reason", "not registered");
								break;
							case INVALID_ARGUMENT:
								item.put("status", 400);
								item.put("reason", "invalid");
								break;
							case SENDER_ID_MISMATCH:
								item.put("status", 403);
								item.put("reason", errorCode.name());
								break;
							default:
								item.put("status", 408);
								item.put("reason", errorCode.name());
								break;
						}
					}
				}
			}
		}
	}
~~~

코드 자체가 복잡한 점은 없다. FCM 결과값은 발송 토큰은 반환하지 않지만 발송한 순서데로 결과를 반환한다고 명시되어 있다. 만약 개별 토큰 별로 결과를 저장하고 싶다면 발송한 토큰 순서를 따라 가면서 매칭해주면 비슷한 결과를 나오게 할수 있다. 

SendResponse의 결과값은 @nullable 이다. 따라서 결과값이 안오는 경우도 생각하고 처리하여야 한다.
이때 재발송을 시도할수는 있지만 FCM에서는 추천하지 않는다고 한다. (메세지 수명에 따라 FCM에 저장되어 있을수 있기 때문) 
FCM의 메세지는 발송시 바로 전송되지 않을수 있다. 푸시 발송시 지정한 Ttl(timeToLive) 기간중에 발송가능한 시기에 FCM에서 발송하는 방식이기 떄문에 발송이 실패 했다고 해서 재발송을 해버리면 앱에 푸시가 중복으로 발송되는 경우도 있다. 