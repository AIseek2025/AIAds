// AIAds KOL 后台 - JavaScript
// 严格遵循 UI 规范

// 检查登录状态
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || currentUser.userType !== 'kol') {
    window.location.href = 'login.html';
} else {
    document.getElementById('kol-name').textContent = currentUser.name;
    document.getElementById('available-balance').textContent = '$' + (currentUser.earnings || 2500).toLocaleString();
}

// 任务数据
const tasks = [
    { 
        id: 1, 
        title: '夏季护肤品推广', 
        advertiser: '深圳美妆有限公司', 
        budget: 800, 
        platform: 'tiktok', 
        deadline: '2026-05-20',
        description: '需要创作一条夏季护肤品使用心得视频，展示产品使用效果和前后对比',
        requirements: ['视频时长 30-60 秒', '包含产品展示和使用', '添加指定话题标签', '7 天内发布'],
        tags: ['美妆', '护肤', '夏季']
    },
    { 
        id: 2, 
        title: '时尚穿搭分享', 
        advertiser: '广州服装贸易', 
        budget: 600, 
        platform: 'tiktok', 
        deadline: '2026-05-25',
        description: '展示夏季新款服装穿搭，需要搭配不同场景和配饰',
        requirements: ['视频时长 45-90 秒', '至少 3 套穿搭', '提供购买链接', '10 天内发布'],
        tags: ['时尚', '穿搭', '服装']
    },
    { 
        id: 3, 
        title: '美食探店视频', 
        advertiser: '北京餐饮集团', 
        budget: 1000, 
        platform: 'tiktok', 
        deadline: '2026-05-18',
        description: '探店新开业的网红餐厅，品尝招牌菜品并分享真实感受',
        requirements: ['视频时长 60-120 秒', '包含环境展示', '品尝 3 道以上菜品', '5 天内发布'],
        tags: ['美食', '探店', '生活']
    },
    { 
        id: 4, 
        title: '数码产品评测', 
        advertiser: '科技前沿工作室', 
        budget: 1200, 
        platform: 'tiktok', 
        deadline: '2026-05-30',
        description: '评测最新款智能手表，展示功能和实际使用体验',
        requirements: ['视频时长 90-180 秒', '详细功能演示', '优缺点分析', '15 天内发布'],
        tags: ['数码', '科技', '评测']
    },
];

// 我的任务数据
const myTasks = [
    { id: 101, title: '夏季促销宣传', advertiser: '深圳科技有限公司', budget: 500, deadline: '2026-05-15', status: 'active' },
    { id: 102, title: '新品发布推广', advertiser: '广州贸易公司', budget: 800, deadline: '2026-05-20', status: 'pending' },
    { id: 103, title: '品牌故事视频', advertiser: '北京品牌管理', budget: 1200, deadline: '2026-05-10', status: 'completed' },
];

let selectedTask = null;

// 初始化
renderTasks();
renderMyTasks();

// Tab 切换
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.navbar-nav a').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// 渲染任务列表
function renderTasks() {
    const grid = document.getElementById('task-grid');
    grid.innerHTML = tasks.map(task => `
        <div class="task-card">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-budget">$${task.budget}</div>
            </div>
            <div class="task-info" style="display: flex; gap: var(--spacing-4); margin-bottom: var(--spacing-4);">
                <div class="task-info-item">🏢 ${task.advertiser}</div>
                <div class="task-info-item">🎵 ${task.platform}</div>
                <div class="task-info-item">📅 截止${task.deadline}</div>
            </div>
            <div class="task-desc" style="color: var(--text-secondary); line-height: 1.6; margin-bottom: var(--spacing-4);">${task.description}</div>
            <div class="task-tags" style="display: flex; gap: var(--spacing-2); flex-wrap: wrap; margin-bottom: var(--spacing-4);">
                ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div style="display: flex; gap: var(--spacing-2);">
                <button class="btn btn-secondary" style="flex: 1" onclick="viewTask(${task.id})">查看详情</button>
                <button class="btn btn-primary" style="flex: 1" onclick="applyTaskDirect(${task.id})">立即申请</button>
            </div>
        </div>
    `).join('');
}

// 渲染我的任务
function renderMyTasks() {
    const tbody = document.getElementById('my-tasks-table');
    tbody.innerHTML = myTasks.map(task => `
        <tr>
            <td>${task.title}</td>
            <td>${task.advertiser}</td>
            <td>$${task.budget}</td>
            <td>${task.deadline}</td>
            <td><span class="status-badge status-${task.status}">${getStatusText(task.status)}</span></td>
            <td>
                ${task.status === 'active' ? 
                    `<button class="btn btn-primary btn-sm" onclick="submitWork(${task.id})">提交作品</button>` : 
                    `<button class="btn btn-secondary btn-sm" onclick="viewMyTask(${task.id})">查看</button>`
                }
            </td>
        </tr>
    `).join('');
}

