# AIAds 组件使用指南

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日

---

## 1. 通用组件 (Common Components)

通用组件位于 `src/components/common/` 目录，提供基础的 UI 组件。

### 1.1 Button 按钮

**文件**: `src/components/common/Button.tsx`

#### 使用示例

```tsx
import { Button } from '@/components/common';

// 主要按钮
<Button variant="contained" color="primary" onClick={handleClick}>
  提交
</Button>

// 描边按钮
<Button variant="outlined" color="primary">
  取消
</Button>

// 文字按钮
<Button variant="text" color="primary">
  查看详情
</Button>

// 加载状态
<Button loading onClick={handleSubmit}>
  提交
</Button>

// 禁用状态
<Button disabled>不可点击</Button>

// 全宽按钮
<Button fullWidth>全宽按钮</Button>

// 带图标的按钮
<Button startIcon={<SaveIcon />}>保存</Button>
<Button endIcon={<ArrowRightIcon />}>下一步</Button>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `variant` | `'contained' \| 'outlined' \| 'text'` | `'contained'` | 按钮样式 |
| `color` | `'primary' \| 'secondary' \| 'error' \| 'success'` | `'primary'` | 按钮颜色 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮大小 |
| `loading` | `boolean` | `false` | 加载状态 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `fullWidth` | `boolean` | `false` | 全宽显示 |
| `startIcon` | `ReactNode` | - | 前置图标 |
| `endIcon` | `ReactNode` | - | 后置图标 |
| `onClick` | `function` | - | 点击事件 |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | 按钮类型 |

---

### 1.2 Input 输入框

**文件**: `src/components/common/Input.tsx`

#### 使用示例

```tsx
import { Input } from '@/components/common';

// 基础输入框
<Input
  label="邮箱"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// 带错误提示
<Input
  label="邮箱"
  value={email}
  onChange={handleEmailChange}
  error={!!errors.email}
  helperText={errors.email}
/>

// 密码输入框（带显示/隐藏切换）
<Input
  label="密码"
  type={showPassword ? 'text' : 'password'}
  value={password}
  onChange={handlePasswordChange}
  endAdornment={
    <IconButton onClick={() => setShowPassword(!showPassword)}>
      {showPassword ? <VisibilityOff /> : <Visibility />}
    </IconButton>
  }
/>

// 多行文本
<Input
  label="描述"
  value={description}
  onChange={handleDescriptionChange}
  multiline
  rows={4}
/>

// 带前缀/后缀
<Input
  label="价格"
  value={price}
  onChange={handlePriceChange}
  startAdornment={<span>¥</span>}
  endAdornment={<span>元</span>}
/>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `label` | `string` | - | 标签文本 |
| `value` | `string` | - | 输入值 |
| `onChange` | `function` | - | 变化事件 |
| `error` | `boolean` | `false` | 错误状态 |
| `helperText` | `string` | - | 辅助文本/错误提示 |
| `placeholder` | `string` | - | 占位符 |
| `type` | `'text' \| 'email' \| 'password' \| 'tel' \| 'number'` | `'text'` | 输入类型 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `required` | `boolean` | `false` | 必填标记 |
| `multiline` | `boolean` | `false` | 多行输入 |
| `rows` | `number` | - | 行数 |
| `startAdornment` | `ReactNode` | - | 前置装饰 |
| `endAdornment` | `ReactNode` | - | 后置装饰 |

---

### 1.3 Dialog 对话框

**文件**: `src/components/common/Dialog.tsx`

#### 使用示例

```tsx
import { Dialog, Button } from '@/components/common';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>打开对话框</Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="确认操作"
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setOpen(false)} variant="outlined">
              取消
            </Button>
            <Button onClick={handleConfirm} variant="contained">
              确认
            </Button>
          </>
        }
      >
        <p>您确定要执行此操作吗？</p>
      </Dialog>
    </>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `open` | `boolean` | - | 是否打开 |
| `onClose` | `function` | - | 关闭回调 |
| `title` | `string` | - | 对话框标题 |
| `children` | `ReactNode` | - | 对话框内容 |
| `actions` | `ReactNode` | - | 操作按钮区域 |
| `maxWidth` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'sm'` | 最大宽度 |

