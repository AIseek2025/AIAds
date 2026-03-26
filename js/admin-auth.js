// AIAds 管理后台认证系统
(function() {
  'use strict';
  
  // 管理员账号配置（实际项目中应该从后端获取）
  var ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123',
    role: 'super_admin'
  };
  
  var SESSION_KEY = 'aiads_admin_session';
  var currentUser = null;

  // 检查登录状态
  function checkAuth() {
    var session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        currentUser = JSON.parse(session);
        return true;
      } catch (e) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    return false;
  }

  // 登录
  function login(username, password, remember) {
    if (username === ADMIN_CREDENTIALS.username && 
        password === ADMIN_CREDENTIALS.password) {
      
      currentUser = {
        username: username,
        role: ADMIN_CREDENTIALS.role,
        loginTime: new Date().toISOString()
      };
      
      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      }
      
      console.log('[Admin Auth] Login successful:', currentUser);
      return { success: true };
    }
    
    console.log('[Admin Auth] Login failed');
    return { 
      success: false, 
      error: '用户名或密码错误' 
    };
  }

  // 登出
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    console.log('[Admin Auth] Logout successful');
  }

  // 获取当前用户
  function getCurrentUser() {
    return currentUser;
  }

  // 初始化
  function init() {
    var loginPage = document.getElementById('admin-login-page');
    var dashboard = document.getElementById('admin-dashboard');
    var loginForm = document.getElementById('admin-login-form');
    var loginError = document.getElementById('login-error');
    
    if (!loginPage || !dashboard) {
      console.error('[Admin Auth] Required elements not found');
      return;
    }
    
    // 检查登录状态
    if (checkAuth()) {
      showDashboard();
    } else {
      showLoginPage();
    }
    
    // 登录表单提交
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var username = document.getElementById('admin-username').value.trim();
        var password = document.getElementById('admin-password').value;
        var remember = document.getElementById('admin-remember').checked;
        
        console.log('[Admin Auth] Login attempt:', { username, remember });
        
        var result = login(username, password, remember);
        
        if (result.success) {
          loginError.style.display = 'none';
          showDashboard();
        } else {
          loginError.textContent = result.error;
          loginError.style.display = 'block';
          
          // 震动动画
          loginForm.style.animation = 'shake 0.5s';
          setTimeout(function() {
            loginForm.style.animation = '';
          }, 500);
        }
      });
    }
    
    // 添加震动动画 CSS
    var style = document.createElement('style');
    style.textContent = '@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }';
    document.head.appendChild(style);
  }

  // 显示登录页面
  function showLoginPage() {
    var loginPage = document.getElementById('admin-login-page');
    var dashboard = document.getElementById('admin-dashboard');
    
    if (loginPage) loginPage.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    
    document.title = 'AIAds - 管理员登录';
  }

  // 显示仪表盘
  function showDashboard() {
    var loginPage = document.getElementById('admin-login-page');
    var dashboard = document.getElementById('admin-dashboard');
    var usernameDisplay = document.getElementById('admin-username-display');
    
    if (loginPage) loginPage.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    
    if (usernameDisplay && currentUser) {
      usernameDisplay.textContent = currentUser.username;
    }
    
    document.title = 'AIAds - 管理后台';
    
    // 加载统计数据
    if (window.loadAdminStats) {
      window.loadAdminStats();
    }
  }

  // 全局暴露
  window.adminAuth = {
    check: checkAuth,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    init: init
  };
  
  window.adminLogout = function() {
    if (confirm('确定要退出登录吗？')) {
      logout();
      location.reload();
    }
  };

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
