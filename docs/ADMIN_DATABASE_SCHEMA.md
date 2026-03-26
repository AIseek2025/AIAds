# AIAds 管理后台数据库设计文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 25 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密

---

## 目录

1. [ER 图](#1-er 图)
2. [核心表结构](#2-核心表结构)
3. [业务表结构](#3-业务表结构)
4. [索引设计](#4-索引设计)
5. [视图设计](#5-视图设计)
6. [数据字典](#6-数据字典)

---

## 1. ER 图

### 1.1 管理后台核心实体关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIAds Admin Database ER Diagram                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ admin_roles  │◀──────│   admins     │──────▶│admin_audit_  │
│  (角色表)     │  N:1  │ (管理员表)   │  1:N  │   logs       │
└──────────────┘       └──────────────┘       │ (审计日志表)  │
       │                                      └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│admin_permis- │
│  sions       │
│ (权限表)     │
└──────────────┘


┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │◀──────│ advertisers  │──────▶│ transactions │
│  (用户表)    │  1:1  │ (广告主表)   │  1:N  │  (交易表)    │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │
       │ 1:1                  │ 1:N
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│    kols      │       │  campaigns   │
│  (KOL 表)     │       │  (活动表)    │
└──────────────┘       └──────┬───────┘
       │                      │
       │ 1:N                  │ 1:N
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│content_review│       │    orders    │
│ (内容审核表)  │       │  (订单表)    │
└──────────────┘       └──────┬───────┘
                              │
                              │ 1:N
                              ▼
                       ┌──────────────┐
                       │order_disputes│
                       │ (订单纠纷表)  │
                       └──────────────┘


┌──────────────┐       ┌──────────────┐
│ withdrawals  │       │   invoices   │
│  (提现表)    │       │  (发票表)     │
└──────────────┘       └──────────────┘
```

### 1.2 表关系说明

| 关系 | 说明 |
|-----|------|
| admins → admin_roles | N:1 - 管理员属于一个角色 |
| admins → admin_audit_logs | 1:N - 管理员产生审计日志 |
| users → advertisers | 1:1 - 用户可以是广告主 |
| users → kols | 1:1 - 用户可以是 KOL |
| advertisers → campaigns | 1:N - 广告主创建活动 |
| advertisers → transactions | 1:N - 广告主产生交易 |
| campaigns → orders | 1:N - 活动包含订单 |
| kols → orders | 1:N - KOL 接订单 |
| kols → content_reviews | 1:N - KOL 提交内容审核 |
| orders → order_disputes | 1:N - 订单可能有纠纷 |

---

## 2. 核心表结构

### 2.1 管理员表 (admins)

存储管理后台的管理员账号信息。

```sql
CREATE TABLE admins (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本信息
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),

    -- 角色关联
    role_id UUID NOT NULL REFERENCES admin_roles(id),

    -- 账号状态
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

    -- MFA 配置
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),

    -- 登录信息
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id),

    -- 软删除
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_role_id ON admins(role_id);
CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_admins_created_at ON admins(created_at);

-- 注释
COMMENT ON TABLE admins IS '管理员表';
COMMENT ON COLUMN admins.id IS '管理员 ID';
COMMENT ON COLUMN admins.email IS '登录邮箱';
COMMENT ON COLUMN admins.password_hash IS '密码哈希 (Argon2id)';
COMMENT ON COLUMN admins.name IS '管理员姓名';
COMMENT ON COLUMN admins.role_id IS '角色 ID';
COMMENT ON COLUMN admins.status IS '账号状态：active-正常，inactive-未激活，suspended-暂停';
COMMENT ON COLUMN admins.mfa_enabled IS '是否启用 MFA';
COMMENT ON COLUMN admins.last_login_at IS '最后登录时间';
COMMENT ON COLUMN admins.last_login_ip IS '最后登录 IP';
```

### 2.2 管理员角色表 (admin_roles)

存储管理员角色定义和权限配置。

```sql
CREATE TABLE admin_roles (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 角色信息
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- 权限配置 (JSONB 存储权限代码列表)
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- 系统角色标识 (系统角色不可删除)
    is_system BOOLEAN DEFAULT FALSE,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id),

    -- 软删除
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_admin_roles_name ON admin_roles(name);
CREATE INDEX idx_admin_roles_is_system ON admin_roles(is_system);

-- 注释
COMMENT ON TABLE admin_roles IS '管理员角色表';
COMMENT ON COLUMN admin_roles.id IS '角色 ID';
COMMENT ON COLUMN admin_roles.name IS '角色名称';
COMMENT ON COLUMN admin_roles.permissions IS '权限代码列表 (JSONB 数组)';
COMMENT ON COLUMN admin_roles.is_system IS '是否系统角色 (不可删除)';

-- 初始化系统角色数据
INSERT INTO admin_roles (id, name, description, permissions, is_system) VALUES
('00000000-0000-0000-0000-000000000001', 'Super Admin', '超级管理员，拥有所有权限',
 '["*"]'::jsonb, true),

('00000000-0000-0000-0000-000000000002', 'Admin', '管理员，日常运营管理',
 '["dashboard:*", "user:view", "user:edit", "user:ban", "kol:view", "kol:review",
   "kol:approve", "kol:reject", "content:view", "content:review", "campaign:view",
   "campaign:review", "order:view", "finance:view", "analytics:view"]'::jsonb, true),

('00000000-0000-0000-0000-000000000003', 'Moderator', '审核员，KOL 和内容审核',
 '["dashboard:view", "kol:view", "kol:review", "kol:approve", "kol:reject",
   "content:view", "content:review", "content:approve", "content:reject"]'::jsonb, true),

('00000000-0000-0000-0000-000000000004', 'Finance', '财务管理员',
 '["dashboard:view", "finance:view", "finance:export", "withdrawal:review",
   "withdrawal:approve", "withdrawal:reject", "order:view", "analytics:view"]'::jsonb, true),

('00000000-0000-0000-0000-000000000005', 'Analyst', '数据分析师',
 '["dashboard:view", "dashboard:export", "analytics:view", "analytics:export"]'::jsonb, true);
```

### 2.3 管理员权限表 (admin_permissions)

存储权限点定义（可选，用于动态权限管理）。

```sql
CREATE TABLE admin_permissions (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 权限信息
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_admin_permissions_code ON admin_permissions(code);
CREATE INDEX idx_admin_permissions_module ON admin_permissions(module);

-- 注释
COMMENT ON TABLE admin_permissions IS '管理员权限表';
COMMENT ON COLUMN admin_permissions.code IS '权限代码 (如 user:view)';
COMMENT ON COLUMN admin_permissions.name IS '权限名称';
COMMENT ON COLUMN admin_permissions.module IS '所属模块';

-- 初始化权限数据
INSERT INTO admin_permissions (code, name, description, module) VALUES
-- 数据看板
('dashboard:view', '查看数据看板', '查看平台数据总览', 'dashboard'),
('dashboard:export', '导出数据', '导出数据报表', 'dashboard'),

-- 用户管理
('user:view', '查看用户', '查看用户列表和详情', 'user'),
('user:create', '创建用户', '创建新用户账号', 'user'),
('user:edit', '编辑用户', '修改用户信息', 'user'),
('user:delete', '删除用户', '删除用户账号', 'user'),
('user:ban', '封禁用户', '封禁违规用户', 'user'),
('user:unban', '解封用户', '解封被封禁用户', 'user'),
('user:reset_password', '重置密码', '重置用户登录密码', 'user'),

-- KOL 管理
('kol:view', '查看 KOL', '查看 KOL 列表和详情', 'kol'),
('kol:review', '审核 KOL', '审核 KOL 认证申请', 'kol'),
('kol:approve', '通过审核', '通过 KOL 认证', 'kol'),
('kol:reject', '拒绝审核', '拒绝 KOL 认证', 'kol'),
('kol:verify', '人工认证', '人工认证 KOL', 'kol'),
('kol:suspend', '暂停 KOL', '暂停 KOL 接单资格', 'kol'),
('kol:blacklist', '加入黑名单', '将 KOL 加入黑名单', 'kol'),

-- 内容审核
('content:view', '查看内容', '查看待审核内容', 'content'),
('content:review', '审核内容', '审核用户提交的内容', 'content'),
('content:approve', '通过审核', '通过内容审核', 'content'),
('content:reject', '拒绝审核', '拒绝内容审核', 'content'),
('content:delete', '删除内容', '删除违规内容', 'content'),

-- 活动管理
('campaign:view', '查看活动', '查看活动列表和详情', 'campaign'),
('campaign:review', '审核活动', '审核新创建的活动', 'campaign'),
('campaign:manage', '管理活动', '管理活动状态', 'campaign'),

-- 订单管理
('order:view', '查看订单', '查看订单列表和详情', 'order'),
('order:manage', '管理订单', '管理订单状态', 'order'),
('order:export', '导出订单', '导出订单数据', 'order'),

-- 财务管理
('finance:view', '查看财务', '查看交易记录和报表', 'finance'),
('finance:export', '导出报表', '导出财务报表', 'finance'),
('withdrawal:review', '审核提现', '审核 KOL 提现申请', 'finance'),
('withdrawal:approve', '通过提现', '批准提现申请', 'finance'),
('withdrawal:reject', '拒绝提现', '拒绝提现申请', 'finance'),
('recharge:confirm', '确认充值', '确认广告主充值', 'finance'),
('finance:adjustment', '余额调整', '调整用户账户余额', 'finance'),

-- 数据统计
('analytics:view', '查看分析', '查看数据分析', 'analytics'),
('analytics:export', '导出分析', '导出分析数据', 'analytics'),

-- 系统设置
('settings:view', '查看设置', '查看系统设置', 'settings'),
('settings:edit', '修改设置', '修改系统配置', 'settings'),
('settings:roles:manage', '角色管理', '管理角色和权限', 'settings'),
('settings:admins:manage', '管理员管理', '管理管理员账号', 'settings'),
('settings:audit:view', '查看审计', '查看操作审计日志', 'settings'),
('settings:audit:export', '导出审计', '导出审计日志', 'settings');
```

### 2.4 管理员审计日志表 (admin_audit_logs)

存储管理员操作审计日志。

```sql
CREATE TABLE admin_audit_logs (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 操作人信息
    admin_id UUID NOT NULL REFERENCES admins(id),
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    admin_role VARCHAR(100),

    -- 操作信息
    action VARCHAR(50) NOT NULL,  -- create, update, delete, approve, reject, ban, unban, export, login, logout
    resource_type VARCHAR(100) NOT NULL,  -- user, kol, content, withdrawal, settings
    resource_id UUID,
    resource_name VARCHAR(255),

    -- 请求信息
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(512) NOT NULL,
    request_body JSONB,

    -- 响应信息
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
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_ip ON admin_audit_logs(ip_address);
CREATE INDEX idx_admin_audit_logs_status ON admin_audit_logs(status);

-- 分区表（按月分区）
-- CREATE TABLE admin_audit_logs_2026_03 PARTITION OF admin_audit_logs
--     FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 注释
COMMENT ON TABLE admin_audit_logs IS '管理员审计日志表';
COMMENT ON COLUMN admin_audit_logs.action IS '操作类型';
COMMENT ON COLUMN admin_audit_logs.resource_type IS '资源类型';
COMMENT ON COLUMN admin_audit_logs.request_body IS '请求体 (JSONB)';
COMMENT ON COLUMN admin_audit_logs.old_values IS '旧值 (JSONB)';
COMMENT ON COLUMN admin_audit_logs.new_values IS '新值 (JSONB)';
COMMENT ON COLUMN admin_audit_logs.geo_location IS '地理位置 {country, region, city}';
```

---

## 3. 业务表结构

### 3.1 用户表 (users)

存储平台用户基础信息。

```sql
CREATE TABLE users (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 账号信息
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE,

    -- 基本信息
    nickname VARCHAR(100),
    avatar_url VARCHAR(512),
    real_name VARCHAR(100),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),

    -- 用户角色
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'advertiser', 'kol')),

    -- 账号状态
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),

    -- 验证状态
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verified_at TIMESTAMPTZ,

    -- 偏好设置
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    currency VARCHAR(3) DEFAULT 'CNY',

    -- 登录信息
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- 封禁信息
    banned_at TIMESTAMPTZ,
    banned_until TIMESTAMPTZ,
    ban_reason TEXT,
    banned_by UUID REFERENCES admins(id),

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_banned ON users(status, banned_at);

-- 注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.role IS '用户角色：user-普通用户，advertiser-广告主，kol-KOL';
COMMENT ON COLUMN users.status IS '账号状态：active-正常，suspended-冻结，banned-封禁';
```

### 3.2 广告主表 (advertisers)

存储广告主详细信息。

```sql
CREATE TABLE advertisers (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户关联
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- 企业信息
    company_name VARCHAR(255) NOT NULL,
    business_license VARCHAR(100),
    business_license_url VARCHAR(512),
    tax_id VARCHAR(100),

    -- 联系人信息
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),

    -- 认证状态
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES admins(id),
    rejection_reason TEXT,

    -- 钱包信息
    wallet_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    frozen_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_recharge DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- 统计信息
    total_campaigns INTEGER NOT NULL DEFAULT 0,
    active_campaigns INTEGER NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_advertisers_user_id ON advertisers(user_id);
CREATE INDEX idx_advertisers_verification_status ON advertisers(verification_status);
CREATE INDEX idx_advertisers_company_name ON advertisers(company_name);

-- 注释
COMMENT ON TABLE advertisers IS '广告主表';
COMMENT ON COLUMN advertisers.verification_status IS '认证状态：pending-待审核，approved-已通过，rejected-已拒绝';
COMMENT ON COLUMN advertisers.wallet_balance IS '可用余额';
COMMENT ON COLUMN advertisers.frozen_balance IS '冻结余额';
```

### 3.3 KOL 表 (kols)

存储 KOL 详细信息和社交账号数据。

```sql
CREATE TABLE kols (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户关联
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- 平台信息
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo', 'douyin')),
    platform_id VARCHAR(255) NOT NULL,  -- 平台用户 ID
    platform_username VARCHAR(255) NOT NULL,  -- 平台用户名
    platform_display_name VARCHAR(255),  -- 平台显示名称
    platform_avatar_url VARCHAR(512),

    -- 账号数据
    bio TEXT,
    category VARCHAR(50),  -- 主分类
    subcategory VARCHAR(50),  -- 子分类
    country VARCHAR(2),  -- 国家代码

    -- 粉丝数据
    followers INTEGER NOT NULL DEFAULT 0,
    following INTEGER NOT NULL DEFAULT 0,
    total_videos INTEGER NOT NULL DEFAULT 0,
    avg_views INTEGER NOT NULL DEFAULT 0,
    avg_likes INTEGER NOT NULL DEFAULT 0,
    avg_comments INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,  -- 互动率

    -- 定价信息
    base_price DECIMAL(10, 2),  -- 基础报价

    -- 认证状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'verified', 'suspended', 'banned')),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES admins(id),
    rejection_reason TEXT,

    -- 评级
    rating VARCHAR(1) CHECK (rating IN ('S', 'A', 'B', 'C')),
    rating_updated_at TIMESTAMPTZ,

    -- 黑名单
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklisted_at TIMESTAMPTZ,
    blacklisted_reason TEXT,
    blacklisted_by UUID REFERENCES admins(id),

    -- 暂停信息
    suspended_at TIMESTAMPTZ,
    suspended_until TIMESTAMPTZ,
    suspended_reason TEXT,

    -- 标签
    tags TEXT[] DEFAULT '{}',

    -- 数据同步
    last_synced_at TIMESTAMPTZ,

    -- 统计信息
    total_orders INTEGER NOT NULL DEFAULT 0,
    completed_orders INTEGER NOT NULL DEFAULT 0,
    total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_kols_user_id ON kols(user_id);
CREATE INDEX idx_kols_platform ON kols(platform);
CREATE INDEX idx_kols_status ON kols(status);
CREATE INDEX idx_kols_verified ON kols(verified);
CREATE INDEX idx_kols_followers ON kols(followers);
CREATE INDEX idx_kols_rating ON kols(rating);
CREATE INDEX idx_kols_blacklisted ON kols(is_blacklisted);
CREATE INDEX idx_kols_category ON kols(category);

-- 注释
COMMENT ON TABLE kols IS 'KOL 表';
COMMENT ON COLUMN kols.status IS 'KOL 状态：pending-待审核，active-活跃，verified-已认证，suspended-暂停，banned-封禁';
COMMENT ON COLUMN kols.engagement_rate IS '互动率 (0-1 之间的小数)';
COMMENT ON COLUMN kols.rating IS '评级：S/A/B/C';
```

### 3.4 活动表 (campaigns)

存储广告活动信息。

```sql
CREATE TABLE campaigns (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 广告主关联
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),

    -- 活动信息
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),

    -- 预算信息
    budget DECIMAL(12, 2) NOT NULL,
    spent_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    pricing_model VARCHAR(20) CHECK (pricing_model IN ('fixed', 'cpm', 'cpc', 'cpa')),

    -- 时间信息
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- 目标受众
    target_audience JSONB,  -- {age_range, gender, locations, interests}

    -- 审核状态
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'active', 'paused', 'completed', 'cancelled')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    rejection_reason TEXT,

    -- 统计信息
    total_orders INTEGER NOT NULL DEFAULT 0,
    completed_orders INTEGER NOT NULL DEFAULT 0,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_campaigns_advertiser_id ON campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX idx_campaigns_category ON campaigns(category);

