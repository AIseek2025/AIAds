# AIAds 管理后台前端开发文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 开发团队
**状态**: 已完成

---

## 1. 概述

### 1.1 文档目的

本文档描述 AIAds 管理后台前端的实现细节，包括技术架构、组件设计、状态管理、API 集成等内容。

### 1.2 功能模块

管理后台包含以下核心功能模块：

| 模块 | 路径 | 说明 |
|-----|------|------|
| 管理员登录 | `/admin/login` | 管理员登录页面（支持 MFA） |
| 数据看板 | `/admin/dashboard` | 平台统计数据和趋势图表 |
| 用户管理 | `/admin/users` | 用户列表、搜索、封禁/解封 |
| KOL 审核 | `/admin/kol-review` | KOL 认证申请审核 |
| 内容审核 | `/admin/content-review` | 用户提交内容审核 |
| 财务管理 | `/admin/finance` | 交易记录和提现审核 |

---

## 2. 技术架构

### 2.1 技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.9.x | 类型系统 |
| Material-UI (MUI) | 7.x | UI 组件库 |
| Zustand | 5.x | 状态管理 |
| React Query | 5.x | 服务端状态管理 |
| Axios | 1.x | HTTP 客户端 |
| React Router | 7.x | 路由管理 |
| Recharts | 2.x | 图表库 |

### 2.2 目录结构

```
src/frontend/src/
├── components/
│   ├── layout/
│   │   ├── AdminLayout.tsx          # 管理后台布局组件
│   │   ├── Header.tsx               # 顶部导航栏
│   │   ├── Sidebar.tsx              # 侧边栏菜单
│   │   ├── Footer.tsx               # 页脚
│   │   └── MainLayout.tsx           # 主布局（用户端）
│   ├── common/
│   │   ├── Loading.tsx              # 加载组件
│   │   ├── Dialog.tsx               # 对话框组件
│   │   ├── Button.tsx               # 按钮组件
│   │   └── ErrorBoundary.tsx        # 错误边界
│   ├── ProtectedRoute.tsx           # 用户端路由守卫
│   └── ProtectedAdminRoute.tsx      # 管理端路由守卫
│
├── pages/
│   ├── admin/
│   │   ├── Login.tsx                # 管理员登录页
│   │   ├── Dashboard.tsx            # 数据看板页
│   │   ├── Users.tsx                # 用户管理页
│   │   ├── KolReview.tsx            # KOL 审核页
│   │   ├── ContentReview.tsx        # 内容审核页
│   │   └── Finance.tsx              # 财务管理页
│   ├── auth/                        # 认证页面
│   ├── advertiser/                  # 广告主页面
│   └── kol/                         # KOL 页面
│
├── stores/
│   ├── authStore.ts                 # 用户认证状态
│   ├── adminStore.ts                # 管理员认证状态
│   ├── advertiserStore.ts           # 广告主状态
│   └── kolStore.ts                  # KOL 状态
│
├── services/
│   ├── api.ts                       # 用户端 API 客户端
│   ├── adminApi.ts                  # 管理端 API 客户端
│   ├── advertiserApi.ts             # 广告主 API 客户端
│   └── kolApi.ts                    # KOL API 客户端
│
├── types/
│   └── index.ts                     # TypeScript 类型定义
│
├── hooks/                           # 自定义 Hooks
├── utils/                           # 工具函数
├── styles/                          # 全局样式
├── assets/                          # 静态资源
│
├── App.tsx                          # 应用根组件
├── AppRouter.tsx                    # 路由配置
└── main.tsx                         # 应用入口
```

---

## 3. 核心组件实现

### 3.1 AdminLayout 布局组件

**文件**: `/src/components/layout/AdminLayout.tsx`

**功能**:
- 顶部导航栏：系统名称、管理员信息、通知中心
- 侧边栏菜单：导航菜单（数据看板/用户管理/KOL 审核/内容审核/财务管理/系统设置）
- 内容区域：页面内容渲染
- 响应式设计：移动端抽屉式侧边栏，桌面端固定侧边栏

