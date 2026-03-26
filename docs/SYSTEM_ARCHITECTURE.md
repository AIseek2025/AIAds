# AIAds 系统架构设计文档

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds 架构团队  
**保密级别**: 内部机密

---

## 1. 系统架构概览

### 1.1 架构设计原则

```
1. 简单优先：MVP 阶段避免过度设计，快速上线验证
2. 云原生：充分利用云服务，降低运维成本
3. 可扩展：支持从 0 到 10 万用户的平滑扩展
4. 安全合规：数据加密、权限控制、合规审计
5. 成本优化：按需付费，避免资源浪费
```

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIAds Platform Architecture                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   Users     │
                                    │  (广告主/KOL) │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
           │   广告主 Web 端    │   │    KOL Web 端    │   │   管理后台 Web   │
           │  (React + MUI)   │   │  (React + MUI)   │   │  (React + MUI)   │
           └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │      Vercel (CDN)       │
                              │    静态资源托管 + 边缘缓存    │
                              └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │   API Gateway / LB      │
                              │   (Railway Load Balancer)│
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   Web API Server  │  │   Web API Server  │  │   Web API Server  │
        │  (Node.js + Express)│  │  (Node.js + Express)│  │  (Node.js + Express)│
        │   Railway 实例 1    │  │   Railway 实例 2    │  │   Railway 实例 N    │
        └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
                  │                      │                      │
                  └──────────────────────┼──────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
    │   PostgreSQL      │    │     Redis         │    │   Cloudflare R2   │
    │   (Supabase)      │    │   (Upstash)       │    │   (对象存储)        │
    │   主数据库          │    │   缓存/会话/队列     │    │   图片/视频存储     │
    └───────────────────┘    └───────────────────┘    └───────────────────┘
              │                          │                          │
              ▼                          ▼                          ▼
    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
    │   Supabase Auth   │    │   Upstash Queue   │    │   Cloudflare CDN  │
    │   用户认证          │    │   异步任务队列       │    │   全球加速         │
    └───────────────────┘    └───────────────────┘    └───────────────────┘

                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   TikTok API      │  │   YouTube API     │  │  Instagram API    │
        │   KOL 数据同步      │  │   KOL 数据同步      │  │   KOL 数据同步       │
        └───────────────────┘  └───────────────────┘  └───────────────────┘

                    ┌────────────────────┬────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   支付宝/微信支付    │  │     Stripe        │  │     PayPal        │
        │   广告主充值         │  │   国际信用卡       │  │   KOL 提现         │
        └───────────────────┘  └───────────────────┘  └───────────────────┘
