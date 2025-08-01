---
layout: post
title: 미래의 개발자를 위한 이야기 – 차세대 AI 개발자가 갖춰야 할 기술과 사고방식
date: 2025-07-24
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---
>[Microsoft Cloud & AI 부트캠프](https://www.microsoft.com/ko-kr/cloudandaibootcamp/#msdynttrid=CUsVx4Dt4YF31VnX8uALGXqdzx3fKybnajeHF1wVDjk)  
>[전체 영상](https://info.microsoft.com/AA-InnAI-VDEO-FY26-07Jul-24-AZBCTalksforFutureDevelopersTheskillsandmindsetthatnextgenerationAIdevelopersneed_SREVM72517_LP02-Thank-You---Standard-Hero.html#msdynttrid=fIeT7ilokIxfRDMXdvuzJBRnwF1juEPyy9BZh8VNu3w)


# Microsoft 클라우드 부트캠프 요약본


<details>
<summary>스크립트 전문</summary>

마이크로소프트 클라우드 부트캠프에 오신 여러분을 환영합니다. 저는 프리앙카이며, 디벨로퍼 인게이지먼트 고투마켓을 담당하고 있습니다. 질문이 있으신 경우 Q&A 버튼을 눌러주시고 질문을 남겨주세요. 리소스도 공유드릴 예정입니다.

빠르게 진행되는 데모 세션입니다. 첫 번째 데모는 스캇 핸셀맨님이 진행해주십니다. 애저 AI 파운드리에 관한 데모입니다.

안녕하세요. 저도 애저 AI 파운드리에 대해 이해하려 했는데, 처음엔 좀 어렵고 복잡했습니다. 저는 웹 전문가이기도 해서, 이 파운드리가 어떤 배경에서 어떤 소프트웨어와 연결되는지 고민해봤습니다.

스펙을 보면 에이전트, 모델, 컴파일러 스튜디오 같은 요소들이 있습니다. 왼쪽을 보면 IaaS가 있고, 이는 낮은 수준의 일을 처리합니다. 예를 들어 GPU를 활용해 모델을 트레이닝하는 거죠. 하지만 코딩 없이 드래그 앤 드롭으로 작업하고 싶을 때 애저 AI 파운드리는 '플랫폼으로서의 서비스'처럼 작동합니다. 애저 앱 서비스와 비슷한 개념으로, 하드웨어는 신경 쓰지 않아도 되고, SaaS보다는 조금 더 통제권이 있는 서비스입니다.

이 기능을 실제 문제에 적용해보았습니다. 제가 운영하는 ‘헨셀미닛’이라는 팟캐스트가 있는데, 20년간 총 1,001개의 에피소드를 진행했습니다. 전 세계 다양한 인사들을 모셨지만, 반복적이고 지루한 작업이 많았습니다. 예를 들어 연사를 섭외하고 정보를 정리하고, 에피소드를 편집하는 일이죠.

그래서 이런 지루한 작업들을 도와줄 수 있기를 바랐고, AI가 처리해주기를 원했습니다. 이른바 ‘3D’ 일들—어렵고, 지루하고, 반복적인 일들 말이죠. 비용도 절감하고 싶었고, 너무 큰 모델은 부담스러웠기 때문에 나노 모델을 선택했습니다. 1,000개의 에피소드를 트레이닝하는 데 약 100달러밖에 들지 않았습니다.

AI 파운드리에는 에이전트 플레이그라운드가 있어서, 쇼 노트를 작성하고 에피소드의 전사 기록도 확인할 수 있습니다. 각 주제의 언급 시간, 연사 인용 문구, 관련 리소스까지 자동으로 정리됩니다. 반복적이고 번거로운 작업을 자동화한 셈입니다.

또 미니 어시스턴트 기능으로 각각의 작업을 적절한 에이전트에게 할당할 수 있습니다. 20년간의 데이터를 활용해 스스로 질문에 답하거나, 과거의 에피소드를 분석할 수도 있죠. 예를 들어 “스캇이 AI에 대한 태도가 어떻게 변했는가?”라는 질문에 초기에는 회의적이었지만 최근에는 긍정적으로 바뀌었다는 분석을 보여줍니다.

이처럼 전사, 쇼 노트 작성, 콘텐츠 연결 등을 통해 팟캐스트 팩토리처럼 운영할 수 있게 되었습니다. 여러분도 자신이 가진 문제를 해결하기 위해 AI 팩토리를 만들어 보시길 바랍니다.

이제 발표를 프리앙카에게 넘기겠습니다.

다음 데모는 마틴 님이 진행하며, GitHub Copilot 활용 방법을 소개합니다.

Copilot은 Visual Studio Code에서 탭 키를 눌러 코드 제안을 받거나, 질문을 통해 기능 설명을 받을 수 있습니다. 예를 들어 웹사이트의 아키텍처를 설명해달라고 요청하면 관련 정보를 분석해줍니다. 다양한 언어로도 질문이 가능해, 예를 들어 만다린어로 질문하면 답변도 만다린어로 제공됩니다.

이제 최신 기능을 살펴보겠습니다. 예를 들어 Copilot의 에이전트 모드를 활성화하면 코드베이스를 분석하고 자동으로 변경을 제안하거나 수행합니다. 예를 들어 연사 안내 페이지에서 USB 헤드셋에 대한 정보가 빠져 있다면, Copilot이 해당 파일을 찾아 내용을 추가합니다. 전체 코드베이스에 대해 작업할 수 있으며, CSS 스타일링까지 적용해줍니다.

또한, GitHub에서 이슈가 발생했을 때 이를 Copilot에게 할당하면, Pull Request를 생성하고 변경 사항을 적용해줍니다. 작업 진행 상황도 실시간으로 확인할 수 있습니다.

Copilot은 코드 리뷰도 가능합니다. 코드 내 타이포나 버그를 감지하고 주석으로 안내합니다. 이러한 기능은 데브옵스 환경에서 특히 유용하며, 기존에 뒤처져 있던 개발 환경에도 쉽게 도입할 수 있습니다.

Copilot은 자동화된 기능을 제공하지만, 인간의 판단과 감독은 여전히 중요합니다. 따라서 보안, 품질, 윤리적 사용을 위한 프로세스도 함께 고려되어야 합니다.

마지막 데모는 Python으로 Flappy Bird 게임을 만드는 예시입니다. 간단한 한 문장 지시로 Copilot이 프로젝트 스캐폴딩을 수행하고, 백엔드, 프론트엔드, 설정 파일까지 모두 자동으로 생성합니다.

앱을 실행하려다 포트 충돌 문제가 발생하면 Copilot이 자동으로 포트를 변경해 문제를 해결합니다. 게임 내 새의 색상을 변경하거나 앱을 Azure Kubernetes Service에 배포하는 것도 Copilot이 모두 처리합니다. Docker 파일, YAML 매니페스트 생성, 클라우드 리소스 생성까지 자동으로 수행합니다.

이처럼 복잡한 과정을 단순한 지시만으로 해결할 수 있으며, 애플리케이션을 클라우드에 성공적으로 배포할 수 있습니다.

오늘 보여드린 데모는 다음 세 가지를 설명해주었습니다:

반복 작업 자동화 (AI Foundry)

코드 생성 및 수정 (GitHub Copilot)

클라우드 배포 자동화 (AKS 활용)

오늘 데모가 도움이 되셨기를 바랍니다. 관련 리소스는 채팅창을 통해 공유드리며, 피드백도 부탁드립니다. 더 많은 세션이 이번 주 준비되어 있으니 웹사이트를 방문해 확인해주시기 바랍니다. 감사합니다.
</details>

## 🎙️ 세션 1: 스캇 핸셀맨 – Azure AI Foundry 데모

Azure AI Foundry: 드래그 앤 드롭 방식으로 AI 파이프라인 구성 가능.  
하드웨어 걱정 없이 모델 선택, 트레이닝, 배포까지 가능.
  * 사례: 팟캐스트 ‘헨셀미닛’ 운영에 적용.
    * 1,000개 이상 에피소드 자동화: 쇼 노트 작성, 전사, 연사 정보 수집, 메타데이터 정리.
    * 나노 모델 활용해 비용 절감 (약 $100).
    * 반복 작업 자동화 → 생산성 향상.
    * 도구들: 에이전트 플레이그라운드, 미니 어시스턴트, 콘텐츠 분석 도구 등 활용.

## 💻 세션 2: 마틴 – GitHub Copilot 데모
GitHub Copilot 기능  
코드 자동 완성, 코드 분석, 문서화, 다국어 질문 지원.  
에이전트 모드: 전체 코드베이스 분석 및 수정 가능.  
CLI, GitHub · Build and ship software on a single, collaborative platform , VS Code 등 다양한 환경 지원.
 * 사례 데모: 팟캐스트 웹사이트 개선
   * 연사 안내 페이지 업데이트.
   * 에이전트가 파일 찾고 내용 추가, 스타일 수정.
   *  자동 Pull Request 생성 및 배포.

## 🕹️ 세션 3: Copilot으로 게임 개발 + 배포
Flappy Bird 게임 개발 (사례)
* 한 문장으로 전체 프로젝트 자동 생성 (백엔드 + 프론트엔드 + 설정 파일 포함).  
  * 충돌 포트 자동 감지 및 수정.
* 서비스 업데이트 지원
  * 새 색상 일괄 변경, CSS 수정 등 코드 수정 자동화
* Azure Kubernetes Service (AKS) 배포
  * 도커 파일, 매니페스트 생성.
  * 클러스터 생성 및 앱 배포 자동화. 
  * IP 주소 제공 → 공유 및 플레이 가능.

## 💡 핵심 메시지
에이전트와 Copilot을 활용하면 반복적이고 복잡한 작업을 자동화할 수 있으며, 개발 생산성을 대폭 향상시킬 수 있음.  
적절한 사용을 위해서는 프롬프트 작성 능력(=명확한 요구사항 설명)이 중요.  
AI는 도구일 뿐, 여전히 사람 중심의 판단과 책임이 필요함.


