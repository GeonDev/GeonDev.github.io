---
layout: post
title: Git Hook과 Gemini를 활용한 자동 코드 리뷰 시스템 구축
date: 2026-01-12
Author: Geon Son
categories: IT
tags: [IT]
comments: true
toc: true
---

Spring 프로젝트에서 코드 품질을 자동으로 관리하기 위해 Git Hook과 Gemini AI를 활용한 자동 코드 리뷰 시스템을 구축했다. 커밋 전 자동으로 AI가 코드를 분석하고, 문제가 있으면 커밋을 차단하며, 상세한 리포트를 생성하는 시스템이다.

# 1. 배경 및 문제 상황

## 1.1. 왜 Git Hook을 선택했는가?

회사 프로젝트에서는 Bitbucket과 Bamboo를 사용하여 코드 형상관리와 배포를 진행하고 있다. 처음에는 일반적인 CI/CD 파이프라인에 AI 코드 리뷰를 통합하려고 했으나 다음과 같은 제약사항이 있었다.

### 제약사항
1. **저장소 권한 부족**: Bitbucket 저장소에 대한 관리자 권한이 없어 Webhook이나 Pipeline 설정을 직접 변경할 수 없었다
2. **인증 복잡도**: GitHub와 달리 Bitbucket + Bamboo 환경에서 외부 AI API 연동이 복잡하다
    - 기업 방화벽 정책으로 인한 외부 API 호출 제한
    - Bamboo의 빌드 에이전트에서 AI API 인증 설정의 어려움
    - 보안팀 승인 프로세스의 복잡함
3. **팀 프로세스**: 기존 팀의 CI/CD 파이프라인을 변경하려면 여러 팀의 승인이 필요했다

### Git Hook의 장점
이러한 상황에서 **로컬 Git Hook**은 완벽한 대안이었다:
- ✅ 저장소 권한 불필요 - 개인 로컬 환경에서만 작동
- ✅ 인증 간소화 - 개인 API 키만 있으면 됨
- ✅ 팀 승인 불필요 - 다른 팀원에게 영향 없음
- ✅ 즉시 적용 가능 - 설정 변경 없이 바로 사용
- ✅ 유연한 커스터마이징 - 개인 필요에 맞게 수정 가능

결국 **"내가 통제할 수 있는 환경"**에서 코드 품질을 관리하는 것이 가장 현실적인 방법이었다.

## 1.2. 다른 대안은 없었을까?

Git Hook 외에도 몇 가지 대안을 검토했으나 각각의 한계가 있었다.

### 대안 1: SonarQube 플러그인
**장점:**
- 정적 분석 도구로 검증된 솔루션
- Bamboo와 공식 통합 지원

**단점:**
- AI 기반 분석 불가능 (규칙 기반만 가능)
- 서버 설치 및 관리자 권한 필요
- 초기 설정이 복잡하고 비용 발생 가능

### 대안 2: GitHub Copilot / Cursor AI
**장점:**
- IDE에서 실시간 코드 제안
- 별도 설정 불필요

**단점:**
- 개인 라이센스 구매 필요 (월 $10~20)
- 커밋 전 강제 검증 불가능
- 팀 전체 적용 어려움

### 대안 3: Bitbucket Code Insights API
**장점:**
- Bitbucket 네이티브 통합
- PR에 직접 코멘트 가능

**단점:**
- 저장소 관리자 권한 필수
- Bamboo Pipeline 수정 필요
- 보안팀 승인 프로세스 필요

### 대안 4: Pre-commit Framework (Python)
**장점:**
- 다양한 플러그인 생태계
- 팀 전체 표준화 가능

**단점:**
- Python 환경 필요
- AI 통합을 위한 커스텀 플러그인 개발 필요
- 러닝 커브

### 결론: Git Hook + Gemini AI
결국 **"저장소 권한 없이, 팀 승인 없이, 개인 환경에서 즉시 적용 가능한"** Git Hook 방식이 가장 적합했다.

## 1.3. 시스템 개요

