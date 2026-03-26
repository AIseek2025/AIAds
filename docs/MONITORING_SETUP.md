# AIAds 管理后台监控配置文档

**版本**: 1.0.0
**创建日期**: 2026 年 3 月 25 日
**作者**: DevOps Team
**保密级别**: 内部机密

---

## 目录

1. [监控架构](#1-监控架构)
2. [应用监控](#2-应用监控)
3. [基础设施监控](#3-基础设施监控)
4. [业务监控](#4-业务监控)
5. [告警配置](#5-告警配置)
6. [监控面板](#6-监控面板)
7. [日志管理](#7-日志管理)

---

## 1. 监控架构

### 1.1 监控体系

```
┌─────────────────────────────────────────────────────────────────┐
│                   AIAds Monitoring Architecture                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Application    │  │  Infrastructure │  │   Business      │
│  Monitoring     │  │  Monitoring     │  │   Monitoring    │
│                 │  │                 │  │                 │
│  • Sentry       │  │  • Railway      │  │  • GMV          │
│  • Logtail      │  │  • Supabase     │  │  • Orders       │
│  • Custom       │  │  • Upstash      │  │  • Users        │
│  • Prometheus   │  │  • Vercel       │  │  • Conversion   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │      Grafana            │
                 │    (Visualization)      │
                 └───────────┬─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────┐ ┌─────────────┐
    │  Alertmanager   │ │  Slack  │ │    Email    │
    │  (Routing)      │ │         │ │   (SendGrid)│
    └─────────────────┘ └─────────┘ └─────────────┘
```

### 1.2 监控层级

| 层级 | 监控内容 | 工具 | 频率 |
|-----|---------|------|------|
| **应用层** | API 响应、错误率、业务逻辑 | Sentry, Custom Metrics | 实时 |
| **服务层** | 服务健康、资源使用 | Railway, Vercel | 30 秒 |
| **数据层** | 数据库连接、查询性能 | Supabase, Prometheus | 30 秒 |
| **基础设施** | CPU、内存、磁盘、网络 | Node Exporter | 30 秒 |
| **业务层** | GMV、订单、用户 | Custom Metrics | 1 分钟 |

### 1.3 监控指标分类

#### 黄金指标 (Golden Signals)

| 指标 | 说明 | 告警阈值 |
|-----|------|---------|
| **延迟 (Latency)** | 请求处理时间 | P95 > 500ms |
| **流量 (Traffic)** | 请求速率 | 突增/突降 50% |
| **错误 (Errors)** | 错误响应率 | > 1% |
| **饱和度 (Saturation)** | 资源使用率 | > 80% |

---

## 2. 应用监控

### 2.1 Sentry 错误监控

#### 安装配置

```bash
# 安装 Sentry SDK
cd /Users/surferboy/.openclaw/workspace/AIAds/src/backend
npm install @sentry/node @sentry/tracing
```

#### 后端配置

```typescript
// src/backend/src/utils/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% 采样率
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
    new Sentry.Integrations.Redis(),
    new Sentry.Integrations.Express({
      app: require('express')(),
    }),
  ],
  beforeSend(event, hint) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});

// 错误追踪中间件
export const sentryErrorHandler = Sentry.Handlers.errorHandler();
export const sentryRequestHandler = Sentry.Handlers.requestHandler();
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();
```

#### 前端配置

```typescript
// src/frontend/src/utils/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(),
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### 错误捕获

```typescript
// 捕获异常
try {
  // 业务逻辑
} catch (error) {
  Sentry.captureException(error, {
    tags: { module: 'payment', action: 'charge' },
    extra: { userId, amount, currency: 'CNY' },
    level: 'error',
  });
  throw error;
}

// 捕获消息
Sentry.captureMessage('Payment processed successfully', {
  level: 'info',
  tags: { module: 'payment' },
  extra: { transactionId: 'txn_123' },
});
```

### 2.2 自定义指标

#### Prometheus 指标

```typescript
// src/backend/src/metrics/index.ts
import client, { Counter, Histogram, Gauge } from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP 请求计数器
const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status', 'environment'],
  registers: [register],
});

// HTTP 请求延迟直方图
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'environment'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// 活跃连接数
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['environment'],
  registers: [register],
});

// 业务指标 - GMV
const gmvTotal = new Counter({
  name: 'gmv_total',
  help: 'Total Gross Merchandise Value',
  labelNames: ['currency', 'environment'],
  registers: [register],
});

// 业务指标 - 订单数
const ordersTotal = new Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'environment'],
  registers: [register],
});