```

### 1.3 技术栈总览

| 层级 | 技术选型 | 服务商 | 说明 |
|-----|---------|-------|------|
| **前端** | React 18 + TypeScript | - | 组件化开发，类型安全 |
| **UI 框架** | Material-UI (MUI) v5 | - | 快速构建企业级 UI |
| **状态管理** | Zustand | - | 轻量级状态管理 |
| **HTTP 客户端** | Axios + React Query | - | API 调用 + 数据缓存 |
| **后端** | Node.js 20 + Express | - | 高性能 API 服务 |
| **数据库** | PostgreSQL 15 | Supabase | 托管 PostgreSQL |
| **缓存** | Redis 7 | Upstash | Serverless Redis |
| **文件存储** | Cloudflare R2 | Cloudflare | S3 兼容对象存储 |
| **前端部署** | Vercel | Vercel | 自动 CI/CD |
| **后端部署** | Railway | Railway | 容器化部署 |
| **认证** | JWT + Supabase Auth | Supabase | 用户认证 |
| **监控** | Sentry + Logtail | - | 错误追踪 + 日志 |

---

## 2. 前端架构设计

### 2.1 前端应用结构

```
aiads-frontend/
├── apps/
│   ├── advertiser/          # 广告主端应用
│   │   ├── src/
│   │   │   ├── components/  # 通用组件
│   │   │   ├── pages/       # 页面组件
│   │   │   ├── features/    # 功能模块
│   │   │   │   ├── auth/    # 认证模块
│   │   │   │   ├── dashboard/ # 仪表板
│   │   │   │   ├── campaigns/ # 投放管理
│   │   │   │   ├── kols/    # KOL 管理
│   │   │   │   ├── finance/ # 财务管理
│   │   │   │   └── settings/ # 设置
│   │   │   ├── hooks/       # 自定义 Hooks
│   │   │   ├── services/    # API 服务
│   │   │   ├── stores/      # 状态管理
│   │   │   ├── types/       # TypeScript 类型
│   │   │   └── utils/       # 工具函数
│   │   └── public/
│   │
│   ├── kol/                 # KOL 端应用
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── tasks/   # 任务管理
│   │   │   │   ├── earnings/ # 收入管理
│   │   │   │   └── settings/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   └── public/
│   │
│   └── admin/               # 管理后台
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── features/
│       │   │   ├── users/   # 用户管理
│       │   │   ├──审核/     # 内容审核
│       │   │   ├── finance/ # 财务管理
│       │   │   ├── reports/ # 数据报表
│       │   │   └── settings/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── types/
│       │   └── utils/
│       └── public/
│
├── packages/
│   ├── ui/                  # 共享 UI 组件库
│   ├── utils/               # 共享工具函数
│   ├── types/               # 共享 TypeScript 类型
│   └── config/              # 共享配置
│
├── package.json
└── turbo.json               # Turborepo 配置
```

### 2.2 前端架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Browser Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 广告主 Web 端  │  │   KOL Web 端  │  │  管理后台    │              │
│  │  (Vercel)   │  │  (Vercel)   │  │  (Vercel)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                      Application Layer                           │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────┐    │
│  │                      React 18                           │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │   Pages     │  │  Components │  │   Layouts   │     │    │
│  │  │  (路由页面)  │  │  (可复用组件) │  │  (页面布局)  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────┐    │
│  │                    State Management                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │  Zustand    │  │ React Query │  │  Form State │     │    │
│  │  │ (全局状态)  │  │ (服务端状态) │  │ (表单状态)  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────┐    │
│  │                    Feature Modules                       │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │  Auth   │ │Campaign │ │  KOL    │ │Finance  │       │    │
│  │  │ 模块     │ │ 模块     │ │ 模块     │ │ 模块     │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                      Integration Layer                           │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │                    API Client                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Axios     │  │   Interceptors│  │   Retry     │       │  │
│  │  │ (HTTP 客户端) │  │  (拦截器)    │  │  (重试机制)  │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │                    Auth Client                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │    JWT      │  │   Token     │  │   Refresh   │       │  │
│  │  │  (令牌管理)  │  │  (存储)     │  │  (刷新)     │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Backend API   │
                  │   (Railway)     │
                  └─────────────────┘
```

### 2.3 前端核心组件设计

#### 2.3.1 认证流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   用户登录    │────▶│  JWT 验证     │────▶│  获取用户信息  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  Token 存储   │     │  路由跳转     │
                     │  (localStorage)│    │  (根据角色)   │
                     └──────────────┘     └──────────────┘
```

#### 2.3.2 API 请求流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  组件发起请求  │────▶│ React Query  │────▶│   Axios      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  缓存检查     │     │  Auth Header │
                     │  (有则返回)   │     │  (添加 Token) │
                     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Backend API │
                                          └──────────────┘
```

---

## 3. 后端架构设计

### 3.1 后端服务架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Architecture                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Railway Load Balancer                       │   │
│  │         (自动 SSL + 健康检查 + 负载均衡)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Express.js Server                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Middleware │  │   Routes    │  │  Controllers │     │   │
│  │  │  (中间件)   │  │  (路由层)   │  │  (控制层)   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Service Layer                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  User   │ │Campaign │ │  KOL    │ │ Payment │       │   │
│  │  │Service  │ │Service  │ │Service  │ │Service  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  Order  │ │Tracking │ │   AI    │ │Notification│    │   │
│  │  │Service  │ │Service  │ │Service  │ │ Service  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Access Layer                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Repository │  │   Models    │  │   Query     │     │   │
│  │  │  (数据仓库)  │  │  (数据模型)  │  │  Builder    │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │   Redis     │  │  Cloudflare │             │
│  │ (Supabase)  │  │ (Upstash)   │  │    R2       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   TikTok    │  │   YouTube   │  │  Instagram  │             │
│  │    API      │  │    API      │  │    API      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Alipay/    │  │   Stripe    │  │   PayPal    │             │
│  │  WeChat Pay │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 后端目录结构

