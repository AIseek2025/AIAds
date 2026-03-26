# AIAds 管理后台运维手册

**版本**: 1.0.0
**创建日期**: 2026 年 3 月 25 日
**作者**: DevOps Team
**保密级别**: 内部机密

---

## 目录

1. [系统架构](#1-系统架构)
2. [日常运维](#2-日常运维)
3. [故障处理](#3-故障处理)
4. [性能优化](#4-性能优化)
5. [安全加固](#5-安全加固)
6. [附录](#6-附录)

---

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    AIAds Admin Production Architecture           │
└─────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │     Users       │
                         │  (管理员/运营)   │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    Cloudflare CDN       │
                    │    (DDoS 防护 + 加速)     │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Vercel CDN    │ │   Railway   │ │  Cloudflare │
    │   (前端静态)     │ │   (API)     │ │    R2       │
    │ admin.aiads.com │ │api.aiads.com│ │cdn.aiads.com│
    └─────────────────┘ └──────┬──────┘ └─────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │   Supabase      │   │   Upstash       │
          │   PostgreSQL    │   │   Redis         │
          │   (数据库)       │   │   (缓存)        │
          └─────────────────┘   └─────────────────┘
```

### 1.2 组件说明

| 组件 | 用途 | 供应商 | SLA |
|-----|------|--------|-----|
| **Vercel** | 前端托管 + CDN | Vercel Inc | 99.99% |
| **Railway** | 后端 API 托管 | Railway Corp | 99.95% |
| **Supabase** | PostgreSQL 数据库 | Supabase Inc | 99.99% |
| **Upstash** | Redis 缓存 | Upstash Inc | 99.99% |
| **Cloudflare** | CDN + DDoS 防护 | Cloudflare Inc | 99.99% |
| **Sentry** | 错误监控 | Sentry Inc | 99.9% |

### 1.3 网络拓扑

```
┌─────────────────────────────────────────────────────────────┐
│                      Network Topology                        │
└─────────────────────────────────────────────────────────────┘

Internet
    │
    ▼
┌─────────────────┐
│  Cloudflare Edge │ ← DDoS Protection, WAF
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Vercel  │ │ Railway │
│ (Port 443)│ │(Port 443)│
└─────────┘ └────┬────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
   ┌──────────┐   ┌──────────┐
   │ Supabase │   │ Upstash  │
   │(Port 5432)│   │(Port 6379)│
   └──────────┘   └──────────┘
```

### 1.4 数据流

```
用户请求 → Cloudflare → Vercel/Railway → Supabase/Upstash
    │                                              │
    │                                              ▼
    │                                    数据持久化/缓存
    │
    ▼
响应返回 ← CDN 加速 ← 数据处理 ← 业务逻辑
```

---

## 2. 日常运维

### 2.1 巡检清单

#### 每日巡检

| 检查项 | 检查方法 | 正常标准 | 频率 |
|-------|---------|---------|------|
| 服务健康状态 | Railway Dashboard | 所有服务绿色 | 每日 |
| API 响应时间 | Grafana Dashboard | P95 < 500ms | 每日 |
| 错误率监控 | Sentry Dashboard | < 1% | 每日 |
| 数据库连接 | Supabase Dashboard | 连接池 < 80% | 每日 |
| 缓存命中率 | Upstash Dashboard | > 90% | 每日 |
| 磁盘使用率 | 各平台 Dashboard | < 80% | 每日 |
| 备份状态 | Supabase Backup | 最近备份 < 24h | 每日 |

#### 每周巡检

| 检查项 | 检查方法 | 正常标准 | 频率 |
|-------|---------|---------|------|
| 安全日志审查 | Logtail | 无异常登录 | 每周 |
| 性能趋势分析 | Grafana | 无下降趋势 | 每周 |
| 依赖更新检查 | npm audit | 无高危漏洞 | 每周 |
| 容量规划评估 | 监控数据 | 资源余量 > 30% | 每周 |
| 告警规则审查 | Alertmanager | 无误报漏报 | 每周 |

#### 每月巡检

| 检查项 | 检查方法 | 正常标准 | 频率 |
|-------|---------|---------|------|
| 完整备份恢复测试 | 测试环境 | 恢复成功 | 每月 |
| 权限审查 | 数据库查询 | 无异常权限 | 每月 |
| 成本分析 | 各平台账单 | 预算内 | 每月 |
| 灾备演练 | 模拟故障 | 恢复 < 30 分钟 | 每月 |

### 2.2 日志查看

#### 应用日志

```bash
# Railway 日志查看
railway logs --follow

# 查看错误日志
railway logs --grep "ERROR"

# 查看特定时间段日志
railway logs --since "2026-03-25T10:00:00Z" --until "2026-03-25T12:00:00Z"
```

#### 数据库日志

```sql
-- Supabase 慢查询日志
SELECT * FROM pg_stat_statements
WHERE total_exec_time > 1000
ORDER BY total_exec_time DESC
LIMIT 20;

-- 连接数监控
SELECT count(*) as connections,
       max_conn.setting as max_connections
FROM pg_stat_activity,
     (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn;
```

#### 审计日志

```sql
-- 查看管理员操作日志
SELECT * FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- 查看敏感操作
SELECT * FROM admin_audit_logs
WHERE action IN ('user:ban', 'user:delete', 'withdrawal:approve')
ORDER BY created_at DESC;
```

### 2.3 备份操作

#### 数据库备份

```bash
# 手动备份数据库
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
gzip backup_$(date +%Y%m%d_%H%M%S).sql

# 上传到云存储
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).sql.gz s3://aiads-backups/database/
```

#### 配置备份

```bash
# 导出 Railway 环境变量
railway variables export > railway_vars_$(date +%Y%m%d).json

# 导出 Vercel 配置
vercel env ls > vercel_env_$(date +%Y%m%d).txt

# 备份代码版本
git tag -a backup-$(date +%Y%m%d_%H%M%S) -m "Backup tag"
git push origin backup-$(date +%Y%m%d_%H%M%S)
```

### 2.4 变更管理

#### 变更流程

```
变更申请 → 风险评估 → 审批 → 执行 → 验证 → 复盘
```

#### 变更窗口

| 变更类型 | 时间窗口 | 审批要求 |
|---------|---------|---------|
| 紧急修复 | 随时 | 技术负责人 |
| 小变更 | 工作日 10:00-17:00 | 团队负责人 |
| 大变更 | 周末 02:00-06:00 | CTO |

---

## 3. 故障处理

### 3.1 故障分级

| 级别 | 名称 | 影响范围 | 响应时间 | 升级条件 |
|-----|------|----------|----------|---------|
| P0 | 紧急故障 | 全站不可用 | 5 分钟 | 15 分钟未解决 |
| P1 | 严重故障 | 核心功能不可用 | 15 分钟 | 30 分钟未解决 |
| P2 | 一般故障 | 部分功能异常 | 1 小时 | 2 小时未解决 |
| P3 | 轻微故障 | 非核心问题 | 4 小时 | 8 小时未解决 |

### 3.2 故障响应流程

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

### 3.3 常见故障排查

#### 故障 1：API 服务不可用

**症状**:
- 所有 API 请求返回 502/503
- 健康检查失败
- 用户无法访问管理后台

**排查步骤**:

```bash
# 1. 检查 Railway 服务状态
railway status

# 2. 查看服务日志
railway logs --follow

# 3. 检查资源使用
railway metrics

# 4. 检查环境变量
railway variables

# 5. 重启服务
railway restart

# 6. 检查数据库连接
psql "$DATABASE_URL" -c "SELECT 1"

# 7. 检查 Redis 连接
redis-cli -u "$REDIS_URL" ping
```

**可能原因**:
- 服务崩溃
- 资源耗尽
- 配置错误
- 数据库连接失败

**解决方案**:
1. 查看错误日志定位问题
2. 回滚到上一个稳定版本
3. 修复配置后重新部署

#### 故障 2：数据库连接失败

**症状**:
- API 返回数据库连接错误
- 查询超时
- 数据无法读取/写入

**排查步骤**:

```bash
# 1. 检查数据库状态
psql "$DATABASE_URL" -c "SELECT 1"

# 2. 检查连接池
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity"

# 3. 检查 Supabase 状态
# 进入 Supabase Dashboard 查看

# 4. 检查网络连接
curl -v "$DATABASE_URL"

# 5. 重启连接池
# Railway 重启自动重建连接池
```

**可能原因**:
- 数据库服务宕机
- 连接数耗尽
- 网络问题
- 凭证过期

**解决方案**:
1. 重启数据库连接池
2. 清理空闲连接
3. 联系 Supabase 支持

#### 故障 3：前端无法访问

**症状**:
- 管理后台页面无法加载
- CDN 返回错误
- 静态资源 404

**排查步骤**:

```bash
# 1. 检查 Vercel 部署状态
vercel ls

# 2. 查看构建日志
vercel logs <deployment-url>

# 3. 检查域名配置
# Vercel Dashboard → Domains

# 4. 检查 CDN 状态
# Cloudflare Dashboard → Analytics

# 5. 清除 CDN 缓存
# Cloudflare Dashboard → Caching → Purge Everything
```

**可能原因**:
- 部署失败
- 域名配置错误
- CDN 问题

**解决方案**:
1. 重新部署前端
2. 检查域名 DNS 配置
3. 清除 CDN 缓存

#### 故障 4：认证失败

**症状**:
- 管理员无法登录
- Token 验证失败
- 401 错误频发

**排查步骤**:

```bash
# 1. 检查 JWT Secret 配置
railway variables | grep JWT

# 2. 检查 Token 生成
# 使用测试账号登录

# 3. 查看认证日志
railway logs --grep "auth"

# 4. 检查 Redis (Token 黑名单)
redis-cli -u "$REDIS_URL" keys "admin_blacklist:*"
```

**可能原因**:
- JWT Secret 配置错误
- Token 过期
- Redis 连接失败

**解决方案**:
1. 更新 JWT Secret 配置
2. 重启服务
3. 清除 Token 黑名单

### 3.4 应急预案

#### 紧急回滚

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 开始紧急回滚..."

# 回滚 Railway 到上一个版本
PREV_DEPLOYMENT=$(railway deployments | head -2 | tail -1 | awk '{print $1}')
railway rollback $PREV_DEPLOYMENT

# 回滚 Vercel 到上一个版本
PREV_VERCEL=$(vercel ls | head -2 | tail -1 | awk '{print $1}')
vercel rollback $PREV_VERCEL

echo "✅ 回滚完成"
echo "请验证服务是否恢复正常"
```

#### 服务降级

当系统负载过高时，实施服务降级：

1. **关闭非核心功能**:
   - 数据导出
   - 报表生成
   - 批量操作

2. **限流保护**:
   ```bash
   # 降低限流阈值
   export RATE_LIMIT_MAX_REQUESTS=50
   railway restart
   ```

3. **缓存降级**:
   ```bash
   # 增加缓存时间
   # 修改代码中缓存过期时间
   ```

### 3.5 故障报告模板

```markdown
# 故障报告

## 基本信息
- 故障编号：INC-YYYYMMDD-001
- 故障级别：P1
- 发生时间：2026-03-25 10:00 UTC
- 恢复时间：2026-03-25 10:30 UTC
- 持续时间：30 分钟

## 影响范围
- 受影响功能：管理后台 API
- 影响用户数：约 20 人
- 业务损失：无法进行审核操作

## 故障现象
所有 API 请求返回 502 错误，管理后台无法访问。

## 根本原因
Railway 实例内存耗尽导致服务崩溃。

## 处理过程
- 10:00 监控发现服务不可用
- 10:05 确认为内存溢出
- 10:10 回滚到上一个版本
- 10:30 服务恢复正常

## 改进措施
1. 增加内存监控告警
2. 优化内存使用
3. 增加实例规格
```

---

## 4. 性能优化

### 4.1 数据库优化

#### 索引优化

```sql
-- 添加常用查询索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 添加复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_advertiser_status
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

-- 避免 N+1 查询，使用 JOIN
SELECT o.*, k.platform_username
FROM orders o
JOIN kols k ON o.kol_id = k.id;

-- 使用物化视图缓存复杂查询
CREATE MATERIALIZED VIEW mv_daily_stats AS
SELECT
  date_trunc('day', created_at) as day,
  count(*) as total_orders,
  sum(amount) as total_amount
FROM orders
GROUP BY date_trunc('day', created_at);

-- 刷新物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
```

### 4.2 缓存优化

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

// 缓存穿透保护（布隆过滤器）
async function getWithBloomFilter(key: string, fetchFn: () => Promise<any>) {
  // 检查布隆过滤器
  const exists = await bloomFilter.exists(key);
  if (!exists) {
    return null; // 肯定不存在
  }

  // 尝试从缓存获取
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // 从数据库获取
  const data = await fetchFn();

  // 写入缓存和布隆过滤器
  if (data) {
    await redis.setex(key, 3600, JSON.stringify(data));
    await bloomFilter.add(key);
  }

  return data;
}
```

#### CDN 缓存

```yaml
# Vercel 缓存配置 (vercel.json)
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "private, no-cache"
        }
      ]
    }
  ]
}
```

### 4.3 代码优化

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

// 使用事务保证一致性
await prisma.$transaction(async (tx) => {
  await tx.user.update({ ... });
  await tx.advertiser.create({ ... });
});
```

---

## 5. 安全加固

### 5.1 防火墙配置

#### Cloudflare WAF 规则

| 规则 | 动作 | 说明 |
|-----|------|------|
| SQL 注入检测 | Block | 拦截 SQL 注入尝试 |
| XSS 检测 | Block | 拦截跨站脚本攻击 |
| 恶意 Bot | Block | 拦截恶意爬虫 |
| 国家/地区限制 | Block | 限制高风险国家 |
| IP 信誉 | Block | 拦截低信誉 IP |

#### Railway 防火墙

```bash
# 仅允许 Cloudflare IP 访问
# Railway Dashboard → Settings → Networking
# 添加 Cloudflare IP 段到白名单
```

### 5.2 访问控制

#### API 限流

```typescript
import rateLimit from 'express-rate-limit';

// 全局限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', limiter);

// 管理员接口限流
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: '操作过于频繁，请稍后再试'
});

app.use('/api/admin/', adminLimiter);
```

#### IP 白名单

```typescript
const adminIpWhitelist = ['1.2.3.4', '5.6.7.8'];

app.use('/api/admin/', (req, res, next) => {
  if (!adminIpWhitelist.includes(req.ip)) {
    return res.status(403).json({
      success: false,
      error: { code: 'IP_NOT_ALLOWED', message: 'IP 不在白名单' }
    });
  }
  next();
});
```

### 5.3 数据加密

#### 传输加密

- 强制 HTTPS (HSTS)
- TLS 1.3
- 证书自动续期

#### 存储加密

- 密码：bcrypt (cost=12)
- JWT: RS256 非对称加密
- 敏感数据：AES-256

### 5.4 安全审计

#### 审计日志

```sql
-- 查看所有审计日志
SELECT * FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- 查看失败操作
SELECT * FROM admin_audit_logs
WHERE status = 'failure'
ORDER BY created_at DESC;

-- 查看敏感操作
SELECT * FROM admin_audit_logs
WHERE action IN ('user:delete', 'withdrawal:approve', 'settings:edit')
ORDER BY created_at DESC;
```

#### 定期审计

| 频率 | 审计内容 | 负责人 |
|-----|---------|--------|
| 每周 | 异常登录检测 | 安全团队 |
| 每月 | 权限审查 | 运维团队 |
| 每季度 | 完整安全审计 | 外部机构 |

---

## 6. 附录

### A. 常用命令

#### Railway 命令

```bash
# 登录
railway login

# 查看状态
railway status

# 查看日志
railway logs --follow

# 查看部署
railway deployments

# 重启服务
railway restart

# 回滚
railway rollback <deployment-id>

# 查看变量
railway variables

# 添加变量
railway variables set KEY=value
```

#### Vercel 命令

```bash
# 登录
vercel login

# 部署
vercel deploy

# 生产部署
vercel deploy --prod

# 查看部署
vercel ls

# 查看日志
vercel logs <deployment-url>

# 回滚
vercel rollback <deployment-url>
```

#### 数据库命令

```bash
# 连接数据库
psql "$DATABASE_URL"

# 导出数据库
pg_dump "$DATABASE_URL" > backup.sql

# 导入数据库
psql "$DATABASE_URL" < backup.sql

# 运行迁移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate
```

### B. 联系方式

| 服务 | 支持渠道 | 链接 |
|-----|---------|------|
| Railway | Email/Slack | railway.app/support |
| Vercel | Email/Chat | vercel.com/support |
| Supabase | Discord/Email | supabase.com/support |
| Upstash | Email | upstash.com/contact |
| Cloudflare | Chat/Email | cloudflare.com/support |

### C. 监控仪表板

| 仪表板 | 链接 | 说明 |
|-------|------|------|
| Grafana | https://grafana.aiads.com | 系统监控 |
| Sentry | https://sentry.io/organizations/aiads | 错误监控 |
| Supabase | https://app.supabase.com | 数据库监控 |
| Upstash | https://console.upstash.com | Redis 监控 |
| Vercel | https://vercel.com/aiads | 前端监控 |
| Railway | https://railway.app/project/aiads | 后端监控 |

### D. 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|-----|------|---------|------|
| 1.0.0 | 2026-03-25 | 初始版本 | DevOps Team |

---

**文档维护**: DevOps Team
**审核周期**: 每季度
**下次审核**: 2026-06-25

*最后更新：2026 年 3 月 25 日*