// 业务指标 - 活跃用户
const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: ['type', 'environment'],
  registers: [register],
});

// 导出指标端点
export const metricsMiddleware = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

export { register, httpRequests, httpRequestDuration, activeConnections, gmvTotal, ordersTotal, activeUsers };
```

#### 指标埋点

```typescript
// API 请求中间件
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequests.inc({
      method: req.method,
      endpoint: req.route?.path || req.path,
      status: res.statusCode,
      environment: process.env.NODE_ENV,
    });
    httpRequestDuration.observe({
      method: req.method,
      endpoint: req.route?.path || req.path,
      environment: process.env.NODE_ENV,
    }, duration);
  });

  next();
});

// 业务指标埋点
async function processPayment(data: PaymentData) {
  const result = await paymentService.charge(data);

  if (result.success) {
    gmvTotal.inc({ currency: 'CNY', environment: 'production' }, data.amount);
    ordersTotal.inc({ status: 'completed', environment: 'production' });
  }

  return result;
}
```

---

## 3. 基础设施监控

### 3.1 Railway 监控

#### 监控指标

| 指标 | 说明 | 告警阈值 |
|-----|------|---------|
| **CPU 使用率** | 实例 CPU 使用百分比 | > 80% 持续 5 分钟 |
| **内存使用率** | 实例内存使用百分比 | > 85% 持续 5 分钟 |
| **响应时间** | API 平均响应时间 | P95 > 500ms |
| **错误率** | 5xx 错误比例 | > 1% |
| **请求量** | 每秒请求数 | 突增/突降 50% |
| **实例数** | 运行实例数量 | < 1 或 > 5 |

#### 配置告警

1. 登录 Railway Dashboard
2. 选择项目 → Settings → Alerts
3. 添加告警规则:

```yaml
# Railway 告警配置示例
alerts:
  - name: High CPU Usage
    metric: cpu_usage
    threshold: 80
    duration: 5m
    action: notify

  - name: High Memory Usage
    metric: memory_usage
    threshold: 85
    duration: 5m
    action: notify

  - name: High Error Rate
    metric: error_rate
    threshold: 1
    duration: 5m
    action: notify
```

### 3.2 Supabase 监控

#### 监控指标

| 指标 | 说明 | 告警阈值 |
|-----|------|---------|
| **数据库连接** | 连接池使用率 | > 80% |
| **存储空间** | 磁盘使用率 | > 80% |
| **CPU 使用率** | 数据库 CPU | > 80% |
| **慢查询** | 执行时间 > 1s 的查询 | > 10 个/分钟 |
| **复制延迟** | 主从复制延迟 | > 10 秒 |
| **事务数** | 活跃事务数 | > 100 |

#### 监控查询

```sql
-- 查看慢查询
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 查看连接数
SELECT count(*) as connections,
       max_conn.setting as max_connections
