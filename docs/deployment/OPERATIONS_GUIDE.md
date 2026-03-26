# AIAds 运维指南

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [监控配置](#1-监控配置)
2. [告警设置](#2-告警设置)
3. [备份策略](#3-备份策略)
4. [故障排查](#4-故障排查)
5. [性能优化](#5-性能优化)
6. [安全运维](#6-安全运维)

---

## 1. 监控配置

### 1.1 监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIAds Monitoring Stack                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Application│    │  Infrastruc │    │   Business  │
│  Monitoring │    │  ture       │    │   Metrics   │
│             │    │  Monitoring │    │             │
│  • Sentry   │    │  • Railway  │    │  • GMV      │
│  • Logtail  │    │  • Supabase │    │  • Orders   │
│  • Custom   │    │  • Upstash  │    │  • Users    │
└─────────────┘    └─────────────┘    └─────────────┘
         │                │                  │
         └────────────────┼──────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   Dashboard     │
                 │   (Grafana)     │
                 └─────────────────┘
```

### 1.2 应用监控

#### Sentry 配置

**安装 Sentry SDK：**

```bash
npm install @sentry/node @sentry/tracing
```

**配置 Sentry（src/backend/src/utils/logger.ts）：**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
    new Sentry.Integrations.Redis(),
  ],
});
```

**错误追踪：**

```typescript
try {
  // 业务逻辑
} catch (error) {
  Sentry.captureException(error, {
    tags: { module: 'payment' },
    extra: { userId, amount },
  });
}
```

#### 日志收集（Logtail）

**配置 Logtail：**

```typescript
import { Logtail } from '@logtail/node';

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

logger.add(new transports.Console({
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      logtail.log({
        timestamp,
        level,
        message,
        ...meta,
      });
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
}));
```

### 1.3 基础设施监控

#### Railway 监控

**监控指标：**

| 指标 | 阈值 | 说明 |
|------|------|------|
| CPU 使用率 | >80% | 持续 5 分钟告警 |
| 内存使用率 | >85% | 持续 5 分钟告警 |
| 响应时间 | >500ms | P95 延迟 |
| 错误率 | >1% | 5xx 错误比例 |
| 请求量 | 突增 50% | 异常流量检测 |

**配置告警：**

1. 进入 Railway 项目
2. 选择 "Settings" → "Alerts"
3. 添加告警规则
4. 配置通知渠道（Slack/邮件）

#### Supabase 监控

**监控指标：**

| 指标 | 阈值 | 说明 |
|------|------|------|
| 数据库连接 | >80% | 连接池使用率 |
| 存储空间 | >80% | 磁盘使用率 |
| CPU 使用率 | >80% | 数据库 CPU |
| 慢查询 | >1s | 查询时间 |
| 复制延迟 | >10s | 主从延迟 |

**查看监控：**

1. 进入 Supabase Dashboard
2. 选择项目 → "Database" → "Statistics"
3. 查看各项指标

#### Upstash Redis 监控

**监控指标：**

| 指标 | 阈值 | 说明 |
|------|------|------|
| 内存使用 | >80% | Redis 内存 |
| 连接数 | >100 | 并发连接 |
| 命令延迟 | >10ms | 平均延迟 |
| 命中率 | <90% | 缓存命中率 |

### 1.4 业务监控

#### 核心指标

```typescript
// 业务指标埋点
const metrics = {
  // 用户指标
  users: {
    newRegistrations: counter('users_registrations_total'),
    activeUsers: gauge('users_active'),
    verifiedUsers: counter('users_verified_total'),
  },
  
  // 交易指标
  transactions: {
    gmv: counter('transactions_gmv_total'),
    orders: counter('transactions_orders_total'),
    revenue: counter('transactions_revenue_total'),
  },
  
  // 活动指标
  campaigns: {
    created: counter('campaigns_created_total'),
    active: gauge('campaigns_active'),
    completed: counter('campaigns_completed_total'),
  },
  
  // KOL 指标
  kols: {
    total: gauge('kols_total'),
    verified: gauge('kols_verified'),
    earnings: counter('kols_earnings_total'),
  },
};
```

#### 自定义 Dashboard

**Grafana Dashboard 配置：**

```json
{
  "dashboard": {
    "title": "AIAds Business Metrics",
    "panels": [
      {
        "title": "GMV Trend",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(transactions_gmv_total[1h])",
            "legendFormat": "GMV/hour"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "users_active",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Order Status",
        "type": "piechart",
        "targets": [
          {
            "expr": "orders_by_status",
            "legendFormat": "{{status}}"
          }
        ]
      }
    ]
  }
}
```

---

## 2. 告警设置

### 2.1 告警级别

| 级别 | 名称 | 响应时间 | 通知渠道 |
|------|------|----------|----------|
| P0 | 紧急 | 5 分钟 | 电话 + 短信 + Slack |
| P1 | 严重 | 15 分钟 | 短信 + Slack |
| P2 | 警告 | 1 小时 | Slack + 邮件 |
| P3 | 提示 | 4 小时 | 邮件 |

### 2.2 告警规则

#### 基础设施告警

```yaml
# alerting-rules.yaml
groups:
  - name: infrastructure
    rules:
      # CPU 告警
      - alert: HighCPUUsage
        expr: avg(rate(process_cpu_seconds_total[5m])) > 0.8
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% for more than 5 minutes"
      
      # 内存告警
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1073741824 > 0.85
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}GB"
      
      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: P0
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # 响应时间告警
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"
```

#### 业务告警

```yaml
groups:
  - name: business
    rules:
      # GMV 异常
      - alert: GMVDrop
        expr: rate(transactions_gmv_total[1h]) < 1000
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "GMV dropped significantly"
          description: "Current GMV/hour: {{ $value }}"
      
      # 订单量异常
      - alert: OrderVolumeDrop
        expr: rate(transactions_orders_total[1h]) < 10
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "Order volume dropped"
          description: "Current orders/hour: {{ $value }}"
      
      # 支付失败率
      - alert: HighPaymentFailureRate
        expr: rate(payment_failures_total[15m]) / rate(payment_attempts_total[15m]) > 0.1
        for: 15m
        labels:
          severity: P0
        annotations:
          summary: "High payment failure rate"
          description: "Failure rate: {{ $value | humanizePercentage }}"
      
      # KOL 提现积压
      - alert: WithdrawalBacklog
        expr: withdrawals_pending_count > 100
        for: 30m
        labels:
          severity: P1
        annotations:
          summary: "Withdrawal backlog detected"
          description: "Pending withdrawals: {{ $value }}"
```

### 2.3 通知渠道配置

#### Slack 通知

```yaml
receivers:
  - name: slack
    slack_configs:
      - api_url: https://hooks.slack.com/services/xxx/yyy/zzz
        channel: '#aiads-alerts'
        send_resolved: true
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
```

#### 邮件通知

```yaml
receivers:
  - name: email
    email_configs:
      - to: ops@aiads.com
        from: alerts@aiads.com
        smarthost: smtp.sendgrid.net:587
        auth_username: apikey
        auth_password: ${SENDGRID_API_KEY}
```

#### 短信通知（Twilio）

```yaml
receivers:
  - name: sms
    webhook_configs:
      - url: http://localhost:3000/alerts/sms
        send_resolved: true
```

### 2.4 告警路由

```yaml
route:
  receiver: slack
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: P0
      receiver: sms
      continue: true
    - match:
        severity: P1
      receiver: slack
      group_wait: 10s
    - match:
        severity: P2
      receiver: email
```

---

## 3. 备份策略

### 3.1 数据库备份

#### Supabase 自动备份

**配置：**

1. 进入 Supabase Dashboard
2. 选择项目 → "Database" → "Backups"
3. 开启自动备份
4. 设置备份频率

**备份策略：**

| 类型 | 频率 | 保留期 |
|------|------|--------|
| 全量备份 | 每天 | 30 天 |
| 增量备份 | 每小时 | 7 天 |
| 归档备份 | 每周 | 1 年 |

#### 手动备份

```bash
# 导出数据库
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
gzip backup_$(date +%Y%m%d_%H%M%S).sql

# 上传到云存储
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).sql.gz s3://aiads-backups/database/
```

#### 恢复流程

```bash
# 从备份恢复
gunzip backup_20260324_100000.sql.gz
psql "$DATABASE_URL" < backup_20260324_100000.sql

# 验证恢复
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

### 3.2 文件备份

#### R2 存储备份

**配置跨区域复制：**

1. 进入 Cloudflare Dashboard
2. 选择 R2 → Buckets
3. 选择 bucket → "Replication"
4. 配置目标 bucket（不同区域）

**备份策略：**

| 文件类型 | 备份方式 | 保留期 |
|----------|----------|--------|
| 用户头像 | 实时复制 | 永久 |
| 营业执照 | 实时复制 | 永久 |
| 视频内容 | 延迟复制 | 2 年 |

### 3.3 配置备份

#### 环境变量备份

```bash
# 导出环境变量（加密存储）
railway variables export > railway_vars_$(date +%Y%m%d).json
age -r age1xxx railway_vars_$(date +%Y%m%d).json

# 上传到安全存储
aws s3 cp railway_vars_$(date +%Y%m%d).json.age s3://aiads-backups/configs/
```

#### 代码版本备份

```bash
# 确保所有代码已提交
git add .
git commit -m "Backup before deployment"
git push origin main

# 创建标签
git tag -a backup-$(date +%Y%m%d_%H%M%S) -m "Backup tag"
git push origin backup-$(date +%Y%m%d_%H%M%S)
```

### 3.4 备份验证

#### 定期恢复测试

**测试计划：**

| 频率 | 测试内容 | 负责人 |
|------|----------|--------|
| 每周 | 数据库备份恢复 | DevOps |
| 每月 | 完整系统恢复 | 运维团队 |
| 每季度 | 灾难恢复演练 | 全员 |

**测试流程：**

1. 选择备份文件
2. 在测试环境恢复
3. 验证数据完整性
4. 记录测试结果
5. 修复发现的问题

---

## 4. 故障排查

### 4.1 故障分级

| 级别 | 名称 | 影响范围 | 响应时间 |
|------|------|----------|----------|
| P0 | 紧急故障 | 全站不可用 | 立即 |
| P1 | 严重故障 | 核心功能不可用 | 15 分钟 |
| P2 | 一般故障 | 部分功能异常 | 1 小时 |
| P3 | 轻微故障 | 非核心问题 | 4 小时 |

### 4.2 常见故障排查

#### 故障 1：API 服务不可用

**症状：**
- 所有 API 请求返回 502/503
- 健康检查失败

**排查步骤：**

```bash
# 1. 检查 Railway 状态
railway status

# 2. 查看服务日志
railway logs --follow

# 3. 检查资源使用
railway metrics

# 4. 检查环境变量
railway variables

# 5. 重启服务
railway restart
```

**可能原因：**
- 服务崩溃
- 资源耗尽
- 配置错误

**解决方案：**
1. 查看错误日志定位问题
2. 回滚到上一个稳定版本
3. 修复配置后重新部署

#### 故障 2：数据库连接失败

**症状：**
- API 返回数据库连接错误
- 查询超时

**排查步骤：**

```bash
# 1. 检查数据库状态
psql "$DATABASE_URL" -c "SELECT 1"

# 2. 检查连接池
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity"

# 3. 检查 Supabase 状态
# 进入 Supabase Dashboard 查看

# 4. 检查网络连接
curl -v "$DATABASE_URL"
```

**可能原因：**
- 数据库服务宕机
- 连接数耗尽
- 网络问题

**解决方案：**
1. 重启数据库连接池
2. 清理空闲连接
3. 联系 Supabase 支持

#### 故障 3：支付功能异常

**症状：**
- 用户无法充值
- 支付回调失败

**排查步骤：**

```bash
# 1. 检查支付服务状态
curl https://api.stripe.com/health

# 2. 查看支付日志
grep "payment" logs/app.log | tail -100

# 3. 检查 Webhook 配置
curl https://api.aiads.com/v1/webhooks

# 4. 验证支付密钥
echo "$STRIPE_SECRET_KEY" | head -c 10
```

**可能原因：**
- 支付平台故障
- 密钥过期
- Webhook 配置错误

**解决方案：**
1. 更新支付密钥
2. 重新配置 Webhook
3. 联系支付平台支持

#### 故障 4：社交 API 同步失败

**症状：**
- KOL 数据不同步
- 粉丝数不更新

**排查步骤：**

```bash
# 1. 检查 API 配额
curl "https://www.googleapis.com/youtube/v3/channels?part=statistics&key=$YOUTUBE_API_KEY"

# 2. 查看同步日志
grep "sync" logs/app.log | tail -100

# 3. 检查 Token 有效期
# 进入各平台 Developer Console 查看
```

**可能原因：**
- API 配额超限
- Token 过期
- API 变更

**解决方案：**
1. 刷新 API Token
2. 升级 API 配额
3. 更新 API 集成代码

### 4.3 故障响应流程

```
┌─────────────┐
│  故障发现   │
│ (监控/用户) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  故障定级   │
│  (P0-P3)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  通知响应   │
│ (告警渠道)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  问题排查   │
│ (定位原因)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  问题解决   │
│ (修复/回滚) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  复盘总结   │
│ (改进措施)  │
└─────────────┘
```

### 4.4 故障报告模板

```markdown
# 故障报告

## 基本信息
- 故障编号：INC-YYYYMMDD-001
- 故障级别：P1
- 发生时间：2026-03-24 10:00 UTC
- 恢复时间：2026-03-24 10:30 UTC
- 持续时间：30 分钟

## 影响范围
- 受影响功能：支付充值
- 影响用户数：约 100 人
- 损失金额：约 ¥50,000

## 故障现象
用户无法完成支付宝充值，支付成功后余额未到账。

## 根本原因
支付宝回调 Webhook 验证逻辑错误，导致合法回调被拒绝。

## 处理过程
- 10:00 监控发现支付成功率下降
- 10:05 确认为支付宝回调问题
- 10:10 临时关闭 Webhook 签名验证
- 10:30 服务恢复正常
- 11:00 修复代码并重新部署

## 改进措施
1. 增加支付回调监控
2. 完善 Webhook 验证测试
3. 建立支付异常自动告警
```

---

## 5. 性能优化

### 5.1 数据库优化

#### 索引优化

```sql
-- 添加常用查询索引
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_campaigns_status ON campaigns(status);
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);

-- 添加复合索引
CREATE INDEX CONCURRENTLY idx_campaigns_advertiser_status 
ON campaigns(advertiser_id, status);

-- 查看索引使用情况
EXPLAIN ANALYZE SELECT * FROM campaigns WHERE advertiser_id = $1 AND status = $2;
```

#### 查询优化

```sql
-- 避免 SELECT *
SELECT id, email, created_at FROM users WHERE status = 'active';

-- 使用 LIMIT 限制结果数
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20;

-- 避免 N+1 查询
-- 使用 JOIN 代替循环查询
SELECT o.*, k.platform_username 
FROM orders o 
JOIN kols k ON o.kol_id = k.id;
```

### 5.2 缓存优化

#### Redis 缓存策略

```typescript
// 缓存 KOL 数据
async function getKolData(kolId: string) {
  const cacheKey = `kol:${kolId}`;
  
  // 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 从数据库获取
  const data = await db.kol.findUnique({ where: { id: kolId } });
  
  // 写入缓存（1 小时过期）
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  
  return data;
}

// 缓存热点数据
async function getPopularKols() {
  const cacheKey = 'kols:popular';
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await db.kol.findMany({
    where: { verified: true },
    orderBy: { followers: 'desc' },
    take: 100
  });
  
  await redis.setex(cacheKey, 1800, JSON.stringify(data));
  
  return data;
}
```

#### CDN 缓存

```yaml
# Vercel 缓存配置
headers:
  - source: '/static/(.*)'
    headers:
      - key: Cache-Control
        value: public, max-age=31536000, immutable
  - source: '/api/(.*)'
    headers:
      - key: Cache-Control
        value: private, no-cache
```

### 5.3 代码优化

#### 异步处理

```typescript
// 使用队列处理耗时任务
import { Queue } from 'bullmq';

const emailQueue = new Queue('emails', { connection: redis });

// 添加任务到队列
await emailQueue.add('send-verification', {
  email,
  code,
  purpose
});

// Worker 处理
const worker = new Worker('emails', async job => {
  await sendEmail(job.data);
}, { connection: redis });
```

#### 批量操作

```typescript
// 批量插入代替循环插入
const users = [...];
await db.user.createMany({ data: users });

// 批量更新
await Promise.all(
  userIds.map(id => 
    db.user.update({ where: { id }, data: { ... } })
  )
);
```

---

## 6. 安全运维

### 6.1 安全扫描

#### 依赖扫描

```bash
# 使用 npm audit
npm audit

# 自动修复
npm audit fix

# 使用 Snyk
snyk test
snyk monitor
```

#### 代码扫描

```bash
# 使用 ESLint 安全插件
npm run lint:security

# 使用 Semgrep
semgrep --config auto src/
```

### 6.2 访问控制

#### API 限流

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', limiter);
```

#### IP 白名单

```typescript
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const allowedIPs = ['1.2.3.4', '5.6.7.8'];
    return allowedIPs.includes(req.ip);
  }
});
```

### 6.3 安全审计

#### 审计日志

```typescript
// 记录敏感操作
async function logAuditEvent(event: AuditEvent) {
  await db.auditLog.create({
    data: {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      result: event.result
    }
  });
}

// 审计事件类型
type AuditEvent = {
  userId: string;
  action: 'login' | 'password_change' | 'data_export' | ...;
  resource: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
};
```

#### 定期审计

| 频率 | 审计内容 | 负责人 |
|------|----------|--------|
| 每周 | 异常登录检测 | 安全团队 |
| 每月 | 权限审查 | 运维团队 |
| 每季度 | 完整安全审计 | 外部机构 |

---

## 附录

### A. 运维检查清单

#### 日常检查

- [ ] 服务健康检查
- [ ] 错误日志审查
- [ ] 资源使用率
- [ ] 备份状态确认
- [ ] 告警响应处理

#### 周检查

- [ ] 性能指标分析
- [ ] 安全日志审查
- [ ] 容量规划评估
- [ ] 依赖更新检查

#### 月检查

- [ ] 完整备份恢复测试
- [ ] 权限审查
- [ ] 成本分析
- [ ] SLA 达成情况

### B. 联系方式

| 角色 | 联系方式 |
|------|----------|
| DevOps 值班 | +86-xxx-xxxx-xxxx |
| 安全团队 | security@aiads.com |
| 技术支持 | support@aiads.com |

---

**AIAds 运维指南结束**
