# AIAds 管理后台架构设计文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密

---

## 1. 概述

### 1.1 文档目的

本文档描述 AIAds 管理后台的整体架构设计，包括权限模型、技术架构、安全设计等核心内容。

### 1.2 管理后台定位

管理后台是 AIAds 平台的运营管理中枢，为平台运营人员、审核人员、财务人员和管理员提供统一的运营管理界面。

### 1.3 核心功能模块

```
┌─────────────────────────────────────────────────────────────────┐
│                      AIAds Admin Dashboard                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  用户管理   │  │  KOL 审核    │  │  内容审核   │  │  财务管理   │
│  User Mgmt  │  │  KOL Review  │  │Content Audit│  │  Finance    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  数据看板   │  │  活动管理   │  │  订单管理   │  │  系统设置   │
│  Dashboard  │  │Campaign Mgmt│  │ Order Mgmt  │  │  Settings   │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. 权限模型设计

### 2.1 RBAC 权限模型

管理后台采用基于角色的访问控制（Role-Based Access Control）模型：

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC Model                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│    Role     │────▶│  Permission │
│   (管理员)   │  N:M│   (角色)    │  1:N│   (权限)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 角色定义

| 角色 | 英文名称 | 说明 | 适用人员 |
|-----|---------|------|---------|
| 超级管理员 | Super Admin | 系统最高权限，可管理所有功能和用户 | 技术负责人、CTO |
| 管理员 | Admin | 日常运营管理，用户管理，内容审核 | 运营主管 |
| 审核员 | Moderator | KOL 审核、内容审核 | 审核团队 |
| 财务 | Finance | 财务管理、提现审核 | 财务人员 |
| 数据分析师 | Analyst | 数据查看、报表导出 | 数据分析团队 |

### 2.3 权限粒度设计

权限分为三个粒度级别：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Granularity                         │
└─────────────────────────────────────────────────────────────────┘

Level 1: 菜单级权限 (Menu Level)
├── 控制左侧导航菜单的显示/隐藏
├── 示例：user_management, kol_review, finance
└── 实现：前端路由守卫 + 菜单渲染控制

Level 2: 页面级权限 (Page Level)
├── 控制页面的访问权限
├── 示例：user_list, user_detail, user_edit
└── 实现：路由守卫 + 页面级权限检查

Level 3: 操作级权限 (Action Level)
├── 控制页面内的具体操作按钮
├── 示例：user_create, user_edit, user_delete, user_ban
└── 实现：按钮级权限指令 + API 权限验证
```

### 2.4 权限点定义

#### 2.4.1 用户管理模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `user:view` | 查看用户 | 页面级 | 查看用户列表和详情 |
| `user:create` | 创建用户 | 操作级 | 创建新用户 |
| `user:edit` | 编辑用户 | 操作级 | 修改用户信息 |
| `user:delete` | 删除用户 | 操作级 | 删除用户账号 |
| `user:ban` | 封禁用户 | 操作级 | 封禁违规用户 |
| `user:unban` | 解封用户 | 操作级 | 解封被封禁用户 |
| `user:reset_password` | 重置密码 | 操作级 | 重置用户密码 |

#### 2.4.2 KOL 审核模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `kol:view` | 查看 KOL | 页面级 | 查看 KOL 列表和详情 |
| `kol:review` | 审核 KOL | 操作级 | 审核 KOL 认证申请 |
| `kol:approve` | 通过审核 | 操作级 | 通过 KOL 认证 |
| `kol:reject` | 拒绝审核 | 操作级 | 拒绝 KOL 认证 |
| `kol:verify` | 人工认证 | 操作级 | 人工认证 KOL |
| `kol:suspend` | 暂停 KOL | 操作级 | 暂停 KOL 资格 |