FROM pg_stat_activity,
     (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn;

-- 查看表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看锁等待
SELECT
  blocked_locks.pid     AS blocked_pid,
  blocked_activity.usename  AS blocked_user,
  blocking_locks.pid     AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query    AS blocked_statement,
  blocking_activity.query   AS current_statement_in_blocking_process
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### 3.3 Upstash Redis 监控

#### 监控指标

| 指标 | 说明 | 告警阈值 |
|-----|------|---------|
| **内存使用** | Redis 内存使用量 | > 80% |
| **连接数** | 并发连接数 | > 100 |
| **命令延迟** | 平均命令执行时间 | > 10ms |
| **命中率** | 缓存命中率 | < 90% |
| **键数量** | 存储的键数量 | 突增 50% |

#### 监控命令

```bash
# 查看 Redis 信息
redis-cli -u "$REDIS_URL" INFO

# 查看内存使用
redis-cli -u "$REDIS_URL" INFO memory

# 查看连接数
redis-cli -u "$REDIS_URL" CLIENT LIST | wc -l

# 查看慢查询
redis-cli -u "$REDIS_URL" SLOWLOG GET 10

# 查看键数量
redis-cli -u "$REDIS_URL" DBSIZE
```

### 3.4 Vercel 监控

#### 监控指标

| 指标 | 说明 | 告警阈值 |
|-----|------|---------|
| **构建失败** | 部署构建失败 | 任何失败 |
| **函数错误** | Serverless 函数错误 | > 1% |
| **带宽使用** | CDN 带宽使用 | > 80% 配额 |
| **响应时间** | 页面加载时间 | > 3 秒 |

---

## 4. 业务监控

### 4.1 核心业务指标

#### 用户指标

```typescript
// 用户注册数
const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations',
  labelNames: ['type', 'environment'],
});

// 活跃用户数
const activeUsers = new Gauge({
  name: 'active_users_gauge',
  help: 'Number of active users',
  labelNames: ['type', 'environment'],
});

// 用户留存率
const userRetentionRate = new Gauge({
  name: 'user_retention_rate',
  help: 'User retention rate',
  labelNames: ['period', 'environment'],
});
```

#### 交易指标

```typescript
// GMV
const gmvTotal = new Counter({
  name: 'gmv_total',
  help: 'Total Gross Merchandise Value',
  labelNames: ['currency', 'environment'],
});

// 订单数
const ordersTotal = new Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'environment'],
});

// 平均订单金额
const averageOrderValue = new Gauge({
  name: 'average_order_value',
  help: 'Average order value',
  labelNames: ['currency', 'environment'],
});

// 支付成功率
const paymentSuccessRate = new Gauge({
  name: 'payment_success_rate',
  help: 'Payment success rate',
  labelNames: ['provider', 'environment'],
});
```

#### KOL 指标

```typescript
// KOL 总数
const kolsTotal = new Gauge({
  name: 'kols_total',
  help: 'Total number of KOLs',
  labelNames: ['platform', 'verified', 'environment'],
});

// KOL 审核通过率
const kolApprovalRate = new Gauge({
  name: 'kol_approval_rate',
  help: 'KOL approval rate',
  labelNames: ['environment'],
});

// KOL 收益
const kolEarnings = new Counter({
  name: 'kol_earnings_total',
  help: 'Total KOL earnings',
  labelNames: ['currency', 'environment'],
});
```

### 4.2 业务告警

| 告警名称 | 触发条件 | 说明 |
|---------|---------|------|
| GMV 异常下降 | 小时 GMV < 1000 | 业务异常 |
| 订单量异常 | 小时订单 < 10 | 业务异常 |
| 支付失败率高 | 失败率 > 10% | 支付问题 |
| 用户注册异常 | 注册量突降 50% | 获客问题 |
| KOL 审核积压 | 待审核 > 100 | 审核人力不足 |

---

## 5. 告警配置

### 5.1 告警级别

| 级别 | 名称 | 响应时间 | 通知渠道 | 示例 |
|-----|------|----------|---------|------|
| P0 | 紧急 | 5 分钟 | 电话 + 短信 + Slack | 服务不可用 |
| P1 | 严重 | 15 分钟 | 短信 + Slack | 核心功能异常 |
| P2 | 警告 | 1 小时 | Slack + 邮件 | 性能下降 |
| P3 | 提示 | 4 小时 | 邮件 | 资源预警 |

### 5.2 Alertmanager 配置

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.sendgrid.net:587'
  smtp_from: 'alerts@aiads.com'
  smtp_auth_username: 'apikey'
  smtp_auth_password: '${SENDGRID_API_KEY}'

route:
  group_by: ['alertname', 'severity', 'environment']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: P0
      receiver: 'critical-receiver'
      continue: true
    - match:
        severity: P1
      receiver: 'slack-receiver'
    - match:
        environment: production
      receiver: 'production-receiver'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'devops@aiads.com'
        send_resolved: true

  - name: 'critical-receiver'
    email_configs:
      - to: 'devops-critical@aiads.com'
        send_resolved: true
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        send_resolved: true
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'slack-receiver'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-warning'
        send_resolved: true

  - name: 'production-receiver'
    email_configs:
      - to: 'production-team@aiads.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'P0'
    target_match:
      severity: 'P1'
    equal: ['alertname', 'instance']
```

### 5.3 Prometheus 告警规则

```yaml
# alerting-rules.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for more than 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: avg(rate(process_cpu_seconds_total[5m])) > 0.8
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1073741824 > 0.85
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | humanize }}GB"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: P0
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is not responding"

  - name: business
    rules:
      - alert: GMVDrop
        expr: rate(gmv_total[1h]) < 1000
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "GMV dropped significantly"
          description: "Current GMV/hour: {{ $value }}"

      - alert: HighPaymentFailureRate
        expr: rate(payment_failures_total[15m]) / rate(payment_attempts_total[15m]) > 0.1
        for: 15m
        labels:
          severity: P0
        annotations:
          summary: "High payment failure rate"
          description: "Failure rate: {{ $value | humanizePercentage }}"