-- 注释
COMMENT ON TABLE campaigns IS '活动表';
COMMENT ON COLUMN campaigns.target_audience IS '目标受众配置 (JSONB)';
COMMENT ON COLUMN campaigns.status IS '活动状态';
```

### 3.5 订单表 (orders)

存储订单信息。

```sql
CREATE TABLE orders (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 订单号
    order_no VARCHAR(50) NOT NULL UNIQUE,

    -- 关联信息
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    kol_id UUID NOT NULL REFERENCES kols(id),

    -- 订单信息
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverables JSONB,  -- {content_type, quantity, requirements}

    -- 价格信息
    amount DECIMAL(12, 2) NOT NULL,
    platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    kol_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- 订单状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN (
            'pending_payment',  -- 待付款
            'pending_acceptance',  -- 待接单
            'in_progress',  -- 进行中
            'pending_review',  -- 待审核
            'pending_revision',  -- 待修改
            'pending_publish',  -- 待发布
            'completed',  -- 已完成
            'cancelled',  -- 已取消
            'disputed'  -- 纠纷中
        )),

    -- 时间信息
    accepted_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- 取消/纠纷信息
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),  -- advertiser, kol, admin

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_campaign_id ON orders(campaign_id);
CREATE INDEX idx_orders_advertiser_id ON orders(advertiser_id);
CREATE INDEX idx_orders_kol_id ON orders(kol_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 注释
COMMENT ON TABLE orders IS '订单表';
COMMENT ON COLUMN orders.deliverables IS '交付要求 (JSONB)';
COMMENT ON COLUMN orders.status IS '订单状态';
```

### 3.6 订单纠纷表 (order_disputes)

存储订单纠纷信息。

```sql
CREATE TABLE order_disputes (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 订单关联
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),

    -- 纠纷信息
    raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('advertiser', 'kol')),
    reason TEXT NOT NULL,
    evidence_urls TEXT[],

    -- 处理状态
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),

    -- 处理信息
    assigned_to UUID REFERENCES admins(id),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES admins(id),

    -- 仲裁结果
    ruling VARCHAR(20) CHECK (ruling IN ('advertiser', 'kol', 'split', 'refund')),
    refund_amount DECIMAL(12, 2),

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_disputes_order_id ON order_disputes(order_id);
CREATE INDEX idx_disputes_status ON order_disputes(status);
CREATE INDEX idx_disputes_assigned_to ON order_disputes(assigned_to);