```
aiads-backend/
├── src/
│   ├── config/              # 配置文件
│   │   ├── database.ts      # 数据库配置
│   │   ├── redis.ts         # Redis 配置
│   │   ├── storage.ts       # 存储配置
│   │   └── index.ts
│   │
│   ├── middleware/          # 中间件
│   │   ├── auth.ts          # 认证中间件
│   │   ├── errorHandler.ts  # 错误处理
│   │   ├── rateLimiter.ts   # 限流中间件
│   │   ├── logger.ts        # 日志中间件
│   │   └── validation.ts    # 验证中间件
│   │
│   ├── routes/              # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── advertisers.routes.ts
│   │   ├── kols.routes.ts
│   │   ├── campaigns.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── tracking.routes.ts
│   │   └── index.ts
│   │
│   ├── controllers/         # 控制器
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── advertisers.controller.ts
│   │   ├── kols.controller.ts
│   │   ├── campaigns.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── payments.controller.ts
│   │   └── tracking.controller.ts
│   │
│   ├── services/            # 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   ├── advertisers.service.ts
│   │   ├── kols.service.ts
│   │   ├── campaigns.service.ts
│   │   ├── orders.service.ts
│   │   ├── payments.service.ts
│   │   ├── tracking.service.ts
│   │   ├── ai/
│   │   │   ├── matching.service.ts    # AI 匹配服务
│   │   │   ├── fraud.service.ts       # 欺诈检测服务
│   │   │   └── pricing.service.ts     # 智能定价服务
│   │   └── integrations/
│   │       ├── tiktok.service.ts      # TikTok 集成
│   │       ├── youtube.service.ts     # YouTube 集成
│   │       ├── instagram.service.ts   # Instagram 集成
│   │       ├── alipay.service.ts      # 支付宝集成
│   │       ├── wechatpay.service.ts   # 微信支付集成
│   │       ├── stripe.service.ts      # Stripe 集成
│   │       └── paypal.service.ts      # PayPal 集成
│   │
│   ├── repositories/        # 数据访问层
│   │   ├── base.repository.ts
│   │   ├── users.repository.ts
│   │   ├── advertisers.repository.ts
│   │   ├── kols.repository.ts
│   │   ├── campaigns.repository.ts
│   │   ├── orders.repository.ts
│   │   └── transactions.repository.ts
│   │
│   ├── models/              # 数据模型
│   │   ├── user.model.ts
│   │   ├── advertiser.model.ts
│   │   ├── kol.model.ts
│   │   ├── campaign.model.ts
│   │   ├── order.model.ts
│   │   ├── transaction.model.ts
│   │   └── tracking.model.ts
│   │
│   ├── types/               # TypeScript 类型
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   ├── campaign.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/               # 工具函数
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── crypto.ts
│   │   └── helpers.ts
│   │
│   ├── jobs/                # 定时任务
│   │   ├── syncKolData.job.ts
│   │   ├── processPayments.job.ts
│   │   └── cleanup.job.ts
│   │
│   └── app.ts               # 应用入口
│
├── tests/                   # 测试文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── prisma/                  # Prisma ORM 配置
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 3.3 核心服务设计

#### 3.3.1 认证服务

```typescript
// src/services/auth.service.ts

interface AuthService {
  // 用户注册
  register(data: RegisterDTO): Promise<AuthResponse>;
  
  // 用户登录
  login(credentials: LoginDTO): Promise<AuthResponse>;
  
  // 刷新 Token
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  
  // 登出
  logout(userId: string): Promise<void>;
  
  // 验证 Token
  verifyToken(token: string): Promise<TokenPayload>;
  
  // 发送验证码
  sendVerificationCode(type: 'email' | 'phone', target: string): Promise<void>;
  
