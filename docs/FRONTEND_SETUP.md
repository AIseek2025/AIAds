# AIAds 前端开发环境搭建指南

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**最后更新**: 2026 年 3 月 24 日

---

## 1. 环境要求

### 1.1 必需软件

| 软件 | 版本要求 | 下载地址 |
|-----|---------|---------|
| Node.js | 18.x 或 20.x LTS | https://nodejs.org/ |
| npm | 9.x 或更高 | 随 Node.js 一起安装 |
| Git | 最新稳定版 | https://git-scm.com/ |

### 1.2 推荐工具

- **代码编辑器**: VS Code (https://code.visualstudio.com/)
- **推荐插件**:
  - ESLint
  - Prettier
  - TypeScript
  - Material UI Icons
  - React Developer Tools

---

## 2. 项目初始化

### 2.1 克隆项目

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds/src/frontend
```

### 2.2 安装依赖

```bash
# 安装所有依赖
npm install
```

### 2.3 环境变量配置

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置正确的 API 地址：

```env
# 开发环境
VITE_API_URL=http://localhost:8080/api/v1

# 生产环境
# VITE_API_URL=https://api.aiads.com/api/v1
```

---

## 3. 开发命令

### 3.1 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

### 3.2 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录

### 3.3 预览生产构建

```bash
npm run preview
```

### 3.4 代码检查

```bash
# ESLint 检查
npm run lint

# 修复 ESLint 问题
npm run lint:fix
```

### 3.5 类型检查

```bash
npx tsc --noEmit
```

---

## 4. 项目结构

```
src/frontend/
├── src/
│   ├── components/        # 可复用组件
│   │   ├── common/        # 通用组件 (Button, Input, Dialog 等)
│   │   ├── layout/        # 布局组件 (Header, Sidebar, Footer 等)
│   │   ├── business/      # 业务组件
│   │   └── ProtectedRoute.tsx  # 路由保护组件
│   │
│   ├── pages/             # 页面组件
│   │   ├── auth/          # 认证页面 (登录，注册，忘记密码)
│   │   ├── advertiser/    # 广告主页面
│   │   ├── kol/           # KOL 页面
│   │   └── admin/         # 管理页面
│   │
│   ├── hooks/             # 自定义 Hooks
│   ├── stores/            # 状态管理 (Zustand)
│   ├── services/          # API 调用服务
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   ├── styles/            # 全局样式
│   ├── assets/            # 静态资源
│   ├── App.tsx            # 应用根组件
│   ├── AppRouter.tsx      # 路由配置
│   ├── main.tsx           # 应用入口
│   └── index.css          # 全局样式
│
├── public/                # 公共资源
├── .env                   # 环境变量
├── .env.example           # 环境变量示例
├── package.json           # 项目依赖配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 配置
└── README.md
```

---

## 5. 技术栈说明

### 5.1 核心库

| 库 | 版本 | 用途 |
|---|------|-----|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| React Router | 6.x | 路由管理 |

### 5.2 UI 组件

| 库 | 版本 | 用途 |
|---|------|-----|
| Material-UI | 5.x | UI 组件库 |
| MUI Icons | 5.x | 图标库 |
| Emotion | 11.x | CSS-in-JS |

### 5.3 状态管理

| 库 | 版本 | 用途 |
|---|------|-----|
| Zustand | 4.x | 全局状态管理 |

### 5.4 网络请求

| 库 | 版本 | 用途 |
|---|------|-----|
| Axios | 1.x | HTTP 客户端 |

### 5.5 构建工具

| 工具 | 版本 | 用途 |
|-----|------|-----|
| Vite | 5.x | 构建工具 |

---

## 6. 开发规范

### 6.1 代码风格

- 使用 TypeScript 编写所有组件
- 使用函数式组件 + Hooks
- 遵循 Airbnb React/TypeScript 风格指南
- 使用 Prettier 格式化代码

### 6.2 组件命名

- 组件文件使用 PascalCase 命名：`MyComponent.tsx`
- 组件导出使用具名导出：`export const MyComponent`
- 默认导出用于页面组件和入口文件

### 6.3 目录约定

- `components/` - 可复用的 UI 组件
- `pages/` - 页面级组件
- `hooks/` - 自定义 Hooks
- `stores/` - Zustand 状态管理
- `services/` - API 服务层
- `types/` - TypeScript 类型定义

### 6.4 Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具链相关
```

示例：
```bash
git commit -m "feat: 实现登录页面"
git commit -m "fix: 修复注册表单验证问题"
```

---

## 7. 常见问题

### 7.1 依赖安装失败

```bash
# 清除缓存后重新安装
rm -rf node_modules package-lock.json
npm install
```

### 7.2 开发服务器启动失败

```bash
# 检查端口是否被占用
lsof -i :3000

# 或者修改 vite.config.ts 中的端口
```

### 7.3 TypeScript 类型错误

```bash
# 检查类型定义
npx tsc --noEmit

# 如果是依赖包类型问题，尝试安装类型定义
npm install -D @types/包名
```

---

## 8. 部署指南

### 8.1 构建生产版本

```bash
npm run build
```

### 8.2 Vercel 部署

1. 安装 Vercel CLI:
```bash
npm install -g vercel
```

2. 部署:
```bash
vercel
```

3. 配置环境变量（在 Vercel 控制台）

### 8.3 其他平台部署

构建产物在 `dist/` 目录，可部署到任何静态托管服务：
- Netlify
- AWS S3 + CloudFront
- Cloudflare Pages

---

## 9. 开发资源

### 9.1 官方文档

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Material-UI](https://mui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Router](https://reactrouter.com/)
- [Vite](https://vitejs.dev/)

### 9.2 内部文档

- [组件使用指南](./COMPONENT_GUIDE.md)
- [API 规范](../../docs/API_SPEC.md)
- [技术栈说明](../../docs/TECH_STACK.md)

---

## 10. 联系支持

如有问题，请联系：
- 技术支持：support@aiads.com
- 项目仓库：[AIAds Frontend](https://github.com/aiads/frontend)