**关键代码**:
```tsx
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout, hasPermission } = useAdminAuthStore();
  const { sidebarCollapsed } = useAdminAppStore();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // ... handlers

  return (
    <MainContainer>
      <CssBaseline />
      <StyledAppBar position="fixed" elevation={0}>
        {/* Header content */}
      </StyledAppBar>
      <ContentWrapper>
        {/* Sidebar - Mobile */}
        <StyledDrawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}>
          {drawerContent}
        </StyledDrawer>
        {/* Sidebar - Desktop */}
        <Box sx={{ width: SIDEBAR_WIDTH, display: { xs: 'none', md: 'block' } }}>
          {drawerContent}
        </Box>
        {/* Main Content */}
        <MainContent>{children}</MainContent>
      </ContentWrapper>
    </MainContainer>
  );
};
```

### 3.2 ProtectedAdminRoute 路由守卫

**文件**: `/src/components/ProtectedAdminRoute.tsx`

**功能**:
- 检查管理员认证状态
- 未认证时重定向到管理登录页
- 支持权限检查（可选）

**实现**:
```tsx
export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useAdminAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <Loading open />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
```

---

## 4. 状态管理

### 4.1 adminStore

**文件**: `/src/stores/adminStore.ts`

**状态结构**:
```typescript
interface AdminAuthState {
  admin: Admin | null;
  role: AdminRole | null;
  permissions: AdminPermission[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (admin, accessToken, refreshToken, role?, permissions?) => void;
  logout: () => void;
  updateAdmin: (admin: Partial<Admin>) => void;
  setPermissions: (permissions: AdminPermission[]) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => boolean;

  // Permission checks
  hasPermission: (permission: AdminPermission) => boolean;
  hasAnyPermission: (permissions: AdminPermission[]) => boolean;
  hasAllPermissions: (permissions: AdminPermission[]) => boolean;
}
```

**持久化配置**:
```typescript
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        role: state.role,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 4.2 权限检查

**超级管理员特权**:
```typescript
hasPermission: (permission) => {
  // Super admin has all permissions
  if (get().role === 'super_admin') {
    return true;
  }
  return get().permissions.includes(permission);
},
```

---

## 5. API 集成

### 5.1 adminApi 服务

**文件**: `/src/services/adminApi.ts`

**API 模块**:
- `adminAuthAPI` - 认证相关（登录、刷新 Token、登出）
- `adminUserAPI` - 用户管理（列表、详情、封禁、解封）
- `adminKolAPI` - KOL 审核（待审核列表、详情、通过、拒绝）
- `adminContentAPI` - 内容审核（待审核列表、详情、通过、拒绝）
- `adminFinanceAPI` - 财务管理（交易列表、提现审核、导出报表）
- `adminDashboardAPI` - 数据看板（统计数据、分析数据、排行榜）
- `adminSettingsAPI` - 系统设置（配置、角色、审计日志）

**请求拦截器**:
```typescript
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

**响应拦截器（Token 刷新）**:
```typescript
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        const response = await axios.post(`${ADMIN_API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem('adminAccessToken', access_token);
        localStorage.setItem('adminRefreshToken', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return adminApi(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 5.2 React Query 集成

**示例 - 用户列表**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['adminUsers', queryParams],
  queryFn: () => adminUserAPI.getUsers(queryParams),
});
```

**示例 - 突变操作**:
```typescript
const banUserMutation = useMutation({
  mutationFn: (data: { id: string; reason: string; duration_days?: number | null }) =>
    adminUserAPI.banUser(data.id, { reason: data.reason, duration_days: data.duration_days }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    setSnackbar({ open: true, message: '用户已封禁', severity: 'success' });
  },
  onError: (err: any) => {
    setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
  },
});
```

---

## 6. 页面实现

### 6.1 管理员登录页 (Login.tsx)

**功能**:
- 邮箱/密码输入
- MFA 验证码输入（可选，当启用 MFA 时）
- 记住我
- 错误处理和提示

**状态管理**:
```typescript
const [formData, setFormData] = useState<AdminLoginData>({
  email: '',
  password: '',
  mfa_code: '',
  remember_me: false,
});

const [showPassword, setShowPassword] = useState(false);
const [showMfaInput, setShowMfaInput] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [mfaRequired, setMfaRequired] = useState(false);
```

### 6.2 数据看板页 (Dashboard.tsx)

**功能**:
- 统计卡片：用户数、广告主数、KOL 数、活动数、今日收入
- 趋势图表：用户增长趋势、收入趋势
- 平台分布饼图
- KOL 排行榜
- 订单统计和财务概览

**数据获取**:
```typescript
const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
  queryKey: ['adminDashboardStats'],
  queryFn: () => adminDashboardAPI.getStats({ period: 'today' }),
});