  // 验证验证码
  verifyCode(type: 'email' | 'phone', target: string, code: string): Promise<boolean>;
}
```

#### 3.3.2 AI 匹配服务

```typescript
// src/services/ai/matching.service.ts

interface MatchingService {
  // 为广告主推荐 KOL
  recommendKols(
    advertiserId: string,
    criteria: MatchingCriteria
  ): Promise<KolRecommendation[]>;
  
  // 计算匹配度分数
  calculateMatchScore(
    campaign: Campaign,
    kol: Kol
  ): Promise<MatchScore>;
  
  // 学习用户偏好
  learnPreferences(
    userId: string,
    interactions: UserInteraction[]
  ): Promise<void>;
}

interface MatchingCriteria {
  industry?: string;        // 行业
  targetAudience?: string;  // 目标受众
  budgetRange?: [number, number]; // 预算范围
  platform?: string[];      // 平台
  followerRange?: [number, number]; // 粉丝范围
  engagementRate?: number;  // 最低互动率
  location?: string[];      // 地区
}
```

#### 3.3.3 欺诈检测服务

```typescript
// src/services/ai/fraud.service.ts

interface FraudDetectionService {
  // 检测 KOL 粉丝质量
  detectFakeFollowers(kolId: string): Promise<FraudReport>;
  
  // 检测异常互动
  detectAbnormalEngagement(kolId: string): Promise<EngagementReport>;
  
  // 风险评估
  assessRisk(kolId: string): Promise<RiskAssessment>;
  
  // 标记可疑 KOL
  flagSuspiciousKol(kolId: string, reason: string): Promise<void>;
}

interface FraudReport {
  kolId: string;
  fakeFollowerPercentage: number;
  suspiciousPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  detectedAt: Date;
}
```

---

## 4. 数据库架构设计

### 4.1 数据库架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     Database Architecture                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Core Tables                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │  users   │  │advertisers│  │   kols   │               │  │
│  │  │  用户表   │  │  广告主表  │  │  KOL 表   │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │campaigns │  │  orders  │  │transactions│              │  │
│  │  │ 活动表   │  │  订单表   │  │  交易表    │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │tracking  │  │ messages │  │ reviews  │               │  │
│  │  │ 追踪表   │  │  消息表   │  │  评价表   │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Indexes & Constraints                   │  │
│  │  • Primary Keys (UUID)                                    │  │
│  │  • Foreign Keys (级联删除)                                 │  │
│  │  • Unique Indexes (email, phone, username)                │  │
│  │  • Composite Indexes (查询优化)                            │  │
│  │  • Partial Indexes (状态过滤)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Row Level Security                     │  │
│  │  • 用户只能访问自己的数据                                  │  │
│  │  • 管理员可访问所有数据                                    │  │
│  │  • KOL 数据公开可见 (部分字段)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Redis (Upstash)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Sessions  │  │    Cache    │  │    Queue    │             │
│  │  (用户会话)  │  │  (热点数据)  │  │  (任务队列)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  • JWT Token 黑名单                                              │
│  • 验证码缓存 (5 分钟)                                            │
│  • KOL 数据缓存 (1 小时)                                           │
│  • 异步任务队列                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 表关系图

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │   advertisers   │
│─────────────────│         │─────────────────│
│ id (PK)         │◄───────┤│ user_id (FK)    │
│ email           │  1:1    │ id (PK)         │
│ phone           │         │ company_name    │
│ password_hash   │         │ business_license│
│ role            │         │ status          │
│ status          │         │ wallet_balance  │
│ created_at      │         │ created_at      │
└─────────────────┘         └─────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────┐
│      kols       │
│─────────────────│
│ user_id (FK)    │
│ id (PK)         │
│ platform        │
│ platform_id     │
│ username        │
│ followers       │
│ engagement_rate │
│ category        │
│ status          │
│ verified_at     │
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐         ┌─────────────────┐
│   campaigns     │         │     orders      │
│─────────────────│         │─────────────────│
│ id (PK)         │◄────────││ campaign_id(FK) │
│ advertiser_id   │  1:N    │ id (PK)         │
│ title           │         │ kol_id (FK)     │
│ description     │         │ status          │
│ budget          │         │ price           │
│ status          │         │ content_url     │
│ created_at      │         │ published_at    │
└─────────────────┘         └─────────────────┘
        │                           │
        │ 1:N                       │ 1:1
        ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  transactions   │         │  tracking_events│
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ order_id (FK)   │         │ order_id (FK)   │
│ type            │         │ event_type      │
│ amount          │         │ event_data      │
│ status          │         │ created_at      │
│ created_at      │         └─────────────────┘
└─────────────────┘
```

