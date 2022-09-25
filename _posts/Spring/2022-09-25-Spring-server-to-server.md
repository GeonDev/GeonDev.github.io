---
layout: post
title: Spring 다른 서버 API 호출 하여 사용하기 (RestTemplate)
date: 2022-09-25
Author: Geon Son
categories: Spring
tags: [Springboot, REST, API,  RestTemplate]
comments: true
toc: true    
---

> [참고  사이트](https://velog.io/@soosungp33/%EC%8A%A4%ED%94%84%EB%A7%81-RestTemplate-%EC%A0%95%EB%A6%AC%EC%9A%94%EC%B2%AD-%ED%95%A8)

 신규 시스템의 API를 만들면서 기존 시스템의 DB에 접근해야 되는 일이 생겼다. 이러면서 동시에 고민이 생겼는데 신규 시스템은 개인정보 관리용 시스템이라
DB를 별도로 분리해서 별도망으로 관리하여야 한다. 기존 시스템의 DB와 연결하는 것은 보안정책상 까다로운 결제를 받아야 하고 비슷한 기능이 이미 기존
시스템에 있는데 굳이 새로 API를 만드는 것은 귀찮은 일이라 서버간 통신을 알아보다가 RestTemplate를 사용하기로 하였다.

# 1. RestTemplate을 활용한 서버 통신
 RestTemplate은 스프링 3.0 이상 부터 지원하고 HttpClient의 기능을 추상화 하여 제공한다.  

 ![](/images/spring/9f77-4beb-a62c-895724d1bd36.png){: .align-center}

어플리케이션에서  RestTemplate를 생성하고, URI, HTTP 메소드 등을 담아서 요청을 하면 추상화 되어 있는 HttpClient의  HttpMessageConverter를
이용하여 xml, JSON의 형태로 결과를 반환한다.


# 2. RestTemplate 활용 서버간 통신 구현

~~~
public ApiResultMapper<PaymentLocalData> getUserPaymentInfo(String userId, int page, int size) {

      URI uri = UriComponentsBuilder
              .fromUriString("http//www.abc.co.kr")
              .path(/paymentDate)
              .queryParam("userId", userId)
              .queryParam("page", page)
              .queryParam("size", size)
              .encode(Charset.defaultCharset())
              .build()
              .toUri();

      RestTemplate restTemplate = new RestTemplate();
      ResponseEntity<String> result = restTemplate.getForEntity(uri,String.class);

      ObjectMapper mapper = new ObjectMapper();
      mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

      try {
          ApiResultMapper<PaymentLocalData> value = mapper.readValue(result.getBody(), ApiResultMapper.class);
          if(value != null){
              return value;
          }else{
              throw new CmsNoFoundException("결제 데이터가 존재하지 않습니다.");
          }
      }catch (Exception e){
          e.printStackTrace();
      }

      return null;
  }
~~~   

먼저 URI uri를 보면 어떤 API와 통신을 할지 지정하는 코드 이다. 굳이 UriComponentsBuilder를 사용하여 URL을 생성하는 이유는
파라미터 설정이 쉽기 때문이다. 당연히 스트링을 합치거나 다른 방법을 사용할수 있긴 하지만 파라미터가 많아 질수록 UriComponentsBuilder를 사용 하는 것이 편리하다.

이후에 RestTemplate를 생성하고 위에서 생성한 URL을 전달하여 결과를 받는다. 이때 결과값을 String으로 전달 받았는데 별도의 클래스가 아니라 스트링으로
받은 이유는 전달 받은 클래스의 형태가 다르거나 또는 전달 받은 값에 클래스 - 클래스 형태로 되어 있을 경우 파싱을 하기 쉽지 않아 차라리 스트링 형태로 받고
파싱을 하는 편이 간단했기 때문이다.

파라메터 매핑을 할때 **DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES** 라는 옵션을 추가한 것을 알수 있다.
이 옵션은 JSON을 매핑 할때 해당값이 없으면(API 호출시에 결과값이 없는 호출일 수도 있음으로) 해당부분은 매핑을 무시하고 넘겨주어
오륙 터지지 않게 만들어 준다.

전달 받은 ResponseEntity<String> result 에서 데이터가 저장되어 있는 Body를 반환하여 mapper에 전달을 해준다.
mapper에서 데이터를 파싱할때는 이름 기준으로 파싱을 한다. 그렇기 때문에 문제가 생기는 경우가 있는데 클래스 내부에 클래스로 데이터를 저장한 경우에 반환값이
[ClassA : ClassB[AAA,BBB]] 이런 식으로  반환이 된다. 사실 데이터를 받아오면서 상위 클래스 이름은 필요하지 않다. 단순히 구분자의 용도로 처리되어야 하는데
프론트엔드 파트에서 파싱 작업을 또 한번 하거나 서버에서 또 잘라줘야 하는 문제가 있었다. 그래서 데이터를 전달 받을 전용 클래스  ApiResultMapper를 만들어서
형태가 다른 결과 값을 그나마 쉽게 파싱할수 있도록 처리하였다. ApiResultMapper는 특별한 기능은 아니고 단순 제네릭 클래스이다.

~~~
@Data
public class ApiResultMapper<T> {

    private int recordLimit = 10;

    private int pageIndex = 1;

    private int totalRecordCount = 0;

    private List<T> data;

}
~~~

타 서버에서 결과를 반환할때 사용하는 이름을 data 라고 강제로(?) 지정하고 mapper에서 사용하게 되면 파싱을 할때 data 라는 이름으로 결과가 반환됨으로
여러 클래스에 사용할수 있다. 참고로 타 서버에서 어떤 형식으로 값을 반환했는데 전달한다. 페이징을 위한 값과 데이터를 전달한다.

~~~
@Override
public Map<String, Object> getAllUserPaginatePaymentLog(
        String ssoUserId,  int pageIndex, int pageLogLimit) {
    PaymentParameters parameters = new PaymentParameters();
    parameters.setSsoUserId(ssoUserId);
    parameters.setRecordLimit(pageLogLimit);
    parameters.setPageIndex(pageIndex);
    parameters.setRangeBeginDate(null);
    parameters.setRangeEndDate(null);

    Map<String, Object> result = new HashMap<>();

    int totalCount = paymentMapper.selectAllUserPaymentLogTotalCount(parameters);

    result.put("totalRecordCount" , totalCount);
    result.put("pageIndex",pageIndex);
    result.put("recordLimit", pageLogLimit);

    if (totalCount > 0) {
        result.put("data" , paymentMapper.selectAllUserPaginatePaymentLogList(parameters));
    }

    return result;
}
~~~

이렇게 서버간 통신을 정리했다. 최근에는 webClient를 사용한다고 하니 다음 기회때 사용법을 정리해야겠다.
