// AIAds UI 风格切换 - 复刻 UI-UX Pro Max
(function() {
  'use strict';
  
  // UI 风格列表（来自 UI-UX Pro Max）
  var UI_STYLES = [
    { id: 'default', name: '默认', icon: '🎨' },
    { id: 'glassmorphism', name: '玻璃拟态', icon: '🪟' },
    { id: 'aurora', name: '极光 UI', icon: '🌅' },
    { id: 'oled', name: '深色 OLED', icon: '🌙' },
    { id: 'clay', name: '黏土拟态', icon: '🏺' },
    { id: 'minimal', name: '极简主义', icon: '📐' },
    { id: 'brutalism', name: '粗野主义', icon: '🔨' }
  ];

  var currentUIStyle = localStorage.getItem('aiads-ui-style') || 'default';
  var btn = null;
  var panel = null;
  var isOpen = false;

  function log(msg) {
    console.log('[UI Style]', msg);
  }

  // 应用 UI 风格
  function applyUIStyle(id) {
    log('applyUIStyle: ' + id);
    if (!id) return;
    
    document.documentElement.setAttribute('data-ui-style', id);
    currentUIStyle = id;
    localStorage.setItem('aiads-ui-style', id);
    updateBtn();
    log('Applied: ' + id);
  }

  function updateBtn() {
    if (!btn) return;
    var style = UI_STYLES.find(function(s) { return s.id === currentUIStyle; });
    if (style) {
      var txt = btn.querySelector('.ui-style-text');
      if (txt) txt.textContent = style.icon + ' ' + style.name;
    }
  }

  function render() {
    if (!panel) return;
    log('render options');
    
    var html = '';
    UI_STYLES.forEach(function(s) {
      var active = s.id === currentUIStyle ? ' active' : '';
      html += '<div class="ui-style-option' + active + '" data-id="' + s.id + '">' +
        '<span class="ui-style-icon">' + s.icon + '</span>' +
        '<span class="ui-style-name">' + s.name + '</span>' +
        (s.id === currentUIStyle ? '<span class="ui-style-check">✓</span>' : '') +
        '</div>';
    });
    
    panel.innerHTML = html;
    
    // 绑定点击事件
    var options = panel.querySelectorAll('.ui-style-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        log('Option clicked: ' + id);
        if (id) {
          applyUIStyle(id);
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
    log('create UI style selector');
    
    // 容器
    var container = document.createElement('div');
    container.className = 'ui-style-selector-wrapper';
    
    // 按钮
    btn = document.createElement('button');
    btn.className = 'ui-style-select-button';
    btn.type = 'button';
    btn.innerHTML = '<span class="ui-style-text"></span><span class="ui-style-arrow">▼</span>';
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      log('Button clicked');
      toggle();
    }, false);
    
    container.appendChild(btn);
    
    // 面板
    panel = document.createElement('div');
    panel.className = 'ui-style-dropdown';
    
    container.appendChild(panel);
    document.body.appendChild(container);
    
    // 初始化
    applyUIStyle(currentUIStyle);
    
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
    
    log('Init complete, currentUIStyle=' + currentUIStyle);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', create, false);
  } else {
    create();
  }

  // 全局 API
  window.AIAdsUIStyle = {
    set: applyUIStyle,
    get: function() { return currentUIStyle; }
  };
})();
