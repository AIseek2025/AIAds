// AIAds UX 模式切换 - 来自 UI-UX Pro Max
(function() {
  'use strict';
  
  // UX 模式列表（来自 UI-UX Pro Max 最佳实践）
  var UX_MODES = [
    { id: 'default', name: '默认', icon: '⚙️' },
    { id: 'smooth-scroll', name: '平滑滚动', icon: '📜' },
    { id: 'sticky-nav', name: '粘性导航', icon: '📌' },
    { id: 'reduced-motion', name: '减少动画', icon: '🚫' },
    { id: 'large-touch', name: '大触摸目标', icon: '👆' },
    { id: 'high-contrast', name: '高对比度', icon: '◐' },
    { id: 'focus', name: '专注模式', icon: '🎯' },
    { id: 'reading', name: '阅读模式', icon: '📖' },
    { id: 'compact', name: '紧凑模式', icon: '📦' }
  ];

  var currentUXMode = localStorage.getItem('aiads-ux-mode') || 'default';
  var btn = null;
  var panel = null;
  var isOpen = false;

  function log(msg) {
    console.log('[UX Mode]', msg);
  }

  // 应用 UX 模式
  function applyUXMode(id) {
    log('applyUXMode: ' + id);
    if (!id) return;
    
    document.documentElement.setAttribute('data-ux-mode', id);
    currentUXMode = id;
    localStorage.setItem('aiads-ux-mode', id);
    updateBtn();
    log('Applied: ' + id);
  }

  function updateBtn() {
    if (!btn) return;
    var mode = UX_MODES.find(function(m) { return m.id === currentUXMode; });
    if (mode) {
      var txt = btn.querySelector('.ux-mode-text');
      if (txt) txt.textContent = mode.icon + ' ' + mode.name;
    }
  }

  function render() {
    if (!panel) return;
    log('render options');
    
    var html = '';
    UX_MODES.forEach(function(m) {
      var active = m.id === currentUXMode ? ' active' : '';
      html += '<div class="ux-mode-option' + active + '" data-id="' + m.id + '">' +
        '<span class="ux-mode-icon">' + m.icon + '</span>' +
        '<span class="ux-mode-name">' + m.name + '</span>' +
        (m.id === currentUXMode ? '<span class="ux-mode-check">✓</span>' : '') +
        '</div>';
    });
    
    panel.innerHTML = html;
    
    // 绑定点击事件
    var options = panel.querySelectorAll('.ux-mode-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        log('Option clicked: ' + id);
        if (id) {
          applyUXMode(id);
          closePanel();
        }
      });
    }
  }

  function openPanel() {
    log('openPanel');
    if (!panel || !btn) return;
    isOpen = true;
    panel.classList.add('open');
    btn.classList.add('active');
    render();
  }

  function closePanel() {
    log('closePanel');
    if (!panel || !btn) return;
    isOpen = false;
    panel.classList.remove('open');
    btn.classList.remove('active');
  }

  function toggle() {
    log('toggle, isOpen=' + isOpen);
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function create() {
    log('create UX mode selector');
    
    // 容器
    var container = document.createElement('div');
    container.className = 'ux-mode-selector-wrapper';
    
    // 按钮
    btn = document.createElement('button');
    btn.className = 'ux-mode-select-button';
    btn.type = 'button';
    btn.innerHTML = '<span class="ux-mode-text"></span><span class="ux-mode-arrow">▼</span>';
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      log('Button clicked');
      toggle();
    }, false);
    
    container.appendChild(btn);
    
    // 面板
    panel = document.createElement('div');
    panel.className = 'ux-mode-dropdown';
    
    container.appendChild(panel);
    document.body.appendChild(container);
    
    // 初始化
    applyUXMode(currentUXMode);
    
    // 点击外部关闭
    document.addEventListener('click', function(e) {
      if (isOpen && container && !container.contains(e.target)) {
        log('Click outside, closing');
        closePanel();
      }
    }, false);
    
    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen) {
        log('ESC pressed, closing');
        closePanel();
      }
    }, false);
    
    log('Init complete, currentUXMode=' + currentUXMode);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', create, false);
  } else {
    create();
  }

  // 全局 API
  window.AIAdsUXMode = {
    set: applyUXMode,
    get: function() { return currentUXMode; }
  };
})();