#### 2.4.3 内容审核模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `content:view` | 查看内容 | 页面级 | 查看待审核内容 |
| `content:review` | 审核内容 | 操作级 | 审核用户提交的内容 |
| `content:approve` | 通过审核 | 操作级 | 通过内容审核 |
| `content:reject` | 拒绝审核 | 操作级 | 拒绝内容审核 |
| `content:delete` | 删除内容 | 操作级 | 删除违规内容 |

#### 2.4.4 财务管理模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `finance:view` | 查看财务 | 页面级 | 查看交易记录和报表 |
| `finance:export` | 导出报表 | 操作级 | 导出财务报表 |
| `withdrawal:review` | 审核提现 | 操作级 | 审核 KOL 提现申请 |
| `withdrawal:approve` | 通过提现 | 操作级 | 批准提现申请 |
| `withdrawal:reject` | 拒绝提现 | 操作级 | 拒绝提现申请 |
| `recharge:confirm` | 确认充值 | 操作级 | 确认广告主充值 |

#### 2.4.5 数据看板模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `dashboard:view` | 查看看板 | 页面级 | 查看数据看板 |
| `dashboard:export` | 导出数据 | 操作级 | 导出数据报表 |
| `analytics:view` | 查看分析 | 页面级 | 查看数据分析 |

#### 2.4.6 系统设置模块

| 权限代码 | 权限名称 | 权限类型 | 说明 |
|---------|---------|---------|------|
| `settings:view` | 查看设置 | 页面级 | 查看系统设置 |
| `settings:edit` | 修改设置 | 操作级 | 修改系统配置 |
| `role:manage` | 角色管理 | 操作级 | 管理角色和权限 |
| `admin:manage` | 管理员管理 | 操作级 | 管理管理员账号 |
| `audit:view` | 查看审计 | 页面级 | 查看操作审计日志 |

### 2.5 角色权限矩阵

| 权限 / 角色 | Super Admin | Admin | Moderator | Finance | Analyst |
|-----------|:-----------:|:-----:|:---------:|:-------:|:-------:|
| `user:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:edit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:ban` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kol:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:review` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:approve` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:review` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `finance:view` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:export` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `withdrawal:review` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `withdrawal:approve` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `dashboard:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:export` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `settings:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:edit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `role:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ✅ | ❌ | ❌ | ❌ |

### 2.6 权限实现方案

#### 2.6.1 数据库设计

```sql
-- 角色表
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,  -- 系统角色不可删除
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    role_id UUID NOT NULL REFERENCES admin_roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 权限表（可选，用于更细粒度的权限管理）
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.6.2 前端权限检查

```typescript
// src/stores/permissionStore.ts
import { create } from 'zustand';

interface PermissionState {
  permissions: string[];
  role: string | null;
  
  // 检查是否有指定权限
  hasPermission: (permission: string) => boolean;
  
  // 检查是否有任一权限
  hasAnyPermission: (permissions: string[]) => boolean;
  
  // 检查是否有所有权限
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // 设置权限
  setPermissions: (permissions: string[], role: string) => void;
  
  // 清除权限
  clearPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  role: null,

  hasPermission: (permission) => {
    return get().permissions.includes(permission);
  },

  hasAnyPermission: (permissions) => {
    return permissions.some(p => get().permissions.includes(p));
  },

  hasAllPermissions: (permissions) => {
    return permissions.every(p => get().permissions.includes(p));
  },

  setPermissions: (permissions, role) => {
    set({ permissions, role });
  },

  clearPermissions: () => {
    set({ permissions: [], role: null });
  },
}));

// src/components/PermissionGuard.tsx
import React from 'react';
import { usePermissionStore } from '@/stores/permissionStore';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const hasPermission = usePermissionStore((state) => state.hasPermission(permission));

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// 使用示例
<PermissionGuard permission="user:delete">
  <Button color="error" onClick={handleDelete}>删除用户</Button>
</PermissionGuard>
```

#### 2.6.3 后端权限中间件

```typescript
// src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const adminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要提供管理员认证 Token',
        },
      });
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as {
      sub: string;
      role: string;
      permissions: string[];
    };

    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: '管理员 Token 无效',
      },
    });
  }
};

