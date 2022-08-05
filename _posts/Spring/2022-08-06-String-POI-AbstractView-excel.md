---
layout: post
title: Spring POI, AbstractView를 활용한 Excel Download 구현 - 템플릿 파일 사용
date: 2022-08-06
Author: Geon Son
categories: Spring
tags: [Springboot, AbstractView, Excel]
comments: true
toc: true    
---

통계 프로그램을 만들면 결과를 엑셀로 다운로드 하는 기능이 거의 필수로 들어오는 것 같다.
파일을 업로드하는 것은 구현해 본적이 있지만 다운로드 하는 것은 구현해 본적이 없어서 정리하려고 한다.

# 1. apache poi

> http://poi.apache.org/download.html

apache poi는 오피스 프로그램을 java로 다루기 위한 라이브러리 라고 한다.
poi 와 poi-ooxml를 dependency에 추가 하면 된다. 나는 poi-scratchpad도 추가 하였다.
현재 최신 버전은 5.0으로 보인다.

~~~
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
~~~

# 2. Controller 구현

보통 스프링에서 대부분의 연산은 Controller에서 실행되지만 파일 다운로드는 view 단에서 이루어 진다고 한다.
따라서 Controller에서는 필요한 Service를 호출하여 model에 값만 넣어주면 된다.
조금 특이한 점은 진짜 뷰(?)인 .html, jsp 파일을 return하는게 아니라 AbstractView 를 상속받는 클래스를 리턴한다는 것이다. AbstractView를 상속 받으면 해당 클래스는 뷰로 취급된다고 한다.

~~~
@Controller
@RequestMapping("user/*")
public class UserController {

  @RequestMapping(value="excel" )
  public String getExcelUserList( @ModelAttribute("search") Search search, Model model) throws Exception{		

	search.setCurrentPage(1);

	if(search.getKeyword() == null) {
		search.setKeyword("");
	}

	//미사용 데이터 -> 단순 초기화용
	search.setCurrentDate(0);
	search.setPageSize(0);

	// Business logic 수행
	List<User> list = userServices.getAllUserList(search);

	model.addAttribute("list", list);
	model.addAttribute("fileName", "UserList");

        // AbstractView를 상속한 Class
	return "excelDownloader";
	}
}
~~~
위에서 설명한 것 처럼 Controller에서는 보통의 뷰에 데이터를 전달 하듯이 Model에 값을 전달하는 기능만 하고 excelDownloader를 리턴한다.



# 3. AbstractView를 상속 받은 ExcelDownloader 구현

ExcelDownloader 다운로드 기능을 담당하는 클래스이다. 물론 이름은 원하는데로 작성하면 되기 때문에 신경 쓰지 않아도 되고 AbstractView의 메소드 중 renderMergedOutputModel()을 신경 쓰면 된다.
컨트롤러에서 AbstractView를 상속한 클래스를 호출하면 renderMergedOutputModel()를 호출해서 기능을 수행한다. 매개변수로 HttpServletRequest request, HttpServletResponse response가 있기 때문에 왠만한 전달값은 전부 받을 수 있을 것 같다.

## XSSFWorkbook과 SXSSFWorkbook
엑셀파일을 불러오기 위하여 사용하는 클래스이다. 기본적으로 SXSSFWorkbook은 XSSFWorkbook을 상속받아 만들어 졌다고 한다. SXSSFWorkbook를 사용하는 가장 큰 이유는 대용량의 파일을 빠르게 저장하고 사용할 수 있기 때문이라고 한다. 아직 대용량의 프로젝트를 경험해 본적은 없지만 회사의 프로젝트는 모두 SXSSFWorkbook로 구현되어 있어서 나도 SXSSFWorkbook로 구현하였다.


## renderMergedOutputModel 구현

