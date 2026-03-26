# AIAds 管理后台权限设计文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密

---

## 1. 概述

### 1.1 文档目的

本文档详细描述 AIAds 管理后台的权限设计，包括权限模型、角色定义、权限点、实现方案等内容。

### 1.2 权限设计原则

```
1. 最小权限原则：只授予完成工作所需的最小权限
2. 职责分离原则：关键操作需要多人协作完成
3. 可追溯原则：所有权限操作都有审计日志
4. 动态调整原则：支持根据业务需求动态调整权限
```

### 1.3 权限模型

管理后台采用 **RBAC (Role-Based Access Control)** 权限模型：

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC Permission Model                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Admin    │────▶│    Role     │────▶│  Permission │
│  (管理员)    │  N:M│   (角色)    │  1:N│   (权限)    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                       │
      │                                       ▼
      │                               ┌─────────────┐
      │                               │  Resource   │
      │                               │   (资源)    │
      │                               └─────────────┘
      │
      ▼
┌─────────────┐
│   Permission│
│   Assignment│
│  (权限分配)  │
└─────────────┘
```

---

## 2. 角色定义

### 2.1 角色列表

| 角色 ID | 角色名称 | 英文名称 | 说明 | 适用人员 |
|--------|---------|---------|------|---------|
| `super_admin` | 超级管理员 | Super Admin | 系统最高权限，可管理所有功能和用户 | 技术负责人、CTO |
| `admin` | 管理员 | Admin | 日常运营管理，用户管理，内容审核 | 运营主管 |
| `moderator` | 审核员 | Moderator | KOL 审核、内容审核 | 审核团队成员 |
| `finance` | 财务 | Finance | 财务管理、提现审核 | 财务人员 |
| `analyst` | 数据分析师 | Analyst | 数据查看、报表导出 | 数据分析团队 |

### 2.2 角色详细说明

#### 2.2.1 超级管理员 (Super Admin)

**职责**:
- 系统配置和管理
- 管理员账号管理
- 角色和权限管理
- 查看所有审计日志
- 紧急情况下接管所有权限

**特点**:
- 系统预定义角色，不可删除
- 拥有所有权限
- 可以创建和分配其他管理员角色
- 敏感操作需要二次验证

#### 2.2.2 管理员 (Admin)

**职责**:
- 用户账号管理（封禁、解封、重置密码）
- KOL 审核和管理
- 内容审核
- 查看基础数据看板
- 查看审计日志

**特点**:
- 系统预定义角色，不可删除
- 除系统设置外的所有运营权限
- 无法管理其他管理员账号

#### 2.2.3 审核员 (Moderator)

**职责**:
- KOL 认证审核
- 内容审核
- 查看审核相关数据

**特点**:
- 专注于审核工作
- 无用户管理权限
- 无财务管理权限

#### 2.2.4 财务 (Finance)

**职责**:
- 查看交易记录
- 审核提现申请
- 导出财务报表
- 查看财务相关数据

**特点**:
- 专注于财务管理
- 敏感操作（大额提现审批）需要二次验证
- 无法查看用户详细信息

#### 2.2.5 数据分析师 (Analyst)

**职责**:
- 查看数据看板
- 导出数据报表
- 查看分析图表

**特点**:
- 只读权限
- 无修改操作权限
- 可导出脱敏数据

---

## 3. 权限点设计

### 3.1 权限点命名规范

权限点采用 `{模块}:{操作}` 的命名格式：

```
格式：{module}:{action}

示例:
- user:view      (用户模块 - 查看)
- user:create    (用户模块 - 创建)
- kol:approve    (KOL 模块 - 审批)
```

### 3.2 权限点分类

权限分为三个级别：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Levels                             │
└─────────────────────────────────────────────────────────────────┘

Level 1: 菜单级权限 (Menu Permission)
├── 控制导航菜单的显示/隐藏
├── 格式：{module}:access
└── 示例：user:access, kol:access, finance:access

Level 2: 页面级权限 (Page Permission)
├── 控制页面的访问权限
├── 格式：{module}:{resource}:view
└── 示例：user:list:view, kol:detail:view

Level 3: 操作级权限 (Action Permission)
├── 控制具体操作按钮的显示/隐藏
├── 格式：{module}:{resource}:{action}
└── 示例：user:ban, kol:approve, withdrawal:approve
```