// src/middleware/requirePermission.ts
export const requirePermission = (permission: string) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要认证',
        },
      });
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限执行此操作',
        },
      });
    }

    next();
  };
};

// 使用示例
router.post(
  '/users/:id/ban',
  adminAuth,
  requirePermission('user:ban'),
  userController.banUser
);
```

---

## 3. 技术架构设计

### 3.1 技术栈选型

| 层级 | 技术选型 | 版本 | 说明 |
|-----|---------|------|------|
| **前端框架** | React | 18.x | 组件化开发 |
| **UI 框架** | Material-UI (MUI) | 5.x | 企业级 UI 组件库 |
| **状态管理** | Zustand | 4.x | 轻量级状态管理 |
| **API 客户端** | React Query | 5.x | 服务端状态管理 |
| **HTTP 客户端** | Axios | 1.x | HTTP 请求库 |
| **路由管理** | React Router | 6.x | 客户端路由 |
| **表单处理** | React Hook Form | 7.x | 高性能表单库 |
| **表单验证** | Zod | 3.x | Schema 验证 |
| **图表库** | Recharts | 2.x | React 图表库 |
| **日期处理** | Day.js | 1.x | 轻量级日期库 |

### 3.2 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Frontend Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Browser Layer                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Admin Web App (Vercel Hosting)              │   │
│  │                   https://admin.aiads.com                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React 18 + TypeScript                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Pages     │  │  Components │  │   Layouts   │     │   │
│  │  │  (页面组件)  │  │  (通用组件)  │  │  (布局组件)  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   State Management                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Zustand    │  │ React Query │  │  Form State │     │   │
│  │  │ (全局状态)  │  │ (服务端状态) │  │ (表单状态)  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Feature Modules                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  Users  │ │  KOLs   │ │Content  │ │Finance  │       │   │
│  │  │ 管理模块 │ │审核模块 │ │审核模块 │ │财务模块 │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │Dashboard│ │Analytics│ │Settings │ │  Auth   │       │   │
│  │  │ 数据看板│ │数据分析 │ │系统设置 │ │ 认证模块 │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Integration Layer                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Client Layer                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Axios     │  │Interceptors │  │   Retry     │     │   │
│  │  │ (HTTP 客户端) │  │ (拦截器)    │  │ (重试机制)  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Auth Management                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │    JWT      │  │   Token     │  │   Refresh   │     │   │
│  │  │  (令牌管理)  │  │  (存储)     │  │  (刷新)     │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Backend API   │
                     │   (Railway)     │
                     │ /api/v1/admin/* │
                     └─────────────────┘
```

### 3.3 目录结构

