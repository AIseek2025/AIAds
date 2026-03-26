# AIAds 管理后台 - 剩余模块数据库设计文档

**文档版本**: 1.0
**创建日期**: 2026 年 3 月 25 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密
**状态**: 已审批

---

## 目录

1. [ER 图](#1-er 图)
2. [新增表结构](#2-新增表结构)
3. [索引设计](#3-索引设计)
4. [数据迁移](#4-数据迁移)
5. [数据字典](#5-数据字典)

---

## 1. ER 图

### 1.1 剩余模块实体关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  AIAds Admin Remaining Modules ER Diagram                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   advertisers    │
│   (广告主表)      │
│   - 已有表        │
└────────┬─────────┘
         │ 1:N
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│ advertiser_      │  │ advertiser_      │
│ verifications    │  │ consumptions     │
│ (认证表)          │  │ (消费表)          │
│ - 新增           │  │ - 新增           │
└──────────────────┘  └──────────────────┘


┌──────────────────┐
│   campaigns      │
│   (活动表)        │
│   - 已有表        │
└────────┬─────────┘
         │ 1:N
         │
         ▼
┌──────────────────┐
│ campaign_stats   │
│ (统计表)          │
│ - 新增           │
└──────────────────┘


┌──────────────────┐
│     orders       │
│   (订单表)        │
│   - 已有表        │
└────────┬─────────┘
         │ 1:1
         │
         ▼
┌──────────────────┐
│ order_disputes   │
│ (纠纷表)          │
│ - 已有表          │
└──────────────────┘


┌──────────────────┐
│    settings      │
│ (系统配置表)      │
│ - 新增           │
└──────────────────┘

┌──────────────────┐
│ sensitive_words  │
│  (敏感词表)       │
│ - 新增           │
└──────────────────┘
```

### 1.2 表关系说明

| 关系 | 说明 |
|-----|------|
| advertisers → advertiser_verifications | 1:1 - 广告主与认证信息一对一 |
| advertisers → advertiser_consumptions | 1:N - 广告主产生多条消费记录 |
| campaigns → campaign_stats | 1:1 - 活动与统计数据一对一 |
| orders → order_disputes | 1:1 - 订单与纠纷一对一（可选） |

---

## 2. 新增表结构

### 2.1 广告主认证表 (advertiser_verifications)

**用途**: 存储广告主企业认证详细信息和审核记录。

```sql
CREATE TABLE advertiser_verifications (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 广告主关联
    advertiser_id UUID NOT NULL UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE,

    -- 企业信息
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255),
    business_license VARCHAR(100) NOT NULL,
    business_license_url VARCHAR(512),
    tax_id VARCHAR(100),
    legal_representative VARCHAR(100) NOT NULL,

    -- 认证资料
    business_license_images TEXT[],
    legal_representative_id_front VARCHAR(512),
    legal_representative_id_back VARCHAR(512),
    authorization_letter_url VARCHAR(512),

    -- 审核信息
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    rejection_reason TEXT,
    review_notes TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_advertiser_verifications_advertiser_id ON advertiser_verifications(advertiser_id);
CREATE INDEX idx_advertiser_verifications_status ON advertiser_verifications(status);
CREATE INDEX idx_advertiser_verifications_submitted_at ON advertiser_verifications(submitted_at);
CREATE INDEX idx_advertiser_verifications_reviewed_at ON advertiser_verifications(reviewed_at);

-- 注释
COMMENT ON TABLE advertiser_verifications IS '广告主认证表';
COMMENT ON COLUMN advertiser_verifications.id IS '认证记录 ID';
COMMENT ON COLUMN advertiser_verifications.advertiser_id IS '广告主 ID';
COMMENT ON COLUMN advertiser_verifications.company_name IS '公司名称';
COMMENT ON COLUMN advertiser_verifications.company_name_en IS '公司英文名称';
COMMENT ON COLUMN advertiser_verifications.business_license IS '营业执照号';
COMMENT ON COLUMN advertiser_verifications.business_license_url IS '营业执照图片 URL';
COMMENT ON COLUMN advertiser_verifications.tax_id IS '税号';
COMMENT ON COLUMN advertiser_verifications.legal_representative IS '法人代表';
COMMENT ON COLUMN advertiser_verifications.business_license_images IS '营业执照图片 URL 数组';
COMMENT ON COLUMN advertiser_verifications.legal_representative_id_front IS '法人身份证正面 URL';
COMMENT ON COLUMN advertiser_verifications.legal_representative_id_back IS '法人身份证反面 URL';
COMMENT ON COLUMN advertiser_verifications.authorization_letter_url IS '授权书 URL';
COMMENT ON COLUMN advertiser_verifications.status IS '认证状态：pending-待审核，submitted-已提交，approved-已通过，rejected-已拒绝';
COMMENT ON COLUMN advertiser_verifications.submitted_at IS '提交时间';
COMMENT ON COLUMN advertiser_verifications.reviewed_at IS '审核时间';
COMMENT ON COLUMN advertiser_verifications.reviewed_by IS '审核人 ID';
COMMENT ON COLUMN advertiser_verifications.rejection_reason IS '拒绝原因';
COMMENT ON COLUMN advertiser_verifications.review_notes IS '审核备注';
```

---

### 2.2 广告主消费表 (advertiser_consumptions)

**用途**: 存储广告主所有消费交易记录。

```sql
CREATE TABLE advertiser_consumptions (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 交易号
    transaction_no VARCHAR(50) NOT NULL UNIQUE,

    -- 广告主关联
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- 订单/活动关联
    order_id UUID REFERENCES orders(id),
    campaign_id UUID REFERENCES campaigns(id),

    -- 消费信息
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('order_payment', 'campaign_boost', 'service_fee', 'refund')),

    -- 余额变更
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- 描述
    description TEXT,

    -- 时间信息
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_advertiser_consumptions_transaction_no ON advertiser_consumptions(transaction_no);
CREATE INDEX idx_advertiser_consumptions_advertiser_id ON advertiser_consumptions(advertiser_id);
CREATE INDEX idx_advertiser_consumptions_user_id ON advertiser_consumptions(user_id);
CREATE INDEX idx_advertiser_consumptions_order_id ON advertiser_consumptions(order_id);
CREATE INDEX idx_advertiser_consumptions_campaign_id ON advertiser_consumptions(campaign_id);
CREATE INDEX idx_advertiser_consumptions_type ON advertiser_consumptions(type);
CREATE INDEX idx_advertiser_consumptions_status ON advertiser_consumptions(status);
CREATE INDEX idx_advertiser_consumptions_created_at ON advertiser_consumptions(created_at DESC);
CREATE INDEX idx_advertiser_consumptions_completed_at ON advertiser_consumptions(completed_at);

-- 注释
COMMENT ON TABLE advertiser_consumptions IS '广告主消费表';
COMMENT ON COLUMN advertiser_consumptions.id IS '消费记录 ID';
COMMENT ON COLUMN advertiser_consumptions.transaction_no IS '交易号';
COMMENT ON COLUMN advertiser_consumptions.advertiser_id IS '广告主 ID';
COMMENT ON COLUMN advertiser_consumptions.user_id IS '用户 ID';
COMMENT ON COLUMN advertiser_consumptions.order_id IS '订单 ID';
COMMENT ON COLUMN advertiser_consumptions.campaign_id IS '活动 ID';
COMMENT ON COLUMN advertiser_consumptions.amount IS '消费金额';
COMMENT ON COLUMN advertiser_consumptions.type IS '消费类型：order_payment-订单支付，campaign_boost-活动推广，service_fee-服务费，refund-退款';
COMMENT ON COLUMN advertiser_consumptions.balance_before IS '消费前余额';
COMMENT ON COLUMN advertiser_consumptions.balance_after IS '消费后余额';
COMMENT ON COLUMN advertiser_consumptions.status IS '状态：pending-待处理，completed-已完成，failed-失败，refunded-已退款';
COMMENT ON COLUMN advertiser_consumptions.description IS '消费描述';
COMMENT ON COLUMN advertiser_consumptions.completed_at IS '完成时间';
COMMENT ON COLUMN advertiser_consumptions.refunded_at IS '退款时间';
```

---

### 2.3 活动统计表 (campaign_stats)

**用途**: 存储活动效果统计数据，支持数据分析和报表。

```sql
CREATE TABLE campaign_stats (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 活动关联
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,

    -- 曝光数据
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    click_through_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- 互动数据
    total_likes INTEGER NOT NULL DEFAULT 0,
    total_comments INTEGER NOT NULL DEFAULT 0,
    total_shares INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- 转化数据
    total_conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- ROI 数据
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    roi DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- 覆盖数据
    estimated_reach INTEGER NOT NULL DEFAULT 0,
    actual_reach INTEGER NOT NULL DEFAULT 0,

    -- KOL 数据
    total_kols INTEGER NOT NULL DEFAULT 0,
    applied_kols INTEGER NOT NULL DEFAULT 0,
    selected_kols INTEGER NOT NULL DEFAULT 0,
    published_videos INTEGER NOT NULL DEFAULT 0,

    -- 效果评分
    performance_score VARCHAR(20)
        CHECK (performance_score IN ('excellent', 'good', 'average', 'poor')),

    -- 数据日期
    stats_date DATE NOT NULL,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_campaign_stats_campaign_id ON campaign_stats(campaign_id);
CREATE INDEX idx_campaign_stats_stats_date ON campaign_stats(stats_date);
CREATE INDEX idx_campaign_stats_performance_score ON campaign_stats(performance_score);
CREATE INDEX idx_campaign_stats_created_at ON campaign_stats(created_at);

-- 注释
COMMENT ON TABLE campaign_stats IS '活动统计表';
COMMENT ON COLUMN campaign_stats.id IS '统计数据 ID';
COMMENT ON COLUMN campaign_stats.campaign_id IS '活动 ID';
COMMENT ON COLUMN campaign_stats.total_impressions IS '总曝光数';
COMMENT ON COLUMN campaign_stats.total_clicks IS '总点击数';
COMMENT ON COLUMN campaign_stats.click_through_rate IS '点击率 (CTR)';
COMMENT ON COLUMN campaign_stats.total_likes IS '总点赞数';
COMMENT ON COLUMN campaign_stats.total_comments IS '总评论数';
COMMENT ON COLUMN campaign_stats.total_shares IS '总分享数';
COMMENT ON COLUMN campaign_stats.engagement_rate IS '互动率';
COMMENT ON COLUMN campaign_stats.total_conversions IS '总转化数';
COMMENT ON COLUMN campaign_stats.conversion_rate IS '转化率';
COMMENT ON COLUMN campaign_stats.total_cost IS '总成本';
COMMENT ON COLUMN campaign_stats.total_revenue IS '总收入';
COMMENT ON COLUMN campaign_stats.roi IS '投资回报率';
COMMENT ON COLUMN campaign_stats.estimated_reach IS '预估覆盖人数';
COMMENT ON COLUMN campaign_stats.actual_reach IS '实际覆盖人数';
COMMENT ON COLUMN campaign_stats.total_kols IS '参与 KOL 总数';
COMMENT ON COLUMN campaign_stats.applied_kols IS '申请 KOL 数';
COMMENT ON COLUMN campaign_stats.selected_kols IS '选中 KOL 数';
COMMENT ON COLUMN campaign_stats.published_videos IS '已发布视频数';
COMMENT ON COLUMN campaign_stats.performance_score IS '效果评分：excellent-优秀，good-良好，average-一般，poor-差';
COMMENT ON COLUMN campaign_stats.stats_date IS '统计数据日期';
```

---

### 2.4 系统配置表 (settings)

**用途**: 存储系统各项配置参数，支持动态配置。

```sql
CREATE TABLE settings (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 配置键
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_group VARCHAR(50) NOT NULL,  -- basic, email, sms, storage, security

    -- 配置值 (JSONB 存储复杂配置)
    config_value JSONB NOT NULL,

    -- 配置描述
    description TEXT,

    -- 是否可修改
    is_editable BOOLEAN DEFAULT TRUE,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES admins(id)
);

-- 索引
CREATE INDEX idx_settings_config_group ON settings(config_group);
CREATE INDEX idx_settings_config_key ON settings(config_key);

-- 注释
COMMENT ON TABLE settings IS '系统配置表';
COMMENT ON COLUMN settings.id IS '配置 ID';
COMMENT ON COLUMN settings.config_key IS '配置键';
COMMENT ON COLUMN settings.config_group IS '配置分组：basic-基础，email-邮件，sms-短信，storage-存储，security-安全';
COMMENT ON COLUMN settings.config_value IS '配置值 (JSONB 格式)';
COMMENT ON COLUMN settings.description IS '配置描述';
COMMENT ON COLUMN settings.is_editable IS '是否可修改';
COMMENT ON COLUMN settings.updated_by IS '最后更新人 ID';

-- 初始化配置数据
INSERT INTO settings (config_key, config_group, config_value, description, is_editable) VALUES
-- 基础配置
('platform_name', 'basic', '"AIAds 影响者营销平台"', '平台名称', true),
('platform_logo', 'basic', '"/logo.svg"', '平台 Logo URL', true),
('platform_url', 'basic', '"https://aiads.com"', '平台 URL', true),
('customer_service_email', 'basic', '"support@aiads.com"', '客服邮箱', true),
('customer_service_phone', 'basic', '"400-XXX-XXXX"', '客服电话', true),
('timezone', 'basic', '"Asia/Shanghai"', '时区', true),
('default_language', 'basic', '"zh-CN"', '默认语言', true),

-- 邮件配置
('smtp_server', 'email', '"smtp.example.com"', 'SMTP 服务器', true),
('smtp_port', 'email', '587', 'SMTP 端口', true),
('smtp_encryption', 'email', '"TLS"', 'SMTP 加密方式', true),
('sender_email', 'email', '"noreply@aiads.com"', '发件人邮箱', true),
('sender_name', 'email', '"AIAds 平台"', '发件人名称', true),

-- 短信配置
('sms_provider', 'sms', '"aliyun"', '短信服务商', true),
('sms_signature', 'sms', '"AIAds 平台"', '短信签名', true),
('sms_template_id', 'sms', '"SMS_123456789"', '短信模板 ID', true),

-- 存储配置
('storage_provider', 'storage', '"aws_s3"', '存储服务商', true),
('storage_bucket', 'storage', '"aiads-assets"', '存储桶名称', true),
('storage_region', 'storage', '"ap-southeast-1"', '存储区域', true),
('storage_cdn_domain', 'storage', '"https://cdn.aiads.com"', 'CDN 域名', true),

-- 安全配置
('password_min_length', 'security', '8', '密码最小长度', false),
('password_require_uppercase', 'security', 'true', '密码要求大写字母', false),
('password_require_lowercase', 'security', 'true', '密码要求小写字母', false),
('password_require_number', 'security', 'true', '密码要求数字', false),
('password_require_special', 'security', 'true', '密码要求特殊字符', false),
('login_lockout_attempts', 'security', '5', '登录失败锁定次数', false),
('login_lockout_duration_minutes', 'security', '30', '登录锁定时长 (分钟)', false),
('session_timeout_minutes', 'security', '120', 'Session 超时时间 (分钟)', false),
('require_mfa', 'security', 'false', '是否强制 MFA', false)
ON CONFLICT (config_key) DO NOTHING;
```

---

### 2.5 敏感词表 (sensitive_words)

**用途**: 存储系统敏感词库，用于内容审核和过滤。

```sql
CREATE TABLE sensitive_words (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 敏感词
    word VARCHAR(255) NOT NULL,

    -- 分类
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('political', 'illegal', 'pornographic', 'violent', 'spam', 'other')),

    -- 严重程度
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    -- 匹配模式
    match_type VARCHAR(20) NOT NULL DEFAULT 'exact'
        CHECK (match_type IN ('exact', 'fuzzy', 'regex')),

    -- 替换词
    replacement VARCHAR(255) DEFAULT '***',

    -- 描述
    description TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id)
);

-- 索引
CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_sensitive_words_status ON sensitive_words(status);
CREATE INDEX idx_sensitive_words_severity ON sensitive_words(severity);
CREATE INDEX idx_sensitive_words_match_type ON sensitive_words(match_type);

-- 注释
COMMENT ON TABLE sensitive_words IS '敏感词表';
COMMENT ON COLUMN sensitive_words.id IS '敏感词 ID';
COMMENT ON COLUMN sensitive_words.word IS '敏感词';
COMMENT ON COLUMN sensitive_words.category IS '分类：political-政治，illegal-违法，pornographic-色情，violent-暴力，spam-垃圾，other-其他';
COMMENT ON COLUMN sensitive_words.severity IS '严重程度：low-低，medium-中，high-高，critical-严重';
COMMENT ON COLUMN sensitive_words.status IS '状态：active-启用，inactive-禁用';
COMMENT ON COLUMN sensitive_words.match_type IS '匹配类型：exact-精确匹配，fuzzy-模糊匹配，regex-正则匹配';
COMMENT ON COLUMN sensitive_words.replacement IS '替换词';
COMMENT ON COLUMN sensitive_words.description IS '描述';
COMMENT ON COLUMN sensitive_words.created_by IS '创建人 ID';
COMMENT ON COLUMN sensitive_words.updated_by IS '更新人 ID';
```

---

## 3. 索引设计

### 3.1 广告主模块索引

```sql
-- 广告主认证表索引
CREATE INDEX idx_advertiser_verifications_advertiser_id ON advertiser_verifications(advertiser_id);
CREATE INDEX idx_advertiser_verifications_status ON advertiser_verifications(status);
CREATE INDEX idx_advertiser_verifications_submitted_at ON advertiser_verifications(submitted_at);
CREATE INDEX idx_advertiser_verifications_reviewed_at ON advertiser_verifications(reviewed_at);

-- 广告主消费表索引
CREATE INDEX idx_advertiser_consumptions_transaction_no ON advertiser_consumptions(transaction_no);
CREATE INDEX idx_advertiser_consumptions_advertiser_id ON advertiser_consumptions(advertiser_id);
CREATE INDEX idx_advertiser_consumptions_user_id ON advertiser_consumptions(user_id);
CREATE INDEX idx_advertiser_consumptions_order_id ON advertiser_consumptions(order_id);
CREATE INDEX idx_advertiser_consumptions_campaign_id ON advertiser_consumptions(campaign_id);
CREATE INDEX idx_advertiser_consumptions_type ON advertiser_consumptions(type);
CREATE INDEX idx_advertiser_consumptions_status ON advertiser_consumptions(status);
CREATE INDEX idx_advertiser_consumptions_created_at ON advertiser_consumptions(created_at DESC);
CREATE INDEX idx_advertiser_consumptions_completed_at ON advertiser_consumptions(completed_at);

-- 组合索引
CREATE INDEX idx_advertiser_consumptions_advertiser_status ON advertiser_consumptions(advertiser_id, status);
CREATE INDEX idx_advertiser_consumptions_advertiser_created ON advertiser_consumptions(advertiser_id, created_at DESC);
```

### 3.2 活动模块索引

```sql
-- 活动统计表索引
CREATE INDEX idx_campaign_stats_campaign_id ON campaign_stats(campaign_id);
CREATE INDEX idx_campaign_stats_stats_date ON campaign_stats(stats_date);
CREATE INDEX idx_campaign_stats_performance_score ON campaign_stats(performance_score);
CREATE INDEX idx_campaign_stats_created_at ON campaign_stats(created_at);

-- 组合索引
CREATE INDEX idx_campaign_stats_campaign_date ON campaign_stats(campaign_id, stats_date);
```

### 3.3 系统设置模块索引

```sql
-- 系统配置表索引
CREATE INDEX idx_settings_config_group ON settings(config_group);
CREATE INDEX idx_settings_config_key ON settings(config_key);

-- 敏感词表索引
CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_sensitive_words_status ON sensitive_words(status);
CREATE INDEX idx_sensitive_words_severity ON sensitive_words(severity);
CREATE INDEX idx_sensitive_words_match_type ON sensitive_words(match_type);

-- 组合索引
CREATE INDEX idx_sensitive_words_category_status ON sensitive_words(category, status);
CREATE INDEX idx_sensitive_words_active_category ON sensitive_words(status, category) WHERE status = 'active';
```

### 3.4 索引优化建议

```sql
-- 1. 对于大数据量表，考虑使用分区表
-- 示例：advertiser_consumptions 按月分区
-- CREATE TABLE advertiser_consumptions_2026_03 PARTITION OF advertiser_consumptions
--     FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 2. 对于频繁查询的字段，使用覆盖索引
-- 示例：查询广告主消费列表
CREATE INDEX idx_advertiser_consumptions_covering 
    ON advertiser_consumptions(advertiser_id, created_at DESC) 
    INCLUDE (transaction_no, amount, type, status, description);

-- 3. 对于敏感词表，使用全文索引支持模糊搜索
CREATE INDEX idx_sensitive_words_word_trgm ON sensitive_words USING gin(word gin_trgm_ops);
```

---

## 4. 数据迁移

### 4.1 迁移脚本

#### 4.1.1 创建新表

```sql
-- 创建广告主认证表
CREATE TABLE IF NOT EXISTS advertiser_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID NOT NULL UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255),
    business_license VARCHAR(100) NOT NULL,
    business_license_url VARCHAR(512),
    tax_id VARCHAR(100),
    legal_representative VARCHAR(100) NOT NULL,
    business_license_images TEXT[],
    legal_representative_id_front VARCHAR(512),
    legal_representative_id_back VARCHAR(512),
    authorization_letter_url VARCHAR(512),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    rejection_reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建广告主消费表
CREATE TABLE IF NOT EXISTS advertiser_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    campaign_id UUID REFERENCES campaigns(id),
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('order_payment', 'campaign_boost', 'service_fee', 'refund')),
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建活动统计表
CREATE TABLE IF NOT EXISTS campaign_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    click_through_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    total_likes INTEGER NOT NULL DEFAULT 0,
    total_comments INTEGER NOT NULL DEFAULT 0,
    total_shares INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    roi DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estimated_reach INTEGER NOT NULL DEFAULT 0,
    actual_reach INTEGER NOT NULL DEFAULT 0,
    total_kols INTEGER NOT NULL DEFAULT 0,
    applied_kols INTEGER NOT NULL DEFAULT 0,
    selected_kols INTEGER NOT NULL DEFAULT 0,
    published_videos INTEGER NOT NULL DEFAULT 0,
    performance_score VARCHAR(20)
        CHECK (performance_score IN ('excellent', 'good', 'average', 'poor')),
    stats_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_group VARCHAR(50) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES admins(id)
);

-- 创建敏感词表
CREATE TABLE IF NOT EXISTS sensitive_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('political', 'illegal', 'pornographic', 'violent', 'spam', 'other')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    match_type VARCHAR(20) NOT NULL DEFAULT 'exact'
        CHECK (match_type IN ('exact', 'fuzzy', 'regex')),
    replacement VARCHAR(255) DEFAULT '***',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id)
);
```

#### 4.1.2 迁移现有数据

```sql
-- 迁移广告主认证数据
INSERT INTO advertiser_verifications (
    advertiser_id,
    company_name,
    business_license,
    legal_representative,
    status,
    submitted_at,
    reviewed_at,
    reviewed_by
)
SELECT
    id,
    company_name,
    business_license,
    legal_representative,
    CASE
        WHEN verification_status = 'approved' THEN 'approved'
        WHEN verification_status = 'rejected' THEN 'rejected'
        ELSE 'submitted'
    END,
    created_at,
    verified_at,
    verified_by