### 3.3 完整权限点列表

#### 3.3.1 用户管理模块 (user)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `user:access` | 访问用户管理 | 菜单级 | 显示用户管理菜单 | Admin, Super Admin |
| `user:list:view` | 查看用户列表 | 页面级 | 查看用户列表页面 | Admin, Super Admin |
| `user:detail:view` | 查看用户详情 | 页面级 | 查看用户详细信息 | Admin, Super Admin |
| `user:create` | 创建用户 | 操作级 | 创建新用户账号 | Super Admin |
| `user:edit` | 编辑用户 | 操作级 | 修改用户信息 | Admin, Super Admin |
| `user:delete` | 删除用户 | 操作级 | 删除用户账号 | Super Admin |
| `user:ban` | 封禁用户 | 操作级 | 封禁违规用户 | Admin, Super Admin |
| `user:unban` | 解封用户 | 操作级 | 解封被封禁用户 | Admin, Super Admin |
| `user:suspend` | 冻结用户 | 操作级 | 临时冻结用户账号 | Admin, Super Admin |
| `user:reset_password` | 重置密码 | 操作级 | 重置用户登录密码 | Admin, Super Admin |

#### 3.3.2 KOL 管理模块 (kol)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `kol:access` | 访问 KOL 管理 | 菜单级 | 显示 KOL 管理菜单 | All |
| `kol:list:view` | 查看 KOL 列表 | 页面级 | 查看 KOL 列表页面 | All |
| `kol:detail:view` | 查看 KOL 详情 | 页面级 | 查看 KOL 详细信息 | All |
| `kol:pending:view` | 查看待审核 | 页面级 | 查看待审核 KOL 列表 | Moderator, Admin, Super Admin |
| `kol:review` | 审核 KOL | 操作级 | 执行 KOL 审核操作 | Moderator, Admin, Super Admin |
| `kol:approve` | 通过审核 | 操作级 | 通过 KOL 认证申请 | Moderator, Admin, Super Admin |
| `kol:reject` | 拒绝审核 | 操作级 | 拒绝 KOL 认证申请 | Moderator, Admin, Super Admin |
| `kol:suspend` | 暂停 KOL | 操作级 | 暂停 KOL 接单资格 | Admin, Super Admin |
| `kol:unsuspend` | 恢复 KOL | 操作级 | 恢复 KOL 接单资格 | Admin, Super Admin |
| `kol:verify` | 人工认证 | 操作级 | 人工认证 KOL 身份 | Admin, Super Admin |

#### 3.3.3 内容审核模块 (content)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `content:access` | 访问内容审核 | 菜单级 | 显示内容审核菜单 | Moderator, Admin, Super Admin |
| `content:list:view` | 查看内容列表 | 页面级 | 查看内容列表页面 | Moderator, Admin, Super Admin |
| `content:detail:view` | 查看内容详情 | 页面级 | 查看内容详细信息 | Moderator, Admin, Super Admin |
| `content:pending:view` | 查看待审核 | 页面级 | 查看待审核内容列表 | Moderator, Admin, Super Admin |
| `content:review` | 审核内容 | 操作级 | 执行内容审核操作 | Moderator, Admin, Super Admin |
| `content:approve` | 通过审核 | 操作级 | 通过内容审核 | Moderator, Admin, Super Admin |
| `content:reject` | 拒绝审核 | 操作级 | 拒绝内容审核 | Moderator, Admin, Super Admin |
| `content:delete` | 删除内容 | 操作级 | 删除违规内容 | Admin, Super Admin |
| `content:force_delete` | 强制删除 | 操作级 | 强制删除并封禁 | Super Admin |

