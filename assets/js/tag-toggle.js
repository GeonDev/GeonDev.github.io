// 태그 목록이 2줄을 넘을 때만 접기/펼치기 버튼을 추가한다.
(function() {
  'use strict';

  function getVisibleLineLimit(items) {
    const lineTops = [];

    items.forEach(function(item) {
      if (!lineTops.includes(item.offsetTop)) {
        lineTops.push(item.offsetTop);
      }
    });

    lineTops.sort(function(a, b) {
      return a - b;
    });

    return {
      hasOverflow: lineTops.length > 2,
      maxTop: lineTops[Math.min(1, lineTops.length - 1)]
    };
  }

  function setCollapsed(tagList, items, isCollapsed) {
    items.forEach(function(item) {
      item.hidden = false;
    });

    if (!isCollapsed) {
      tagList.classList.add('is-expanded');
      return;
    }

    tagList.classList.remove('is-expanded');

    window.requestAnimationFrame(function() {
      const limit = getVisibleLineLimit(items);

      items.forEach(function(item) {
        item.hidden = item.offsetTop > limit.maxTop;
      });
    });
  }

  function setupTagToggle(tagList) {
    if (!tagList || tagList.dataset.tagToggleReady === 'true') {
      return;
    }

    tagList.dataset.tagToggleReady = 'true';
    const items = Array.from(tagList.children);

    window.requestAnimationFrame(function() {
      const limit = getVisibleLineLimit(items);

      if (!limit.hasOverflow) {
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-toggle';
      button.textContent = '더보기';
      button.setAttribute('aria-expanded', 'false');

      button.addEventListener('click', function() {
        const isExpanded = button.getAttribute('aria-expanded') !== 'true';
        setCollapsed(tagList, items, !isExpanded);
        button.textContent = isExpanded ? '접기' : '더보기';
        button.setAttribute('aria-expanded', String(isExpanded));
      });

      tagList.insertAdjacentElement('afterend', button);
      setCollapsed(tagList, items, true);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tag-collapsible').forEach(setupTagToggle);
  });
})();