```
aiads-admin/
├── public/
│   ├── favicon.ico
│   └── logo.svg
│
├── src/
│   ├── api/                    # API 层
│   │   ├── client.ts           # Axios 实例配置
│   │   ├── interceptors.ts     # 请求/响应拦截器
│   │   ├── endpoints.ts        # API 端点定义
│   │   └── index.ts
│   │
│   ├── components/             # 通用组件
│   │   ├── ui/                 # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Form.tsx
│   │   │   └── ...
│   │   ├── layout/             # 布局组件
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   └── common/             # 通用业务组件
│   │       ├── SearchBar.tsx
│   │       ├── Pagination.tsx
│   │       ├── StatusBadge.tsx
│   │       └── ...
│   │
│   ├── features/               # 功能模块
│   │   ├── auth/               # 认证模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   ├── users/              # 用户管理模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   ├── kols/               # KOL 审核模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   ├── content/            # 内容审核模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   ├── finance/            # 财务管理模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   ├── dashboard/          # 数据看板模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   └── settings/           # 系统设置模块
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       └── services/
│   │
│   ├── hooks/                  # 通用 Hooks
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useDebounce.ts
│   │   └── ...
│   │
│   ├── layouts/                # 布局
│   │   ├── AdminLayout.tsx
│   │   └── AuthLayout.tsx
│   │
│   ├── pages/                  # 页面
│   │   ├── login.tsx
│   │   ├── dashboard.tsx
│   │   ├── 404.tsx
│   │   └── ...
│   │
│   ├── routes/                 # 路由配置
│   │   ├── index.tsx
│   │   ├── protected.tsx
│   │   └── public.tsx
│   │
│   ├── stores/                 # 状态管理
│   │   ├── authStore.ts
│   │   ├── permissionStore.ts
│   │   ├── appStore.ts
│   │   └── ...
│   │
│   ├── styles/                 # 全局样式
│   │   ├── globals.css
│   │   ├── theme.ts
│   │   └── ...
│   │
│   ├── types/                  # TypeScript 类型
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   ├── kol.types.ts
│   │   └── ...
│   │
│   ├── utils/                  # 工具函数
│   │   ├── format.ts
│   │   ├── validator.ts
│   │   ├── storage.ts
│   │   └── ...
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 3.4 路由设计

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      // 数据看板
      { path: '', element: <DashboardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      
      // 用户管理
      { path: 'users', element: <UserListPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      
      // KOL 审核
      { path: 'kols', element: <KolListPage /> },
      { path: 'kols/pending', element: <KolReviewPage /> },
      { path: 'kols/:id', element: <KolDetailPage /> },
      
      // 内容审核
      { path: 'content', element: <ContentListPage /> },
      { path: 'content/pending', element: <ContentReviewPage /> },
      
      // 财务管理
      { path: 'finance', element: <FinancePage /> },
      { path: 'finance/transactions', element: <TransactionListPage /> },
      { path: 'finance/withdrawals', element: <WithdrawalListPage /> },
      { path: 'finance/withdrawals/:id', element: <WithdrawalDetailPage /> },
      
      // 系统设置
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/roles', element: <RoleManagementPage /> },
      { path: 'settings/admins', element: <AdminManagementPage /> },
      { path: 'settings/audit-logs', element: <AuditLogPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
```

### 3.5 状态管理设计

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  } | null;
  
  // Actions
  setTokens: (token: string, refreshToken: string) => void;
  setAdmin: (admin: AuthState['admin']) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      admin: null,

      setTokens: (token, refreshToken) => {
        set({ token, refreshToken });
      },

      setAdmin: (admin) => {
        set({ admin });
      },

      clearAuth: () => {
        set({ token: null, refreshToken: null, admin: null });
      },

      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);

// src/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  currentTheme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentTheme: 'light',
  language: 'zh-CN',

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setTheme: (theme) => {
    set({ currentTheme: theme });
  },

  setLanguage: (lang) => {
    set({ language: lang });
  },
}));
```

### 3.6 API 集成设计

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3000/api/v1/admin';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Token 过期处理
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token, refresh_token } = response.data.data;
        useAuthStore.getState().setTokens(access_token, refresh_token);
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// src/features/users/services/userService.ts
import { apiClient } from '@/api/client';
import { User, UserListParams, UserListResponse } from '../types';

export const userService = {
  // 获取用户列表
  getUsers: async (params: UserListParams): Promise<UserListResponse> => {
    const response = await apiClient.get('/users', { params });
    return response.data.data;
  },

  // 获取用户详情
  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  // 封禁用户
  banUser: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/users/${id}/ban`, { reason });
  },

  // 解封用户
  unbanUser: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/unban`);
  },
};

// src/features/users/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';

export const useUsers = (params: UserListParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getUsers(params),
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      userService.banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

---

## 4. 安全设计

### 4.1 管理员认证

#### 4.1.1 独立 JWT 认证

管理后台使用独立的 JWT Secret，与用户后台完全隔离：

```typescript
// 后端配置
const ADMIN_JWT_CONFIG = {
  secret: process.env.ADMIN_JWT_SECRET,  // 独立密钥
  expiresIn: '8h',  // 8 小时有效期
  refreshExpiresIn: '7d',  // Refresh Token 7 天
  issuer: 'aiads-admin',
  audience: 'aiads-admin-api',
};
```

#### 4.1.2 登录流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  管理员登录   │────▶│  验证账号密码 │────▶│  检测 IP 白名单  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  生成 Token   │     │  记录登录日志 │
                     │  Access +    │     │  (审计)      │
                     │  Refresh     │     └──────────────┘
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  返回 Token   │
                     │  给前端       │
                     └──────────────┘
```