#### 3.3.4 财务管理模块 (finance)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `finance:access` | 访问财务管理 | 菜单级 | 显示财务管理菜单 | Finance, Admin, Super Admin |
| `finance:dashboard:view` | 查看财务看板 | 页面级 | 查看财务数据看板 | Finance, Admin, Super Admin |
| `finance:transactions:view` | 查看交易记录 | 页面级 | 查看所有交易记录 | Finance, Admin, Super Admin |
| `finance:transactions:export` | 导出交易记录 | 操作级 | 导出交易记录报表 | Finance, Admin, Super Admin |
| `finance:withdrawals:view` | 查看提现列表 | 页面级 | 查看提现申请列表 | Finance, Admin, Super Admin |
| `finance:withdrawals:detail` | 查看提现详情 | 页面级 | 查看提现申请详情 | Finance, Admin, Super Admin |
| `finance:withdrawals:review` | 审核提现 | 操作级 | 执行提现审核操作 | Finance, Admin, Super Admin |
| `finance:withdrawals:approve` | 通过提现 | 操作级 | 批准提现申请 | Finance, Admin, Super Admin |
| `finance:withdrawals:reject` | 拒绝提现 | 操作级 | 拒绝提现申请 | Finance, Admin, Super Admin |
| `finance:recharge:confirm` | 确认充值 | 操作级 | 确认线下充值 | Finance, Admin, Super Admin |
| `finance:adjustment` | 余额调整 | 操作级 | 调整用户余额 | Super Admin |

#### 3.3.5 数据看板模块 (dashboard)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `dashboard:access` | 访问数据看板 | 菜单级 | 显示数据看板菜单 | All |
| `dashboard:view` | 查看数据看板 | 页面级 | 查看平台统计数据 | All |
| `dashboard:analytics:view` | 查看数据分析 | 页面级 | 查看详细分析图表 | Analyst, Admin, Super Admin |
| `dashboard:export` | 导出数据 | 操作级 | 导出数据报表 | Analyst, Admin, Super Admin |
| `dashboard:realtime:view` | 查看实时数据 | 页面级 | 查看实时数据监控 | Admin, Super Admin |

#### 3.3.6 系统设置模块 (settings)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `settings:access` | 访问系统设置 | 菜单级 | 显示系统设置菜单 | Admin, Super Admin |
| `settings:view` | 查看系统配置 | 页面级 | 查看系统配置信息 | Admin, Super Admin |
| `settings:edit` | 修改系统配置 | 操作级 | 修改系统配置参数 | Super Admin |
| `settings:roles:view` | 查看角色管理 | 页面级 | 查看角色列表和权限 | Super Admin |
| `settings:roles:manage` | 管理角色 | 操作级 | 创建/编辑/删除角色 | Super Admin |
| `settings:admins:view` | 查看管理员 | 页面级 | 查看管理员列表 | Super Admin |
| `settings:admins:manage` | 管理管理员 | 操作级 | 创建/编辑/删除管理员 | Super Admin |
| `settings:audit:view` | 查看审计日志 | 页面级 | 查看操作审计日志 | Admin, Super Admin |
| `settings:audit:export` | 导出审计日志 | 操作级 | 导出审计日志报表 | Super Admin |

#### 3.3.7 通用权限 (common)

| 权限代码 | 权限名称 | 权限级别 | 说明 | 默认角色 |
|---------|---------|---------|------|---------|
| `notification:view` | 查看通知 | 操作级 | 查看系统通知 | All |
| `notification:send` | 发送通知 | 操作级 | 向用户发送通知 | Admin, Super Admin |
| `file:upload` | 上传文件 | 操作级 | 上传文件到系统 | All |
| `file:delete` | 删除文件 | 操作级 | 删除系统文件 | Admin, Super Admin |

---

## 4. 角色权限矩阵

### 4.1 完整权限矩阵