FROM advertisers
WHERE verification_status IS NOT NULL
ON CONFLICT (advertiser_id) DO NOTHING;

-- 迁移交易数据到消费表
INSERT INTO advertiser_consumptions (
    transaction_no,
    advertiser_id,
    user_id,
    order_id,
    campaign_id,
    amount,
    type,
    balance_before,
    balance_after,
    status,
    description,
    completed_at,
    created_at
)
SELECT
    transaction_no,
    advertiser_id,
    user_id,
    order_id,
    campaign_id,
    amount,
    type,
    balance_before,
    balance_after,
    status,
    description,
    completed_at,
    created_at
FROM transactions
WHERE type IN ('order_payment', 'campaign_boost', 'service_fee')
ON CONFLICT (transaction_no) DO NOTHING;

-- 初始化活动统计数据
INSERT INTO campaign_stats (
    campaign_id,
    total_impressions,
    total_clicks,
    total_cost,
    stats_date
)
SELECT
    c.id,
    COALESCE(SUM(o.views), 0),
    COALESCE(SUM(o.clicks), 0),
    c.spent_amount,
    CURRENT_DATE
FROM campaigns c
LEFT JOIN orders o ON o.campaign_id = c.id
GROUP BY c.id, c.spent_amount
ON CONFLICT (campaign_id) DO NOTHING;

