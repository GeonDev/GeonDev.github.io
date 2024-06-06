---
layout: post
title: URL 주소를 넣고 파일 다운로드 하기 (Spring, FileUtils)
date: 2023-09-01
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true    
---

프로젝트 중 파일의 경로를 직접 노출하면 안된다고 하여 파일 다운로드 컨트롤러를 만들었다.  
당연히 고도화 시킬수 있을것 같지만 일단은 간단하게 파일 경로를 찾아가서 다운로드 하도록 구성  
파일 타입 상관없이 내려준다. 

# 1. 소스코드

~~~

    @GetMapping("/download/file")
    public void download( HttpServletResponse response) {
        
        String fileName = "다운로드 했을떄 표시되는 파일명";
        String saveFilePath = "불러올 파일의 저장 경로 ";

        File downloadFile = new File(saveFilePath);

        byte fileByte[] = new byte[0];
        try {
            fileByte = FileUtils.readFileToByteArray(downloadFile);

            response.setContentType("application/octet-stream");
            response.setContentLength(fileByte.length);
            response.setHeader("Content-Disposition", "attachment; fileName=\"" + URLEncoder.encode(fileName, "UTF-8") + "\";");
            response.setHeader("Content-Transfer-Encoding", "binary");

            response.getOutputStream().write(fileByte);
            response.getOutputStream().flush();
            response.getOutputStream().close();

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
~~~

사실 특별한 내용은 없다.  
FileUtils의 readFileToByteArray() 메소드로 파일을 불러올 파일을 byte 배열로 바꾸어 주고 헤더와 인코딩을 설정하여 내려주면 끝난다. 파일 관련 기능 구현은 막상 보면 쉽지만 항상 햇깔린다...









