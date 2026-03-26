# AIAds Frontend

AIAds 平台的前端应用，包含广告主后台、KOL 后台和管理后台三个 Web 应用。

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型系统
- **Material-UI v5** - UI 组件库
- **Zustand** - 状态管理
- **React Router v6** - 路由管理
- **Axios** - HTTP 客户端
- **Vite 5** - 构建工具

## 项目结构

```
src/
├── components/        # 可复用组件
│   ├── common/        # 通用组件
│   ├── layout/        # 布局组件
│   └── business/      # 业务组件
├── pages/             # 页面组件
│   ├── auth/          # 认证页面
│   ├── advertiser/    # 广告主页面
│   ├── kol/           # KOL 页面
│   └── admin/         # 管理页面
├── hooks/             # 自定义 Hooks
├── stores/            # 状态管理
├── services/          # API 服务
├── utils/             # 工具函数
├── types/             # TypeScript 类型
└── assets/            # 静态资源
```

## 主要功能

### 认证系统
- 用户登录
- 用户注册（支持广告主/KOL 角色选择）
- 忘记密码
- 重置密码

### 角色系统
- **广告主 (Advertiser)**: 投放 KOL 广告
- **KOL**: 接收广告任务
- **管理员 (Admin)**: 平台管理

## 开发规范

- 所有代码使用 TypeScript
- 使用函数组件 + Hooks
- 遵循 Airbnb React/TypeScript 风格指南
- 使用 ESLint + Prettier 保证代码质量

## 文档

- [开发环境搭建指南](../../docs/FRONTEND_SETUP.md)
- [组件使用指南](../../docs/COMPONENT_GUIDE.md)
- [API 规范](../../docs/API_SPEC.md)

## 环境变量

复制 `.env.example` 到 `.env` 并配置正确的 API 地址：

```env
VITE_API_URL=http://localhost:8080/api/v1
```

## 可用脚本

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建

# 代码质量
npm run lint         # ESLint 检查
npm run lint:fix     # 修复 ESLint 问题

# 类型检查
npx tsc --noEmit     # TypeScript 类型检查
```

## 浏览器支持

- Chrome (最新)
- Firefox (最新)
- Safari (最新)
- Edge (最新)

## License

Copyright © 2026 AIAds Platform