## 1.1. 주요 기능
- **자동 코드 분석**: 커밋 전 변경된 코드를 AI가 자동으로 분석
- **커밋 차단**: 치명적인 결함 발견 시 자동으로 커밋 차단
- **상세 리포트**: 프로젝트 영향도, 사이드 이펙트, 성능 등 다각도 분석
- **커밋 메시지 추천**: AI가 변경사항에 맞는 커밋 메시지 자동 생성
- **JIRA 연동**: 브랜치명에서 JIRA ID를 추출하여 커밋 메시지에 자동 추가

## 1.2. 시스템 구조
```
프로젝트 루트/
├── .git/
│   └── hooks/
│       ├── pre-commit          # 커밋 전 실행
│       └── prepare-commit-msg  # 커밋 메시지 자동 추가
├── hooks/                      # Hook 소스 파일
│   ├── pre-commit
│   ├── prepare-commit-msg
│   └── setup.sh               # 설치 스크립트
├── GEMINI_REPORT.md           # AI 리뷰 리포트 (자동 생성)
└── .gitignore
```

# 2. 환경 설정

## 2.1. 필수 요구사항
- macOS (zsh)
- Git
- Gemini CLI

## 2.2. Gemini CLI 설치

Gemini CLI는 Google의 Gemini AI를 터미널에서 사용할 수 있게 해주는 도구다.

~~~bash
# npm을 통한 설치 (권장)
npm install -g @google/generative-ai

# 설치 확인
gemini --version

# API 키 설정 (최초 1회)
gemini config set apiKey YOUR_API_KEY
~~~

