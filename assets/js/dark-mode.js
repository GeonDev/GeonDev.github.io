// 다크 모드 토글 기능
(function() {
  'use strict';

  // 로컬 스토리지에서 다크 모드 설정 가져오기
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const body = document.body;
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    body.classList.toggle('dark-mode', theme === 'dark');
    body.classList.toggle('light-mode', theme === 'light');
    updateToggleIcon();
  }

  function getActiveTheme() {
    if (body.classList.contains('dark-mode')) {
      return 'dark';
    }

    if (body.classList.contains('light-mode')) {
      return 'light';
    }

    return prefersDarkScheme.matches ? 'dark' : 'light';
  }

  // 저장된 설정 또는 시스템 설정 확인
  const currentTheme = localStorage.getItem('theme');

  if (currentTheme === 'dark' || currentTheme === 'light') {
    applyTheme(currentTheme);
  } else {
    applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
    body.classList.remove('light-mode');
  }

  // 토글 버튼 이벤트
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
      const theme = getActiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      
      // 설정 저장
      localStorage.setItem('theme', theme);
    });
  }

  // 토글 아이콘 업데이트
  function updateToggleIcon() {
    if (darkModeToggle) {
      const icon = darkModeToggle.querySelector('span, i') || darkModeToggle;
      if (getActiveTheme() === 'dark') {
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
      applyTheme(e.matches ? 'dark' : 'light');
      body.classList.remove('light-mode');
    }
  });
})();