---

## 5. 缓存架构设计

### 5.1 缓存策略

```
┌─────────────────────────────────────────────────────────────────┐
│                       Caching Strategy                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Cache Layers                                  │
│                                                                  │
│  L1: Browser Cache (localStorage)                               │
│  • JWT Token                                                    │
│  • 用户基本信息                                                   │
│  • 应用配置                                                      │
│  TTL: Token 过期时间 / 配置 24 小时                                   │
│                                                                  │
│  L2: React Query Cache                                          │
│  • API 响应数据                                                  │
│  • 列表数据 (分页)                                                │
│  TTL: 1-5 分钟 (根据数据类型)                                        │
│                                                                  │
│  L3: Redis Cache (Upstash)                                      │
│  • 会话数据 (JWT 黑名单)                                           │
│  • 验证码 (5 分钟)                                                 │
│  • KOL 详情数据 (1 小时)                                            │
│  • 热门 KOL 列表 (30 分钟)                                          │
│  • 分布式锁                                                      │
│  TTL: 根据数据类型                                                │
│                                                                  │
│  L4: Database Query Cache                                       │
│  • 复杂查询结果                                                   │
│  • 聚合统计数据                                                   │
│  TTL: 5-30 分钟                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Redis 键设计

```typescript
// Redis Key 命名规范

// 会话相关
session:{userId}              // 用户会话
jwt:blacklist:{jti}           // JWT 黑名单
verification:{type}:{target}  // 验证码

// 用户数据
user:profile:{userId}         // 用户资料
user:settings:{userId}        // 用户设置

// KOL 数据
kol:profile:{kolId}           // KOL 资料
kol:stats:{kolId}             // KOL 统计数据
kol:list:featured             // 推荐 KOL 列表
kol:list:trending             // 热门 KOL 列表

// 活动数据
campaign:{campaignId}         // 活动详情
campaign:list:{advertiserId}  // 广告主活动列表

// 订单数据
order:{orderId}               // 订单详情
order:list:{userId}           // 用户订单列表

// 队列
queue:payment:process         // 支付处理队列
queue:notification:send       // 通知发送队列
queue:kol:sync                // KOL 数据同步队列

// 锁
lock:payment:{orderId}        // 支付锁
lock:order:{orderId}          // 订单锁
```

---

## 6. 文件存储架构

### 6.1 Cloudflare R2 存储设计

```
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare R2 Storage                          │
└─────────────────────────────────────────────────────────────────┘

Bucket: aiads-media

目录结构:
├── avatars/                    # 用户头像
│   ├── users/{userId}/
│   └── kols/{kolId}/
│
├── business-licenses/          # 营业执照
│   └── {advertiserId}/
│
├── campaigns/                  # 活动素材
│   └── {campaignId}/
│       ├── brief/              # 需求简报
│       ├── assets/             # 素材文件
│       └── submissions/        # KOL 提交内容
│
├── contracts/                  # 合同文件
│   └── {orderId}/
│
├── reports/                    # 数据报告
│   └── {userId}/
│
└── temp/                       # 临时文件
    └── {sessionId}/

访问控制:
• 公开读取：KOL 公开资料图片
• 签名 URL：合同、报告等敏感文件
• 私有：营业执照等认证文件