| 权限代码 | Super Admin | Admin | Moderator | Finance | Analyst |
|---------|:-----------:|:-----:|:---------:|:-------:|:-------:|
| **用户管理** |
| `user:access` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:list:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:detail:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:create` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:edit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:ban` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:unban` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:suspend` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user:reset_password` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **KOL 管理** |
| `kol:access` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:list:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:detail:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:pending:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:review` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:approve` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:reject` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kol:suspend` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kol:unsuspend` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kol:verify` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **内容审核** |
| `content:access` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:list:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:detail:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:pending:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:review` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:approve` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:reject` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `content:force_delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **财务管理** |
| `finance:access` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:dashboard:view` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:transactions:view` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:transactions:export` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `finance:withdrawals:view` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:withdrawals:detail` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:withdrawals:review` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:withdrawals:approve` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:withdrawals:reject` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:recharge:confirm` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:adjustment` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **数据看板** |
| `dashboard:access` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:analytics:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:export` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `dashboard:realtime:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **系统设置** |
| `settings:access` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:edit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings:roles:view` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings:roles:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings:admins:view` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings:admins:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings:audit:view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:audit:export` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **通用权限** |
| `notification:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `notification:send` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `file:upload` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `file:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.2 角色权限汇总

```
Super Admin (超级管理员)
├── 所有权限
└── 特殊权限：settings:edit, settings:roles:manage, settings:admins:manage, finance:adjustment

Admin (管理员)
├── 用户管理：user:access, user:list:view, user:detail:view, user:edit, user:ban, user:unban, user:suspend, user:reset_password
├── KOL 管理：kol:access, kol:list:view, kol:detail:view, kol:pending:view, kol:review, kol:approve, kol:reject
├── 内容审核：content:access, content:list:view, content:detail:view, content:pending:view, content:review, content:approve, content:reject, content:delete
├── 财务管理：finance:access, finance:dashboard:view, finance:transactions:view, finance:transactions:export, finance:withdrawals:view, finance:withdrawals:detail, finance:withdrawals:review, finance:withdrawals:approve, finance:withdrawals:reject, finance:recharge:confirm
├── 数据看板：dashboard:access, dashboard:view, dashboard:analytics:view, dashboard:export
├── 系统设置：settings:access, settings:view
└── 通用权限：notification:view, notification:send, file:upload, file:delete

Moderator (审核员)
├── KOL 管理：kol:access, kol:list:view, kol:detail:view, kol:pending:view, kol:review, kol:approve, kol:reject
├── 内容审核：content:access, content:list:view, content:detail:view, content:pending:view, content:review, content:approve
├── 数据看板：dashboard:access, dashboard:view
└── 通用权限：notification:view, file:upload

Finance (财务)
├── 财务管理：finance:access, finance:dashboard:view, finance:transactions:view, finance:transactions:export, finance:withdrawals:view, finance:withdrawals:detail, finance:withdrawals:review, finance:withdrawals:approve, finance:withdrawals:reject, finance:recharge:confirm
├── 数据看板：dashboard:access, dashboard:view, dashboard:analytics:view, dashboard:export
└── 通用权限：notification:view, file:upload

Analyst (数据分析师)
├── 数据看板：dashboard:access, dashboard:view, dashboard:analytics:view, dashboard:export
├── 财务管理：finance:transactions:export (仅导出)
└── 通用权限：notification:view, file:upload
```

---

## 5. 权限实现方案

### 5.1 数据库设计

#### 5.1.1 角色表 (admin_roles)

```sql
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,  -- 系统角色不可删除
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 插入系统角色
INSERT INTO admin_roles (name, description, permissions, is_system) VALUES
('super_admin', '超级管理员', '["*"]'::jsonb, true),
('admin', '管理员', '["user:access", "user:list:view", ...]'::jsonb, true),
('moderator', '审核员', '["kol:access", "kol:list:view", ...]'::jsonb, true),
('finance', '财务', '["finance:access", "finance:dashboard:view", ...]'::jsonb, true),
('analyst', '数据分析师', '["dashboard:access", "dashboard:view", ...]'::jsonb, true);
```

#### 5.1.2 管理员表 (admins)

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    role_id UUID NOT NULL REFERENCES admin_roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, suspended, deleted
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE UNIQUE INDEX idx_admins_email ON admins (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_admins_role_id ON admins (role_id);
CREATE INDEX idx_admins_status ON admins (status);
```

#### 5.1.3 权限表 (admin_permissions) - 可选

```sql
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,  -- menu, page, action
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 插入权限点
INSERT INTO admin_permissions (code, name, description, module, level) VALUES
('user:access', '访问用户管理', '显示用户管理菜单', 'user', 'menu'),
('user:list:view', '查看用户列表', '查看用户列表页面', 'user', 'page'),
('user:ban', '封禁用户', '封禁违规用户', 'user', 'action'),
-- ... 其他权限点
;
```

