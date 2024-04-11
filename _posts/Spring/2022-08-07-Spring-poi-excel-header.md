---
layout: post
title: Spring POI, AbstractView를 활용한 Excel Download 구현 - 해더 생성
date: 2022-08-07
Author: Geon Son
categories: Spring
tags: [Springboot, AbstractView, Excel]
comments: true
toc: true    
---

이전에 엑셀파일을 다운로드 할때는 별도의 템플릿 파일을 이용하여 엑셀파일을 생성하였다.  
이렇게 설정하면 이미 서식이 있기 때문에 예쁜 틀이 나오지만 파일 경로 문제나 동시에 파일을 조작하면 에러가 발생하기도 한다.

이번에는 별도의 파일없이 엑셀파일 다운기능을 구현해 보았다.

# 1. 의존성 주입
```
		<!-- 엑셀 제어  -->
		<dependency>
			<groupId>org.apache.poi</groupId>
			<artifactId>poi</artifactId>
			<version>4.0.0</version>
		</dependency>

		<dependency>
			<groupId>org.apache.poi</groupId>
			<artifactId>poi-ooxml</artifactId>
			<version>4.0.0</version>
		</dependency>

		<dependency>
			<groupId>org.apache.poi</groupId>
			<artifactId>poi-scratchpad</artifactId>
			<version>4.0.0</version>
		</dependency>
```

이전에 설명을 한적이 있으니 설명은 생략한다.

# 2. Controller 구현

```
@GetMapping("/user-excel")
    public View userExcel(Model model,
                          @RequestParam(value = "type", required = false, defaultValue = "") String type,
                          @RequestParam(value = "value", required = false, defaultValue = "") String value,
                          @RequestParam(value = "start", required = false, defaultValue = "") String startDate,
                          @RequestParam(value = "end", required = false, defaultValue = "") String endDate){



        List<UserDto> data = userService.getExcalDate(type, value, startDate, endDate);
        model.addAttribute("data", data);

        //ExcelDownloader에서 어떤 데이터 인지 구분하기 위하여 전달
        model.addAttribute("contentType", "User");

        return new ExcelDownloader();
    }

```

별도의 기능 없이 간단하게 주어진 필터에 따라 Service에서 값을 가지고 온다.

이렇게 데이터를 불러오면 model에 값을 넣고 추상뷰(AbstractView)인 ExcelDownloader()를 호출하는 것으로 Controller의 역할은 끝난다.

# 3. AbstractView 구현

```
import com.apt.proptech.domain.dto.AssociateDto;
import com.apt.proptech.domain.dto.UserDto;
import org.apache.poi.xssf.streaming.SXSSFRow;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.view.AbstractView;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

public class ExcelDownloader extends AbstractView {

    private static final Logger logger = LoggerFactory.getLogger(ExcelDownloader.class);

    InputStream is = null;
    String title = "non-title";

    SXSSFWorkbook workbook = null;

    @Override
    protected void renderMergedOutputModel(Map<String, Object> model, HttpServletRequest request, HttpServletResponse response) throws Exception {

        String type = (String) model.get("contentType");

        switch (type){
            case "User":
                title = "사용자내역조회";
                workbook = generateUserExcel(model);
                break;

            case "Associate":
                title = "조합현황조회";
                workbook = generateAssociateExcel(model);
                break;
        }

        try {
            response.setContentType("application/msexcel;charset=UTF-8");
            response.setHeader("Content-Disposition", "attachement; filename=\""+ java.net.URLEncoder.encode(title+".xlsx", "UTF-8") + "\";charset=\"UTF-8\"");

            ServletOutputStream out = response.getOutputStream();
            workbook.write(out);
            workbook.close();
            out.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }


    public SXSSFWorkbook generateUserExcel(Map<String, Object> model) throws Exception{
        //테이블 기본 템플릿 생성
        SXSSFWorkbook wb = new SXSSFWorkbook(100);

        //엑셀 테이블 헤더
        String[] header = {
                "Name" ,
                "Email" ,
                "Phone Number" ,
                "Provider" ,
                "Role" ,
                "State",
                "Reg Date",
                "Retire Date"
        };

        List<UserDto> data = (List<UserDto>) model.get("data");


        if(data.size() == 0) {
            wb.createSheet("sheet");
        }else{
            int startRow = 0;
            SXSSFSheet sheet = wb.createSheet("sheet");
            SXSSFRow row = sheet.createRow(startRow);

            //첫줄 (헤더) 그리기
            for (int i = 0; i < header.length; i++) {
                row.createCell(i).setCellValue(header[i]);
            }
            startRow++;

            //테이블 내용 작성
            for(UserDto item : data){
                int i =0;
                row = sheet.createRow(startRow);
                row.createCell(i++).setCellValue(item.getName() );
                row.createCell(i++).setCellValue(item.getEmail() );
                row.createCell(i++).setCellValue(item.getPhoneNumber() );
                row.createCell(i++).setCellValue(item.getProvider() );
                row.createCell(i++).setCellValue(item.getRole() );
                row.createCell(i++).setCellValue(item.getState());
                row.createCell(i++).setCellValue(item.getRegisterDate() );
                row.createCell(i++).setCellValue(item.getRetiredDate() );
                startRow++;
            }
        }

        return  wb;
    }


}
```
전체 코드를 보더라도 큰 문제가 없을 것 같아 한번에 첨부하였다.  
renderMergedOutputModel() 은 AbstractView의 필수요소로 Controller에서 넘어온 model을 map형식을 받아와 처리를 할수 있다. switch 부분에서는 Controller 부분에서 넘겨준 값을 통하여 분기를 구분한다.

이후에 generateUserExcel를 통하여 엑셀파일을 작성하는데 먼저 데이터 위에 간단한 칼럼명을 표시하기 위하여 header라는 배열을 만들고 먼저 한줄을 작성하였다.  
그 이후 부터는 기존 과 동일하게 데이터를 순회하면서 한줄씩 값을 채워주면 된다.

![](/images/spring/excel/qwefqwef.png){: .align-center}
대략 이런 결과물이 나온다.

# 4. 개선이 필요한 부분
데이터를 전달 받은 과정에서 제한이 없다. -> 조건만 맞으면 수백줄도 받을수 있다. 따로 제한을 두어야 할지, 의도는 이게 맞으니 놔두어야 할지 고민이 생겼다.

헤더를 생성하는 부분에서 하드코딩으로 작성하였다. 사실 헤더 뿐아니라 검색옵션을 지정하는 등 여러 부분에 하드코딩이 되어있다. 가급적 이런 방식은 지양하면 좋은데 별도의 파일을 이용해야 할지 아니면 다른 DB테이블을 이용할지 고려해 봐야 한다.
