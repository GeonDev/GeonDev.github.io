---
layout: post
title: mustache + Springboot 사용해보기
date: 2021-10-04
Author: Geon Son
categories: Spring
tags: [Springboot, Mustache]
comments: true
toc: true
---

>매뉴얼 경로
https://github.com/janl/mustache.js/

>전체 프로젝트
https://github.com/GeonDev/Proptech



회사에서 진행 중인 프로젝트, 진행된 프로젝트는 대부분 Spring(boot) + jsp로 작업되어 있었다. 작업한 프로젝트 대부분이 운영(Admin) 페이지가 많기 때문에 접속량이 많은 편도 아니고 프론트를 전담하는 개발자가 없기 떄문에 이전 개발자 분들에게 익숙한 방식으로 개발되었기 때문에 같은 방식으로 계속 개발되고 있다고 생각한다.

 굳이 war로 사용할 필요도 없지만 그렇다고 jar를 쓰지 말아야할 이유도 없고(JSP를 제외하면) 조금 더 간단 하고 깔끔한 방법으로 화면을 구성할수 없을까 하다가 mustache 탬플릿을 알게 되어 이리저리 사용해 보았다.

![](/assets/images/it/f620bfdbimage1.png){: .align-center}

 SB ADMIN 2 탬플릿을 사용하여 페이지를 제작하였고 내부에 mustache를 이용하여 약간의 요소를 변경하였다. mustache를 사용해도 javascript나 jquery는 그대로 사용할수 있고 특별히 못 만들겠다는 부분은 없지만 불편한 점도 편한 점도 있었다.

#  매우 간단한 적용
스프링 부트를 사용하면서 mustache를 사용하려고 하면 아주 간단한 설정을 적용하면 된다.
```
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-mustache</artifactId>
		</dependency>
```
우선 mustache lib를 다운받기 위해 pom에 dependency를 추가해주고
```
spring:
  mustache:
    expose-session-attributes: true
    suffix=.mustache
```
필수는 아니지만 머스테치에서 세션을 사용할수 있도록 값을 받아오는 기능을 추가한다.
suffix 설정을 이용하여 머스테치 파일의 확장자를 .mustache에서 다른 이름으로 변경하는 설정도 할 수 있지만 나는 굳이 필요없다고 생각하였다.
mustache는 스프링부트에서 공식지원하고 있기 때문에 이렇게 간단히 설정하면 적용이 완료 된다.



#  화면에서 연산 불가
mustache의 가장 큰 특징은 서버에서 완벽하게 연산된(?) 데이터만 전달 해야 한다는 점이다.
좋은 점은 화면에서 복잡한 연산 코드가 없다보니 비교적 깔끔하고 읽기 쉽게 화면이 구성된다.
JSP로 화면이 구성되다 보면 내부에 c:set c:forEach 등 화면단에서 연산을 하는 코드를 많이 사용하게 되면서 코드가 복잡해진다면 mustache는 이러한 코드 없이 서버단에서 모든 정보를 주기 때문에 비교적 깔끔하다.
단 페이징 같은 기능을 넣을때는 서버에서 보내줘야 되는 정보가 많아져서 약간 귀찮은 상황이 발생하기도 한다.



![](/assets/images/it/f620bfdbimage2.png){: .align-center}



위에 보이는 단순한 페이지 네비게이션을 보여주기 위해 화면에서는 mustache로 값이 있는지 확인하고 받아온 데이터 (심지어 페이지 번호를 연산할수도 없다.)를 순회하면서 출력하는 방식으로 화면을 구성하고

```
{% raw %}
<nav aria-label="Page navigation">
	<ul class="pagination justify-content-center">

		{{#isFirstPage}}
		<li class="page-item disabled">
		{{/isFirstPage}}

		{{^isFirstPage}}
		<li class="page-item ">
		{{/isFirstPage}}
		<a class="page-link" href="javascript:getTablePage({{pages.prePageNum}});" aria-label="Previous">
			<span aria-hidden="true">&laquo;</span>
			<span class="sr-only">Previous</span>
		</a>
	</li>


		{{#pages.pageNumbers}}
			<li class="page-item"><a class="page-link" href="javascript:getTablePage({{.}});" >{{.}}</a></li>
		{{/pages.pageNumbers}}


		{{#isLastPage}}
		<li class="page-item disabled">
		{{/isLastPage}}

		{{^isLastPage}}
		<li class="page-item ">
		{{/isLastPage}}
		<a class="page-link" href="javascript:getTablePage({{pages.nextPageNum}});" aria-label="Next">
			<span aria-hidden="true">&raquo;</span>
			<span class="sr-only">Next</span>
		</a>
	</li>
	</ul>
</nav>
{% endraw %}
```

서버의 서비스 단에서는 지금이 첫페이지인지 마지막인지, 다음번호는 몇번인지, 표시할 번호는 무엇인지(JPA Pageable은 0부터 페이지를 카운트 하지만 표시는 1부터 해야 하는데 이러한 작은 연산도 서버에서 해줘야 한다.) 등 모든 정보를 고정된 값으로 전달 하기 위해 많은 연산이 필요하다.