#### 5.1.4 操作审计日志表 (admin_audit_logs)

```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 操作人信息
    admin_id UUID NOT NULL REFERENCES admins(id),
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    admin_role VARCHAR(100),
    
    -- 操作信息
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    
    -- 请求信息
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(512) NOT NULL,
    request_body JSONB,
    response_status INTEGER,
    
    -- 变更信息
    old_values JSONB,
    new_values JSONB,
    
    -- 环境信息
    ip_address INET NOT NULL,
    user_agent TEXT,
    geo_location JSONB,
    
    -- 操作结果
    status VARCHAR(20) NOT NULL DEFAULT 'success',
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

### 5.2 前端实现

#### 5.2.1 权限 Store

```typescript
// src/stores/permissionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      permissions: [],
      role: null,

      hasPermission: (permission) => {
        const { permissions } = get();
        // 超级管理员拥有所有权限
        if (get().role === 'super_admin') {
          return true;
        }
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        return permissions.some(p => get().hasPermission(p));
      },

      hasAllPermissions: (permissions) => {
        return permissions.every(p => get().hasPermission(p));
      },

      setPermissions: (permissions, role) => {
        set({ permissions, role });
      },

      clearPermissions: () => {
        set({ permissions: [], role: null });
      },
    }),
    {
      name: 'admin-permission-storage',
      partialize: (state) => ({ permissions: state.permissions, role: state.role }),
    }
  )
);
```

#### 5.2.2 权限守卫组件

```typescript
// src/components/PermissionGuard.tsx
import React from 'react';
import { usePermissionStore } from '@/stores/permissionStore';

interface PermissionGuardProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;  // 是否需要所有权限（默认任一）
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
  requireAll = false,
}) => {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasPermission = usePermissionStore((state) => 
    requireAll 
      ? state.hasAllPermissions(permissions)
      : state.hasAnyPermission(permissions)
  );

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// 使用示例
<PermissionGuard permission="user:delete">
  <Button color="error" onClick={handleDelete}>删除用户</Button>
</PermissionGuard>

<PermissionGuard permission={['user:create', 'user:edit']}>
  <Button>用户管理</Button>
</PermissionGuard>
```

#### 5.2.3 权限指令

```typescript
// src/directives/permission.ts
import { DirectiveBinding } from 'vue';  // 或 React 自定义 Hook
import { usePermissionStore } from '@/stores/permissionStore';

export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    const hasPermission = usePermissionStore.getState().hasPermission(value);

    if (!hasPermission) {
      el.parentNode?.removeChild(el);
    }
  }
};

// React Hook 版本
export const usePermission = (permission: string | string[]) => {
  const hasPermission = usePermissionStore((state) => 
    Array.isArray(permission)
      ? state.hasAnyPermission(permission)
      : state.hasPermission(permission)
  );

  return hasPermission;
};

// 使用示例
function UserActions() {
  const canDelete = usePermission('user:delete');
  const canEdit = usePermission('user:edit');

  return (
    <>
      {canEdit && <Button onClick={handleEdit}>编辑</Button>}
      {canDelete && <Button onClick={handleDelete}>删除</Button>}
    </>
  );
}
```

#### 5.2.4 路由权限控制

```typescript
// src/routes/protected.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePermissionStore } from '@/stores/permissionStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const hasPermission = usePermissionStore((state) => {
    if (!requiredPermission) return true;
    return Array.isArray(requiredPermission)
      ? state.hasAnyPermission(requiredPermission)
      : state.hasPermission(requiredPermission);
  });

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredPermission && !hasPermission) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

