// AIAds 广告主后台 - JavaScript
// 严格遵循 UI 规范

// 检查登录状态
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || currentUser.userType !== 'advertiser') {
    window.location.href = 'login.html';
} else {
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-balance').textContent = '$' + currentUser.balance.toLocaleString();
}

// KOL 数据
const kols = [
    { id: 1, name: '@fashion_guru', platform: 'tiktok', followers: 25000, engagement: 4.5, avgViews: 15000, price: 500, tags: ['时尚', '美妆', '生活方式'] },
    { id: 2, name: '@tech_reviewer', platform: 'youtube', followers: 48000, engagement: 3.8, avgViews: 35000, price: 800, tags: ['科技', '数码', '评测'] },
    { id: 3, name: '@lifestyle_blog', platform: 'instagram', followers: 32000, engagement: 5.2, avgViews: 20000, price: 600, tags: ['生活方式', '旅行', '美食'] },
    { id: 4, name: '@fitness_coach', platform: 'tiktok', followers: 18000, engagement: 6.1, avgViews: 12000, price: 450, tags: ['健身', '健康', '运动'] },
    { id: 5, name: '@beauty_tips', platform: 'youtube', followers: 42000, engagement: 4.2, avgViews: 28000, price: 750, tags: ['美妆', '护肤', '教程'] },
    { id: 6, name: '@travel_diary', platform: 'instagram', followers: 28000, engagement: 4.8, avgViews: 18000, price: 550, tags: ['旅行', '摄影', '冒险'] },
];

// 活动数据
let campaigns = [
    { id: 1, name: '夏季促销活动', platform: 'tiktok', budget: 5000, kols: 25, views: 850000, status: 'active', created: '2026-05-08' },
    { id: 2, name: '新品发布推广', platform: 'youtube', budget: 8000, kols: 40, views: 1200000, status: 'active', created: '2026-05-07' },
    { id: 3, name: '品牌知名度提升', platform: 'instagram', budget: 12000, kols: 60, views: 2500000, status: 'completed', created: '2026-05-06' },
];

let selectedKol = null;

// 初始化
renderKols(kols);
renderCampaigns();

// Tab 切换 - 使用规范的 .tab-pane
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.navbar-nav a').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// 渲染 KOL 列表
function renderKols(kolList) {
    const grid = document.getElementById('kol-grid');
    grid.innerHTML = kolList.map(kol => `
        <div class="kol-card">
            <div class="kol-header">
                <div class="kol-avatar">${kol.name[1]}</div>
                <div>
                    <div class="kol-name">${kol.name}</div>
                    <div class="kol-platform">${getPlatformIcon(kol.platform)} ${kol.platform.charAt(0).toUpperCase() + kol.platform.slice(1)}</div>
                </div>
            </div>
            <div class="kol-stats">
                <div class="kol-stat">
                    <div class="kol-stat-value">${formatNumber(kol.followers)}</div>
                    <div class="kol-stat-label">粉丝</div>
                </div>
                <div class="kol-stat">
                    <div class="kol-stat-value">${kol.engagement}%</div>
                    <div class="kol-stat-label">互动率</div>
                </div>
                <div class="kol-stat">
                    <div class="kol-stat-value">${formatNumber(kol.avgViews)}</div>
                    <div class="kol-stat-label">均播</div>
                </div>
            </div>
            <div class="kol-tags">
                ${kol.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <button class="btn btn-primary" style="width: 100%" onclick="viewKol(${kol.id})">查看详情</button>
        </div>
    `).join('');
}

// 渲染活动列表
function renderCampaigns() {
    const tbody = document.getElementById('my-campaigns-table');
    tbody.innerHTML = campaigns.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${getPlatformIcon(c.platform)} ${c.platform}</td>
            <td>$${c.budget.toLocaleString()}</td>
            <td>${c.kols}</td>
            <td><span class="status-badge status-${c.status}">${getStatusText(c.status)}</span></td>
            <td>${c.created}</td>
            <td><button class="btn btn-primary btn-sm" onclick="viewCampaign(${c.id})">查看</button></td>
        </tr>
    `).join('');
}

// 查看 KOL
function viewKol(id) {
    selectedKol = kols.find(k => k.id === id);
    const modal = document.getElementById('kol-modal');
    const body = document.getElementById('kol-modal-body');
    body.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--spacing-5); margin-bottom: var(--spacing-8);">
            <div class="kol-avatar" style="width: 80px; height: 80px; font-size: 32px;">${selectedKol.name[1]}</div>
            <div>
                <h3 style="margin: 0; font-size: var(--fs-2xl);">${selectedKol.name}</h3>
                <p style="color: var(--text-muted); margin: var(--spacing-1) 0;">${getPlatformIcon(selectedKol.platform)} ${selectedKol.platform}</p>
            </div>
        </div>
        <div class="kol-stats" style="grid-template-columns: repeat(4, 1fr); gap: var(--spacing-5); margin-bottom: var(--spacing-8);">
            <div class="kol-stat">
                <div class="kol-stat-value">${formatNumber(selectedKol.followers)}</div>
                <div class="kol-stat-label">粉丝数</div>
            </div>
            <div class="kol-stat">
                <div class="kol-stat-value">${selectedKol.engagement}%</div>
                <div class="kol-stat-label">互动率</div>
            </div>
            <div class="kol-stat">
                <div class="kol-stat-value">${formatNumber(selectedKol.avgViews)}</div>
                <div class="kol-stat-label">平均播放</div>
            </div>
            <div class="kol-stat">
                <div class="kol-stat-value">$${selectedKol.price}</div>
                <div class="kol-stat-label">单次合作</div>
            </div>
        </div>
        <div style="margin-bottom: var(--spacing-5);">
            <h4 style="margin-bottom: var(--spacing-2);">标签</h4>
            <div class="kol-tags">${selectedKol.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        </div>
        <div class="alert alert-info">
            💡 此 KOL 适合${selectedKol.tags.join('、')}类产品的推广，互动率${selectedKol.engagement}%高于平台平均水平。
        </div>
    `;
    modal.classList.add('active');
}

// 选择 KOL
function selectKol() {
    if (selectedKol) {
        showToast('success', `已选择 ${selectedKol.name}！`);
        closeModal('kol-modal');
    }
}

// 创建活动
function createCampaign(e) {
    e.preventDefault();
    const name = document.getElementById('campaign-name').value;
    const platform = document.getElementById('campaign-platform').value;
    const budget = parseFloat(document.getElementById('campaign-budget').value);
    
    const newCampaign = {
        id: campaigns.length + 1,
        name,
        platform,
        budget,
        kols: 0,
        views: 0,
        status: 'draft',
        created: new Date().toISOString().split('T')[0]
    };
    
    campaigns.unshift(newCampaign);
    renderCampaigns();
    
    // 更新统计
    document.getElementById('total-campaigns').textContent = campaigns.length;
    
    showToast('success', '活动创建成功！');
    e.target.reset();
}

// 查看活动
function viewCampaign(id) {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
        showToast('info', `${campaign.name}\n预算：$${campaign.budget.toLocaleString()}\n状态：${getStatusText(campaign.status)}`);
    }
}

// 筛选 KOL
function filterKols() {
    showToast('info', '筛选功能演示');
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Toast 提示 - 使用规范的 .op-result-toast
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `op-result-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 工具函数
function getPlatformIcon(platform) {
    const icons = { tiktok: '🎵', youtube: '📺', instagram: '📷' };
    return icons[platform] || '📱';
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
}

function getStatusText(status) {
    const texts = { draft: '草稿', active: '进行中', completed: '已完成' };
    return texts[status] || status;
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}
