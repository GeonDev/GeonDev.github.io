---
layout: post
title: 로컬 임시 저장 파일 업로더 만들기
date: 2024-02-11
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

게시판 CMS 프로젝트를 하다가 게시판 생성을 하되 모든 데이터는 한꺼번에 업로드를 시켜야 한다는 기획 조건을 받았다.   
사용자가 작성하는 다른 데이터는 복잡하긴 하지만 자바스크립트로 어떻게든 만들었는데  
파일을 임시저장하는 것은 구현해본 적이 없어서 정리 했다.  
(사실 이런 것도 프론트가 완전히 분리되어 있으면 안할거 같긴한데... 내부 CMS여서 인력지원이 안되서 js로 만들었다.)



# 1. 파일 업로드 단계 정리
파일 업로드를 하지만 바로 서버에 올라가지 않고 클라이언트 내부에 저장을 해야 한다. 내부에 저장된 파일을 사용자가 삭제 해서 서버에 올릴지 안올릴지 결정할 수 있어야 한다.  

파일 업로드는 여러 위치에서 사용할수 있어야 하니 별도 스크립트로 분리 하고, 특정 확장자의 파일만 업로드 할수 있어야 한다. 
미리 지정되어야 하는 여러 조건들이 필요하여 별도 스크립트에 변수를 설정하였다. 

~~~
// 파일 현재 필드 숫자 totalCount랑 비교값
let fileCount = 0;
// 해당 숫자를 수정하여 전체 업로드 갯수를 정한다.
let totalCount = 10;
// 파일 고유넘버
let fileNum = 0;
// 첨부파일 배열
let content_files = new Array();
// 파일 사이즈 
let fileSize = 30 * 1024 * 1024;
// 허용 확장자
let fileType = "jpg,jpeg,gif,png,bmp,txt,hwp,doc,docx,ppt,pptx,xls,xlsx,pdf,mov,mp3,mp4,wav,avi,zip".split(",");

//페이지 최초 실행시 서버에 올라가 있는 파일 카운트 세팅
function setFileNowCount(e){
    fileCount = e;
}

function setFileTotalCount(e){
    totalCount = e;
}

function setFileLimitSize(e){
    fileSize = e * 1204 * 1024;
}

function setFileType(e){
    fileType = e.split(",")
}
~~~ 

위 코드는 자바 스크립트로 작성한 코드이다. 기본적으로 필요한 상태 값을 전역 변수로 세팅하였고 게시판 설정에 따라 설정값을 바꾸기 위한 set 함수를 만들었다. 
위 코드에서 가장 중요한 부분은 **let content_files = new Array();** 으로 첨부파일을 임시 저장하는 객체를 생성한 것이다. 


# 2. 파일 업로드 버튼(input file) 커스텀
~~~
<input multiple="multiple" type="file" >
~~~

파일 업로드 버튼은 이렇게 단단하게 type만 넣어주면 동작한다. (multiple 속성을 넣으면 한번에 여러개의 파일을 업로드 할수 있다.)  다만 기획에서는 모양이 마음에 들지 않는다고 바꾸라고 한다.  

다양하게 구현 할수 있기는 한데 나같은 경우에는 파일 업로드 버튼을 디스플레이에서 숨기고(style="display:none;) 별도의 버튼을 눌렀을때 스크립트로 파일 업로드가 실행되도록 아래와 같이 변경해 주었다.

>[참고](https://mong-blog.tistory.com/entry/input-file-%EB%B2%84%ED%8A%BC-%EC%BB%A4%EC%8A%A4%ED%84%B0%EB%A7%88%EC%9D%B4%EC%A7%95%ED%95%98%EA%B8%B0)


~~~
#btn-upload {
  width: 150px;
  height: 30px;
  background: #fff;
  border: 1px solid rgb(77,77,77);
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: rgb(77,77,77);
    color: #fff;
  }
}


<label for="file">
  <div id="btn-upload">파일 업로드</div>
