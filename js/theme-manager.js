// AIAds 主题切换 - 100% 复刻 AI-news（含所有颜色和背景跟随）
(function() {
  'use strict';
  
  // AI-news 官方背景颜色列表 + 额外深色主题 + 白色主题
  var THEMES = [
    // AI-news 官方渐变主题（7 个）
    { id: 'default', name: '默认', color: '', type: 'default' },
    { id: 'aurora_red', name: '极光红', color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', type: 'gradient' },
    { id: 'aurora_purple', name: '极光紫', color: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', type: 'gradient' },
    { id: 'mist_blue', name: '雾蓝', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'gradient' },
    { id: 'sunset', name: '落日', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'gradient' },
    { id: 'neon_grid', name: '霓虹网格', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', type: 'gradient' },
    { id: 'starfield', name: '星河', color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', type: 'gradient' },
    { id: 'mint', name: '薄荷', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', type: 'gradient' },
    
    // 白色主题（6 个不同色值效果）
    { id: 'snow_white', name: '雪白', color: '#fafafa', type: 'light' },
    { id: 'cloud_white', name: '云朵', color: '#f5f5f5', type: 'light' },
    { id: 'pearl_white', name: '珍珠', color: '#f0f0f0', type: 'light' },
    { id: 'silver_white', name: '银白', color: '#e5e5e5', type: 'light' },
    { id: 'mist_white', name: '薄雾', color: '#d4d4d4', type: 'light' },
    { id: 'cream_white', name: '奶油', color: '#fef9ed', type: 'light' },
    
    // 深色主题（9 个）
    { id: 'obsidian', name: '黑曜石', color: '#09090b', type: 'dark' },
    { id: 'midnight', name: '午夜蓝', color: '#0f172a', type: 'dark' },
    { id: 'forest', name: '森林绿', color: '#0f1f17', type: 'dark' },
    { id: 'rose', name: '玫瑰红', color: '#2d1421', type: 'dark' },
    { id: 'royal', name: '皇家蓝', color: '#172554', type: 'dark' },
    { id: 'emerald', name: '翡翠绿', color: '#064e3b', type: 'dark' },
    { id: 'violet', name: '紫罗兰', color: '#4c1d95', type: 'dark' },
    { id: 'crimson', name: '深红色', color: '#4c0519', type: 'dark' },
    { id: 'teal', name: '青绿色', color: '#134e4a', type: 'dark' }
  ];

  var currentTheme = localStorage.getItem('aiads-theme') || 'default';
  var btn = null;
  var panel = null;
  var isOpen = false;

  function log(msg) {
    console.log('[Theme]', msg);
  }

  // 应用主题到整个页面
  function applyTheme(id) {
    log('applyTheme: ' + id);
    if (!id) return;

    var theme = THEMES.find(function(t) { return t.id === id; });
    if (!theme) return;

    // 设置 data-theme 属性
    document.documentElement.setAttribute('data-theme', id);
    document.documentElement.setAttribute('data-theme-type', theme.type);

    // 根据主题类型设置背景
    if (theme.type === 'gradient' && theme.color) {
      // 渐变主题：应用渐变到 body
      document.body.style.background = theme.color;
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundSize = 'cover';
    } else if (theme.type === 'light' && theme.color) {
      // 白色主题：应用纯色到 body
      document.body.style.background = theme.color;
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundSize = 'cover';
    } else if (theme.type === 'dark' && theme.color) {
      // 深色主题：应用纯色到 body
      document.body.style.background = theme.color;
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundSize = 'cover';
    } else {
      // 默认主题：清除自定义背景
      document.body.style.background = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundSize = '';
    }

    currentTheme = id;
    localStorage.setItem('aiads-theme', id);
    updateBtn();
    log('Applied: ' + id);
  }

  function updateBtn() {
    if (!btn) return;
    var theme = THEMES.find(function(t) { return t.id === currentTheme; });
    if (theme) {
      var txt = btn.querySelector('.theme-select-text');
      if (txt) txt.textContent = theme.name;
      
      if (theme.type === 'gradient' || (theme.type === 'dark' && theme.color)) {
        btn.style.background = theme.color;
        btn.style.color = '#fff';
        btn.style.border = 'none';
      } else {
        btn.style.background = 'var(--bg-surface)';
        btn.style.color = 'var(--text)';
        btn.style.border = '1px solid var(--line)';
      }
    }
  }

  function render() {
    if (!panel) return;
    log('render options');
    
    // 分组渲染
    var defaultThemes = THEMES.filter(function(t) { return t.type === 'default'; });
    var gradientThemes = THEMES.filter(function(t) { return t.type === 'gradient'; });
    var lightThemes = THEMES.filter(function(t) { return t.type === 'light'; });
    var darkThemes = THEMES.filter(function(t) { return t.type === 'dark'; });
    
    var html = '';
    
    // 默认主题
    html += '<div class="theme-group"><div class="theme-group-title">默认</div>';
    defaultThemes.forEach(function(t) {
      var active = t.id === currentTheme ? ' active' : '';
      html += '<div class="bg-card' + active + '" data-id="' + t.id + '">' +
        '<div class="tag">默认</div>' +
        '<div class="name">默认</div>' +
        '</div>';
    });
    html += '</div>';
    
    // 渐变主题组（AI-news 官方）
    html += '<div class="theme-group"><div class="theme-group-title">渐变主题</div>';
    gradientThemes.forEach(function(t) {
      var active = t.id === currentTheme ? ' active' : '';
      html += '<div class="bg-card' + active + '" data-id="' + t.id + '" style="background:' + t.color + ';">' +
        '<div class="name">' + t.name + '</div>' +
        '</div>';
    });
    html += '</div>';
    
    // 白色主题组
    html += '<div class="theme-group"><div class="theme-group-title">白色主题</div>';
    lightThemes.forEach(function(t) {
      var active = t.id === currentTheme ? ' active' : '';
      html += '<div class="bg-card' + active + '" data-id="' + t.id + '" style="background:' + t.color + ';">' +
        '<div class="name">' + t.name + '</div>' +
        '</div>';
    });
    html += '</div>';
    
    // 深色主题组
    html += '<div class="theme-group"><div class="theme-group-title">深色主题</div>';
    darkThemes.forEach(function(t) {
      var active = t.id === currentTheme ? ' active' : '';
      html += '<div class="bg-card' + active + '" data-id="' + t.id + '" style="background:' + t.color + ';">' +
        '<div class="name">' + t.name + '</div>' +
        '</div>';
    });
    html += '</div>';
    
    panel.innerHTML = html;
    
    // 绑定点击事件
    var options = panel.querySelectorAll('.bg-card');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        log('Option clicked: ' + id);
        if (id) {
          applyTheme(id);
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
    log('create theme selector');
    
    // 容器
    var container = document.createElement('div');
    container.className = 'theme-selector-wrapper';
    
    // 按钮
    btn = document.createElement('button');
    btn.className = 'theme-select-button';
    btn.type = 'button';
    btn.innerHTML = '<span class="theme-select-text"></span><span class="theme-select-arrow">▼</span>';
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      log('Button clicked');
      toggle();
    }, false);
    
    container.appendChild(btn);
    
    // 面板
    panel = document.createElement('div');
    panel.className = 'theme-dropdown';
    
    container.appendChild(panel);
    document.body.appendChild(container);
    
    // 初始化
    applyTheme(currentTheme);
    
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
    
    log('Init complete, currentTheme=' + currentTheme);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', create, false);
  } else {
    create();
  }

  // 全局 API
  window.AIAdsTheme = {
    set: applyTheme,
    get: function() { return currentTheme; }
  };
})();