~~~
@Override
protected void renderMergedOutputModel(Map<String, Object> model, HttpServletRequest request, HttpServletResponse response) throws Exception {

	//path를 받아오는 코드는 생략하였다....

        template = path + template;
        emptyFlie = path + emptyFlie;


		filename = (String) model.get("fileName") + "_" + getDate();

		//엑셀파일 작성을 위한 임시데이터 저장용 기능
		//최소 압축 비율을 지정한다.
		ZipSecureFile.setMinInflateRatio(0);

		//엑셀파일을 생성한다.
		wb = generateUserExcel(model);

		response.setContentType("application/msexcel;charset=UTF-8");
		response.setHeader("Content-Disposition", "attachment; filename=" + filename + ".xlsx;");

		ServletOutputStream os = response.getOutputStream();
		wb.write(os);
		wb.close();
		is.close();
		os.close();

	}

    	public String getDate() {
		Date d = new Date();
		SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd");

		return format.format(d);
	}
~~~

클래스 위에 전역 변수로 파일을 저장할 위치, 콘텐츠 타입을 지정하는 변수 등이 있지만 이해하는데 어려운 코드는 아니다. 먼서 파일 작성을 위한 임시파일의 압축비율을 지정한다. SXSSFWorkbook를 사용하였을때 XSSFWorkbook보다 빠르게 파일을 생성할수 있는 이유는 임시 파일을 이용하기 때문이라고 한다. 나머지 기능은 보통 파일 쓰기와 크게 다르지 않다.

## generateUserExcel(model) 구현

~~~
// 탬플릿 엑셀 파일에 리스트 값을 넣음
public Workbook generateUserExcel(Map<String, Object> model) throws Exception{
	List<User> userlist = (List<User>) model.get("list");

		is = new FileInputStream(template);

		XSSFWorkbook xwb = new XSSFWorkbook(is);
		SXSSFWorkbook workbook = new SXSSFWorkbook(xwb);

               //엑셀의 시작열을 지정 0부터 카운트 한다.
			int startRow = 4;

			//탬플릿 파일에 template 시트의 서식을 불러온다.
			XSSFRow template = xwb.getSheet("template").getRow(startRow);
			List<CellStyle> styleList = new LinkedList<>();

			for(int i =1; i < template.getLastCellNum(); i++) {
				styleList.add(template.getCell(i).getCellStyle());
			}

			SXSSFSheet sheet = workbook.getSheetAt(0);

			logger.info("template excel READ Complite");

			for(User user : userlist) {
				SXSSFRow row = sheet.createRow(startRow);

				row.createCell(1).setCellValue(user.getUserCode());
				row.createCell(2).setCellValue(user.getUserName());
				row.createCell(3).setCellValue(user.getRole());
				row.createCell(4).setCellValue(user.getState());
				row.createCell(5).setCellValue(user.getRegDate());
				row.createCell(6).setCellValue(user.getBanDate());
				row.createCell(7).setCellValue(user.getAccount());
				row.createCell(8).setCellValue(user.getPrimeCount());
				row.createCell(9).setCellValue(user.getEmail());

				for(int i =1; i < row.getLastCellNum(); i++) {
					sheet.getRow(startRow).getCell(i).setCellStyle(styleList.get(i-1));
				}
				startRow++;
			}
			workbook.removeSheetAt(1);

			// First step is to get at the CTWorksheet bean underlying the worksheet.
			CTWorksheet ctWorksheet = xwb.getSheetAt(0).getCTWorksheet();
	        // From the CTWorksheet, get at the sheet views.
			CTSheetViews ctSheetViews = ctWorksheet.getSheetViews();
	        // Grab a single sheet view from that array
			CTSheetView ctSheetView = ctSheetViews.getSheetViewArray(ctSheetViews.sizeOfSheetViewArray() - 1);
	        // Se the address of the top left hand cell.
	        ctSheetView.setTopLeftCell("A1");
	        // Also, make sure that cell A1 is the active cell
	        sheet.setActiveCell(new CellAddress("A1"));		


		return workbook;
	}
~~~

이 코드는 탬플릿으로 저장된 엑셀파일을 읽어와서 두번째 시트(시트 이름을 "template"라고 입력했다.)의 서식을 불러와 저장하고 저장된 서식을 이용하여 첫번째 시트에 작성한다. 파일 작성이 끝나면 서식이 저장된 두번째 시트는 지우고 남아 있는 첫번째 시트만 반환한다. 실제 시트를 보면 첫번째 시트는 빈칸이고 두번째 시트에는 글자색이 지정되어 있다.