CDN 加速:
• Cloudflare CDN 全球加速
• 图片自动优化
• 视频流式传输
```

---

## 7. 第三方服务集成

### 7.1 社交媒体 API 集成

```
┌─────────────────────────────────────────────────────────────────┐
│               Social Media API Integration                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TikTok API    │     │   YouTube API   │     │ Instagram API   │
│─────────────────│     │─────────────────│     │─────────────────│
│ • 用户信息       │     │ • 频道信息       │     │ • 用户信息       │
│ • 视频列表       │     │ • 视频列表       │     │ • 帖子列表       │
│ • 粉丝统计       │     │ • 订阅者统计     │     │ • 粉丝统计       │
│ • 互动数据       │     │ • 互动数据       │     │ • 互动数据       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Data Sync Service     │
                    │─────────────────────────│
                    │ • 定时同步 (每小时)      │
                    │ • 增量更新              │
                    │ • 数据标准化            │
                    │ • 异常检测              │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   PostgreSQL Database   │
                    └─────────────────────────┘
```

### 7.2 支付服务集成

```
┌─────────────────────────────────────────────────────────────────┐
│                   Payment Integration                            │
└─────────────────────────────────────────────────────────────────┘

广告主充值:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   支付宝     │  │   微信支付   │  │   Stripe    │  │   PayPal    │
│─────────────│  │─────────────│  │─────────────│  │─────────────│
│ • 扫码支付   │  │ • 扫码支付   │  │ • 信用卡     │  │ • 国际支付   │
│ • APP 支付    │  │ • APP 支付    │  │ • 借记卡     │  │ • 钱包       │
│ • 网页支付   │  │ • 网页支付   │  │ • 银行转账   │  │ • 信用卡     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

KOL 提现:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   PayPal    │  │   Stripe    │  │  银行转账    │
│─────────────│  │─────────────│  │─────────────│
│ • 全球覆盖   │  │ • 多币种     │  │ • 本地银行   │
│ • 快速到账   │  │ • API 集成   │  │ • 大额提现   │
└─────────────┘  └─────────────┘  └─────────────┘

支付流程:
1. 创建支付订单 → 2. 选择支付方式 → 3. 跳转支付 → 4. 回调处理 → 5. 更新余额
```

---

## 8. 部署架构

### 8.1 部署架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Deployment Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Vercel                                   │
│                    (Frontend Hosting)                            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 广告主端     │  │   KOL 端     │  │  管理后台    │             │
│  │ advertiser. │  │ kol.aiads.  │  │ admin.aiads.│             │
│  │ aiads.com   │  │ com         │  │ com         │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Features:                                                       │
│  • 自动 HTTPS                                                    │
│  • 全球 CDN                                                      │
│  • 自动 CI/CD                                                    │
│  • Preview Deployments                                           │
│  • Edge Functions                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Railway                                   │
│                    (Backend Hosting)                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Production Environment                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ API Server  │  │ API Server  │  │ API Server  │     │   │
│  │  │  Instance 1 │  │  Instance 2 │  │  Instance N │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │         ▲               ▲               ▲               │   │
│  │         └───────────────┼───────────────┘               │   │
│  │                         │                               │   │
│  │              ┌──────────┴──────────┐                    │   │
│  │              │   Load Balancer     │                    │   │
│  │              │   (自动 SSL)         │                    │   │
│  │              └─────────────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Staging Environment                   │   │
│  │  ┌─────────────┐                                        │   │
│  │  │ API Server  │                                        │   │
│  │  │  (Single)   │                                        │   │
│  │  └─────────────┘                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Features:                                                       │
│  • 自动部署 (Git Push)                                           │
│  • 环境变量管理                                                   │
│  • 自动 SSL 证书                                                   │
│  • 健康检查                                                      │
│  • 自动扩缩容                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Managed Services                            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Supabase   │  │  Upstash    │  │ Cloudflare  │             │
│  │ PostgreSQL  │  │   Redis     │  │     R2      │             │
│  │  (主数据库)  │  │  (缓存/队列) │  │  (对象存储)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 CI/CD 流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                           │
└─────────────────────────────────────────────────────────────────┘

前端 (Vercel):
Git Push ──▶ GitHub Actions ──▶ Build ──▶ Deploy Preview
                                      │
                                      ▼
                              Main Branch Merge
                                      │
                                      ▼
                              Deploy Production

后端 (Railway):
Git Push ──▶ GitHub Actions ──▶ Test ──▶ Build Docker ──▶ Deploy
                                      │
                                      ▼
                              Run Migrations
                                      │
                                      ▼
                              Health Check
```

