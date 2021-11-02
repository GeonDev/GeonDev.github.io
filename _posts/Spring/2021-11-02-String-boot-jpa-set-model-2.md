---
title:  "Springboot JPA 적용해 보기 - 2 (연관 관계)"
toc: true
toc_sticky: true
categories:
  - Spring
tags:  
  - Web
  - Java
  - SpringBoot
  - JPA
  - Database
---

![](/assets/images/spring/r43hjolfl_1.png)
아무생각 없이 개발하다가 객체를 불러올수 없다는 오류가 출력되는 것을 보게 되었습니다. 
**org.hibernate.LazyInitializationException:could not initialize proxy** 가 발생하는 이유는 데이터를 조회 하기 전에 이미 엔티티가 끝나버렸기 때문으로 Lazyload를 사용하면 처음 데이터를 조회할때 데이터를 로드 하지 않기 때문에 그냥 쿼리를 날리면 이런 문제가 발생할수 있다고 합니다. 해결방법은 크게 2가지 인데 

1. FetchType을 EAGER로 변경하는 방법
2. 쿼리를 호출할때 @Transactional을 선언하는 것

Lazy에서 EAGER로 변경하면 쿼리를 불러올떄 모든 데이터를 같이 불러오기 떄문에 겉보기에는 별다른 문제는 없지만 불러오는 데이터 량이 많아 질수록 당연히 느려질 것이고 필요없는 데이터를 더 불러오는 상황이 되기 때문에 @Transactional을 이용하여 해결하였습니다. 

사실 문제는 이렇게 만들어진 엔티티가 단방향이였기 때문에 다른 엔티티의 값을 가지고 오는 연산이 점점 많아지면 오버헤드도 늘어나고 데이터를 조회하는 과정에서 양방향 매핑이 되어 있지 않기 때문에 로직상 오류가 더 많이 발생하게 될것이라고 생각하게 되었습니다. 결국 단뱡향 매핑을 양방향으로 전환하는 작업을 수행하면서 고려해야 하는 내용을 테스트 하고 정리하였습니다.

# 1. 연관관계의 주인에 값을 넣어야 한다?

이게 무슨 말인지 이해가 잘 되지 않았습니다. 연관관계의 주인은 외래키를 관리하는 객체 이기 때문에 User, LoginHistory가 있다면 LoginHistory에 외래키가 있기 때문에 연관관계의 주인은 LoginHistory이고 그러면 LoginHistory 안에 있는 User에만 값을 넣으면 된다는 건가?

```
   @Test
    @Transactional
    void test(){
        
        User user1 = User.builder()
                .id(1L)
                .username("김")
                .build();

        //히스토리 추가
        LoginHistory h1 = LoginHistory.builder()
                .id(1L)
                .user(user1)
                .build();

        LoginHistory h2 = LoginHistory.builder()
                .id(2L)
                .user(user1)
                .build();

        LoginHistory h3 = LoginHistory.builder()
                .id(3L)
                .user(user1)
                .build();

        userRepository.save(user1);
        
        loginHistoryRepository.save(h1);
        loginHistoryRepository.save(h2);
        loginHistoryRepository.save(h3);

        User temp = userRepository.findByUsername("김");

        temp.getLoginHistoryList().forEach(o->{
            System.out.println(o.getId());
        });

    }
```

User를 하나 생성하고 3개의 LoginHistory를 생성하고 각각에 같은 User를 넣어주었습니다. 이렇게 한 상태에서 userRepository로 user를 불러와서 LoginHistory를 조회하면?

![](/assets/images/spring/r43hjolfl_2.png)

User에 LoginHistory가 없기 때문에 NullPointerException이 발생합니다. 그렇다면 반대로 User에 LoginHistory를 넣고 LoginHistory에는 User를 넣지 않는다면? 
당연히 User에 데이터가 들어갔기 떄문에 LoginHistory가 정상적으로 출력됩니다. LoginHistory에서 username이 `김`인 데이터를 출력하려고 한다면 값이 나오지 않습니다. 

