---
layout: post
title: Spring POI, AbstractView를 활용한 Excel Download 구현 - 암호화
date: 2023-01-16
Author: Geon Son
categories: Spring
tags: [Springboot, AbstractView, Excel]
comments: true
toc: true    
---

액셀파일을 다운로드 하는데 가끔 암호화를 요구 하기도 한다. 처음에는 어떻게 만들어야 하는지 몰랐는데 의외로 간단하게 액셀파일 생성 부분만 수정하면 된다.  
이전에 컨트롤러 등은 구현한 적이 있음으로 이전 포스팅을 참고 하고 암호화 부분만 살펴 보려고 한다.

# 1. 암호화 구현

의외로 암호화는 간단했다.
~~~
		ServletOutputStream out = response.getOutputStream();
		workbook.write(out);
		workbook.close();
		out.close();
~~~

기존에 이렇게 바로 ServletOutputStream을 넘기던 부분을

~~~
		ByteArrayOutputStream file = new ByteArrayOutputStream();
		workbook.write(file);

		InputStream fileIn = new ByteArrayInputStream(file.toByteArray());
		POIFSFileSystem fs = new POIFSFileSystem();

		//비밀번호 세팅
		EncryptionInfo info = new EncryptionInfo(EncryptionMode.agile);
		Encryptor enc = info.getEncryptor();

		String password = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		enc.confirmPassword(password);

		OPCPackage opc = OPCPackage.open(fileIn);
		OutputStream os = enc.getDataStream(fs);
		opc.save(os);
		opc.close();

		OutputStream fileOut = response.getOutputStream();
		fs.writeFilesystem(fileOut);
		fileOut.close();
		file.close();
~~~

아래와 같이 OPCPackage 으로 넘기면 된다. 코드에 주석이 되어 있기 때문에 내용자체는 금방 이해할 것이다.  

우선 ByteArrayOutputStream에 기존에 생성했던 Workbook을 넘겨 준다.  
그리고 EncryptionInfo 를 이용해서 암호화 로직을 정한 후 설정하고 싶은 패스워드를 지정한다. (여기서는 현재 날짜로 지정하였다.)  
마지막으로 OPCPackage에 위해 작성했던 EncryptionInfo 인코딩된 데이터를 넣어주면 된다.

처음에는 SXSSFWorkbook 등 Workbook 클래스 부터 변경을 하려고 했는데  
생각해 보니 어차피 상속을 받아 생성되어 있는 클래스라 형변환이 되기 때문에 굳이 기존 클래스를 Workbook에 맞춰서 다시 만들 필요는 없었다.



# 3. 전체 소스

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

            //이 부분이 기존 소스와 다르게 변경되었다.						
						ByteArrayOutputStream file = new ByteArrayOutputStream();
						workbook.write(file);

						InputStream fileIn = new ByteArrayInputStream(file.toByteArray());
						POIFSFileSystem fs = new POIFSFileSystem();

						//비밀번호 세팅
						EncryptionInfo info = new EncryptionInfo(EncryptionMode.agile);
						Encryptor enc = info.getEncryptor();

						String password = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
						enc.confirmPassword(password);

						OPCPackage opc = OPCPackage.open(fileIn);
						OutputStream os = enc.getDataStream(fs);
						opc.save(os);
						opc.close();

						OutputStream fileOut = response.getOutputStream();
						fs.writeFilesystem(fileOut);
						fileOut.close();
						file.close();

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