const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
  queryKey: ['adminDashboardAnalytics'],
  queryFn: () => adminDashboardAPI.getAnalytics({ metric: 'user_growth', period: 'month', group_by: 'day' }),
});
```

### 6.3 用户管理页 (Users.tsx)

**功能**:
- 用户列表表格
- 搜索和筛选（角色/状态/关键词）
- 用户详情弹窗
- 封禁/解封操作
- 分页

**筛选状态**:
```typescript
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);
const [keyword, setKeyword] = useState('');
const [roleFilter, setRoleFilter] = useState<string>('');
const [statusFilter, setStatusFilter] = useState<string>('');
```

### 6.4 KOL 审核页 (KolReview.tsx)

**功能**:
- 待审核 KOL 列表
- KOL 详情查看（基本信息、数据统计、粉丝增长趋势）
- 审核操作（通过/拒绝）
- 审核备注

**详情对话框**:
```typescript
const [detailOpen, setDetailOpen] = useState(false);
const [detailTab, setDetailTab] = useState(0); // 0: 基本信息，1: 数据统计，2: 审核历史

const { data: kolDetail } = useQuery({
  queryKey: ['adminKolDetail', selectedKol?.id],
  queryFn: () => adminKolAPI.getKol(selectedKol!.id),
  enabled: detailOpen && !!selectedKol?.id,
});
```

### 6.5 内容审核页 (ContentReview.tsx)

**功能**:
- 待审核内容列表
- 内容预览（图片/视频）
- AI 审核结果显示
- 审核操作（通过/拒绝/要求修改）

**筛选功能**:
```typescript
const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
const [priorityFilter, setPriorityFilter] = useState<string>('');
```

### 6.6 财务管理页 (Finance.tsx)

**功能**:
- 交易记录列表（支持筛选和导出）
- 待审核提现列表
- 提现详情查看
- 提现审核（通过/拒绝）

**Tab 切换**:
```typescript
const [activeTab, setActiveTab] = useState(0); // 0: 交易记录，1: 提现审核
```

---

## 7. 类型定义

### 7.1 管理员类型

```typescript
export interface Admin {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: AdminRole;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'finance' | 'analyst';
```

### 7.2 权限类型

```typescript
export type AdminPermission =
  | 'user:view'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:ban'
  | 'user:unban'
  | 'kol:view'
  | 'kol:review'
  | 'kol:approve'
  | 'kol:reject'
  | 'content:view'
  | 'content:review'
  | 'content:approve'
  | 'content:reject'
  | 'finance:view'
  | 'finance:export'
  | 'withdrawal:review'
  | 'withdrawal:approve'
  | 'withdrawal:reject'
  | 'dashboard:view'
  | 'analytics:view'
  | 'settings:view'
  | 'settings:edit'
  | 'role:manage'
  | 'admin:manage'
  | 'audit:view';
```

---

## 8. 响应式设计

### 8.1 断点配置

使用 MUI 默认断点：
- `xs`: 0-599px（手机）
- `sm`: 600px-899px（平板）
- `md`: 900px-1199px（小屏桌面）
- `lg`: 1200px-1535px（中屏桌面）
- `xl`: 1536px+（大屏桌面）

### 8.2 布局适配

**侧边栏**:
```tsx
// 移动端：临时抽屉
<StyledDrawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} />