-- 初始化系统配置
INSERT INTO settings (config_key, config_group, config_value, description, is_editable) VALUES
('platform_name', 'basic', '"AIAds 影响者营销平台"', '平台名称', true),
('platform_logo', 'basic', '"/logo.svg"', '平台 Logo URL', true),
('platform_url', 'basic', '"https://aiads.com"', '平台 URL', true),
('timezone', 'basic', '"Asia/Shanghai"', '时区', true),
('default_language', 'basic', '"zh-CN"', '默认语言', true),
('password_min_length', 'security', '8', '密码最小长度', false),
('login_lockout_attempts', 'security', '5', '登录失败锁定次数', false),
('session_timeout_minutes', 'security', '120', 'Session 超时时间 (分钟)', false)
ON CONFLICT (config_key) DO NOTHING;
```

### 4.2 回滚脚本

```sql
-- 仅在迁移失败时使用回滚脚本

-- 删除新表（谨慎操作）
-- DROP TABLE IF EXISTS advertiser_verifications CASCADE;
-- DROP TABLE IF EXISTS advertiser_consumptions CASCADE;
-- DROP TABLE IF EXISTS campaign_stats CASCADE;
-- DROP TABLE IF EXISTS settings CASCADE;
-- DROP TABLE IF EXISTS sensitive_words CASCADE;
```

### 4.3 数据验证

```sql
-- 验证广告主认证数据
SELECT 
    'advertiser_verifications' AS table_name,
    COUNT(*) AS total_records,
    COUNT(DISTINCT advertiser_id) AS unique_advertisers
