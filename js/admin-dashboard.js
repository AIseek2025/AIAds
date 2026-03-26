// AIAds 管理后台仪表盘功能
(function() {
  'use strict';
  
  // 模拟数据
  var mockData = {
    users: [
      { id: 1, username: 'admin', email: 'admin@aiads.com', role: 'admin', status: 'active', registeredAt: '2026-01-01' },
      { id: 2, username: '深圳科技有限公司', email: 'contact@sztech.com', role: 'advertiser', status: 'active', registeredAt: '2026-02-15' },
      { id: 3, username: '@fashion_guru', email: 'fashion@example.com', role: 'kol', status: 'active', registeredAt: '2026-02-20' },
      { id: 4, username: '广州贸易公司', email: 'info@gztrade.com', role: 'advertiser', status: 'active', registeredAt: '2026-03-01' },
      { id: 5, username: '@tech_reviewer', email: 'tech@example.com', role: 'kol', status: 'active', registeredAt: '2026-03-05' }
    ],
    stats: {
      totalUsers: 10520,
      totalAdvertisers: 2150,
      totalKols: 8200,
      totalCampaigns: 1580,
      totalGMV: 5280000,
      totalRevenue: 792000
    }
  };

  // Tab 切换
  window.switchAdminTab = function(tabName) {
    console.log('[Admin Dashboard] Switching to tab:', tabName);
    
    // 隐藏所有 Tab 内容
    var contents = document.querySelectorAll('.admin-tab-content');
    contents.forEach(function(content) {
      content.classList.remove('active');
    });
    
    // 显示目标 Tab
    var targetTab = document.getElementById('admin-tab-' + tabName);
    if (targetTab) {
      targetTab.classList.add('active');
    }
    
    // 更新侧边栏激活状态
    var sidebarLinks = document.querySelectorAll('.admin-sidebar a');
    sidebarLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabName)) {
        link.classList.add('active');
      }
    });
    
    // 更新顶部导航激活状态
    var navLinks = document.querySelectorAll('.admin-navbar .navbar-nav a');
    navLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabName)) {
        link.classList.add('active');
      }
    });
  };

  // 加载统计数据
  window.loadAdminStats = function() {
    console.log('[Admin Dashboard] Loading stats...');
    
    // 更新统计卡片
    updateStat('stat-total-users', mockData.stats.totalUsers);
    updateStat('stat-total-advertisers', mockData.stats.totalAdvertisers);
    updateStat('stat-total-kols', mockData.stats.totalKols);
    updateStat('stat-total-campaigns', mockData.stats.totalCampaigns);
    updateStat('stat-total-gmv', mockData.stats.totalGMV, true);
    updateStat('stat-total-revenue', mockData.stats.totalRevenue, true);
    
    // 加载用户列表
    loadUsersTable();
  };

  // 更新统计数字
  function updateStat(elementId, value, isCurrency) {
    var element = document.getElementById(elementId);
    if (!element) return;
    
    var formattedValue = isCurrency ? '$' + value.toLocaleString() : value.toLocaleString();
    
    // 数字滚动动画
    animateValue(element, 0, value, 1000, isCurrency);
  }

  // 数字滚动动画
  function animateValue(element, start, end, duration, isCurrency) {
    var startTimestamp = null;
    
    function step(timestamp) {
      if (!startTimestamp) startTimestamp = timestamp;
      var progress = Math.min((timestamp - startTimestamp) / duration, 1);
      var value = Math.floor(progress * (end - start) + start);
      
      element.textContent = isCurrency ? '$' + value.toLocaleString() : value.toLocaleString();
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }
    
    window.requestAnimationFrame(step);
  }

  // 加载用户列表
  function loadUsersTable() {
    var tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    var html = '';
    mockData.users.forEach(function(user) {
      var roleBadge = getRoleBadge(user.role);
      var statusBadge = getStatusBadge(user.status);
      
      html += '<tr>' +
        '<td>' + user.id + '</td>' +
        '<td>' + escapeHtml(user.username) + '</td>' +
        '<td>' + escapeHtml(user.email) + '</td>' +
        '<td>' + roleBadge + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + user.registeredAt + '</td>' +
        '<td>' +
          '<button class="btn btn-sm" onclick="viewUser(' + user.id + ')">查看</button> ' +
          '<button class="btn btn-sm" onclick="editUser(' + user.id + ')">编辑</button>' +
        '</td>' +
      '</tr>';
    });
    
    tbody.innerHTML = html;
  }

  // 获取角色徽章
  function getRoleBadge(role) {
    var badges = {
      admin: '<span class="badge badge-orange">管理员</span>',
      advertiser: '<span class="badge badge-blue">广告主</span>',
      kol: '<span class="badge badge-purple">KOL</span>'
    };
    return badges[role] || '<span class="badge">未知</span>';
  }

  // 获取状态徽章
  function getStatusBadge(status) {
    var badges = {
      active: '<span class="badge badge-green">活跃</span>',
      inactive: '<span class="badge badge-orange">未激活</span>',
      banned: '<span class="badge badge-red">已封禁</span>'
    };
    return badges[status] || '<span class="badge">未知</span>';
  }

  // HTML 转义
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 查看用户（全局函数）
  window.viewUser = function(id) {
    var user = mockData.users.find(function(u) { return u.id === id; });
    if (user) {
      alert('查看用户：' + user.username + '\n角色：' + user.role + '\n状态：' + user.status);
    }
  };

  // 编辑用户（全局函数）
  window.editUser = function(id) {
    var user = mockData.users.find(function(u) { return u.id === id; });
    if (user) {
      alert('编辑用户：' + user.username);
    }
  };

  // 全局暴露
  window.adminDashboard = {
    switchTab: switchAdminTab,
    loadStats: loadAdminStats
  };
})();