---

## 9. 安全架构

### 9.1 安全层次

```
┌─────────────────────────────────────────────────────────────────┐
│                       Security Layers                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                       │
│ • HTTPS/TLS 1.3 (强制)                                          │
│ • DDoS 防护 (Cloudflare)                                         │
│ • WAF (Web Application Firewall)                                │
│ • IP 白名单 (管理后台)                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Application Security                                   │
│ • JWT 认证 (RS256)                                               │
│ • RBAC 权限控制                                                  │
│ • 输入验证 (Zod)                                                 │
│ • SQL 注入防护 (Prisma ORM)                                       │
│ • XSS 防护 (Content Security Policy)                             │
│ • CSRF 防护                                                      │
│ • 速率限制 (Rate Limiting)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Data Security                                          │
│ • 密码加密 (bcrypt)                                              │
│ • 敏感数据加密存储 (AES-256)                                     │
│ • Row Level Security (Supabase)                                 │
│ • 数据脱敏 (日志/调试)                                            │
│ • 定期备份 (每日)                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Operational Security                                   │
│ • 环境变量加密                                                   │
│ • 密钥管理 (Railway Secrets)                                    │
│ • 访问日志审计                                                   │
│ • 异常检测告警                                                   │
│ • 安全更新 (依赖扫描)                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 认证流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Flow                          │
└─────────────────────────────────────────────────────────────────┘

注册流程:
用户填写信息 ──▶ 发送验证码 ──▶ 验证通过 ──▶ 创建用户 ──▶ 生成 Token
                                                              │
                                                              ▼
                                                      返回 Access + Refresh Token

登录流程:
用户登录 ──▶ 验证凭证 ──▶ 生成 Token ──▶ 返回 Token ──▶ 客户端存储

Token 刷新:
Access Token 过期 ──▶ 使用 Refresh Token ──▶ 获取新 Token ──▶ 更新存储

登出流程:
用户登出 ──▶ Token 加入黑名单 ──▶ 清除本地存储

Token 结构:
{
  "sub": "user_id",
  "role": "advertiser|kol|admin",
  "iat": 1234567890,
  "exp": 1234571490,  // 1 小时
  "jti": "unique_token_id"
}
```

---

## 10. 监控与日志

### 10.1 监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring & Logging                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Sentry      │     │    Logtail      │     │  Uptime Kuma    │
│─────────────────│     │─────────────────│     │─────────────────│
│ • 错误追踪       │     │ • 日志聚合       │     │ • 服务监控       │
│ • 性能监控       │     │ • 日志搜索       │     │ • 告警通知       │
│ • 用户行为       │     │ • 日志分析       │     │ • 状态页面       │
│ • Source Maps   │     │ • 告警规则       │     │ • 响应时间       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Application Code      │
                    │   (Instrumentation)     │
                    └─────────────────────────┘

监控指标:
• API 响应时间 (P50, P95, P99)
• 错误率 (按类型/端点)
• 请求量 (按端点/状态码)
• 数据库查询时间
• Redis 命中率
• 活跃用户数
• 业务指标 (订单量/GMV)
```

---

## 11. 扩展性设计

### 11.1 水平扩展策略

```
┌─────────────────────────────────────────────────────────────────┐
│                   Horizontal Scaling                             │
└─────────────────────────────────────────────────────────────────┘

API 服务扩展:
• Railway 自动扩展 (基于 CPU/内存)
• 无状态设计 (会话存 Redis)
• 最大实例数：10 (根据负载调整)

数据库扩展:
• Supabase 自动扩展 (存储 + 计算)
• 读写分离 (读副本)
• 连接池 (PgBouncer)

缓存扩展:
• Upstash 自动扩展 (Serverless)
• 分片策略 (按数据类型)

文件存储扩展:
• Cloudflare R2 无限扩展
• CDN 边缘缓存