</label>
<input type="file" name="file" style ='display:none'>

~~~



~~~
$(document).on("click", "#btn-upload", function(e){
    e.preventDefault();
    $('#input_file').click();
});
~~~

e.preventDefault(); 를 추가하면 원래 해당 버튼을 눌렀을때 발생해야 하는 이벤트(id = "btn-upload" 의 이벤트)가 동작하지 않는다.  

id가 btn-upload인 요소는 단순한 모양 데이터 이기 때문에 혹시 다른 이벤트가 생기지 않도록 추가하였고 파일업로드가 동작하는 input_file이 클릭되었다가 스크립트로 추가하였다. 


# 3. 파일 임시 업로드 

이제 input_file을 클릭했을때 발생하는 메소드를 지정해야 한다.  
나는 파일 업로드가 필요한 페이지를 로드할때 input_file 에 연결할 메소드를 따로 저장하였다.  
이렇게 하나의 메소드만 사용해야 추후 요구사항이 변경되었을때 대응하기 유리하기 때문이다. 

~~~

    $(function() {
        $("#input_file").on("change", fileCheck);
    }


    function fileCheck(e) {
        let files = e.target.files;

        // 파일 사이즈 체크
        if(files.item(0).size > fileSize ){
            alert('첨부파일 크기를 초과하였습니다.');
            return;
        }

        // 파일 확장자 확인
        if(!fileTypeCheck(files.item(0).name)){
            alert('업로드 양식에 맞지 않습니다.');
            return;
        }

        // 파일 배열 담기
        let filesArr = Array.prototype.slice.call(files);

        // 파일 개수 확인 및 제한
        if (fileCount + filesArr.length > totalCount) {
            alert('첨부가능한 파일 갯수가 초과되었습니다.');
            return;
        } else {
            fileCount = fileCount + filesArr.length;
        }

        // 각각의 파일 배열담기 및 기타
        filesArr.forEach(function (f) {
            let reader = new FileReader();
            reader.onload = function (e) {
                content_files.push(f);
                $('#articleFileChange').append(
                    '<div id="file' + fileNum + '" onclick="fileDelete(\'file' + fileNum + '\')">'
                    + '<p class="mb-0" style="font-size:15px">' + f.name +  '<span class="btn-close ms-1"> </span>'
                );
                fileNum ++;
            };
            reader.readAsDataURL(f);
        });

        //초기화 한다.
        $("#input_file").val("");
    }
~~~

fileCheck 메소드를 보면 간단한 기능을 수행한다. 먼저 전달 받은 이벤트에서 파일 정보를 받아온다.   
위에서 multiple 설정을 했기 때문에 파일이 여러 개 들어올수 있다. 
일단 지금은 files.item(0)으로 첫번째 데이터만 체크 하였다. 

**Array.prototype.slice()** 을 통하여 배열을 얕은 복사 하고 (깊은 복사를 해버리면 원하는 데이터 뿐 아니라   
데이터가 다른 위치에서 변경되어도 적용될수 있다.) cell() 메소드를 이용하여 리스트로 반환한다. 

FileReader()는 파일을 비동기로 업로드 하는 역할을 수행한다.   
위에서 설명한 것 처럼 파일은 리스트로 받아왔기 때문에   forEach를 돌면서 파일 데이터를 저장한다.   
**content_files.push(f)**

이후에 요구사항에 따라 필요한 내용을 그려주는데 내 경우에는 임시저장 한 파일의 이름을 표시하고,
파일을 지울수 있는 함수를 넣었다. 

**reader.readAsDataURL(f);**
reader.onload 아래에 있는 readAsDataURL은 파일의 로컬 경로를 생성해 줄수 있다.  
특히 파일 미리 보기를 수행할수 있는데 아래와 같이 수정하면 파일의 임시 URL 데이터를 뽑아와서 src에 넣어 아직 업로드 하지 않는 파일의 URL을 보여준다.

 ~~~
             reader.onload = function (e) {
                content_files.push(f);

                    //파일 임시 URL 추출
                    let url = e.target.result;
                        let thumbNail = $("<img>");
                        thumbNail.attr("src" , e.target.result);

                        //생성된 요소를 붙였다 -> 예시 코드
                        $('#articleFileChange').append(thumbNail)

                fileNum ++;
            };
 ~~~


**$("#input_file").val("");**  
마지막으로 input_file에 올렸던 파일 데이터를 초기화하여 추가로 파일을 올릴수 있도록 한다. 


# 4. 임시 파일 삭제

~~~
// 파일 부분 삭제 함수
function fileDelete(fileNum){
    let no = fileNum.replace(/[^0-9]/g, "");
    content_files[no].is_delete = true;
    $('#' + fileNum).remove();
    fileCount --;
}
~~~ 

위에서 만든 fileCheck() 중간에 파일을 삭제하는 함수를 추가 하였다.   
구현하기에 따라서 파일 데이터가 저장된 content_files에 있는 값을 직접 제거 하는 것도 가능할 것이다.
  
다만 나는 중간에 파일의 순서가 꼬이지 않게 인덱스를 유지하고 싶었기 때문에  
저장된 오브젝트에 is_delete라는 플래그를 추가하는 방법으로 해당 데이터가 삭제 되었다는 것을 표시 했다.  
(자바스크립트는 오브젝트에 필드를 미리 지정하지 않아도 유연하게 추가가 된다.)


# 5. 파일 서버 업로드

~~~
function registerAction(){
    if(Object.keys(content_files).length != 0){
        let $token = $("form input[name='_csrf']");

        let formData = new FormData();
        for (let i = 0; i < content_files.length; i++) {
            // 삭제 안한것만 담아 준다.
            if(!content_files[i].is_delete){
                formData.append("article-file", content_files[i]);
            }
        }

        //파일업로드 multiple ajax
        $.ajax({
            async: false,
            type: "POST",
            enctype: "multipart/form-data",
            url: "/upload/file/",
            data : formData,
            processData: false,
            contentType: false,
            beforeSend: function(xhr){
                xhr.setRequestHeader('X-XSRF-TOKEN', $token.val());
            },
            success: function (data) {
                try {
                    let message = data.message;
                    if(message != 'OK'){
                        alert(message);
                        return false;
                    }else {
                        //업로드 완료 후 처리 -> 프로젝트마다 다르기 때문에 주석만 남겨둠
                    }
                }catch (e){
                    alert("파일 업로드 중 오류가 발생했습니다.");
                    return false;
                }

            },
            error: function (xhr, status, error) {
                alert("서버오류로 지연되고있습니다. 잠시 후 다시 시도해주시기 바랍니다.");
                return false;
            }
        });
    }
    return true;
}
~~~

오히려 파일 업로드 부분은 간단하다.   
일반적인 ajax로 구현하는데 content_files 중에 is_delete가 아닌 데이터를 FormData 객체에 넣어 전달한다.


~~~
    @PostMapping(value = "/upload/file/")
    public Map<String, Object> fileUpload(
            @RequestParam("article-file") List<MultipartFile> multipartFile ) {

                    for(MultipartFile file : multipartFile) {

                        if( file.getSize() >= fileLimit  * 1024 * 1024){
                            result.put("message", originalFileName + " 파일이 "+ fileLimit + "MB 보다 큽니다." );
                            break;
                        }

                        File targetFile = new File("파일 저장 경로");
                        try {
                            InputStream fileStream = file.getInputStream();
                            FileUtils.copyInputStreamToFile(fileStream, targetFile); //파일 저장

                        } catch (Exception e) {
                            //파일삭제
                            FileUtils.deleteQuietly(targetFile);    //저장된 현재 파일 삭제
                            e.printStackTrace();
                            break;
                        }
                    }



            }
~~~

전달 받은 데이터를 받을 컨트롤러를 생성하고 전달받은 데이터를 최종 저장하면 작업은 끝난다.