### 4.2 操作审计日志

#### 4.2.1 审计日志表

```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 操作人信息
    admin_id UUID NOT NULL REFERENCES admins(id),
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    
    -- 操作信息
    action VARCHAR(50) NOT NULL,  -- create, update, delete, approve, reject, ban, unban, export, login, logout
    resource_type VARCHAR(100) NOT NULL,  -- user, kol, content, withdrawal, settings
    resource_id UUID,
    resource_name VARCHAR(255),
    
    -- 操作详情
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(512) NOT NULL,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    
    -- 变更信息（更新操作时）
    old_values JSONB,
    new_values JSONB,
    
    -- 环境信息
    ip_address INET NOT NULL,
    user_agent TEXT,
    geo_location JSONB,  -- {country, region, city}
    
    -- 操作结果
    status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, failure
    error_message TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs (admin_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs (action);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs (resource_type, resource_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs (created_at);
CREATE INDEX idx_admin_audit_logs_ip ON admin_audit_logs (ip_address);
```

#### 4.2.2 审计日志中间件

```typescript
// src/middleware/auditLog.ts
import { AdminRequest } from './adminAuth';

export const auditLog = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // 记录响应完成后的日志
  res.on('finish', async () => {
    const logData = {
      admin_id: req.admin?.id,
      admin_email: req.admin?.email,
      admin_name: req.admin?.name,
      action: extractAction(req.method, req.path),
      resource_type: extractResourceType(req.path),
      resource_id: extractResourceId(req.path),
      request_method: req.method,
      request_path: req.path,
      request_body: req.body,
      response_status: res.statusCode,
      response_body: res.locals.responseBody,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      status: res.statusCode >= 400 ? 'failure' : 'success',
      error_message: res.locals.errorMessage,
    };

    await prisma.adminAuditLog.create({
      data: logData,
    });
  });

  next();
};
```

### 4.3 敏感操作二次验证

```typescript
// 需要二次验证的操作
const SENSITIVE_ACTIONS = [
  'user:delete',
  'user:reset_password',
  'withdrawal:approve',
  'settings:edit',
  'admin:create',
  'admin:delete',
];

// 二次验证中间件
export const require2FA = (req: AdminRequest, res: Response, next: NextFunction) => {
  const action = req.headers['x-action'] as string;
  
  if (SENSITIVE_ACTIONS.includes(action)) {
    const mfaCode = req.headers['x-mfa-code'];
    
    if (!mfaCode) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MFA_REQUIRED',
          message: '敏感操作需要 MFA 验证',
        },
      });
    }
    
    // 验证 MFA 代码
    const isValid = verifyMFA(req.admin.id, mfaCode);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MFA_INVALID',
          message: 'MFA 验证码无效',
        },
      });
    }
  }
  
  next();
};
```

### 4.4 IP 白名单

```typescript
// IP 白名单配置
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

export const ipWhitelist = (req: AdminRequest, res: Response, next: NextFunction) => {
  if (ADMIN_IP_WHITELIST.length === 0) {
    return next();
  }
  
  const clientIP = req.ip;
  
  if (!ADMIN_IP_WHITELIST.includes(clientIP)) {
    // 记录未授权访问尝试
    logSecurityEvent('IP_WHITELIST_DENIED', {
      ip: clientIP,
      path: req.path,
      admin: req.admin?.email,
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_NOT_WHITELISTED',
        message: '您的 IP 地址不在白名单中',
      },
    });
  }
  
  next();
};
```