말이 어려웠지만 결론은 **필요한 값이 있다면 한쪽 객체에 넣지말고 당연히 사용하는 모든 객체에 값을 넣어야 한다는 것**입니다. 어느한쪽에 데이터를 넣었다고 해서 정상적으로 작동하지 않는다는 것으로 상식적으로 생각하고 작성하면 됩니다.


## 2. OneToMany? ManyToOne 어느 쪽?
간단한 내용인데 막상 연관관계 매핑을 하다보면 혼란이 옵니다. 
이부분은 기준을 확실하게 정하면 될것 같은데 List<>를 가지고 있는 쪽이 OneToMany입니다. 
그럼 반대로 ManyToOne는 연관관계의 주인인 경우가 됩니다. 

```

@Entity
@DynamicInsert
@DynamicUpdate
public class User extends BaseTimeEntity{

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //다른 엔티티의 user_id와 혼동하지 말것! -> 로그인시 구분되기 쉽게 하는 이름
    //security를 사용할때 기본으로 요구하는 값
    private String username;
    private String password;
    //실명 입력
    private String name;
    private String email;
    private String profileImg;
    private String phoneNumber;

    //OAuth를 위한 필드
    private String provider;
    private String providerId;


    @Enumerated(EnumType.STRING)
    private UserRole userRole;

    @Enumerated(EnumType.STRING)
    private UserState userState;

    private LocalDateTime retiredDate;

    private LocalDateTime modiPasswordDate;


    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id")
    private Company company;

    @OneToMany(mappedBy = "user",fetch = FetchType.LAZY)
    private List<Account> accountList = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<LoginHistory> loginHistoryList = new ArrayList<>();

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    private List<OwnedHistory> ownedHistoryList = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Receipt> receiptList = new ArrayList<>();

}


@Entity
public class LoginHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime loginDate;

    private String loginIp;

    private Boolean isLogin;

    @Enumerated(EnumType.STRING)
    private IpChecked ipChecked;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;


}
```

## 3. Entity를 바로 전달하지 않는다.
양방향 매핑을 하게 되었을떄 발생할수 있는 문제중 하나는 무한순회 입니다. 무한순회를 맊을수 있는 방법은 @ToString(exclude = "user")와 같이 조회시에 제외하는 방법도 있지만 다른 방법으로는 DTO를 사용하여 화면에 값을 전달하는 방법입니다. DTO에 화면 구성에 필요한 값을 넣으면서 무한 순회를 막을수 있습니다. 

```
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssociateDto {

    private String name;
    private String round;
    private String expectDate;
    private String realDate;
    private String feeRatio;
    private String city;
    private String state;
    private String address;
    private String registerDate;
    private String modifiedDate;

    //전체 참여자 수
    private int totalJoinUserCount;

    //전체 사업 금액
    private int totalRequiredPaid;

    //전체 납입 금액
    private int totalPaid;

    //전체 미납 금액
    private int totalUnPaid;


    public AssociateDto(Associate associate){
        this.name = associate.getName();
        this.round = associate.getAssociateRound().name();
        this.expectDate = CommonUtil.toDateStr(associate.getEndExpectDate());
        this.realDate = CommonUtil.toDateStr(associate.getEndRealDate());
        this.feeRatio = CommonUtil.null2str(associate.getOperateFeeRatio());
        this.city = CommonUtil.null2str(associate.getCity());
        this.state = CommonUtil.null2str(associate.getState());
        this.address = CommonUtil.null2str(associate.getState());
        this.registerDate = CommonUtil.toDateStr(associate.getRegDate());
        this.modifiedDate = CommonUtil.toDateStr(associate.getModiDate());


        //전체 사업 금액
        for (SaleProp sale : associate.getSalePropList()){
            for(Claim claim : sale.getClaimList()){
                this.totalRequiredPaid += claim.getPayment();
            }
        }

        //전체 납입 금액
        for (SaleProp sale : associate.getSalePropList()){
            for(Claim claim : sale.getClaimList()){
               for(Receipt receipt : claim.getReceiptList()){
                   this.totalPaid += receipt.getPayment();
               }
            }
        }

        //전체 미납금액
        this.totalUnPaid =  this.totalRequiredPaid -  this.totalPaid;
    }
}
```
위에 DTO는 엔티티에는 없는 부가 정보를 계산하여 전달하는 기능을 합니다. 