// 路由配置
{
  path: 'users',
  element: (
    <ProtectedRoute requiredPermission="user:access">
      <UserListPage />
    </ProtectedRoute>
  ),
},
{
  path: 'users/:id/ban',
  element: (
    <ProtectedRoute requiredPermission="user:ban">
      <BanUserPage />
    </ProtectedRoute>
  ),
}
```

### 5.3 后端实现

#### 5.3.1 认证中间件

```typescript
// src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
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
      email: string;
      role: string;
      permissions: string[];
    };

    // 验证管理员是否存在且状态正常
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!admin || admin.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: '账号已被禁用',
        },
      });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role.name,
      permissions: admin.role.name === 'super_admin' 
        ? ['*']  // 超级管理员拥有所有权限
        : decoded.permissions,
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
```

#### 5.3.2 权限检查中间件

```typescript
// src/middleware/requirePermission.ts
import { AdminRequest } from './adminAuth';

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

    // 超级管理员拥有所有权限
    if (req.admin.role === 'super_admin') {
      return next();
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

#### 5.3.3 权限检查工具函数

```typescript
// src/utils/permission.ts
export class PermissionChecker {
  private permissions: string[];
  private role: string;

  constructor(permissions: string[], role: string) {
    this.permissions = permissions;
    this.role = role;
  }

  // 检查是否有指定权限
  can(permission: string): boolean {
    if (this.role === 'super_admin') {
      return true;
    }
    return this.permissions.includes(permission);
  }

  // 检查是否有任一权限
  canAny(permissions: string[]): boolean {
    return permissions.some(p => this.can(p));
  }

  // 检查是否有所有权限
  canAll(permissions: string[]): boolean {
    return permissions.every(p => this.can(p));
  }

  // 检查是否无权
  cannot(permission: string): boolean {
    return !this.can(permission);
  }
}

// 使用示例
const checker = new PermissionChecker(permissions, role);
if (checker.cannot('user:delete')) {
  throw new ForbiddenError('没有删除用户的权限');
}
```

---

## 6. 敏感操作二次验证

### 6.1 需要二次验证的操作

| 操作类型 | 权限代码 | 验证方式 | 说明 |
|---------|---------|---------|------|
| 删除用户 | `user:delete` | MFA | 防止误删用户 |
| 重置用户密码 | `user:reset_password` | MFA | 防止恶意重置 |
| 批准大额提现 | `finance:withdrawals:approve` | MFA | 金额 > $10,000 |
| 修改系统配置 | `settings:edit` | MFA | 防止误配置 |
| 创建管理员 | `admin:create` | MFA | 防止创建后门账号 |
| 删除管理员 | `admin:delete` | MFA | 防止删除账号 |
| 导出审计日志 | `settings:audit:export` | MFA | 防止数据泄露 |
| 余额调整 | `finance:adjustment` | MFA + 审批 | 需要上级审批 |

### 6.2 二次验证流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  发起敏感操作 │────▶│  检查是否需要 │────▶│  返回 MFA    │
│  请求         │     │  二次验证     │     │  要求        │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  不需要      │     │  用户提供     │
                     │  直接执行    │     │  MFA 代码      │
                     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  验证 MFA     │
                                          │  代码         │
                                          └──────────────┘
                                                 │
                                  ┌──────────────┴──────────────┐
                                  │                             │
                                  ▼                             ▼
                         ┌──────────────┐             ┌──────────────┐
                         │  验证成功    │             │  验证失败    │
                         │  执行操作    │             │  返回错误    │
                         └──────────────┘             └──────────────┘
```

### 6.3 二次验证实现

```typescript
// src/middleware/require2FA.ts
import { AdminRequest } from './adminAuth';
import { verifyTOTP } from '@/utils/mfa';

const SENSITIVE_ACTIONS = [
  'user:delete',
  'user:reset_password',
  'finance:withdrawals:approve',
  'settings:edit',
  'admin:create',
  'admin:delete',
  'settings:audit:export',
  'finance:adjustment',
];

export const require2FA = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  const action = req.headers['x-action'] as string;
  
  if (!SENSITIVE_ACTIONS.includes(action)) {
    return next();
  }

  const mfaCode = req.headers['x-mfa-code'];
  
  if (!mfaCode) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'MFA_REQUIRED',
        message: '敏感操作需要 MFA 验证',
        required: true,
      },
    });
  }

  // 获取管理员 MFA 信息
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin!.id },
    select: { mfa_enabled: true, mfa_secret: true },
  });

  if (!admin?.mfa_enabled) {
    // 如果管理员未启用 MFA，记录安全事件
    logSecurityEvent('MFA_NOT_ENABLED', {
      admin_id: req.admin!.id,
      action,
    });
    
    // 可选：强制要求启用 MFA
    return res.status(403).json({
      success: false,
      error: {
        code: 'MFA_NOT_ENABLED',
        message: '请先启用 MFA 后再执行敏感操作',
      },
    });
  }

  // 验证 MFA 代码
  const isValid = verifyTOTP(admin.mfa_secret!, mfaCode);
  
  if (!isValid) {
    // 记录 MFA 验证失败
    logSecurityEvent('MFA_VERIFICATION_FAILED', {
      admin_id: req.admin!.id,
      action,
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'MFA_INVALID',
        message: 'MFA 验证码无效',
      },
    });
  }

  next();
};