![첫번째](/images/spring/excel/imageqwfqwf-1.png){: .align-center}

![두번째](/images/spring/excel/imagedqwfqw-2.png){: .align-center}


for(User user : userlist) 부분을 보면 전달 받은 리스트에서 한 행씩 엑셀파일에 데이터를 넣어주는 것을 볼수 있다. 원하는 칼럼의 개수, 값에 따라 다르게 작성하면 된다.
이렇게 작성이 끝나면 브라우저의 다운로드 경로에 저장되어지는 엑셀파일을 볼수 있다.


## 오류 해결

**java.lang.IllegalArgumentException: Attempting to write a row[4] in the range [0,4] that is already written to disk.**
라는 오류가 발생했다. 이미 다른 기록이 작성되어 있다는데 액셀파일은 빈칸이다. 크게 2가지 해결방법이 있다.

### 1. 읽기 전용 파일인지 확인
읽으려는 excel 파일이 읽기 전용이면 해당 파일에 접근할수 없어 쓰기오류가 발생한다.
읽기전용을 해제 하면 된다.

### 2. 열 삭제
![](/images/spring/excel/imageasdf-3.png){: .align-center}
비어있는 시트이고 읽기전용도 아닌데 오류가 발생하면 excel 파일을 열어서 열을 지워보면 해결되는 경우가 있다.
표시되지 않지만 데이터가 있는건지...왜 그런건지는 모르겠다....


### 3. o.s.b.w.servlet.support.ErrorPageFilter
스프링 타일즈를 적용하고 테스트를 하다보니 문제가 발생했다. 기존에는 String으로 AbstractView를 반환하였는데 타일즈를 적용하면서 viewResolver 설정을 변경하였기 때문에 작동이 안된다. (정확하게는 String 으로 화면을 전달하면 반드시 [스트링.jsp] 형태만 인식한다.)

방법은 전달하는 AbstractView Class를 정확하게 View()로 사용한다고 명시하면 된다.
~~~
	@RequestMapping(value = "/totalCall.excel" ,method = RequestMethod.POST)
	public View getTotalCallList( Model model, SearchVO<TotalCallDto> searchVO) throws Exception{		

		List<TotalCallDto> list = new ArrayList<>();

		//GSON : 추후에 searchVO 키값으로 하는 Service  필요

		list = searchVO.getResults();

		model.addAttribute("list", list);
		model.addAttribute("taget", "total");

		return new ExcelView();

	}
~~~

특별히 다른 것은 없고 반환형식을 View(org.springframework.web.servlet.View)로 사용하하고 new로 객체를 생성하여 반환하면 된다.



## ExcelDownloader 전체 코드

단순 참고 용으로 첨부

~~~
package com.vig.util;

import java.io.FileInputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletContext;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellAddress;
import org.apache.poi.xssf.streaming.SXSSFRow;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTSheetView;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTSheetViews;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTWorksheet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.view.AbstractView;

import com.vig.controller.FeedController;
import com.vig.domain.User;

/**
 *
 * @author kada
 * @content 뷰 취급된 클래스로 엑셀파일을 생성하고 다운로드 하게 해준다.
 *          static/excel 에 있는 엑셀파일을 이용하여 파일을 생성한다.
 *
 * */

@Component
public class ExcelDownloader extends AbstractView{

	public static final Logger logger = LogManager.getLogger(FeedController.class);

	@Value("${excelPath}")
	String excelPath;

	@Value("${realExcelPath}")
	String realExcelPath;

	private static String OS = System.getProperty("os.name").toLowerCase();

	//전달할 콘텐츠 타입을 지정
	private static final String CONTENT_TYPE = "application/vnd.ms-excel";

	private String template = "template.xlsx";
	String filename = "";

	@Autowired
	private ServletContext context;		

	InputStream is = null;
	Workbook wb = null;


