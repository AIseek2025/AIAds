# AIAds — 全球中小 KOL 广告投放平台

> 帮助中国工厂/企业把广告预算投给全球其他国家的小 KOL（几千到几万粉丝）

## 项目定位

**核心使命**：连接中国供应链与全球中小 KOL，打造"AI×中国供应链×全球中小博主"的广告投放闭环

**目标市场**：
- **广告主**：中国工厂/企业，拥有深度供应商资源，需要低成本全球曝光
- **KOL**：TikTok/YouTube/Instagram 等平台，几千到几万粉丝，无议价权，无法直接对接广告主
- **定价模式**：曝光计价 (CPM)、点击计价 (CPC) 为主，成交计价 (CPA) 为辅
- **平台佣金**：小比例佣金（10-20%）

## 差异化优势

| 维度 | Captiv8 | HypeAuditor | Hypefy | **AIAds** |
|------|---------|-------------|--------|-----------|
| 核心定位 | AI+ 创意协作 | 数据验证 + 品牌安全 | AI 驱动发现 | **AI×中国供应链×全球中小 KOL** |
| 数据库 | 1500 万 + | 未披露 | 有限 | **聚焦中小 KOL（1 万 -5 万粉丝）** |
| 价格 | 定制报价 | $399/月 | 未披露 | **按效果付费 + 低佣金** |
| 中国供应链 | ❌ | ❌ | ❌ | ✅ **深度整合** |
| 撮合交易 | ✅ | ❌ | 部分 | ✅ **双向撮合** |

## 可用 Agents

| Agent | 职责 | 技能文件 |
|-------|------|----------|
| `/product-manager` | 产品调研、竞品分析、PRD 撰写 | `agents/product-manager/SKILL.md` |
| `/market-researcher` | 市场调研、用户访谈、数据分析 | `agents/market-researcher/SKILL.md` |
| `/architect` | 系统架构、技术选型、API 设计 | `agents/architect/SKILL.md` |
| `/backend-dev` | 后端开发、数据库、API 实现 | `agents/backend-dev/SKILL.md` |
| `/frontend-dev` | 前端开发、UI 实现、交互优化 | `agents/frontend-dev/SKILL.md` |
| `/qa-engineer` | 测试用例、质量保障、Bug 追踪 | `agents/qa-engineer/SKILL.md` |
| `/security-auditor` | 安全审计、合规检查、数据保护 | `agents/security-auditor/SKILL.md` |
| `/devops-engineer` | 部署、监控、CI/CD | `agents/devops-engineer/SKILL.md` |

## 开发流程（gstack 标准）

```
Think → Plan → Build → Review → Test → Ship → Reflect
```

1. **产品阶段**：`/product-manager` → `/market-researcher` → PRD
2. **规划阶段**：`/architect` → 技术方案 → `/review`
3. **开发阶段**：`/backend-dev` + `/frontend-dev` → 实现功能
4. **测试阶段**：`/qa-engineer` → `/qa` → 修复 Bug
5. **发布阶段**：`/ship` → PR → `/land-and-deploy`
6. **回顾阶段**：`/retro` → 持续改进

## 技术栈建议

- **前端**：React + TypeScript + Bootstrap + Material Design
- **后端**：Node.js + Express / Python + FastAPI
- **数据库**：PostgreSQL + Redis
- **AI 服务**：KOL 匹配算法、内容审核、预算优化
- **第三方集成**：TikTok API、YouTube API、Instagram Graph API
- **部署**：Docker + Kubernetes / Vercel + Supabase

## 核心功能模块

1. **广告主端**
   - 自主充值系统
   - KOL 筛选与匹配
   - 投放预算管理
   - 数据看板（曝光/点击/转化）

2. **KOL 端**
   - 账号绑定（TikTok/YouTube/Ins）
   - 广告任务接单
   - 内容发布审核
   - 收益提现

3. **平台端**
   - AI 智能匹配
   - 内容安全审核
   - 反作弊系统
   - 佣金结算

## 文件约定

- `agents/` - Agent 技能定义
- `docs/` - 产品文档、PRD、技术方案
- `src/` - 源代码
- `tests/` - 测试用例
- `configs/` - 配置文件

## 开发规范

- 所有新文件放在 `/Users/surferboy/.openclaw/workspace/AIAds`
- 使用 gstack 标准流程进行代码审查和测试
- 每个功能模块必须有对应的测试用例
- 提交前运行 `/review` 和 `/qa`