// 桌面端：固定显示
<Box sx={{ width: SIDEBAR_WIDTH, display: { xs: 'none', md: 'block' } }}>
```

**统计卡片**:
```tsx
<Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
  <StatCard />
</Grid>
```

---

## 9. 加载状态和错误处理

### 9.1 加载状态

所有数据获取都显示加载状态：
```tsx
{isLoading ? (
  Array.from({ length: 10 }).map((_, index) => (
    <TableRow key={index}>
      <TableCell><CircularProgress size={20} /></TableCell>
      {/* ... */}
    </TableRow>
  ))
) : (
  // Render data
)}
```

### 9.2 错误处理

使用 Alert 组件显示错误：
```tsx
{error && (
  <Alert severity="error">加载失败：{(error as Error).message}</Alert>
)}
```

### 9.3 操作反馈

使用 Snackbar 显示操作结果：
```tsx
const [snackbar, setSnackbar] = useState<{
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}>({
  open: false,
  message: '',
  severity: 'success',
});
```

---

## 10. 路由配置

### 10.1 路由结构

```tsx
<Routes>
  {/* Public Routes */}
  <Route path="/admin/login" element={<AdminLoginPage />} />

  {/* Admin Routes */}
  <Route
    path="/admin"
    element={
      <ProtectedAdminRoute>
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      </ProtectedAdminRoute>
    }
  >
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="kol-review" element={<KolReviewPage />} />
    <Route path="content-review" element={<ContentReviewPage />} />
    <Route path="finance" element={<FinancePage />} />
  </Route>
</Routes>
```

### 10.2 导航路径

| 页面 | 路径 | 权限要求 |
|-----|------|---------|
| 登录 | `/admin/login` | 无 |
| 数据看板 | `/admin/dashboard` | `dashboard:view` |
| 用户管理 | `/admin/users` | `user:view` |
| KOL 审核 | `/admin/kol-review` | `kol:review` |
| 内容审核 | `/admin/content-review` | `content:review` |
| 财务管理 | `/admin/finance` | `finance:view` |

---

## 11. 环境变量

### 11.1 配置

在 `.env` 文件中配置：

```env
# Admin API URL
VITE_ADMIN_API_URL=http://localhost:8080/api/v1/admin

# Production
# VITE_ADMIN_API_URL=https://api.aiads.com/api/v1/admin
```

---

## 12. 开发指南

### 12.1 添加新页面

1. 在 `/src/pages/admin/` 创建页面组件
2. 在 `/src/services/adminApi.ts` 添加 API 方法
3. 在 `/src/types/index.ts` 添加类型定义
4. 在 `AppRouter.tsx` 添加路由

### 12.2 添加新权限

1. 在 `types/index.ts` 的 `AdminPermission` 类型中添加
2. 在后端数据库中配置权限
3. 在页面中使用 `ProtectedAdminRoute` 或 `hasPermission` 检查

### 12.3 代码规范

- 使用 TypeScript 严格模式
- 组件使用函数式写法
- 使用 MUI 组件库
- 遵循 ESLint 规则
- 添加适当的注释

---

## 13. 测试

### 13.1 单元测试

使用 Vitest 运行测试：

```bash
npm run test
```

### 13.2 端到端测试

（待实现）

---

## 14. 部署

### 14.1 构建

```bash
npm run build
```

### 14.2 部署到 Vercel

```bash
vercel deploy
```

### 14.3 Nginx 配置

参考 `nginx.conf` 配置。

---

## 15. 验收标准

- [x] 所有页面实现（登录/看板/用户/KOL/内容/财务）
- [x] 路由配置正确
- [x] 权限控制生效
- [x] 响应式设计
- [x] TypeScript 编译通过
- [x] 加载状态和错误处理
- [x] 使用 MUI 组件库
- [x] 使用 Zustand 状态管理
- [x] 使用 React Query 数据获取

---

## 16. 后续优化

1. 添加系统设置页面
2. 添加审计日志页面
3. 添加管理员管理页面
4. 实现数据导出功能
5. 添加批量操作
6. 优化移动端体验
7. 添加国际化支持
8. 添加暗色主题

---

**文档结束**
