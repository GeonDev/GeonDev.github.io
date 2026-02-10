// 다크 모드 토글 기능
(function() {
  'use strict';

  // 로컬 스토리지에서 다크 모드 설정 가져오기
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const body = document.body;
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // 저장된 설정 또는 시스템 설정 확인
  const currentTheme = localStorage.getItem('theme');
  
  if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
  } else if (currentTheme === 'light') {
    body.classList.remove('dark-mode');
  } else if (prefersDarkScheme.matches) {
    body.classList.add('dark-mode');
  }

  // 토글 버튼 이벤트
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
      body.classList.toggle('dark-mode');
      
      // 설정 저장
      const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      
      // 아이콘 변경
      updateToggleIcon();
    });
  }

  // 토글 아이콘 업데이트
  function updateToggleIcon() {
    if (darkModeToggle) {
      const icon = darkModeToggle.querySelector('i') || darkModeToggle;
      if (body.classList.contains('dark-mode')) {
        icon.textContent = '☀️';
        darkModeToggle.setAttribute('aria-label', '라이트 모드로 전환');
      } else {
        icon.textContent = '🌙';
        darkModeToggle.setAttribute('aria-label', '다크 모드로 전환');
      }
    }
  }

  // 초기 아이콘 설정
  updateToggleIcon();

  // 시스템 테마 변경 감지
  prefersDarkScheme.addEventListener('change', function(e) {
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        body.classList.add('dark-mode');
      } else {
        body.classList.remove('dark-mode');
      }
      updateToggleIcon();
    }
  });
})();