-- 注释
COMMENT ON TABLE order_disputes IS '订单纠纷表';
```

### 3.7 交易表 (transactions)

存储所有交易流水。

```sql
CREATE TABLE transactions (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 交易号
    transaction_no VARCHAR(50) NOT NULL UNIQUE,

    -- 用户关联
    user_id UUID NOT NULL REFERENCES users(id),
    advertiser_id UUID REFERENCES advertisers(id),
    kol_id UUID REFERENCES kols(id),

    -- 交易信息
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'recharge',  -- 充值
        'order_payment',  -- 订单支付
        'withdrawal',  -- 提现
        'refund',  -- 退款
        'commission',  -- 佣金
        'adjustment'  -- 调整
    )),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',

    -- 支付信息
    payment_method VARCHAR(50),  -- alipay, wechat, paypal, bank_transfer
    payment_ref VARCHAR(255),  -- 第三方支付参考号

    -- 订单关联
    order_id UUID REFERENCES orders(id),

    -- 余额变更
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,

    -- 交易状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- 描述和备注
    description TEXT,
    admin_note TEXT,

    -- 时间信息
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id)  -- 管理员操作时记录
);

-- 索引
CREATE INDEX idx_transactions_transaction_no ON transactions(transaction_no);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);

-- 注释
COMMENT ON TABLE transactions IS '交易表';
COMMENT ON COLUMN transactions.type IS '交易类型';
```

### 3.8 提现表 (withdrawals)

存储 KOL 提现申请。

```sql
CREATE TABLE withdrawals (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 提现号
    withdrawal_no VARCHAR(50) NOT NULL UNIQUE,

    -- KOL 关联
    kol_id UUID NOT NULL REFERENCES kols(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- 提现信息
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL,  -- 净额 = amount - fee

    -- 收款方式
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('paypal', 'bank_transfer', 'alipay', 'wechat')),
    payment_account VARCHAR(255) NOT NULL,  -- 收款账号
    payment_account_name VARCHAR(255),  -- 收款人姓名

    -- 银行信息 (银行转账时)
    bank_info JSONB,  -- {bank_name, account_number, routing_number, swift_code}

    -- 审核状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled')),

    -- 审核信息
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    rejection_reason TEXT,
    admin_note TEXT,

    -- 处理信息
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES admins(id),
    payment_ref VARCHAR(255),  -- 支付参考号

    -- KOL 余额快照
    available_balance DECIMAL(12, 2),
    pending_balance DECIMAL(12, 2),

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_withdrawals_withdrawal_no ON withdrawals(withdrawal_no);
CREATE INDEX idx_withdrawals_kol_id ON withdrawals(kol_id);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX idx_withdrawals_reviewed_by ON withdrawals(reviewed_by);

-- 注释
COMMENT ON TABLE withdrawals IS '提现表';
COMMENT ON COLUMN withdrawals.bank_info IS '银行信息 (JSONB)';
COMMENT ON COLUMN withdrawals.status IS '提现状态';
```

### 3.9 内容审核表 (content_reviews)

存储内容审核记录。

```sql
CREATE TABLE content_reviews (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 内容信息
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('video', 'image', 'post', 'article')),
    source_type VARCHAR(50) NOT NULL,  -- kol_profile, campaign_content, user_report
    source_id UUID,  -- 来源 ID

    -- 内容详情
    title VARCHAR(255),
    description TEXT,
    content_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512),
    duration INTEGER,  -- 视频时长 (秒)

    -- 提交者
    submitter_id UUID NOT NULL REFERENCES users(id),
    kol_id UUID REFERENCES kols(id),

    -- 关联信息
    order_id UUID REFERENCES orders(id),
    campaign_id UUID REFERENCES campaigns(id),

    -- AI 审核结果
    ai_score INTEGER,  -- AI 评分 (0-100)
    ai_flags TEXT[],  -- AI 标记的问题
    ai_suggestions TEXT[],

    -- 审核状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),

    -- 审核结果
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    review_result VARCHAR(10) CHECK (review_result IN ('approved', 'rejected')),
    rejection_reason TEXT,
    revision_note TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_content_reviews_source ON content_reviews(source_type, source_id);