API 키는 Google AI Studio(https://makersuite.google.com/app/apikey)에서 발급받을 수 있다.

# 3. Git Hook 설치

## 3.1. 프로젝트 구조 생성

먼저 프로젝트에 Hook 파일을 저장할 디렉토리를 생성한다.

~~~bash
# 프로젝트 루트에서
mkdir -p hooks
cd hooks
~~~

## 3.2. pre-commit Hook 생성

`hooks/pre-commit` 파일을 생성하고 다음 내용을 작성한다.

이 Hook은:
- 커밋 대상 파일 중 Java, SQL, XML 등을 분석
- Git diff에서 순수 코드만 추출하여 AI에게 전달
- AI 응답을 파싱하여 리포트 생성
- 문제 발견 시 커밋 차단

> 전체 코드는 [GitHub Gist](링크)에서 확인할 수 있다.

## 3.3. prepare-commit-msg Hook 생성

`hooks/prepare-commit-msg` 파일을 생성한다.

이 Hook은 AI가 추천한 커밋 메시지를 자동으로 Git 커밋 메시지에 반영한다.

~~~bash
#!/bin/zsh

COMMIT_MSG_FILE=$1
TMP_MSG_FILE=".git/GEMINI_MSG_TMP"

if [ -f "$TMP_MSG_FILE" ]; then
    cat "$TMP_MSG_FILE" > "$COMMIT_MSG_FILE"
fi
~~~

## 3.4. setup.sh 설치 스크립트 생성

`hooks/setup.sh` 파일을 생성하여 Hook을 자동으로 설치할 수 있게 한다.

~~~bash
#!/bin/zsh

echo "🚀 Git Hooks 설치 시작..."

# Git 루트 찾기
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$PROJECT_ROOT" ]; then
    echo "❌ Git 저장소를 찾을 수 없습니다."
    exit 1
fi

echo "📂 프로젝트 루트: $PROJECT_ROOT"

# .git/hooks 디렉토리 생성
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# 복사할 파일 목록
FILES=("pre-commit" "prepare-commit-msg")

# 파일 복사 및 권한 설정
echo ""
echo "📋 Hook 파일 복사 중..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$HOOKS_DIR/"
        chmod +x "$HOOKS_DIR/$file"
        echo "  ✅ $file 복사 완료"
    else
        echo "  ⚠️  $file 파일이 없습니다."
    fi
done

# 필요한 파일 생성
echo ""
echo "📝 필요한 파일 생성 중..."

# GEMINI_REPORT.md 초기 파일 생성
REPORT_FILE="$PROJECT_ROOT/GEMINI_REPORT.md"
if [ ! -f "$REPORT_FILE" ]; then
    cat > "$REPORT_FILE" << 'EOF'
# 🤖 Gemini 시니어 코드 리뷰 리포트

> 이 파일은 Git pre-commit hook 실행 시 자동으로 업데이트됩니다.

---

*아직 분석된 커밋이 없습니다.*
EOF
    chmod 666 "$REPORT_FILE"
    echo "  ✅ GEMINI_REPORT.md 생성 완료"
else
    echo "  ℹ️  GEMINI_REPORT.md 이미 존재함"
fi

# GEMINI_MSG_TMP 파일 생성
TMP_MSG_FILE="$PROJECT_ROOT/.git/GEMINI_MSG_TMP"
touch "$TMP_MSG_FILE"
chmod 666 "$TMP_MSG_FILE"
echo "  ✅ GEMINI_MSG_TMP 생성 완료"

# .gitignore 업데이트
GITIGNORE="$PROJECT_ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
    if ! grep -q "GEMINI_REPORT.md" "$GITIGNORE"; then
        echo "" >> "$GITIGNORE"
        echo "# AI Code Review Reports" >> "$GITIGNORE"
        echo "GEMINI_REPORT.md" >> "$GITIGNORE"
        echo "  ✅ .gitignore에 GEMINI_REPORT.md 추가"
    else
        echo "  ℹ️  .gitignore에 이미 설정됨"
    fi
else
    cat > "$GITIGNORE" << 'EOF'
# AI Code Review Reports
GEMINI_REPORT.md
EOF
    echo "  ✅ .gitignore 생성 완료"
fi

echo ""
echo "🎉 설치 완료!"
echo ""
echo "📋 설치된 항목:"
echo "  - .git/hooks/pre-commit"
echo "  - .git/hooks/prepare-commit-msg"
echo "  - GEMINI_REPORT.md"
echo "  - .git/GEMINI_MSG_TMP"
echo ""
echo "💡 다음 단계:"
echo "  git add ."
echo "  git commit -m \"기능 추가\""
~~~

## 3.5. 설치 실행

~~~bash
# hooks 디렉토리에서
chmod +x setup.sh
./setup.sh
~~~

정상적으로 설치되면 다음과 같은 메시지를 확인할 수 있다.

![](/images/it/git-hook-setup-success.png){: .align-center}

# 4. 사용 방법

## 4.1. 일반 커밋 프로세스

~~~bash
# 1. 코드 수정 후 스테이징
git add .

# 2. 커밋 시도
git commit -m "사용자 인증 로직 추가"

# 3. AI 분석 시작 (자동)
# - 변경된 파일 분석
# - AI 리뷰 수행
# - 리포트 생성

# 4. 결과 확인
cat GEMINI_REPORT.md
~~~

## 4.2. 커밋 승인 시나리오

코드에 문제가 없으면 다음과 같이 표시된다.

~~~
============================================
🤖 시니어 아키텍트 제미나이 코드 리뷰 시작
============================================
📂 프로젝트 루트: /Users/kafa/IdeaProjects/stock-batch
[INFO] 분석 대상 파일 (총 3개):
  ✓ src/main/java/UserService.java
  ✓ src/main/resources/application.yml

[AI] Gemini 분석 중...
[AI] 분석 완료!
============================================
✅ [PASS] 코드 리뷰 통과!
============================================
📄 리포트: GEMINI_REPORT.md
💬 추천 커밋 메시지: KPCB-123 사용자 인증 로직 추가
============================================
~~~

## 4.3. 커밋 차단 시나리오

치명적인 문제가 발견되면 커밋이 자동으로 차단된다.

~~~
============================================
🚨 [BLOCK] 커밋 거부!
============================================
제미나이가 심각한 이슈를 감지했습니다:
[BLOCK] [UserService]: SQL 인젝션 취약점 발견

📄 상세 리포트: GEMINI_REPORT.md
============================================
~~~

이 경우 `GEMINI_REPORT.md` 파일을 확인하여 문제를 해결한 후 다시 커밋해야 한다.

## 4.4. Hook 비활성화

필요시 Hook을 건너뛸 수 있다.

~~~bash
# Hook 비활성화하고 커밋
git commit --no-verify -m "긴급 수정"

# 또는 Hook 임시 제거
mv .git/hooks/pre-commit .git/hooks/pre-commit.backup
~~~

# 5. 생성되는 리포트 예시

`GEMINI_REPORT.md` 파일에는 다음과 같은 내용이 저장된다.

~~~markdown
# 🤖 Gemini 시니어 코드 리뷰 리포트

> **분석 일시:** 2025-01-12 14:30:45
> **브랜치:** `feature/KPCB-123-user-auth`
> **분석 파일 수:** 3 개
> **총 변경 라인:** 42 라인
> **JIRA 티켓:** KPCB-123

## 📂 분석 대상 파일
- **F1**: `src/main/java/UserService.java` - 28 라인
- **F2**: `src/main/resources/application.yml` - 12 라인
- **F3**: `src/test/java/UserServiceTest.java` - 2 라인

---

### 🔍 1. 프로젝트 영향도 분석 (Project Impact)

사용자 인증 로직 추가로 보안 레이어가 강화되었습니다. 
기존 API 엔드포인트에 인증 필터가 추가되므로 하위 호환성 테스트가 필요합니다.

### ⚠️ 2. 예상되는 사이드 이펙트 (Side Effects)

세션 관리 방식이 변경되어 동시 접속 사용자가 많을 경우 메모리 사용량이 증가할 수 있습니다.
Redis 캐시 도입을 검토하는 것이 좋습니다.

### ✨ 3. 클린 코드 관점 리뷰 (Clean Code)

메서드명이 명확하고 단일 책임 원칙을 잘 지키고 있습니다.
다만 UserService 클래스가 200라인을 넘어가고 있어 추후 분리를 고려해보세요.

### ⚡ 4. 성능 최적화 (Performance & Optimization)

데이터베이스 쿼리에 인덱스가 잘 활용되고 있습니다.
N+1 문제는 발견되지 않았습니다.

### 📊 5. 코드 복잡도 (Complexity Score)

**점수:** 6/10 - 중간 복잡도
조건문이 3단계로 중첩되어 있어 가독성을 해칠 수 있습니다.

### 🧪 6. 추천 테스트 시나리오 (Test Guide)

1. 정상 로그인 시나리오 테스트
2. 잘못된 비밀번호 입력 시 처리 테스트
3. 세션 만료 후 재인증 테스트
4. 동시 로그인 요청 처리 테스트

---

## 💬 추천 커밋 메시지

```
KPCB-123 사용자 인증 로직 추가
```

---

✅ **모든 검토를 통과하여 커밋이 승인되었습니다.**

*Generated by Gemini AI Code Review System v2.0*
~~~

# 6. 트러블슈팅

## 6.1. timeout 명령어 오류

macOS에는 `timeout` 명령어가 기본 제공되지 않는다.

**오류 메시지:**
~~~
.git/hooks/pre-commit:182: command not found: timeout
~~~

**해결 방법:**
pre-commit 스크립트에서 `timeout` 부분이 이미 제거되어 있다. 최신 버전을 사용하면 이 문제는 발생하지 않는다.

## 6.2. Gemini CLI 없음

**오류 메시지:**
~~~
❌ Gemini CLI를 찾을 수 없습니다
~~~

**해결 방법:**
~~~bash
# npm 설치 확인
npm --version

# Gemini CLI 설치
npm install -g @google/generative-ai

# 설치 확인
which gemini
~~~

## 6.3. 권한 오류

**오류 메시지:**
~~~
Permission denied: GEMINI_REPORT.md
~~~

**해결 방법:**
~~~bash
# 파일 권한 수정
chmod 666 GEMINI_REPORT.md

# 또는 소유자 변경
sudo chown $USER GEMINI_REPORT.md
~~~

## 6.4. IntelliJ에서 Hook이 실행되지 않음

IntelliJ IDEA에서 커밋 시 Hook이 실행되지 않는 경우:

1. **PATH 환경변수 문제**: IntelliJ를 터미널에서 실행
   ~~~bash
   open -a "IntelliJ IDEA CE"
   ~~~

2. **Gemini 경로 문제**: `which gemini` 결과를 pre-commit 스크립트에 하드코딩

3. **Version Control 탭 확인**: IntelliJ 하단의 "Git" 탭에서 Hook 실행 로그 확인

# 7. 커스터마이징

## 7.1. 분석 대상 파일 확장자 변경

`pre-commit` 파일의 다음 부분을 수정한다.

~~~bash
# 현재: Java, SQL, XML 등
VALID_EXTENSIONS="java|sql|xml|html|ftl|properties|yml|yaml"

# 예시: TypeScript, JSX 추가
VALID_EXTENSIONS="java|sql|xml|html|ftl|properties|yml|yaml|ts|tsx|jsx"
~~~

## 7.2. AI 프롬프트 수정

더 상세한 분석을 원하거나 특정 분야에 집중하고 싶다면 `pre-commit`의 `AI_PROMPT` 부분을 수정한다.

~~~bash
AI_PROMPT="${CLEAN_INPUT}

[분석 요청사항]
보안 취약점에 특히 주의하여 검토하세요:
- SQL 인젝션
- XSS 공격 가능성
- 민감 정보 노출
...
"
~~~

## 7.3. 커밋 메시지 형식 변경

JIRA ID 형식을 변경하고 싶다면:

~~~bash
# 현재: KPCB-123 메시지
FINAL_MSG="$JIRA_ID $COMMIT_MSG"

# 변경: [KPCB-123] 메시지
FINAL_MSG="[$JIRA_ID] $COMMIT_MSG"

# 변경: 메시지 (KPCB-123)
FINAL_MSG="$COMMIT_MSG ($JIRA_ID)"
~~~

# 8. 팀 협업 가이드

## 8.1. 팀원 온보딩

프로젝트에 새로 합류하는 팀원은 다음 단계를 따른다.

~~~bash
# 1. 저장소 클론
git clone https://github.com/your-org/project.git
cd project

# 2. Gemini CLI 설치
npm install -g @google/generative-ai

# 3. API 키 설정
gemini config set apiKey YOUR_API_KEY

# 4. Hook 설치
cd hooks
./setup.sh

# 5. 테스트
git add .
git commit -m "테스트 커밋"
~~~

## 8.2. CI/CD 통합

GitHub Actions에서도 동일한 코드 리뷰를 수행할 수 있다.

~~~yaml
name: AI Code Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Gemini CLI
        run: |
          npm install -g @google/generative-ai
          gemini config set apiKey ${{ secrets.GEMINI_API_KEY }}
      
      - name: Run Code Review
        run: |
          # PR의 변경 파일 분석
          git diff origin/main...HEAD | gemini "코드 리뷰"
~~~

# 9. 더 나은 대안 제안 (AI 관점)

현재 구축한 Git Hook 시스템은 제약사항 안에서 최선의 선택이었지만, 만약 환경이 개선된다면 다음과 같은 대안들이 더 효과적일 수 있다.

## 9.1. 이상적인 시나리오: Bitbucket + Bamboo 완전 통합

### 구성도
```
Developer → Commit → Bitbucket → Webhook → Bamboo Build
                                              ↓
                                    AI Review Stage
                                              ↓
                                    Code Insights API
                                              ↓
                                    PR Comment
```

### 구현 방법
1. **Bamboo Build Plan에 AI Review Stage 추가**
   ```yaml
   # bamboo-specs/build.yaml
   stages:
     - name: AI Code Review
       jobs:
         - name: Gemini Analysis
           tasks:
             - script: |
                 git diff HEAD~1 HEAD | gemini-cli review
             - script: |
                 curl -X POST \
                   -H "Authorization: Bearer $BITBUCKET_TOKEN" \
                   "https://api.bitbucket.org/2.0/repositories/.../ \
                   pullrequests/$PR_ID/comments"
   ```

2. **Bitbucket Code Insights 연동**
    - AI 분석 결과를 PR에 자동 코멘트
    - 통과/실패 상태를 브랜치 보호 규칙과 연동

### 장점
- ✅ 팀 전체 자동 적용
- ✅ PR 단계에서 강제 검증
- ✅ 중앙 집중식 관리
- ✅ 분석 결과 히스토리 관리

### 필요 조건
- Bitbucket 저장소 관리자 권한
- Bamboo Build Plan 수정 권한
- 외부 API 호출 승인 (보안팀)

## 9.2. 점진적 개선안: Pre-commit Framework

현재 쉘 스크립트 방식보다 더 체계적인 관리를 위해 [Pre-commit Framework](https://pre-commit.com/)를 도입할 수 있다.

### 설치
```bash
# Pre-commit 설치
pip install pre-commit

# .pre-commit-config.yaml 생성
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: local
    hooks:
      - id: gemini-review
        name: Gemini AI Code Review
        entry: hooks/gemini-review.sh
        language: script
        pass_filenames: false
        stages: [commit]
EOF

# Hook 설치
pre-commit install
```

### 장점
- ✅ 설정 파일로 버전 관리 가능
- ✅ 여러 Hook을 체계적으로 관리
- ✅ 팀원들과 설정 공유 가능
- ✅ Skip, Update 등 편리한 CLI 제공

### 예시
```bash
# 특정 Hook만 실행
pre-commit run gemini-review

# Hook 업데이트
pre-commit autoupdate

# 임시로 건너뛰기
SKIP=gemini-review git commit -m "message"
```

## 9.3. 대규모 팀을 위한 솔루션: Merge Request Bot

GitHub의 Dependabot처럼 Bitbucket PR에 자동으로 코멘트하는 봇을 구축할 수 있다.

### 아키텍처
```
Bitbucket PR → Webhook → AWS Lambda → Gemini API
                                ↓
                        Bitbucket API (Comment)
```

### 구현 예시 (AWS Lambda)
```python
import json
import requests
from google import generativeai as genai

def lambda_handler(event, context):
    # Bitbucket Webhook 파싱
    pr_data = json.loads(event['body'])
    pr_id = pr_data['pullrequest']['id']
    repo = pr_data['repository']['full_name']
    
    # Diff 가져오기
    diff = get_pr_diff(repo, pr_id)
    
    # Gemini 분석
    genai.configure(api_key=os.environ['GEMINI_API_KEY'])
    model = genai.GenerativeModel('gemini-pro')
    review = model.generate_content(f"코드 리뷰: {diff}")
    
    # PR에 코멘트
    post_comment(repo, pr_id, review.text)
    
    return {'statusCode': 200}
```

### 장점
- ✅ 개인 환경에 의존하지 않음
- ✅ 모든 PR에 자동 적용
- ✅ 서버리스로 비용 효율적
- ✅ 확장 가능한 아키텍처

### 단점
- AWS 계정 및 설정 필요
- Webhook 등록 권한 필요
- 초기 구축 비용

## 9.4. IDE 통합 솔루션: Custom IntelliJ Plugin

IntelliJ IDEA에서 커밋 전 자동으로 AI 리뷰를 수행하는 플러그인을 개발할 수 있다.

### 기능 명세
```kotlin
// IntelliJ Plugin
class GeminiReviewAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val changes = ChangeListManager.getInstance(project)
            .defaultChangeList.changes
        
        // Gemini API 호출
        val review = GeminiClient.review(changes)
        
        // 결과를 Tool Window에 표시
        ReviewToolWindow.show(project, review)
    }
}
```

### 장점
- ✅ IDE에서 바로 확인 가능
- ✅ 시각적으로 직관적
- ✅ 팀 내부 배포 가능

### 단점
- Plugin 개발 필요 (Kotlin/Java)
- IntelliJ만 지원 (다른 IDE는 별도 개발)

## 9.5. 하이브리드 접근: Local + Server

현재 방식을 유지하면서 선택적으로 서버 분석도 활용하는 방법이다.

### 시나리오
```bash
# 로컬에서 빠른 검증
git commit -m "message"  # Git Hook으로 검증

# PR 생성 시 서버에서 정밀 분석
# Bamboo에서 추가 검증 수행
```

### 구현
```bash
# pre-commit
if [ "$CI" = "true" ]; then
    # CI 환경: 더 상세한 분석
    ANALYSIS_LEVEL="detailed"
else
    # 로컬: 빠른 분석
    ANALYSIS_LEVEL="quick"
fi
```

### 장점
- ✅ 로컬에서 빠른 피드백
- ✅ CI/CD에서 엄격한 검증
- ✅ 단계적 도입 가능

## 9.6. 추천 로드맵

현재 상황에서 점진적으로 개선하려면 다음 순서를 추천한다.

### Phase 1: 현재 (개인 환경)
```
✅ Git Hook + Gemini CLI (현재 구현)
```

### Phase 2: 팀 표준화
```
→ Pre-commit Framework 도입
→ .pre-commit-config.yaml 공유
→ 팀원들에게 온보딩
```

### Phase 3: 서버 통합 (권한 확보 시)
```
→ Bamboo에 AI Review Stage 추가
→ 선택적 서버 분석 활성화
→ Bitbucket PR 코멘트 연동
```

### Phase 4: 완전 자동화
```
→ Merge Request Bot 구축
→ 모든 PR 자동 리뷰
→ 리뷰 히스토리 대시보드
```

## 9.7. 비용 대비 효과 분석

| 솔루션 | 초기 비용 | 운영 비용 | 효과 | 권장도 |
|--------|-----------|-----------|------|--------|
| Git Hook (현재) | 0원 | 0원 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Pre-commit Framework | 0원 | 0원 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Bamboo 통합 | 0원 | 0원 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (권한 필요) |
| AWS Lambda Bot | $50 | $10/월 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| IntelliJ Plugin | $500 | 0원 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| SonarQube | $5,000 | $500/월 | ⭐⭐⭐⭐ | ⭐⭐ |

### 결론
**현재 상황**: Git Hook이 최선
**6개월 후**: Pre-commit Framework로 업그레이드
**1년 후**: Bamboo 통합 검토 (권한 확보 시)

# 10. 마치며

Bitbucket과 Bamboo 환경에서 저장소 권한 없이도 AI 기반 자동 코드 리뷰 시스템을 구축했다.

### 핵심 요약
- **문제**: 저장소 권한 부족, 복잡한 인증, 팀 프로세스 제약
- **해결**: 로컬 Git Hook + Gemini AI
- **결과**: 개인 환경에서 즉시 적용 가능한 코드 품질 관리 시스템

### 기대 효과
- ✅ 커밋 전 자동으로 코드 품질 검증
- ✅ 치명적인 버그를 사전에 차단
- ✅ 일관된 코드 리뷰 기준 적용
- ✅ 시니어 개발자의 리뷰 부담 경감

### 개선 방향
현재는 개인 환경에서 작동하지만, 향후 저장소 권한을 확보하면:
1. Pre-commit Framework로 팀 표준화
2. Bamboo Pipeline에 AI Review Stage 추가
3. Bitbucket PR 자동 코멘트 연동

을 통해 더욱 강력한 시스템으로 발전시킬 수 있다.

### 중요한 원칙
**AI 리뷰는 참고용이며, 최종 판단은 항상 개발자가 해야 한다.**

제약사항 속에서도 창의적인 해결책을 찾아가는 과정이 개발자의 가치라고 생각한다.

**관련 링크:**
- [Gemini AI](https://ai.google.dev/)
- [Git Hooks 공식 문서](https://git-scm.com/docs/githooks)
- [Pre-commit Framework](https://pre-commit.com/)
- [Bitbucket Code Insights API](https://developer.atlassian.com/server/bitbucket/rest/v810/api-group-code-insights/)

