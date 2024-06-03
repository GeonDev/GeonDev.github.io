---
layout: post
title: JPA에서 원하는 항목만 바로 뽑아 사용하기 (dto mapping, projection ,trasform)
date: 2023-08-11
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

JPA를 사용하면서 개발을 할떄 DB를 찾아보는 일이 줄어들었고 대부분의 경우 엔티티만 생각하면서 코딩을 할수 있어 편리했지만
Mybatisd와 달리 엔티티에서 원하는 데이터만 뽑아서 표시할수 없어 서비스 영역에서 DTO 매핑을 해줘야 하는 것이 귀찮았다. 
조금 찾아 보니 JPA에서도 원하는 데이터만 뽑아 바로 사용하는 방법이 있었다.

# 1. Closed Projection
원하는 데이터만 반환하는 인터페이스를 만드는 방법이다.  
인터페이스에 get 메소드를 사용해서 원하는 값만 뽑아낼수 있기 떄문에 사용이 간단하다.

~~~

@Entity
@Data
@Table(name = "TB_STOCK_PORTFOLIO")
public class Portfolio {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    Long portfolioId;

    String userKey;

    //매매, 매수 구분
    @Enumerated(EnumType.STRING)
    TradingType trading;

    //거래일
    LocalDate tradingDt;

    //1주당 평균 가격
    Integer average;

    //매매/매도 개수
    Integer stockCount;
    
}



//매핑에 사용되는 인터페이스
public interface TradingMapping {
        TradingType getTrading();
        LocalDate getTradingDt();
}
~~~

Portfolio 엔티티에서 필요한 필드만 가져 오고 싶다면 아래 처럼 인터페이스를 만들어 원하는 값만 담으면 된다.   
인터페이스를 만들때 별도의 getter, setter는 설정 할 필요없이 원하는 엔티티 필드의 이름에 맞추어 인터페이스를 만들면 된다.  
위에서 만든 인터페이스를 반환하는 레파지토리 메소드를 만들면 끝난다.

~~~
public interface PortfolioRepository extends JpaRepository<Portfolio, String> {

    TradingMapping findByPortfolioId(String id);


    @Query(value = "SELECT PO.trading_type as trading, PO.trading_dt as tradingDt,  FROM TB_STOCK_PORTFOLIO PO " +
            "WHERE PO.portfolio_id = :id" , nativeQuery = true)
    TradingMapping findByPortfolioQuery(String id);
}

~~~

레파지토리에 반환 타입을 위에서 만든 인터페이스로 만들었다. 이렇게 간단하게 매핑을 하고 원하는 데이터만 뽑을수 있다. 
굳이 엔티티 형태로 반환 하는 것 뿐 아니라 네이티브 쿼리에서도 바로 뽑을수 있다. 다만 이때는 alias를 사용하여 엔티티 이름을 맞추어 줘야 원하는 데이터를 추출할수 있다.
(엔티티 이름이 달라 추출되지 않더라도 오류가 발생하지 않기 때문에 주의 해야 한다.)



## 1.1. Open Projection

~~~
public interface TagMapping {
        @Value("#{target.portfolioId + ' ' + target.trading}")
        String getTag
}
~~~

자주 사용하는 것은 아니자만 @Value를 사용하면 엔티티 필드를 조작하여 출력할수 있다.  
실무에서는 계층이 있는 정보 (ex 게시판 경로, 프로그램 정보) 등을 조회 할때 사용해 봤는데   
오히려 데이터를 따로 받고 합치는 편이 유용한 적이 많아서 자주 사용하지는 않았다. 



# 2. Projections
QueryDsl을 사용한다면 매핑 인터페이스가 아니라 DTO에 직접 데이터를 반환 할 수 있다.  
Projections.constructor, Projections.fields, Projections.bean, @QueryProjection 의 방법이 있다.  
이름에서 알수 있듯이 constructor는 생성자를 이용하고 fields는 필드명에 따라 매핑을 하고 bean은 Setter를 사용하고 (결국 fields와 사용법이 유사함)   
@QueryProjection은 DTO class도 QClass를 생성해주는 방법이다. 


~~~
package com.quant.core.entity;


import lombok.Data;

import javax.persistence.*;
import java.io.Serializable;
import java.time.LocalDate;

@Entity
@Data
@Table(name = "TB_CORP_FINANCE")
public class CorpFinance implements Serializable {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    Long financeId;

    //분기코드
    String rceptNo;

    String corpCode;

    String stockCode;

    //연도 4자리
    String yearCode;

    LocalDate startDt;

    LocalDate endDt;

    //자본금
    Long capital;

    //자산 총계
    Long totalAssets;