// 使用示例
router.post(
  '/users/:id/ban',
  adminAuth,
  requirePermission('user:ban'),
  require2FA,
  userController.banUser
);
```

---

## 7. 审计日志

### 7.1 审计范围

所有以下操作都需要记录审计日志：

| 操作类别 | 具体操作 | 保留期限 |
|---------|---------|---------|
| 认证相关 | 登录、登出、密码修改、MFA 设置 | 6 个月 |
| 用户管理 | 创建、编辑、删除、封禁、解封 | 6 个月 |
| KOL 审核 | 通过、拒绝、暂停、恢复 | 6 个月 |
| 内容审核 | 通过、拒绝、删除 | 6 个月 |
| 财务管理 | 提现审批、余额调整、导出报表 | 2 年 |
| 系统设置 | 配置修改、角色管理、管理员管理 | 2 年 |

### 7.2 审计日志格式

```typescript
interface AuditLog {
  // 操作人信息
  adminId: string;
  adminEmail: string;
  adminName: string;
  adminRole: string;
  
  // 操作信息
  action: string;  // create, update, delete, approve, reject, ban, unban, export, login, logout
  resourceType: string;  // user, kol, content, withdrawal, settings
  resourceId?: string;
  resourceName?: string;
  
  // 请求信息
  requestMethod: string;
  requestPath: string;
  requestBody?: any;
  responseStatus: number;
  
  // 变更信息（更新操作时）
  oldValues?: any;
  newValues?: any;
  
  // 环境信息
  ipAddress: string;
  userAgent: string;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  
  // 操作结果
  status: 'success' | 'failure';
  errorMessage?: string;
  
  // 时间戳
  createdAt: Date;
}
```

### 7.3 审计日志查询

```typescript
// src/services/auditLog.service.ts
export const auditLogService = {
  // 记录审计日志
  async log(data: AuditLogCreateInput): Promise<void> {
    await prisma.adminAuditLog.create({
      data,
    });
  },

  // 查询审计日志
  async query(filters: AuditLogFilters): Promise<AuditLog[]> {
    return prisma.adminAuditLog.findMany({
      where: filters,
      include: {
        admin: {
          select: {
            email: true,
            name: true,
            role: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });
  },

  // 导出审计日志
  async export(filters: AuditLogFilters): Promise<string> {
    const logs = await this.query(filters);
    const csv = convertToCSV(logs);
    const url = await uploadToStorage(csv, `audit-logs-${Date.now()}.csv`);
    return url;
  },
};
```

---

## 8. 总结

本权限设计文档为 AIAds 管理后台提供了完整的权限管理方案：

1. **RBAC 模型**: 基于角色的访问控制，支持灵活的权限分配
2. **三级权限**: 菜单级、页面级、操作级，细粒度控制
3. **角色定义**: 5 个预定义角色，覆盖不同职责
4. **权限点**: 完整的权限点列表，覆盖所有功能模块
5. **实现方案**: 前后端完整的权限检查实现
6. **二次验证**: 敏感操作需要 MFA 二次验证
7. **审计日志**: 所有操作可追溯，满足合规要求

该权限设计具有以下特点：

- **安全性**: 多层权限检查，敏感操作二次验证
- **灵活性**: 支持动态添加角色和权限
- **可追溯**: 完整的审计日志记录
- **易用性**: 前端组件化权限控制，简单易用