// 查看任务详情
function viewTask(id) {
    selectedTask = tasks.find(t => t.id === id);
    const modal = document.getElementById('task-modal');
    const body = document.getElementById('task-modal-body');
    body.innerHTML = `
        <div style="margin-bottom: var(--spacing-8);">
            <h3 style="font-size: var(--fs-2xl); margin-bottom: var(--spacing-2);">${selectedTask.title}</h3>
            <p style="color: var(--text-muted);">${selectedTask.advertiser}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-5); margin-bottom: var(--spacing-8);">
            <div style="text-align: center; padding: var(--spacing-5); background: rgba(34, 197, 94, 0.1); border-radius: var(--radius-lg);">
                <div style="font-size: var(--fs-3xl); font-weight: bold; color: var(--success);">$${selectedTask.budget}</div>
                <div style="color: var(--text-muted); font-size: var(--fs-sm);">报酬</div>
            </div>
            <div style="text-align: center; padding: var(--spacing-5); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-lg);">
                <div style="font-size: var(--fs-3xl); font-weight: bold; color: var(--info);">🎵</div>
                <div style="color: var(--text-muted); font-size: var(--fs-sm);">${selectedTask.platform}</div>
            </div>
            <div style="text-align: center; padding: var(--spacing-5); background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-lg);">
                <div style="font-size: var(--fs-3xl); font-weight: bold; color: var(--warning);">${selectedTask.deadline}</div>
                <div style="color: var(--text-muted); font-size: var(--fs-sm);">截止</div>
            </div>
        </div>
        
        <div style="margin-bottom: var(--spacing-5);">
            <h4 style="margin-bottom: var(--spacing-2);">任务描述</h4>
            <p style="color: var(--text-secondary); line-height: 1.6;">${selectedTask.description}</p>
        </div>
        
        <div style="margin-bottom: var(--spacing-5);">
            <h4 style="margin-bottom: var(--spacing-2);">要求</h4>
            <ul style="color: var(--text-secondary); line-height: 2; padding-left: var(--spacing-6);">
                ${selectedTask.requirements.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </div>
        
        <div style="margin-bottom: var(--spacing-5);">
            <h4 style="margin-bottom: var(--spacing-2);">标签</h4>
            <div style="display: flex; gap: var(--spacing-2); flex-wrap: wrap;">
                ${selectedTask.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        
        <div class="alert alert-info">
            💡 此任务与您的账号匹配度 95%，建议申请！
        </div>
    `;
    modal.classList.add('active');
}

// 申请任务
function applyTask() {
    if (selectedTask) {
        myTasks.push({
            id: selectedTask.id,
            title: selectedTask.title,
            advertiser: selectedTask.advertiser,
            budget: selectedTask.budget,
            deadline: selectedTask.deadline,
            status: 'pending'
        });
        renderMyTasks();
        closeModal('task-modal');
        document.getElementById('success-modal').classList.add('active');
    }
}

// 直接申请
function applyTaskDirect(id) {
    const task = tasks.find(t => t.id === id);
    selectedTask = task;
    applyTask();
}

// 提交作品
function submitWork(id) {
    const task = myTasks.find(t => t.id === id);
    if (task) {
        const url = prompt('请输入作品链接（TikTok 视频 URL）:', 'https://tiktok.com/@yourvideo');
        if (url) {
            showToast('success', '作品已提交！广告主将在 1-2 个工作日内审核。');
            task.status = 'review';
            renderMyTasks();
        }
    }
}

// 查看我的任务
function viewMyTask(id) {
    const task = myTasks.find(t => t.id === id);
    if (task) {
        showToast('info', `任务：${task.title}\n广告主：${task.advertiser}\n报酬：$${task.budget}\n状态：${getStatusText(task.status)}`);
    }
}

// 提现
function withdraw() {
    const amount = document.getElementById('withdraw-amount').value;
    if (amount && amount >= 100) {
        const fee = amount * 0.02;
        const received = amount * 0.98;
        showToast('success', `提现申请已提交！\n提现金额：$${amount}\n手续费：$${fee.toFixed(2)}\n实收：$${received.toFixed(2)}\n预计到账时间：明天`);
        document.getElementById('withdraw-amount').value = '';
    } else {
        showToast('error', '请输入有效金额（最低$100）');
    }
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

// Toast 提示
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
function getStatusText(status) {
    const texts = { pending: '待开始', active: '进行中', review: '审核中', completed: '已完成' };
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