CREATE INDEX idx_content_reviews_submitter ON content_reviews(submitter_id);
CREATE INDEX idx_content_reviews_status ON content_reviews(status);
CREATE INDEX idx_content_reviews_priority ON content_reviews(priority);
CREATE INDEX idx_content_reviews_created_at ON content_reviews(created_at);
CREATE INDEX idx_content_reviews_reviewed_by ON content_reviews(reviewed_by);

-- 注释
COMMENT ON TABLE content_reviews IS '内容审核表';
COMMENT ON COLUMN content_reviews.ai_score IS 'AI 审核评分';
COMMENT ON COLUMN content_reviews.ai_flags IS 'AI 标记的问题列表';
```

### 3.10 KOL 数据历史表 (kol_stats_history)

存储 KOL 数据变化历史。

```sql
CREATE TABLE kol_stats_history (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- KOL 关联
    kol_id UUID NOT NULL REFERENCES kols(id),

    -- 统计数据
    followers INTEGER NOT NULL DEFAULT 0,
    following INTEGER NOT NULL DEFAULT 0,
    total_videos INTEGER NOT NULL DEFAULT 0,
    avg_views INTEGER NOT NULL DEFAULT 0,
    avg_likes INTEGER NOT NULL DEFAULT 0,
    avg_comments INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- 统计日期
    stats_date DATE NOT NULL,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_kol_stats_history_kol_id ON kol_stats_history(kol_id);
CREATE INDEX idx_kol_stats_history_date ON kol_stats_history(stats_date);
CREATE UNIQUE INDEX idx_kol_stats_unique ON kol_stats_history(kol_id, stats_date);

-- 注释
COMMENT ON TABLE kol_stats_history IS 'KOL 数据历史表';
```

### 3.11 充值表 (recharges)

存储广告主充值记录。

```sql
CREATE TABLE recharges (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 充值号
    recharge_no VARCHAR(50) NOT NULL UNIQUE,

    -- 广告主关联
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- 充值信息
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    bonus_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,  -- 赠送金额

    -- 支付信息
    payment_method VARCHAR(50) NOT NULL,
    payment_ref VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending',

    -- 凭证 (线下充值)
    voucher_url VARCHAR(512),

    -- 审核状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'completed', 'failed', 'cancelled')),

    -- 审核信息
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES admins(id),

    -- 余额变更
    balance_before DECIMAL(12, 2),
    balance_after DECIMAL(12, 2),

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_recharges_recharge_no ON recharges(recharge_no);
CREATE INDEX idx_recharges_advertiser_id ON recharges(advertiser_id);
CREATE INDEX idx_recharges_status ON recharges(status);
CREATE INDEX idx_recharges_created_at ON recharges(created_at);