    public void AdminExcelView() {
        setContentType(CONTENT_TYPE);
    }

	@Override
	protected void renderMergedOutputModel(Map<String, Object> model, HttpServletRequest request, HttpServletResponse response) throws Exception {
		// TODO Auto-generated method stub

        String path = context.getRealPath("/");  

        if(OS.contains("win")) {
        	//워크스페이스 경로를 받아온다.
            path = path.substring(0,path.indexOf("\\.metadata"));         
            path +=  excelPath;
        }else {
        	//실제 톰켓 데이터가 저장되는 경로를 가리킨다.
        	path =  realExcelPath;
        }     

        template = path + template;


		filename = (String) model.get("fileName") + "_" + getDate();

		//엑셀파일 작성을 위한 임시데이터 저장용 기능
		//최소 압축 비율을 지정한다.
		ZipSecureFile.setMinInflateRatio(0);

		//엑셀파일을 생성한다.
		wb = generateUserExcel(model);

		response.setContentType("application/msexcel;charset=UTF-8");
		response.setHeader("Content-Disposition", "attachment; filename=" + filename + ".xlsx;");

		ServletOutputStream os = response.getOutputStream();
		wb.write(os);
		wb.close();
		is.close();
		os.close();

	}


	// 탬플릿 엑셀 파일에 리스트 값을 넣음
	public Workbook generateUserExcel(Map<String, Object> model) throws Exception{
		List<User> userlist = (List<User>) model.get("list");

			is = new FileInputStream(template);

			XSSFWorkbook xwb = new XSSFWorkbook(is);
			SXSSFWorkbook workbook = new SXSSFWorkbook(xwb);

			//엑셀의 시작열을 지정 0부터 카운트 한다.
			int startRow = 4;

			//탬플릿 파일에 template 시트의 서식을 불러온다.
			XSSFRow template = xwb.getSheet("template").getRow(startRow);
			List<CellStyle> styleList = new LinkedList<>();

			for(int i =1; i < template.getLastCellNum(); i++) {
				styleList.add(template.getCell(i).getCellStyle());
			}

			SXSSFSheet sheet = workbook.getSheetAt(0);

			logger.info("template excel READ Complite");

			//startRow++;
			for(User user : userlist) {
				SXSSFRow row = sheet.createRow(startRow);

				row.createCell(1).setCellValue(user.getUserCode());
				row.createCell(2).setCellValue(user.getUserName());
				row.createCell(3).setCellValue(user.getRole());
				row.createCell(4).setCellValue(user.getState());
				row.createCell(5).setCellValue(user.getRegDate());
				row.createCell(6).setCellValue(user.getBanDate());
				row.createCell(7).setCellValue(user.getAccount());
				row.createCell(8).setCellValue(user.getPrimeCount());
				row.createCell(9).setCellValue(user.getEmail());

				for(int i =1; i < row.getLastCellNum(); i++) {
					sheet.getRow(startRow).getCell(i).setCellStyle(styleList.get(i-1));
				}
				startRow++;
			}
			workbook.removeSheetAt(1);

			// First step is to get at the CTWorksheet bean underlying the worksheet.
			CTWorksheet ctWorksheet = xwb.getSheetAt(0).getCTWorksheet();
	        // From the CTWorksheet, get at the sheet views.
			CTSheetViews ctSheetViews = ctWorksheet.getSheetViews();
	        // Grab a single sheet view from that array
			CTSheetView ctSheetView = ctSheetViews.getSheetViewArray(ctSheetViews.sizeOfSheetViewArray() - 1);
	        // Se the address of the top left hand cell.
	        ctSheetView.setTopLeftCell("A1");
	        // Also, make sure that cell A1 is the active cell
	        sheet.setActiveCell(new CellAddress("A1"));		


		return workbook;
	}


	public String getDate() {
		Date d = new Date();
		SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd");

		return format.format(d);
	}

	public CellStyle getStyle(XSSFSheet sheet, int row, int cell) {
		return sheet.getRow(row).getCell(cell).getCellStyle();
	}

}

~~~
