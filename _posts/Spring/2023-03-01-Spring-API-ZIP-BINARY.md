---
layout: post
title: JAVA에서 API로 전달 받은 zip binary 파싱(feat. DART API 고유번호)
date: 2023-03-01
Author: Geon Son
categories: Spring
tags: [Springboot, ZIP, BINARY]
comments: true
toc: true    
---



![ Zip FILE 전달](/images/spring/20pg03g;fgjwe4nwefg.png)


 토이 프로젝트로 증권 데이터를 받아서 분석하는 프로젝트를 만들고 있다. 증권정보는 증권사 API를 이용하거나 네이버 증권 등 페이지를 크롤링해도 되지만
 증권사 API는 대부분 자바와 리눅스(맥) 환경에 적합하게 되어 있지 않아서 개발 환경 세팅이 힘들고 네이버 증권 페이지를 크롤링 하는 것은
 언제 변경될지 모르는 페이지를 계속 보고 있어야 하니 자동화에 적합하지 않다고 생각했다.

 생각해본 대안이 정부 오픈 API를 활용하는 것으로 비록 데이터가 실시간은 아니지만 분석에는 크게 문제가 없을 것이라고 판단하여 진행하기로 하였다.
 문제는 증권 시장 가격을 불러오는 [공공데이터포탈 - 주식시세정보](https://www.data.go.kr/data/15094808/openapi.do) 와
 회사의 재무 정보를 불러오는 [전자공시 - 재무정보](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016)는
 서로 연결되는 키가 없다. 재무정보 API에서 불러오는 키는 [전자공시 - 고유번호](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018) 라고 하는 별도의 API를 사용하여야만 받아올수 있고 이 정보는 **Zip FILE (binary)** 로 전달 한다고 한다.

 json, xml도 아니고 압축데이터를 바이너리로 제공한다니.... 눈앞이 아찔하다...
 velog에서 같은 문제(?)를 격은 [포스팅](https://velog.io/@dragontiger/API-%ED%86%B5%EC%8B%A0%EC%9C%BC%EB%A1%9C-zip-%ED%8C%8C%EC%9D%BC%EC%9D%84-%EB%B0%9B%EA%B2%8C-%EB%90%9C%EB%8B%A4%EB%A9%B4-Java-IO-Stream-%EC%9D%B4%ED%95%B4)이 있어 참고하였는데
 마지막 부분에 바이너리를 한번에 처리하는 기능은 **[Fatal Error] :1:1: 예기치 않은 파일의 끝입니다.** 라는 오류를 해결할수 없어 결국 바이너를 다운 받아
  zip 압축을 풀고 xml을 파싱하는 방식으로 진행하였다.


# 1. binary 파일 다운로드 하기
  전자공시 - 고유번호](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018) API를 신청하고 그대로 브라우저에 넣어보니
  파일이 zip이 아니라 exe 파일로 다운로드 되었다. 괜찮은 건가 싶긴 하지만 일단 바이너리 파일 부터 다운 받아 보기로 하였다.


  ~~~
  UriComponents uri = UriComponentsBuilder
          .newInstance()
          .scheme("https")
          .host(ApplicationConstants.DART_API_URL)
          .path(ApplicationConstants.DART_CORP_CODE_URI)
          .queryParam("crtfc_key", dartKey)
          .build();


  RestTemplate restTemplate = new RestTemplate();
  ResponseEntity<InputStream> result = restTemplate.getForEntity(uri.toString(), InputStream.class);
  ~~~


 이상태에서 테스트를 해보면 **no suitable HttpMessageConverter found for response type [class java.io.InputStream] and content type [application/x-msdownload;charset=UTF-8]** 에러를 확인할 수 있다.

  ~~~
  org.springframework.web.client.RestClientException: Could not extract response: no suitable HttpMessageConverter found for response type [class java.io.InputStream] and content type [application/x-msdownload;charset=UTF-8]
	at org.springframework.web.client.HttpMessageConverterExtractor.extractData(HttpMessageConverterExtractor.java:119) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:991) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:974) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
	at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:725) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
	at org.springframework.web.client.RestTemplate.execute(RestTemplate.java:680) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
	at org.springframework.web.client.RestTemplate.getForEntity(RestTemplate.java:359) ~[spring-web-5.0.8.RELEASE.jar:5.0.8.RELEASE]
  ~~~

  기존에 RestTemplate을 사용하는 방식으로 코딩할수도 있지만 변환할때 ContentType이 다르다는 메세지인데(타입이 InputStream 인 경우)
  getForEntity를 활용하면 헤더를 지정할 수 없기 때문에 exchange()를 사용하면 헤더를 설정하여 문제를 해결할수 있다.
  추가로 어차피 추후에 파일 저장을 위해서 InputStream.readAllBytes() 을 반환해야 되는데 자료형이 byte 배열로 되어 있다.
  아예 전달 받는 자료형을 바이트 배열로 지정하면 getForEntity를 사용하더라도 오류가 발생하지 않는다.
  (나같은 경우에는 연습 겸, 좀더 명확한 호출을 위하여 exchange를 사용하였다.)

  ~~~
    UriComponents uri = UriComponentsBuilder
      .newInstance()
      .scheme("https")
      .host(ApplicationConstants.DART_API_URL)
      .path(ApplicationConstants.DART_CORP_CODE_URI)
      .queryParam("crtfc_key", dartKey)
      .build();

    HttpHeaders headers = new HttpHeaders();
    headers.setAccept(Arrays.asList(MediaType.APPLICATION_OCTET_STREAM));
    headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
    HttpEntity<String> entity = new HttpEntity<String>(headers);

    RestTemplate restTemplate = new RestTemplate();
    ResponseEntity<byte[]> response = restTemplate.exchange(uri.toString(), HttpMethod.GET, entity, byte[].class);
  ~~~