-- 注释
COMMENT ON TABLE recharges IS '充值表';
```

---

## 4. 索引设计

### 4.1 核心表索引汇总

| 表名 | 索引名 | 索引字段 | 索引类型 | 说明 |
|-----|-------|---------|---------|------|
| admins | idx_admins_email | email | UNIQUE | 邮箱唯一索引 |
| admins | idx_admins_role_id | role_id | BTREE | 角色关联查询 |
| admins | idx_admins_status | status | BTREE | 状态筛选 |
| admin_roles | idx_admin_roles_name | name | UNIQUE | 角色名唯一 |
| admin_audit_logs | idx_admin_audit_logs_admin_id | admin_id | BTREE | 按管理员查询 |
| admin_audit_logs | idx_admin_audit_logs_action | action | BTREE | 按操作类型查询 |
| admin_audit_logs | idx_admin_audit_logs_resource | resource_type, resource_id | BTREE | 按资源查询 |
| admin_audit_logs | idx_admin_audit_logs_created_at | created_at DESC | BTREE | 时间排序 |

### 4.2 业务表索引汇总

| 表名 | 索引名 | 索引字段 | 索引类型 | 说明 |
|-----|-------|---------|---------|------|
| users | idx_users_email | email | UNIQUE | 邮箱唯一 |
| users | idx_users_phone | phone | UNIQUE | 手机唯一 |
| users | idx_users_role | role | BTREE | 角色筛选 |
| users | idx_users_status | status | BTREE | 状态筛选 |
| advertisers | idx_advertisers_user_id | user_id | UNIQUE | 用户关联 |
| advertisers | idx_advertisers_verification_status | verification_status | BTREE | 认证状态 |
| kols | idx_kols_user_id | user_id | UNIQUE | 用户关联 |
| kols | idx_kols_platform | platform | BTREE | 平台筛选 |
| kols | idx_kols_status | status | BTREE | 状态筛选 |
| kols | idx_kols_followers | followers | BTREE | 粉丝数排序 |
| kols | idx_kols_rating | rating | BTREE | 评级筛选 |
| campaigns | idx_campaigns_advertiser_id | advertiser_id | BTREE | 广告主关联 |
| campaigns | idx_campaigns_status | status | BTREE | 状态筛选 |
| orders | idx_orders_order_no | order_no | UNIQUE | 订单号唯一 |
| orders | idx_orders_campaign_id | campaign_id | BTREE | 活动关联 |
| orders | idx_orders_kol_id | kol_id | BTREE | KOL 关联 |
| orders | idx_orders_status | status | BTREE | 状态筛选 |
| transactions | idx_transactions_transaction_no | transaction_no | UNIQUE | 交易号唯一 |
| transactions | idx_transactions_user_id | user_id | BTREE | 用户关联 |
| transactions | idx_transactions_type | type | BTREE | 类型筛选 |
| withdrawals | idx_withdrawals_withdrawal_no | withdrawal_no | UNIQUE | 提现号唯一 |
| withdrawals | idx_withdrawals_status | status | BTREE | 状态筛选 |
| content_reviews | idx_content_reviews_status | status | BTREE | 状态筛选 |

### 4.3 复合索引设计

```sql
-- 用户列表常用查询
CREATE INDEX idx_users_role_status_created ON users(role, status, created_at DESC);