```

---

## 6. 监控面板

### 6.1 Grafana 仪表板

#### 系统监控仪表板

```json
{
  "dashboard": {
    "title": "AIAds System Monitoring",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(rate(process_cpu_seconds_total[5m])) * 100",
            "legendFormat": "CPU %"
          }
        ],
        "thresholds": [
          { "value": 80, "color": "orange" },
          { "value": 90, "color": "red" }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1073741824",
            "legendFormat": "Memory GB"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ endpoint }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error %"
          }
        ],
        "thresholds": [
          { "value": 1, "color": "orange" },
          { "value": 5, "color": "red" }
        ]
      }
    ]
  }
}
```

#### 业务监控仪表板

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
            "expr": "rate(gmv_total[1h])",
            "legendFormat": "GMV/hour"
          }
        ]
      },
      {
        "title": "Orders",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(orders_total[1h])",
            "legendFormat": "Orders/hour"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_gauge",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Payment Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "payment_success_rate * 100",
            "legendFormat": "Success %"
          }
        ],
        "thresholds": [
          { "value": 90, "color": "green" },
          { "value": 95, "color": "yellow" },
          { "value": 100, "color": "green" }
        ]
      }
    ]
  }
}
```

### 6.2 监控面板访问

| 面板 | URL | 说明 |
|-----|-----|------|
| 系统监控 | https://grafana.aiads.com/d/system | CPU/内存/网络 |
| 业务监控 | https://grafana.aiads.com/d/business | GMV/订单/用户 |
| 错误监控 | https://sentry.io/organizations/aiads | 错误追踪 |
| 日志查看 | https://logtail.com/aiads | 日志聚合 |

---

## 7. 日志管理

### 7.1 日志收集

#### Winston 配置

```typescript
// src/backend/src/utils/logger.ts
import winston from 'winston';
import { Logtail } from '@logtail/node';

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN!);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'aiads-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${JSON.stringify(meta)}`;
        })
      ),
    }),
    // 文件输出
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // Logtail 输出
    new winston.transports.Stream({
      stream: new winston.transport.Stream({
        log: (info) => {
          logtail.log({
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            ...info.meta,
          });
        },
      }),
    }),
  ],
});

export default logger;
```

### 7.2 日志级别

| 级别 | 说明 | 示例 |
|-----|------|------|
| ERROR | 错误，需要关注 | API 失败、数据库错误 |
| WARN | 警告，可能有问题 | 限流触发、重试 |
| INFO | 信息，正常流程 | 用户登录、订单创建 |
| DEBUG | 调试，详细信息 | 请求参数、响应数据 |

### 7.3 日志查询

```bash
# Logtail 查询示例
# 错误日志
level: error AND service: aiads-backend

# 特定用户操作
userId: user_123 AND action: login

# 特定时间段
timestamp > "2026-03-25T10:00:00Z" AND timestamp < "2026-03-25T12:00:00Z"

# 特定模块
module: payment AND status: failure
```

### 7.4 日志保留策略

| 日志类型 | 保留期 | 存储位置 |
|---------|--------|---------|
| 错误日志 | 90 天 | Logtail + S3 |
| 访问日志 | 30 天 | Logtail |
| 审计日志 | 1 年 | 数据库 + S3 |
| 调试日志 | 7 天 | 本地 |

---

## 附录

### A. 环境变量

```env
# Sentry
SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx

# Logtail
LOGTAIL_SOURCE_TOKEN=xxx

# Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# PagerDuty
PAGERDUTY_SERVICE_KEY=xxx

# SendGrid (邮件告警)
SENDGRID_API_KEY=xxx
```

### B. 相关文档

- [部署报告](./DEPLOYMENT_REPORT.md)
- [运维手册](./OPERATIONS_MANUAL.md)
- [备份恢复](./BACKUP_RECOVERY.md)

### C. 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|-----|------|---------|------|
| 1.0.0 | 2026-03-25 | 初始版本 | DevOps Team |

---

**文档维护**: DevOps Team
**审核周期**: 每季度
**下次审核**: 2026-06-25

*最后更新：2026 年 3 月 25 日*
