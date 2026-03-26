# AIAds - 全球中小 KOL 广告投放平台

> 帮助中国工厂/企业把广告预算投给全球其他国家的小 KOL（几千到几万粉丝）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/status-planning-blue)]()
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)]()

**源码仓库**: [github.com/AIseek2025/AIAds](https://github.com/AIseek2025/AIAds)

### 一键部署（Docker）

1. 安装 [Docker](https://docs.docker.com/get-docker/) 与 Docker Compose v2  
2. 项目根目录：`cp .env.example .env` 并修改 `DB_PASSWORD`、`JWT_SECRET`  
3. 执行：`bash scripts/deploy.sh`  
4. 前端 <http://localhost/> ，API <http://localhost:3000>  

数据库 schema 见 `src/backend/prisma/`；首次部署请按需执行 `npx prisma migrate deploy` 或 `db push`（开发环境）。

---

## 🎯 项目愿景

打造全球领先的"AI×中国供应链×全球中小 KOL"广告投放平台，帮助中国工厂/企业以最低成本获取全球曝光，同时为全球中小 KOL 提供简单可靠的变现渠道。

---

## 💡 核心价值

### 对广告主（中国工厂/企业）

| 价值 | 说明 |
|------|------|
| **低成本** | 中小 KOL 广告成本仅为头部 KOL 的 1/10-1/100 |
| **高 ROI** | 精准匹配，按效果付费，¥100-500/人起 |
| **省心** | 一站式管理，智能投放，自动优化 |
| **供应链优势** | 深度整合中国供应商资源，提供选品 - 投放 - 转化闭环 |

### 对 KOL（全球中小博主）

| 价值 | 说明 |
|------|------|
| **稳定收入** | 持续的任务来源，可预期的收入 |
| **低门槛** | 几千粉丝即可入驻，无保证金 |
| **简单操作** | 一键接单，发布即赚 |
| **公平透明** | 清晰的定价和结算机制 |

---

## 🎪 目标市场

### 广告主市场

- **中国跨境电商企业数量**：50 万 +
- **年海外营销预算≥10 万企业**：10 万 +
- **KOL 营销采用率**：35%
- **目标渗透率（3 年）**：5%
- **可触达广告主**：5000 家

### KOL 市场

| 平台 | 1 万 -5 万粉丝账号 | 目标渗透率 | 可触达 KOL |
|------|------------------|------------|-----------|
| TikTok | 500 万 + | 1% | 5 万 |
| YouTube | 200 万 + | 1% | 2 万 |
| Instagram | 300 万 + | 1% | 3 万 |
| **合计** | **1000 万+** | - | **10 万** |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端（Vercel）                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │广告主后台    │  │  KOL 后台    │  │  管理后台    │         │
│  │  React      │  │  React      │  │  React      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                    后端（Railway）                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Node.js + Express + TypeScript                      │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   数据层（Supabase）                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │PostgreSQL│ │   Auth   │ │  Storage │ │  Real   │       │
│  │ 数据库    │ │  认证     │ │  文件存储 │ │  时订阅   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React + TypeScript + MUI | 响应式 Web 应用 |
| **后端** | Node.js + Express | RESTful API |
| **数据库** | PostgreSQL (Supabase) | 主数据库 |
| **缓存** | Redis (Upstash) | 会话和缓存 |
| **部署** | Vercel + Railway | 自动 CI/CD |
| **文件存储** | Cloudflare R2 | 图片和视频 |

### 第三方集成

| 服务 | 用途 |
|------|------|
| TikTok API | KOL 数据同步 |
| YouTube API | KOL 数据同步 |
| Instagram Graph API | KOL 数据同步 |
| Stripe | 国际支付 |
| 支付宝/微信 | 国内支付 |
| PayPal | KOL 提现 |
| SendGrid | 邮件发送 |
| Twilio | 短信发送 |

---

## 📋 功能模块

### MVP 功能（6 周）

**广告主端**：
- 注册登录、实名认证
- 充值支付（支付宝/微信/银行卡）
- 发布需求、KOL 搜索
- AI 推荐、发起合作
- 内容审核、数据看板

**KOL 端**：
- 注册登录、账号绑定
- 数据同步、任务广场
- 申请任务、发布内容
- 收益明细、提现

**管理后台**：
- 用户管理、KOL 审核
- 内容审核、财务管理
- 数据报表

---

## 📁 项目结构

```
AIAds/
├── agents/                 # Agent 团队技能定义
│   ├── product-manager/    # 产品经理
│   ├── market-researcher/  # 市场研究员
│   ├── architect/          # 架构师
│   ├── backend-dev/        # 后端开发
│   ├── frontend-dev/        # 前端开发
│   ├── qa-engineer/        # QA 工程师
│   ├── security-auditor/   # 安全审计
│   └── devops-engineer/    # DevOps
├── docs/                   # 产品文档
│   ├── COMPETITOR_ANALYSIS_*.md  # 竞品分析
│   ├── COMPETITOR_MATRIX.md      # 竞品对比
│   ├── PRODUCT_PLAN.md           # 产品规划
│   └── MEETING_NOTES_*.md        # 会议记录
├── src/                    # 源代码（待创建）
│   ├── frontend/           # 前端代码
│   └── backend/            # 后端代码
├── tests/                  # 测试用例（待创建）
├── configs/                # 配置文件（待创建）
├── CLAUDE.md               # 项目配置
├── TODOS.md                # 待办事项
└── README.md               # 本文档
```

---

## 🚀 开发流程

采用 **gstack** 框架规范开发流程：

```
Think → Plan → Build → Review → Test → Ship → Reflect
```

### 阶段一：产品规划（当前）

- [x] 竞品调研（4 份报告）
- [x] 竞品对比矩阵
- [x] 产品规划文档
- [x] 项目章程
- [ ] 团队组建

### 阶段二：技术设计（Week 1）

- [ ] 系统架构设计
- [ ] API 规范定义
- [ ] 数据库设计
- [ ] 技术方案评审

### 阶段三：MVP 开发（Week 2-4）

- [ ] 基础架构搭建
- [ ] 用户认证系统
- [ ] 支付集成
- [ ] 社交 API 对接
- [ ] 核心功能开发

### 阶段四：测试上线（Week 5-6）

- [ ] 测试用例执行
- [ ] Bug 修复
- [ ] 安全审计
- [ ] 压力测试
- [ ] 正式上线

---

## 👥 团队构成

| 角色 | 人数 | 状态 |
|------|------|------|
| 产品经理 | 1 | ✅ 已到位 |
| 架构师 | 1 | ✅ 已到位 |
| 后端开发 | 3 | ⏳ 需招募 |
| 前端开发 | 2 | ⏳ 需招募 |
| AI 工程师 | 1 | ⏳ 需招募 |
| QA 工程师 | 1 | ⏳ 需招募 |
| DevOps | 1 | ⏳ 需招募 |
| **合计** | **10** | - |

---

## 📊 关键指标

### 3 个月目标

| 指标 | 目标值 |
|------|--------|
| 注册广告主 | 500+ |
| 注册 KOL | 10,000+ |
| 月 GMV | ¥100 万 + |
| 月收入 | ¥50 万 + |

### 12 个月目标

| 指标 | 目标值 |
|------|--------|
| 注册广告主 | 2,000+ |
| 注册 KOL | 100,000+ |
| 月 GMV | ¥5,000 万 + |
| 月收入 | ¥800 万 + |

---

## 📚 文档索引

### 产品文档

- [项目章程](docs/PROJECT_CHARTER.md) - 项目愿景、商业模式、里程碑
- [竞品分析 - Captiv8](docs/COMPETITOR_ANALYSIS_CAPTIV8.md)
- [竞品分析 - HypeAuditor](docs/COMPETITOR_ANALYSIS_HYPEAUDITOR.md)
- [竞品分析 - Hypefy](docs/COMPETITOR_ANALYSIS_HYPEFY.md)
- [竞品分析 - Creator.co](docs/COMPETITOR_ANALYSIS_CREATORCO.md)
- [竞品对比矩阵](docs/COMPETITOR_MATRIX.md)
- [产品规划](docs/PRODUCT_PLAN.md)
- [会议记录](docs/MEETING_NOTES_20260324.md)

### Agent 技能

- [产品经理](agents/product-manager/SKILL.md)
- [市场研究员](agents/market-researcher/SKILL.md)
- [架构师](agents/architect/SKILL.md)
- [后端开发](agents/backend-dev/SKILL.md)
- [前端开发](agents/frontend-dev/SKILL.md)
- [QA 工程师](agents/qa-engineer/SKILL.md)
- [安全审计](agents/security-auditor/SKILL.md)
- [DevOps](agents/devops-engineer/SKILL.md)

---

## 🛠️ 开发指南

### 使用 gstack Agent 团队

```bash
# 产品调研
/product-manager "调研中小 KOL 广告平台市场"

# 技术方案设计
/architect "设计 MVP 系统架构"

# 后端开发
/backend-dev "实现用户认证 API"

# 前端开发
/frontend-dev "实现广告主仪表盘"

# 测试
/qa-engineer "编写充值功能测试用例"

# 安全审计
/security-auditor "评审支付模块安全性"

# 部署
/devops-engineer "配置 CI/CD 流水线"
```

### 提交规范

```
feat: 添加新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 📝 待办事项

查看 [TODOS.md](TODOS.md) 了解完整待办清单。

### 当前优先级（P0）

- [ ] 完成团队招募
- [ ] 技术方案设计
- [ ] 申请社交平台 API
- [ ] 搭建开发环境
- [ ] 编写测试计划

---

## 📞 联系方式

**项目地址**: `/Users/surferboy/.openclaw/workspace/AIAds`  
**当前状态**: 产品规划完成，准备启动开发

---

## 📄 许可证

MIT License © 2026 AIAds Team

---

**最后更新**: 2026-03-24