-- KOL 列表常用查询
CREATE INDEX idx_kols_platform_verified_followers ON kols(platform, verified, followers DESC);

-- 订单列表常用查询
CREATE INDEX idx_orders_advertiser_status_created ON orders(advertiser_id, status, created_at DESC);
CREATE INDEX idx_orders_kol_status_created ON orders(kol_id, status, created_at DESC);

-- 交易列表常用查询
CREATE INDEX idx_transactions_user_type_created ON transactions(user_id, type, created_at DESC);

-- 审计日志常用查询
CREATE INDEX idx_audit_admin_action_created ON admin_audit_logs(admin_id, action, created_at DESC);
```

---

## 5. 视图设计

### 5.1 管理员权限视图

```sql
CREATE VIEW v_admin_permissions AS
SELECT
    a.id AS admin_id,
    a.email AS admin_email,
    a.name AS admin_name,
    r.id AS role_id,
    r.name AS role_name,
    r.permissions,
    CASE
        WHEN r.permissions @> '["*"]'::jsonb THEN true
        ELSE false
    END AS is_super_admin
FROM admins a
JOIN admin_roles r ON a.role_id = r.id
WHERE a.deleted_at IS NULL AND r.deleted_at IS NULL;

COMMENT ON VIEW v_admin_permissions IS '管理员权限视图';
```

### 5.2 用户详情视图

```sql
CREATE VIEW v_user_details AS
SELECT
    u.id,
    u.email,
    u.phone,
    u.nickname,
    u.avatar_url,
    u.role,
    u.status,
    u.email_verified,
    u.phone_verified,
    u.created_at,
    u.last_login_at,
    -- 广告主信息
    adv.id AS advertiser_id,
    adv.company_name,
    adv.verification_status AS advertiser_verification,
    adv.wallet_balance,
    adv.total_spent,
    -- KOL 信息
    k.id AS kol_id,
    k.platform,
    k.platform_username,
    k.followers,
    k.verified AS kol_verified,
    k.rating AS kol_rating,
    -- 统计数据
    (SELECT COUNT(*) FROM campaigns WHERE advertiser_id = adv.id) AS total_campaigns,
    (SELECT COUNT(*) FROM orders WHERE advertiser_id = adv.id) AS total_orders
