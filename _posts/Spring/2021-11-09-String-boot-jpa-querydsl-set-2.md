---
title:  "Springboot + Spring Date JPA+ QueryDsl 적용하기(Maven) 2"
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
  - QueryDsl
---

지난번에 QueryDsl을 사용하면 어떻게 Pageable을 사용하는지 만약에 사용 못한다면 대참사가 일어날거라고 생각했는데 당연히 사용하는 방법이 있었다. 여러 사용방법이 있는 것 같지만 지난번에 이미 QuerydslRepositorySupport를 구현하였기 때문에 그대로 활용하는 방법으로 구현하였다.

# 1. PageImpl 반환 메소드 생성
```
    // PageImpl은 Spring Data에서 이미 선언되어 있는 도메인
    public PageImpl<User> findUserTypeAndDatePage(String type, String value, String startDate, String endDate , Pageable pageable){

        JPAQuery<User> query = queryFactory.selectFrom(user).where(eqTypeAndValue(type, value), betweenDate(startDate,endDate));

        Long totalCount = query.fetchCount();

        List<User> result = getQuerydsl().applyPagination(pageable, query).fetch();

        return new PageImpl<>(result, pageable, totalCount);
    }
```
아주 간단하게 page를 반환하는 메소드를 생성할수 있다. 처음에는 PageImpl를 따로 구현해서 제작한 것이라고 생각하였는데 Spring date core에 이미 구현되어 있는 클래스였다.

이렇게 반환된 PageImpl은 Page를 포함하고 있기 때문에 이후에는 기존에 사용하던 Service에서 불러오기만하면 된다.


# 2. 기존 Service와 비교

```
   @Override
    public Pagination getItemList(Pageable pageable, String type, String value) {

        Page<User> userPage = null;

        if(type.equals("Role")){
            userPage = userRepository.findAllByUserRoles(value, pageable);
        }else if(type.equals("State")){
            userPage = userRepository.findAllByUserState(value, pageable);
        }else{
            userPage = baseRepository.findAll(pageable);
        }

        //화면에 표시하기 위한 Pagination 세팅
        Pagination<UserDto> items = Pagination.<UserDto>builder()
                .isFirstPage(userPage.isFirst())
                .isLastPage(userPage.isLast())
                .totalPages(userPage.getTotalPages())
                .totalElements(userPage.getTotalElements())
                .currentPage(userPage.getNumber()+1)
                .currentElements(userPage.getNumberOfElements()+1)
                .contents(convertDomain(userPage.getContent()))
                .pageNumbers(setPageNumber(userPage.getNumber(), userPage.getSize(), userPage.getTotalPages()))
                .prePageNum(setPrePageNum(userPage.getNumber(), userPage.isFirst()) )
                .nextPageNum(setNextPageNum(userPage.getNumber(), userPage.isLast()))
                .searchType(setSearchType())
                .columnTitles(setColumns())
                .totalColumnCount(8)
                .build();

        return items;
    }
```

기존에 Pagination을 반환하는 UserService는 repository에 구현된 JPA 인터페이스를 불러와야 하기 때문에 불필요한 조건 분기도 있고 깔끔하지 않았다. 


```
    public Pagination getItemList(Pageable pageable, String type, String value, String startDate, String endDate) {

        PageImpl<User> userPage = userRepositorySupport.findUserTypeAndDatePage(type, value, startDate, endDate, pageable);

        //화면에 표시하기 위한 Pagination 세팅
        Pagination<UserDto> items = Pagination.<UserDto>builder()
                .isFirstPage(userPage.isFirst())
                .isLastPage(userPage.isLast())
                .totalPages(userPage.getTotalPages())
                .totalElements(userPage.getTotalElements())
                .currentPage(userPage.getNumber()+1)
                .currentElements(userPage.getNumberOfElements()+1)
                .contents(convertDomain(userPage.getContent()))
                .pageNumbers(setPageNumber(userPage.getNumber(), userPage.getSize(), userPage.getTotalPages()))
                .prePageNum(setPrePageNum(userPage.getNumber(), userPage.isFirst()) )
                .nextPageNum(setNextPageNum(userPage.getNumber(), userPage.isLast()))
                .searchType(setSearchType())
                .columnTitles(setColumns())
                .totalColumnCount(8)
                .build();

        return items;
    }    
```

새로 QueryDsl을 사용해 제작된 findUserTypeAndDatePage는 분기를 모두 내부에서 처리하기 떄문에 전달 받은 모든 파라미터를 넣기만 하면 동적 쿼리를 생성한다. 

머스테치를 사용하기 때문에 전달하는 데이터의 양이 많아보이지만 이부분은 다른 템플릿을 사용하면 변경되는 부분 이기 떄문에 쿼리 부분만 비교하면 더 간단한 형태로 구현된 것을 알 수 있다.