---

### 1.4 Snackbar 消息提示

**文件**: `src/components/common/Snackbar.tsx`

#### 使用示例

```tsx
import { Snackbar } from '@/components/common';

function MyComponent() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as const,
  });

  const showSuccess = () => {
    setSnackbar({
      open: true,
      message: '操作成功！',
      severity: 'success',
    });
  };

  const showError = () => {
    setSnackbar({
      open: true,
      message: '操作失败，请重试',
      severity: 'error',
    });
  };

  return (
    <Snackbar
      open={snackbar.open}
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      message={snackbar.message}
      severity={snackbar.severity}
      duration={6000}
    />
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `open` | `boolean` | - | 是否显示 |
| `onClose` | `function` | - | 关闭回调 |
| `message` | `string` | - | 消息内容 |
| `severity` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | 消息类型 |
| `duration` | `number` | `6000` | 自动关闭时间 (ms) |

---

### 1.5 Loading 加载组件

**文件**: `src/components/common/Loading.tsx`

#### 使用示例

```tsx
import { Loading } from '@/components/common';

function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.submit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleSubmit}>提交</Button>
      <Loading open={loading} message="处理中..." />
    </>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `open` | `boolean` | - | 是否显示 |
| `message` | `string` | - | 加载提示文字 |

---

### 1.6 ErrorBoundary 错误边界

**文件**: `src/components/common/ErrorBoundary.tsx`

#### 使用示例

```tsx
import { ErrorBoundary } from '@/components/common';

function App() {
  return (
    <ErrorBoundary
      fallback={
        <div>
          <h1>出错了</h1>
          <p>请稍后重试</p>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
        // 上报错误到监控系统
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `children` | `ReactNode` | - | 子组件 |
| `fallback` | `ReactNode` | - | 错误时显示的 UI |
| `onError` | `function` | - | 错误回调 |

---

## 2. 布局组件 (Layout Components)

布局组件位于 `src/components/layout/` 目录。

### 2.1 Header 顶部导航

**文件**: `src/components/layout/Header.tsx`

#### 使用示例

```tsx
import { Header } from '@/components/layout';