FROM users u
LEFT JOIN advertisers adv ON u.id = adv.user_id
LEFT JOIN kols k ON u.id = k.user_id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW v_user_details IS '用户详情视图';
```

### 5.3 财务总览视图

```sql
CREATE VIEW v_finance_overview AS
SELECT
    -- 总收入
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'recharge' AND status = 'completed') AS total_recharge,

    -- 总支出
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'withdrawal' AND status = 'completed') AS total_withdrawal,

    -- 平台佣金
    (SELECT COALESCE(SUM(platform_fee), 0) FROM orders
     WHERE status = 'completed') AS total_commission,

    -- 待审核提现
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals
     WHERE status = 'pending') AS pending_withdrawals,

    -- 今日收入
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'recharge' AND status = 'completed'
     AND DATE(created_at) = CURRENT_DATE) AS today_recharge,

    -- 今日支出
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'withdrawal' AND status = 'completed'
     AND DATE(created_at) = CURRENT_DATE) AS today_withdrawal;

COMMENT ON VIEW v_finance_overview IS '财务总览视图';
```

### 5.4 审核统计视图

```sql
CREATE VIEW v_review_stats AS
SELECT
    -- KOL 审核统计
    (SELECT COUNT(*) FROM kols WHERE status = 'pending') AS pending_kol_reviews,
    (SELECT COUNT(*) FROM kols WHERE verified = true) AS verified_kols,

    -- 内容审核统计
    (SELECT COUNT(*) FROM content_reviews WHERE status = 'pending') AS pending_content_reviews,
    (SELECT COUNT(*) FROM content_reviews
     WHERE status IN ('approved', 'rejected') AND DATE(reviewed_at) = CURRENT_DATE) AS today_content_reviews,

    -- 提现审核统计
    (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') AS pending_withdrawals;

COMMENT ON VIEW v_review_stats IS '审核统计视图';
```

---

## 6. 数据字典

### 6.1 枚举值定义

#### 用户状态 (user_status)

| 值 | 说明 | 前端展示 |
|---|------|---------|
| active | 正常 | 正常 |
| suspended | 冻结 | 冻结 |
| banned | 封禁 | 封禁 |

#### KOL 状态 (kol_status)

| 值 | 说明 | 前端展示 |
|---|------|---------|
| pending | 待审核 | 待审核 |
| active | 活跃 | 活跃 |
| verified | 已认证 | 已认证 |
| suspended | 暂停 | 暂停 |
| banned | 封禁 | 封禁 |

#### 审核状态 (review_status)

| 值 | 说明 | 前端展示 |
|---|------|---------|
| pending | 待审核 | 待审核 |
| approved | 已通过 | 已通过 |
| rejected | 已拒绝 | 已拒绝 |

#### 订单状态 (order_status)

| 值 | 说明 | 前端展示 |
|---|------|---------|
| pending_payment | 待付款 | 待付款 |
| pending_acceptance | 待接单 | 待接单 |
| in_progress | 进行中 | 进行中 |
| pending_review | 待审核 | 待审核 |
| pending_revision | 待修改 | 待修改 |
| pending_publish | 待发布 | 待发布 |
| completed | 已完成 | 已完成 |
| cancelled | 已取消 | 已取消 |
| disputed | 纠纷中 | 纠纷中 |

#### 交易状态 (transaction_status)

| 值 | 说明 | 前端展示 |
|---|------|---------|
| pending | 待处理 | 待处理 |
| processing | 处理中 | 处理中 |
| completed | 已完成 | 已完成 |
| failed | 失败 | 失败 |
| cancelled | 已取消 | 已取消 |

### 6.2 字段命名规范

| 类型 | 命名规范 | 示例 |
|-----|---------|------|
| 主键 | id | id |
| 外键 | {table}_id | user_id, advertiser_id |
| 布尔值 | is_/has_/can_ 开头 | is_verified, has_paid |
| 时间戳 | {action}_at | created_at, updated_at, deleted_at |
| 金额 | DECIMAL(12,2) | amount, balance, price |
| 状态 | status | status, verification_status |
| JSONB | 复数名词或描述性名称 | tags, settings, metadata |

### 6.3 数据保留策略

| 表名 | 保留策略 | 清理方式 |
|-----|---------|---------|
| admin_audit_logs | 永久保留 | 按月分区，历史数据归档 |
| users | 永久保留 | 软删除 |
| advertisers | 永久保留 | 软删除 |
| kols | 永久保留 | 软删除 |
| campaigns | 5 年 | 软删除 |
| orders | 5 年 | 软删除 |
| transactions | 永久保留 | 硬删除需审批 |
| withdrawals | 5 年 | 软删除 |
| content_reviews | 2 年 | 定期清理 |
| kol_stats_history | 1 年 | 定期清理 |

---

## 7. 附录

### 7.1 数据库配置

```sql
-- 字符集
CREATE DATABASE aiads
    WITH ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 模糊查询
CREATE EXTENSION IF NOT EXISTS "citext";   -- 大小写不敏感文本
```

### 7.2 数据库用户权限

```sql
-- 创建应用用户
CREATE USER aiads_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE aiads TO aiads_app;
GRANT USAGE ON SCHEMA public TO aiads_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aiads_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aiads_app;

-- 创建只读用户 (用于数据分析)
CREATE USER aiads_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE aiads TO aiads_readonly;
GRANT USAGE ON SCHEMA public TO aiads_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO aiads_readonly;
```

### 7.3 备份策略

| 备份类型 | 频率 | 保留时间 | 存储位置 |
|---------|------|---------|---------|
| 全量备份 | 每日 | 30 天 | S3/R2 |
| 增量备份 | 每小时 | 7 天 | S3/R2 |
| WAL 归档 | 实时 | 7 天 | S3/R2 |

---

*本文档由 AIAds 架构团队编写，仅供内部使用*
*保密级别：内部机密*
