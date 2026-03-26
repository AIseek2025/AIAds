# KOL 仪表盘开发文档

## 概述

本文档介绍了 AIAds 平台 KOL（关键意见领袖）仪表盘的前端实现细节。KOL 仪表盘是 KOL 用户管理任务、账号和收益的核心界面。

## 技术栈

- **React 19** - UI 框架
- **MUI (Material-UI) v7** - UI 组件库
- **Zustand** - 状态管理
- **React Query v5** - 数据获取和缓存
- **React Router v7** - 路由管理
- **TypeScript** - 类型安全
- **Axios** - HTTP 客户端

## 目录结构

```
src/frontend/src/
├── pages/kol/
│   ├── Dashboard.tsx       # KOL 主仪表盘
│   ├── Accounts.tsx        # 账号绑定页面
│   ├── TaskMarket.tsx      # 任务广场页面
│   ├── MyTasks.tsx         # 我的任务页面
│   └── Earnings.tsx        # 收益管理页面
├── stores/
│   └── kolStore.ts         # KOL 状态管理
├── services/
│   └── kolApi.ts           # KOL API 服务
└── types/
    └── index.ts            # 类型定义
```

## 页面功能

### 1. KOL 仪表盘 (Dashboard.tsx)

**路由**: `/kol/dashboard`

**功能**:
- 收益统计卡片（本月收益、累计收益、待结算收益）
- 任务统计卡片（进行中任务、已完成任务、任务通过率）
- 快速入口（任务广场、账号绑定、收益管理）
- 最近任务列表

**API 调用**:
- `kolProfileAPI.getProfile()` - 获取 KOL 资料
- `kolProfileAPI.getStats()` - 获取统计数据
- `myTasksAPI.getTasks()` - 获取最近任务

### 2. 账号绑定 (Accounts.tsx)

**路由**: `/kol/accounts`

**功能**:
- 显示已绑定账号列表（TikTok/YouTube/Instagram）
- 绑定新账号
- 同步账号数据
- 解绑账号

**API 调用**:
- `kolAccountAPI.getAccounts()` - 获取账号列表
- `kolAccountAPI.bindAccount()` - 绑定新账号
- `kolAccountAPI.unbindAccount()` - 解绑账号
- `kolAccountAPI.syncAccount()` - 同步单个账号
- `kolAccountAPI.syncAllAccounts()` - 同步所有账号

### 3. 任务广场 (TaskMarket.tsx)

**路由**: `/kol/task-market`

**功能**:
- 任务列表展示
- 多维度筛选（平台、预算范围、类别、关键词）
- 任务详情弹窗
- 申请任务功能

**API 调用**:
- `taskMarketAPI.getAvailableTasks()` - 获取可用任务列表
- `taskMarketAPI.getTask()` - 获取任务详情
- `taskMarketAPI.applyTask()` - 申请任务

### 4. 我的任务 (MyTasks.tsx)

**路由**: `/kol/my-tasks`

**功能**:
- 任务列表（按状态分组）
- 状态标签（待接受/进行中/待审核/已完成/已拒绝）
- 接受/拒绝任务
- 提交作品
- 修改作品

**API 调用**:
- `myTasksAPI.getTasks()` - 获取我的任务列表
- `myTasksAPI.getTask()` - 获取任务详情
- `myTasksAPI.acceptTask()` - 接受任务
- `myTasksAPI.rejectTask()` - 拒绝任务
- `myTasksAPI.submitWork()` - 提交作品
- `myTasksAPI.updateWork()` - 修改作品

### 5. 收益管理 (Earnings.tsx)

**路由**: `/kol/earnings`

**功能**:
- 收益统计（可用余额、待结算金额、累计收益）
- 收益明细列表
- 申请提现功能
- 提现记录

**API 调用**:
- `earningsAPI.getBalance()` - 获取余额信息
- `earningsAPI.getEarnings()` - 获取收益明细
- `earningsAPI.requestWithdrawal()` - 申请提现
- `earningsAPI.getWithdrawals()` - 获取提现记录

## 状态管理 (kolStore.ts)

### 数据类型

```typescript
interface KolAccount {
  id: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'other';
  platformId: string;
  platformUsername: string;
  platformDisplayName: string;
  platformAvatarUrl?: string;
  followers: number;
  following: number;
  totalVideos: number;
  totalLikes: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  status: 'active' | 'pending' | 'disconnected';
  lastSyncAt?: string;
  createdAt: string;
}

interface KolTask {
  id: string;
  campaignId: string;
  campaignTitle: string;
  campaignDescription?: string;
  platform: string;
  budget: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'pending_review' | 'completed' | 'rejected';
  deadline?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  contentUrl?: string;
  contentDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface KolEarnings {
  id: string;
  taskId: string;
  amount: number;
  type: 'task_reward' | 'bonus' | 'refund';
  status: 'pending' | 'settled' | 'withdrawn';
  settledAt?: string;
  createdAt: string;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectionReason?: string;
  paymentMethod: string;
  paymentAccount: string;
  createdAt: string;
  processedAt?: string;
}

interface KolStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  totalTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  successRate: number;
  totalViews: number;
  totalLikes: number;
}
```

### Store Actions

- `setKol(kol)` - 设置 KOL 资料
- `setStats(stats)` - 设置统计数据
- `setAccounts(accounts)` - 设置账号列表
- `setTasks(tasks)` - 设置任务列表
- `setEarnings(earnings)` - 设置收益列表
- `setWithdrawals(withdrawals)` - 设置提现记录
- `addAccount(account)` - 添加账号
- `removeAccount(accountId)` - 移除账号
- `updateAccount(accountId, data)` - 更新账号
- `addTask(task)` - 添加任务
- `updateTask(taskId, data)` - 更新任务

