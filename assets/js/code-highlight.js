// 코드 하이라이팅 개선 스크립트
(function() {
  'use strict';

  // 코드 블록에 복사 버튼과 언어 라벨 추가
  function enhanceCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre.highlight');
    
    codeBlocks.forEach((block, index) => {
      // 이미 처리된 블록은 건너뛰기
      if (block.classList.contains('enhanced')) {
        return;
      }
      
      // 코드 블록을 감싸는 wrapper 생성
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);
      
      // 헤더 생성 (언어 라벨 + 복사 버튼)
      const header = document.createElement('div');
      header.className = 'code-block-header';
      
      // 언어 감지
      const language = detectLanguage(block);
      
      // 언어 라벨
      const langLabel = document.createElement('span');
      langLabel.className = 'code-language';
      langLabel.textContent = language;
      langLabel.setAttribute('aria-label', `코드 언어: ${language}`);
      
      // 복사 버튼
      const copyButton = document.createElement('button');
      copyButton.className = 'code-copy-button';
      copyButton.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">복사</span>';
      copyButton.setAttribute('aria-label', '코드 복사');
      copyButton.setAttribute('data-index', index);
      
      // 복사 기능
      copyButton.addEventListener('click', function() {
        const code = block.querySelector('code');
        const text = code ? code.textContent : block.textContent;
        
        copyToClipboard(text).then(() => {
          // 복사 성공 피드백
          copyButton.innerHTML = '<span class="copy-icon">✓</span><span class="copy-text">복사됨!</span>';
          copyButton.classList.add('copied');
          
          setTimeout(() => {
            copyButton.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">복사</span>';
            copyButton.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('복사 실패:', err);
          copyButton.innerHTML = '<span class="copy-icon">✗</span><span class="copy-text">실패</span>';
          
          setTimeout(() => {
            copyButton.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">복사</span>';
          }, 2000);
        });
      });
      
      header.appendChild(langLabel);
      header.appendChild(copyButton);
      wrapper.insertBefore(header, block);
      
      // 처리 완료 표시
      block.classList.add('enhanced');
    });
  }
  
  // 언어 감지 함수
  function detectLanguage(block) {
    // Rouge가 생성하는 클래스에서 언어 추출
    const classList = block.classList;
    
    // highlight-언어 형식 찾기
    for (let className of classList) {
      if (className.startsWith('language-')) {
        return className.replace('language-', '').toUpperCase();
      }
    }
    
    // code 태그의 클래스 확인
    const code = block.querySelector('code');
    if (code) {
      for (let className of code.classList) {
        if (className.startsWith('language-')) {
          return className.replace('language-', '').toUpperCase();
        }
      }
    }
    
    // 내용 기반 추측
    const content = block.textContent;
    if (content.includes('function') || content.includes('const') || content.includes('let')) {
      return 'JavaScript';
    } else if (content.includes('def ') || content.includes('import ')) {
      return 'Python';
    } else if (content.includes('public class') || content.includes('private ')) {
      return 'Java';
    } else if (content.includes('<?php')) {
      return 'PHP';
    } else if (content.includes('SELECT') || content.includes('FROM')) {
      return 'SQL';
    } else if (content.includes('<html') || content.includes('<div')) {
      return 'HTML';
    } else if (content.includes('{') && content.includes(':')) {
      return 'CSS';
    }
    
    return 'CODE';
  }
  
  // 클립보드에 복사
  function copyToClipboard(text) {
    // 최신 Clipboard API 사용
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    
    // 폴백: execCommand 사용
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand failed'));
        }
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }
  
  // 페이지 로드 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceCodeBlocks);
  } else {
    enhanceCodeBlocks();
  }
  
  // 동적 콘텐츠 대응 (필요시)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      let shouldEnhance = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          shouldEnhance = true;
        }
      });
      if (shouldEnhance) {
        enhanceCodeBlocks();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