预期容量:
• 10 万用户：2-3 API 实例
• 100 万用户：5-8 API 实例 + 读副本
• 1000 万用户：微服务拆分 + 分库分表
```

---

## 12. 成本估算

### 12.1 月度成本 (MVP 阶段)

| 服务 | 套餐 | 月成本 | 说明 |
|-----|------|-------|------|
| **Vercel** | Pro | $20/月 | 前端托管 |
| **Railway** | Pay as you go | $50-100/月 | 后端托管 (2-3 实例) |
| **Supabase** | Pro | $25/月 | PostgreSQL + Auth |
| **Upstash** | Pay as you go | $10-20/月 | Redis |
| **Cloudflare R2** | Pay as you go | $5-10/月 | 对象存储 + CDN |
| **Sentry** | Team | $26/月 | 错误追踪 |
| **Logtail** | Basic | $29/月 | 日志管理 |
| **域名** | - | $5/月 | 3 个域名 |
| **合计** | - | **$170-235/月** | 约 ¥1,200-1,700/月 |

### 12.2 扩展成本 (增长阶段)

| 阶段 | 用户量 | 预估月成本 |
|-----|-------|-----------|
| MVP | 1,000 用户 | ¥1,500/月 |
| 增长 | 10,000 用户 | ¥5,000/月 |
| 规模 | 100,000 用户 | ¥20,000/月 |

---

## 13. 技术决策记录

### 13.1 关键技术选型

| 决策 | 选项 | 选择 | 理由 |
|-----|------|------|------|
| **前端框架** | React vs Vue vs Angular | React | 生态丰富，团队熟悉 |
| **UI 框架** | MUI vs AntD vs Chakra | MUI | 企业级，主题定制 |
| **后端框架** | Express vs Fastify vs NestJS | Express | 简单，MVP 优先 |
| **数据库** | PostgreSQL vs MySQL vs MongoDB | PostgreSQL | 关系型，Supabase 托管 |
| **ORM** | Prisma vs TypeORM vs Drizzle | Prisma | 类型安全，开发体验 |
| **缓存** | Redis vs Memcached | Redis | 功能丰富，Upstash 托管 |
| **部署** | VPS vs PaaS | PaaS | 运维简单，快速上线 |
| **认证** | 自研 vs Supabase Auth | Supabase Auth | 快速集成，安全 |

### 13.2 架构演进路线

```
Phase 1 (MVP, Month 1-2):
• 单体架构 (Node.js + Express)
• 共享数据库
• 基础缓存
• 手动部署

Phase 2 (Growth, Month 3-6):
• 模块化单体
• 读写分离
• 自动部署
• 监控完善

Phase 3 (Scale, Month 7-12):
• 微服务拆分 (用户/订单/支付)
• 消息队列
• 服务网格
• 多区域部署
```

---

## 14. 附录

### 14.1 环境变量配置

```bash
# .env.example

# 应用配置
NODE_ENV=production
PORT=3000
API_VERSION=v1

# 数据库 (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/aiads

# Redis (Upstash)
REDIS_URL=upstash://host:port
REDIS_TOKEN=token

# 认证
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# 存储 (Cloudflare R2)
R2_ACCOUNT_ID=account-id
R2_ACCESS_KEY=access-key
R2_SECRET_KEY=secret-key
R2_BUCKET=aiads-media

# 第三方 API
TIKTOK_API_KEY=key
YOUTUBE_API_KEY=key
INSTAGRAM_API_KEY=key

# 支付
ALIPAY_APP_ID=app-id
ALIPAY_PRIVATE_KEY=key
WECHAT_PAY_MCH_ID=mch-id
WECHAT_PAY_PRIVATE_KEY=key
STRIPE_SECRET_KEY=key
PAYPAL_CLIENT_ID=id
PAYPAL_SECRET=key

# 监控
SENTRY_DSN=dsn
LOGTAIL_TOKEN=token
```

### 14.2 参考文档

- [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) - 产品规划
- [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) - 项目章程
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 数据库设计
- [API_SPEC.md](./API_SPEC.md) - API 规范
- [TECH_STACK.md](./TECH_STACK.md) - 技术选型

---

*本文档由 AIAds 架构团队编写，仅供内部技术参考*
*保密级别：内部机密*