## API 服务 (kolApi.ts)

### KOL Profile API

```typescript
kolProfileAPI.getProfile()      // 获取 KOL 资料
kolProfileAPI.createProfile()   // 创建 KOL 资料
kolProfileAPI.updateProfile()   // 更新 KOL 资料
kolProfileAPI.getStats()        // 获取统计数据
```

### KOL Account API

```typescript
kolAccountAPI.getAccounts()         // 获取账号列表
kolAccountAPI.getAccount(id)        // 获取账号详情
kolAccountAPI.bindAccount(data)     // 绑定账号
kolAccountAPI.unbindAccount(id)     // 解绑账号
kolAccountAPI.syncAccount(id)       // 同步账号
kolAccountAPI.syncAllAccounts()     // 同步所有账号
```

### Task Market API

```typescript
taskMarketAPI.getAvailableTasks(params)  // 获取可用任务
taskMarketAPI.getTask(id)                // 获取任务详情
taskMarketAPI.applyTask(id, message)     // 申请任务
```

### My Tasks API

```typescript
myTasksAPI.getTasks(params)       // 获取我的任务
myTasksAPI.getTask(id)            // 获取任务详情
myTasksAPI.acceptTask(id)         // 接受任务
myTasksAPI.rejectTask(id, reason) // 拒绝任务
myTasksAPI.submitWork(id, data)   // 提交作品
myTasksAPI.updateWork(id, data)   // 修改作品
```

### Earnings API

```typescript
earningsAPI.getBalance()              // 获取余额
earningsAPI.getEarnings(params)       // 获取收益明细
earningsAPI.requestWithdrawal(data)   // 申请提现
earningsAPI.getWithdrawals(params)    // 获取提现记录
```

## 路由配置 (AppRouter.tsx)

```typescript
{
  path: "/kol",
  element: (
    <ProtectedRoute allowedRoles={['kol']}>
      <MainLayout role="kol">
        <KolDashboardPage />
      </MainLayout>
    </ProtectedRoute>
  ),
  children: [
    { path: "dashboard", element: <KolDashboard /> },
    { path: "accounts", element: <AccountsPage /> },
    { path: "task-market", element: <TaskMarketPage /> },
    { path: "my-tasks", element: <MyTasksPage /> },
    { path: "my-tasks/:id", element: <MyTasksPage /> },
    { path: "earnings", element: <EarningsPage /> },
  ]
}
```

## 侧边栏菜单 (Sidebar.tsx)

KOL 用户可见的菜单项：

| 菜单项 | 图标 | 路由 |
|--------|------|------|
| 仪表板 | Dashboard | /dashboard |
| 任务广场 | People | /task-market |
| 我的任务 | Task | /my-tasks |
| 账号绑定 | AccountBalance | /accounts |
| 收益管理 | AttachMoney | /earnings |
| 数据分析 | TrendingUp | /analytics |
| 消息中心 | Message | /messages |
| 设置 | Settings | /settings |

## 响应式设计

所有页面都采用了 MUI 的 Grid 系统，支持以下断点：

- **xs (0-599px)**: 单列布局
- **sm (600-899px)**: 双列布局
- **md (900-1199px)**: 三列/四列布局
- **lg (1200px+)**: 四列布局

## 加载状态和错误处理

每个页面都实现了：

1. **加载状态**: 使用 `LinearProgress` 组件显示加载进度
2. **错误处理**: 使用 `Alert` 组件显示错误信息
3. **空状态**: 显示友好的空状态提示和操作引导

## 开发指南

### 添加新功能

1. 在 `kolStore.ts` 中添加相关类型和状态
2. 在 `kolApi.ts` 中添加 API 调用函数
3. 创建或修改页面组件
4. 在 `AppRouter.tsx` 中添加路由
5. 在 `Sidebar.tsx` 中添加菜单项（如需要）

### 代码风格

- 使用 TypeScript 严格模式
- 使用 MUI 的 `styled` 组件创建自定义样式
- 使用 React Query 的 `useQuery` 和 `useMutation` 进行数据管理
- 使用 Zustand 进行全局状态管理
- 遵循 ESLint 规则

## API 端点

后端 API 基础路径：`/api/v1`

| 端点 | 方法 | 描述 |
|------|------|------|
| /kols/me | GET | 获取当前 KOL 资料 |
| /kols/me/stats | GET | 获取 KOL 统计数据 |
| /kol-accounts | GET | 获取账号列表 |
| /kol-accounts/bind | POST | 绑定账号 |
| /kol-accounts/:id/unbind | DELETE | 解绑账号 |
| /kol-accounts/:id/sync | POST | 同步账号 |
| /kol-accounts/sync-all | POST | 同步所有账号 |
| /tasks/market | GET | 获取可用任务 |
| /tasks/market/:id | GET | 获取任务详情 |
| /tasks/market/:id/apply | POST | 申请任务 |
| /tasks/my | GET | 获取我的任务 |
| /tasks/my/:id/accept | POST | 接受任务 |
| /tasks/my/:id/reject | POST | 拒绝任务 |
| /tasks/my/:id/submit | POST | 提交作品 |
| /earnings | GET | 获取收益明细 |
| /earnings/balance | GET | 获取余额 |
| /earnings/withdraw | POST | 申请提现 |
| /earnings/withdrawals | GET | 获取提现记录 |

## 测试

运行测试：

```bash
cd src/frontend
npm run test
```

## 构建

构建生产版本：

```bash
cd src/frontend
npm run build
```

## 更新日志

### v1.0.0 (2026-03-24)

- 初始版本
- 实现 KOL 仪表盘主页
- 实现账号绑定功能
- 实现任务广场功能
- 实现我的任务功能
- 实现收益管理功能