FROM advertiser_verifications;

-- 验证广告主消费数据
SELECT 
    'advertiser_consumptions' AS table_name,
    COUNT(*) AS total_records,
    COUNT(DISTINCT advertiser_id) AS unique_advertisers,
    SUM(amount) AS total_amount
FROM advertiser_consumptions;

-- 验证活动统计数据
SELECT 
    'campaign_stats' AS table_name,
    COUNT(*) AS total_records,
    COUNT(DISTINCT campaign_id) AS unique_campaigns,
    SUM(total_impressions) AS total_impressions,
    SUM(total_clicks) AS total_clicks
FROM campaign_stats;

-- 验证系统配置数据
SELECT 
    'settings' AS table_name,
    COUNT(*) AS total_records,
    COUNT(DISTINCT config_group) AS groups
FROM settings;

-- 验证敏感词数据
SELECT 
    'sensitive_words' AS table_name,
    COUNT(*) AS total_records,
    COUNT(DISTINCT category) AS categories,
    COUNT(*) FILTER (WHERE status = 'active') AS active_words
FROM sensitive_words;
```

---

## 5. 数据字典

### 5.1 广告主模块数据字典

| 表名 | 说明 | 主要字段 |
|-----|------|---------|
| advertiser_verifications | 广告主认证表 | advertiser_id, company_name, business_license, status |
| advertiser_consumptions | 广告主消费表 | transaction_no, advertiser_id, amount, type, status |

### 5.2 活动模块数据字典

| 表名 | 说明 | 主要字段 |
|-----|------|---------|
| campaign_stats | 活动统计表 | campaign_id, total_impressions, total_clicks, roi, performance_score |

### 5.3 系统设置模块数据字典

| 表名 | 说明 | 主要字段 |
|-----|------|---------|
| settings | 系统配置表 | config_key, config_group, config_value, is_editable |
| sensitive_words | 敏感词表 | word, category, severity, status, match_type |

### 5.4 状态枚举值

#### advertiser_verifications.status

| 值 | 说明 |
|---|------|
| pending | 待提交 |
| submitted | 已提交，待审核 |
| approved | 审核通过 |
| rejected | 审核拒绝 |

#### advertiser_consumptions.status

| 值 | 说明 |
|---|------|
| pending | 待处理 |
| completed | 已完成 |
| failed | 失败 |
| refunded | 已退款 |

#### advertiser_consumptions.type

| 值 | 说明 |
|---|------|
| order_payment | 订单支付 |
| campaign_boost | 活动推广 |
| service_fee | 服务费 |
| refund | 退款 |

#### campaign_stats.performance_score

| 值 | 说明 |
|---|------|
| excellent | 优秀（ROI > 3） |
| good | 良好（ROI 2-3） |
| average | 一般（ROI 1-2） |
| poor | 差（ROI < 1） |

#### settings.config_group

| 值 | 说明 |
|---|------|
| basic | 基础配置 |
| email | 邮件配置 |
| sms | 短信配置 |
| storage | 存储配置 |
| security | 安全配置 |

#### sensitive_words.category

| 值 | 说明 |
|---|------|
| political | 政治敏感 |
| illegal | 违法内容 |
| pornographic | 色情内容 |
| violent | 暴力内容 |
| spam | 垃圾广告 |
| other | 其他 |

#### sensitive_words.severity

| 值 | 说明 |
|---|------|
| low | 低 |
| medium | 中 |
| high | 高 |
| critical | 严重 |

#### sensitive_words.status

| 值 | 说明 |
|---|------|
| active | 启用 |
| inactive | 禁用 |

#### sensitive_words.match_type

| 值 | 说明 |
|---|------|
| exact | 精确匹配 |
| fuzzy | 模糊匹配 |
| regex | 正则匹配 |

---

## 6. 总结

本文档详细设计了 AIAds 管理后台剩余模块的数据库结构，包括：

1. **广告主管理模块**: 新增 advertiser_verifications（认证表）和 advertiser_consumptions（消费表）
2. **活动管理模块**: 新增 campaign_stats（统计表）
3. **系统设置模块**: 新增 settings（配置表）和 sensitive_words（敏感词表）

### 6.1 表结构变更总结

| 表名 | 变更类型 | 记录数预估 | 说明 |
|-----|---------|-----------|------|
| advertiser_verifications | 新增 | 与 advertisers 相同 | 广告主认证信息 |
| advertiser_consumptions | 新增 | 100 万 + | 广告主消费记录 |
| campaign_stats | 新增 | 与 campaigns 相同 | 活动统计数据 |
| settings | 新增 | 50 条左右 | 系统配置 |
| sensitive_words | 新增 | 1000 条左右 | 敏感词库 |

### 6.2 性能考虑

- 所有表都创建了适当的索引以支持查询
- 大数据量表（advertiser_consumptions）考虑使用分区表
- 敏感词表使用全文索引支持模糊搜索
- 配置表使用 JSONB 存储复杂配置，支持灵活扩展

### 6.3 安全考虑

- 敏感操作记录审计日志（updated_by 字段）
- 敏感词表支持分类和严重程度分级
- 系统配置表支持只读配置（is_editable 字段）

---

**文档结束**