    //부채 총계
    Long totalDebt;

    //자본 총계
    Long totalEquity;

    //매출액
    Long revenue;

    //당기 순이익
    Long netIncome;

    //영업 이익
    Long operatingProfit;

    //이익 잉여금
    Long earnedSurplus;

    //시가총액 % 매출액
    Double PSR;

    //시가총액 % 자본 총계
    Double PBR;

    //시가총액 % 당기 순이익
    Double PER;

    //시가총액 % 영업이익
    Double POR;

    Double YOY;

    Double QOQ;

    Double YTD;
}
~~~

위에 코드를 보면 필드 값이 많이 있는 Entity 클래스를 확인할수 있다.   
여기에서 내가 필요한 데이터만 뽑은 CorpFinanceSimpleDto를 만든다면 아래 처럼 된다.

~~~
package com.quant.api.dto;


import lombok.Data;

import java.io.Serializable;

@Data
@AllArgsConstructor
public class CorpFinanceSimpleDto implements Serializable {

    Long financeId;

    //분기코드
    String rceptNo;

    String corpCode;

    String stockCode;

    //자본금
    Long capital;

    //자산 총계
    Long totalAssets;

    //부채 총계
    Long totalDebt;

    //자본 총계
    Long totalEquity;

    //매출액
    Long revenue;

    //당기 순이익
    Long netIncome;

    //영업 이익
    Long operating;
}
~~~

queryDsl의 메소드에서 Projections 내가 원하는 데이터를 바로 뽑아내는 메소드를 만들자고 한다면 아래 처럼 할수 있다.   

~~~
    public List<CorpFinanceSimpleDto> findByFinanceSimple(Long id){
        List<CorpFinanceSimpleDto> results = queryFactory
                .select(
                        Projections.constructor(CorpFinanceSimpleDto.class,
                                corpFinance.financeId,
                                corpFinance.corpCode,
                                corpFinance.stockCode,
                                corpFinance.capital,
                                corpFinance.totalAssets,
                                corpFinance.totalDebt,
                                corpFinance.totalEquity,
                                corpFinance.revenue,
                                corpFinance.netIncome,
                                corpFinance.operatingProfit.as("operating")
                        )
                )                
                .from(corpFinance)
                .where(corpFinance.financeId.eq(id))
                .fetch();
                
        return  results;
    }
~~~

Projections.constructor를 활용하여 corpFinance값의 일부만 DTO에 매핑 시켰다. 예제에서는 interface를 활용한   Open Projection와 비교해서 큰 이점이 없어 보일수도 있다.  
하지만 조인이 포함되어 여러 Entity의 값을 하나의 DTO로 합치는 경우 Open Projection을 사용하는 것이 힘들수도 있고   
as()를 활용하여 DTO의 필드명을 자유롭게 변경할수도 있다. (operatingProfit -> operating)   
또 CASE문을 활용하여 프론트에서 작업하던 연산을 쿼리 단에서 바로 처리할수도 있게 한다. 


## 2.1. CaseBuilder 추가
위에 분기 코드(rceptNo)는 Q1, Q2, Q3, Q4와 같은 형식의 데이터를 받아오게 된다.   
프론트에는 1분기, 2분기, 3분기와 같은 형태로 표시된다고 했을때 CaseBuilder를 이용하면 서비스단 또는 프론트에서 DTO를 수정하지 않아도 된다.

~~~
    public List<CorpFinanceSimpleDto> findByFinanceSimple(Long id){
        List<CorpFinanceSimpleDto> results = queryFactory
                .select(
                        Projections.constructor(CorpFinanceSimpleDto.class,
                                corpFinance.financeId,
                                new CaseBuilder()
                                        .when(corpFinance.corpCode.eq("Q1")).then("1분기")
                                        .when(corpFinance.corpCode.eq("Q2")).then("2분기")
                                        .when(corpFinance.corpCode.eq("Q3")).then("3분기")
                                        .otherwise("4분기"),
                                corpFinance.stockCode,
                                corpFinance.capital,
                                corpFinance.totalAssets,
                                corpFinance.totalDebt,
                                corpFinance.totalEquity,
                                corpFinance.revenue,
                                corpFinance.netIncome,
                                corpFinance.operatingProfit
                        )
                )
                .from(corpFinance).where(corpFinance.financeId.eq(id)).fetch();

        return  results;
    }
~~~

Case 문 쿼리를 사용하는 것과 방법은 똑같다. when() 메소드에 내가 원하는 조건을 넣고 만족하면 then()의 값을 반환하게 된다.  
 이런식으로 DTO에 들어가는 값을 직접 수정하면서 Projections을 유용하게 사용할 수 있다.