### 4.5 安全架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Security Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   管理员登录  │────▶│  IP 白名单   │────▶│  账号密码   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                     ┌─────────────┐
                                     │  MFA 验证    │
                                     │ (可选/条件)  │
                                     └─────────────┘
                                              │
                                              ▼
                                     ┌─────────────┐
                                     │  生成 Token  │
                                     │ Access +    │
                                     │ Refresh     │
                                     └─────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                     ┌─────────────┐                 ┌─────────────┐
                     │  API 请求    │                 │  操作审计   │
                     │ Token 验证   │                 │  日志记录   │
                     └─────────────┘                 └─────────────┘
                              │
                              ▼
                     ┌─────────────┐
                     │  权限检查   │
                     │ RBAC + RLS  │
                     └─────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌─────────────┐                 ┌─────────────┐
     │  普通操作   │                 │  敏感操作   │
     │  直接执行   │                 │  二次验证   │
     └─────────────┘                 └─────────────┘
```

---

## 5. 部署架构

### 5.1 部署环境

| 环境 | 用途 | URL | 部署方式 |
|-----|------|-----|---------|
| 开发环境 | 本地开发 | http://localhost:3001 | Vite Dev Server |
| 测试环境 | 功能测试 | https://admin-test.aiads.com | Vercel Preview |
| 预发布环境 | 上线前验证 | https://admin-staging.aiads.com | Vercel Staging |
| 生产环境 | 正式使用 | https://admin.aiads.com | Vercel Production |

### 5.2 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Deployment Architecture                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Platform                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Production │  │   Staging   │  │   Preview   │             │
│  │  admin.aiads.com │  admin-staging.aiads.com │  Branch Previews │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Features:                                                       │
│  • Automatic SSL/TLS                                             │
│  • Global CDN (Edge Network)                                     │
│  • Automatic CI/CD from Git                                      │
│  • Instant Rollback                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Railway)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Production │  │   Staging   │  │   Development│            │
│  │  api.aiads.com │  api-staging.aiads.com │  Localhost      │
│  │  /api/v1/admin  │  /api/v1/admin  │  /api/v1/admin  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Features:                                                       │
│  • Auto-scaling                                                  │
│  • Health Checks                                                 │
│  • Load Balancing                                                │
│  • DDoS Protection                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 性能优化

### 6.1 前端性能优化

| 优化项 | 策略 | 目标 |
|-------|------|------|
| 代码分割 | 路由级 + 组件级 Lazy Loading | 首屏加载 < 2s |
| 资源优化 | Tree Shaking + 图片压缩 | Bundle < 500KB |
| 缓存策略 | Service Worker + HTTP Cache | 二次访问 < 1s |
| 数据预取 | React Query Prefetch | 页面切换无等待 |

### 6.2 数据看板性能

```typescript
// 大数据量查询优化
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 5 * 60 * 1000,  // 5 分钟缓存
    gcTime: 10 * 60 * 1000,    // 10 分钟 GC
  });
};

// 虚拟列表优化大数据渲染
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualTable = ({ data }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.key} style={{ transform: `translateY(${virtualRow.start}px)` }}>
            {/* Row content */}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 7. 总结

本架构设计文档为 AIAds 管理后台提供了完整的技术方案，包括：

1. **权限模型**: 基于 RBAC 的三级权限体系（菜单级/页面级/操作级）
2. **技术架构**: React + MUI + Zustand + React Query 的现代化技术栈
3. **安全设计**: 独立认证、操作审计、二次验证、IP 白名单等多层安全防护

该架构具有以下特点：

- **安全性**: 管理后台与用户后台完全隔离，多层安全防护
- **可扩展性**: 支持动态添加角色和权限，无需修改代码
- **审计性**: 所有操作记录审计日志，可追溯可查询
- **性能**: 支持大数据量查询和渲染，响应迅速