```
//Pagination DTO를 전달한다.
public Pagination getItemList(Pageable pageable, String type, String value, String startDate, String endDate) {

        Page<Associate> associatesPages = associateRepositorySupport.findUserTypeAndDatePage(type, value, startDate, endDate, pageable);

        Pagination<AssociateDto> items = Pagination.<AssociateDto>builder()
                .isFirstPage(associatesPages.isFirst())
                .isLastPage(associatesPages.isLast())
                .totalPages(associatesPages.getTotalPages())
                .totalElements(associatesPages.getTotalElements())
                .currentPage(associatesPages.getNumber()+1)
                .currentElements(associatesPages.getNumberOfElements()+1)
                .contents(convertDomain(associatesPages.getContent()))
                .pageNumbers(setPageNumber(associatesPages.getNumber(), associatesPages.getSize(), associatesPages.getTotalPages()))
                .prePageNum(setPrePageNum(associatesPages.getNumber(), associatesPages.isFirst()) )
                .nextPageNum(setNextPageNum(associatesPages.getNumber(), associatesPages.isLast()))
                .searchType(setSearchType())
                .columnTitles(setColumns())
                .build();

        return items;
    }

//전달될 데이터를 리스트에 넣어준다.    
private List<AssociateDto> convertDomain( List<Associate> data){
        List<AssociateDto> result = new ArrayList<AssociateDto>();

        for(Associate info : data ){
            AssociateDto temp = new AssociateDto(info);
            result.add(temp);
        }
        return  result;
    }

```


mustache가 할 수 있는 연산은


**1. 값이 있는지 없는지 체크하는 것**

**2. 전달된 리스트를 순회하면서 표시하는 것**

**3. 주어진 경로의 데이터를 불러오는 것**




크게 보면 이정도의 간단한 연산만을 수행할 수 있다. 이 마저도 null 값이 화면에 전달되면 false로 체크하는 것이 아니라 화면에 표시해야하는 값으로 생각하고 에러가 발생한다.

이 부분은 단점이자 장점인데 서버에서 화면으로 전달하는 값은 반드시 있는 값 이라는 큰 원칙을 잡고 화면을 구성하기 떄문에 화면 자체만 보면 오히려 간단하게 작성된다는 특징이 있다.



# 구조적으로 구성 가능
처음 화면을 구성할때는 화면의 구성요소를 모두 넣어서 작성하였다.
페이지마다 중복되는 구성요소도 있고 해당 페이지를 구성하는데 필수가 아닌 정보 (ex 툴바)도 하나의 파일에 같이 들어있다보면 페이지마다 조금씩 다르게 구성되거나 특정 값이 누락되는 등 오류가 생긴다. mustache에서는 jsp에 include 같은 기능을 제공하고 있는데 이를 활용하여 화면을 구성하면 중복되는 요소가 화면마다 다르게 구성되는 것도 막을수 있고
반복작업도 줄어든다.

사실 당연한 기능인데 mustache의 단순함이 합쳐지면 정말 단순한 구조가 된다.

```
{% raw %}
{{>layout/header}}
<body id="page-top">
	<div id="wrapper">

            <!-- /.container-fluid -->
            {{#dashboardLayout}}
                {{>layout/dashboardLayout}}
            {{/dashboardLayout}}

            {{#tableLayout}}
                {{>layout/tableLayout}}
            {{/tableLayout}}

            {{#chartContent}}
                {{>layout/chartContent}}
            {{/chartContent}}

            {{#profileContent}}
                {{>layout/profileContent}}
            {{/profileContent}}


        </div>
        <!-- End of Main Content -->

    </div>
    <!-- End of Content Wrapper -->
</div>


</div>

{{>layout/footer}}
{% endraw %}
```


SB ADMIN 탬플릿에서 화면을 구성하는 요소를 제외하고 실제 작성할 부분은 container-fluid 에 들어갈 화면 밖에 없다. 추가적으로 javascript나 jquery등 필요한 요소는 footer에 작성하면 된다.



```
{% raw %}
<!-- Latest compiled and minified JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>

<!-- Tempus Dominus JavaScript -->
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment.min.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.0.1/js/tempusdominus-bootstrap-4.min.js"></script>



{{#DashboardLayout}}
    <script src="/js/demo/chart-area-demo.js"></script>
    <script src="/js/demo/chart-pie-demo.js"></script>
{{/DashboardLayout}}

{{#tableLayout}}
    <script src="/js/func/tableFunc.js"></script>
{{/tableLayout}}

{{#regLayout}}
    <script src="/js/func/regFunc.js"></script>
{{/regLayout}}

{{#loginLayout}}
    <script src="/js/func/loginFunc.js"></script>
{{/loginLayout}}

</body>
</html>
{% endraw %}
```


footer에도 딱히 특별한 내용없이 CDN이나 불러와야 할 스크립트를 명시하는 것으로 구성이 끝난다.
jsp를 이런 식으로 구성하다보면 프로그래머 마다 성향이 달라서 내부에 상태값을 계산한다거나 화면의 코드를 넣으면서 알아보기 어려운 형식으로 구성되기도 한다. mustache는 오히려 매우 단순해서 프로그래머의 코딩 습관이나 버릇을 오히려 표현하기 힘들기 때문에 누구나 알아보기 쉬운 코드가 된다.

화면을 아주 예쁘게 꾸미거나 복잡한 효과가 필요없다면 mustache의 사용도 고려해볼만 한 것 같다.