바이너리 배열을 받아왔다면 전달 받은 데이터를 원하는 경로에 저장하면 된다. 이때는 간단하게(?) FileOutputStream을 활용하면 된다.
여기서 설정한 filePath는 임의로 설정한 파일 경로이다. 추후에 윈도우 서버에서 구동할 생각도 있기 때문에 OS에 따라 경로를 바꿔 주기 위해서 변수로 설정을 하였다.

~~~
try {
    File lOutFile = new File(filePath  + "temp.zip");
    FileOutputStream lFileOutputStream = new FileOutputStream(lOutFile);
    lFileOutputStream.write(response.getBody());
    lFileOutputStream.close();

} catch (Exception e){
    e.printStackTrace();
}
~~~

![ Zip FILE 전달](/images/spring/aslo-3nk3rg85sadhn.png)
코드를 실행하면 원하는 경로에 위에 설정한 temp.zip이라는 이름으로 압축파일이 생성된 것을 알수 있다. 프로그램을 사용하여 압축을 풀어주면 우리가 원하는
**CORPCODE.xml** 파일이 잘 들어가 있는 것을 알수 있다. 하지만 자동화를 할 것이라면 압축 풀기도 해주어야 되기 때문에 압축 해제 코드도 추가 하였다.


# 2. zip 압출 풀기

~~~
public static void unZip(String ZipFilePath, String FilePath) {
    File Destination_Directory = new File(FilePath);
    if (!Destination_Directory.exists()) {
        Destination_Directory.mkdir();
    }
    try {

        ZipInputStream Zip_Input_Stream = new ZipInputStream(new FileInputStream(ZipFilePath));
        ZipEntry Zip_Entry = Zip_Input_Stream.getNextEntry();

        while (Zip_Entry != null) {
            String File_Path = FilePath + File.separator + Zip_Entry.getName();
            if (!Zip_Entry.isDirectory()) {

                extractFile(Zip_Input_Stream, File_Path);
            } else {

                File directory = new File(File_Path);
                directory.mkdirs();
            }
            Zip_Input_Stream.closeEntry();
            Zip_Entry = Zip_Input_Stream.getNextEntry();
        }
        Zip_Input_Stream.close();
    } catch (Exception e) {
        e.printStackTrace();
    }

}

private static void extractFile(ZipInputStream Zip_Input_Stream, String File_Path) throws IOException {
    int BUFFER_SIZE = 4096;

    BufferedOutputStream Buffered_Output_Stream = new BufferedOutputStream(new FileOutputStream(File_Path));
    byte[] Bytes = new byte[BUFFER_SIZE];
    int Read_Byte = 0;
    while ((Read_Byte = Zip_Input_Stream.read(Bytes)) != -1) {
        Buffered_Output_Stream.write(Bytes, 0, Read_Byte);
    }
    Buffered_Output_Stream.close();
}
~~~

이 코드는 사실 내가 작성한 코드는 아니다. 이 코드는 ZipFilePath의 파일을 압축해제 한 후 FilePath에 압축 헤제한 파일을 차례대로 생성해주는 역할을 수행한다.
압축 해제는 ZipInputStream에 파일을 담아서 Zip_Entry 구분된 파일 이름을 받아와 파일 생성을 진행한다.
내가 사용할때는 static으로 만들어서 Utils 클래스를 만들어 활용하였다.


# 3. xml 파싱하기

~~~
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
factory.setIgnoringElementContentWhitespace(true);
DocumentBuilder builder = factory.newDocumentBuilder();

Document document = builder.parse( filePath + "CORPCODE.xml");

NodeList corpList = document.getElementsByTagName("list");

for(int i =0; i< corpList.getLength(); i++ ){
    Element corp = (Element) corpList.item(i);
   if (!StringUtils.isEmpty(getValue("stock_code" , corp))){
       logger.debug("corp_code : {}" ,getValue("corp_code" , corp));
       logger.debug("corp_name : {}" ,getValue("corp_name" , corp));
       logger.debug("stock_code : {}" ,getValue("stock_code" , corp));
   }
}


private static String getValue(String tag, Element element) {
    NodeList nodes = element.getElementsByTagName(tag).item(0).getChildNodes();
    Node node = (Node) nodes.item(0);
    return node.getTextContent().trim();
}
~~~

Xml 파싱은 생각보다 간단하게 정리할수 있다. 고유번호 xml 파일을 document로 반환하는 코드를 생성한다.
DocumentBuilderFactory에 setIgnoringElementContentWhitespace를 생성하면 node 테그 사이에 빈값을 출력하지 않고 반환하도록 정의 된다.

document.getElementsByTagName()를 사용하여 NodeList를 받아온다. 이렇게 받아온 리스트에서 원하는 값을 출력하면 된다.
특이한 점은 NodeList 타입은 인터페이스여서 stream으로 처리가 안된다는 점, for 문을 이용하여 원하는 데이터를 뽑았다.

Dart의 고유 번호에는 증권상장이 되지 않는 리스트도 포함되어 있기 때문에 빈값이 출력되는 것은 무시하고
stock_code를 저장할때도 [공공데이터포탈 - 주식시세정보](https://www.data.go.kr/data/15094808/openapi.do) API에서는
앞자리에 A를 붙여서 반환 하기 때문에 DB 저장할때 이러한 점만 주의 하면 된다.

전체 코드는 [github](https://github.com/GeonDev/quant)에 첨부한다.  