function App() {
  return <Header onMenuClick={handleMenuClick} />;
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `onMenuClick` | `function` | - | 菜单按钮点击事件（移动端） |

---

### 2.2 Sidebar 侧边栏

**文件**: `src/components/layout/Sidebar.tsx`

#### 使用示例

```tsx
import { Sidebar, PersistentSidebar } from '@/components/layout';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 移动端临时侧边栏 */}
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        role="advertiser"
      />

      {/* 桌面端固定侧边栏 */}
      <PersistentSidebar role="advertiser" />
    </>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `open` | `boolean` | - | 是否打开（移动端） |
| `onClose` | `function` | - | 关闭回调（移动端） |
| `role` | `'advertiser' \| 'kol' \| 'admin'` | - | 用户角色（决定菜单项） |

---

### 2.3 Footer 页脚

**文件**: `src/components/layout/Footer.tsx`

#### 使用示例

```tsx
import { Footer } from '@/components/layout';

function App() {
  return <Footer />;
}
```

---

### 2.4 MainLayout 主布局

**文件**: `src/components/layout/MainLayout.tsx`

#### 使用示例

```tsx
import { MainLayout, AuthLayout } from '@/components/layout';

function App() {
  return (
    <MainLayout role="advertiser">
      <DashboardPage />
    </MainLayout>
  );
}

// 认证页面布局（无侧边栏）
function AuthPage() {
  return (
    <AuthLayout>
      <LoginPage />
    </AuthLayout>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `children` | `ReactNode` | - | 子组件 |
| `role` | `'advertiser' \| 'kol' \| 'admin'` | - | 用户角色 |

---

## 3. 业务组件 (Business Components)

业务组件位于 `src/components/business/` 目录，根据具体业务需求开发。

---

## 4. 状态管理 (State Management)

### 4.1 认证状态 (authStore)

**文件**: `src/stores/authStore.ts`

#### 使用示例

```tsx
import { useAuthStore } from '@/stores/authStore';

function UserProfile() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <p>欢迎，{user?.nickname}!</p>
      <button onClick={logout}>退出登录</button>
    </div>
  );
}
```

#### API

| 属性/方法 | 类型 | 说明 |
|----------|------|------|
| `user` | `User \| null` | 当前用户信息 |
| `isAuthenticated` | `boolean` | 是否已认证 |
| `isLoading` | `boolean` | 是否正在加载 |
| `login` | `(user, accessToken, refreshToken) => void` | 登录 |
| `logout` | `() => void` | 登出 |
| `updateUser` | `(userData) => void` | 更新用户信息 |
| `setLoading` | `(loading) => void` | 设置加载状态 |
| `checkAuth` | `() => boolean` | 检查认证状态 |

---

## 5. API 服务 (API Services)

### 5.1 认证 API (authAPI)

**文件**: `src/services/api.ts`

#### 使用示例

```tsx
import { authAPI } from '@/services/api';

async function handleLogin(credentials) {
  try {
    const response = await authAPI.login(credentials);
    console.log('登录成功:', response.user);
    return response;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 发送验证码
await authAPI.sendVerificationCode('email', 'user@example.com', 'register');

// 验证验证码
await authAPI.verifyCode('email', 'user@example.com', '123456');

// 重置密码
await authAPI.resetPassword({
  email: 'user@example.com',
  verificationCode: '123456',
  newPassword: 'newPassword123',
});
```

#### API 方法

| 方法 | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `login` | `LoginData` | `Promise<AuthResponse>` | 用户登录 |
| `register` | `RegisterData` | `Promise<AuthResponse>` | 用户注册 |
| `logout` | - | `Promise<void>` | 用户登出 |
| `getCurrentUser` | - | `Promise<User>` | 获取当前用户 |
| `sendVerificationCode` | `type, target, purpose` | `Promise<void>` | 发送验证码 |
| `verifyCode` | `type, target, code` | `Promise<void>` | 验证验证码 |
| `resetPassword` | `ForgotPasswordData` | `Promise<void>` | 重置密码 |
| `refreshToken` | `refreshToken` | `Promise<Object>` | 刷新 Token |

---

## 6. 类型定义 (TypeScript Types)

类型定义位于 `src/types/index.ts`。

### 6.1 核心类型

```typescript
// 用户
interface User {
  id: string;
  email: string;
  role: 'advertiser' | 'kol' | 'admin';
  // ...
}

// 登录数据
interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 注册数据
interface RegisterData {
  email: string;
  password: string;
  role: 'advertiser' | 'kol';
  verificationCode: string;
  agreeTerms: boolean;
}

// API 响应
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}
```

---

## 7. 最佳实践

### 7.1 组件开发

1. **使用 TypeScript**: 所有组件必须有类型定义
2. **函数式组件**: 使用 React Hooks
3. **解构 Props**: 提高代码可读性
4. **默认值**: 为可选 Props 提供默认值

### 7.2 状态管理

1. **局部状态优先**: 能使用 useState 解决的不用全局状态
2. **Zustand**: 全局状态使用 Zustand
3. **避免过度共享**: 只共享必要的状态

### 7.3 API 调用

1. **统一错误处理**: 使用 Axios 拦截器
2. **类型安全**: 所有 API 调用必须有类型定义
3. **加载状态**: 异步操作要有 loading 状态

### 7.4 样式开发

1. **MUI 组件优先**: 优先使用 MUI 组件
2. **styled 组件**: 自定义样式使用 styled API
3. **主题化**: 使用主题系统保持风格一致

---

## 8. 更新日志

### v1.0.0 (2026-03-24)
- 初始版本
- 实现基础通用组件
- 实现布局组件
- 实现认证页面
- 实现状态管理和 API 服务
