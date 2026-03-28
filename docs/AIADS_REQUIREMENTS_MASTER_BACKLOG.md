# AIAds 需求总览与实现状态（对照《核心功能设计深度拆解》）

> 目的：在文档体量较大的情况下，用 **可审计 backlog** 标明：**已完成 / 进行中 / 刻意延后**，避免「一次性做完所有章节」导致范围失控（与 `GSTACK_AIAADS_WORK_AUDIT_REPORT` 一致）。

**最后更新**：2026-03-27（迭代：Playwright `integration-order-lifecycle-api` 建单至 `order_payment` 流水；Wave B E2E `global-setup`；`check-e2e-api-env.sh`；根目录 `test:e2e:api`）

---

## 与《深度拆解》章节对照总表

对照原文：`docs/全球中小KOL广告投放平台核心功能设计深度拆解_optimized.md`（章一至章十 + 附录/路线图）。

| 文档章节 | 主题 | 相对深度拆解的实现程度 | 备注 |
|----------|------|------------------------|------|
| 概述 | 定位与价值 | ✅ 产品与代码目标一致 | 工程范围见审计报告「楔子」 |
| **一** | CPM 与数据透明 | 🔶 | 公式与字段已落地；2h/7 日锁定、去重、三方页完整接入仍部分/未做 |
| **二** | 结算与自动化 | 🔶 | 冻结、流水、全额纠纷退款已闭环；全球支付/税务全自动为 ⏳；**部分退款**已与冻结释放对齐（纠纷 `refund_partial`） |
| **三** | KOL 检索与筛选 | 🔶 | 列表/详情/规则推荐已闭环；ES/向量/大模型为 ⏳ |
| **四** | 内容审核 | 🔶 | 管理端审核路径；异步 AI 评分为 ⏳ |
| **五** | 频次限制 | 🔶 | 后端 `kol-frequency.service` + 接单前校验 + `GET /kols/me/frequency`；**KOL 工作台/任务广场/详情**已展示额度；独立聚合表与平台差异仍 ⏳，草案见 `docs/drafts/005_frequency_governance_placeholder.sql` |
| **六** | 邀请与增长 | 🔶 | **邀请码**：Prisma 表、注册核销、`REQUIRE_INVITE_CODE_FOR_REGISTRATION`、管理端 CRUD+前端注册字段；设备/IP 反作弊 ⏳，草案见 `docs/drafts/006_invite_growth_placeholder.sql` |
| **七** | 预算控制 | 🔶 | 冻结与超额保护 ✅；活动告警 API/脚本 ✅；**Webhook 告警**可选（`cron-budget-risks.sh` + `AIADS_BUDGET_ALERT_WEBHOOK_URL`） |
| **八** | 技术架构扩展 | 🔶 | 单体可演进；微服务/ES/Kafka 为演进目标 |
| **九** | 安全与合规 | 🔶 | 管理端审计等；完整 GDPR 合规为长期项 |
| **十** | 实施路线图 | 📝 | 以本 backlog + `GSTACK_AIAADS_PHASE_NEXT.md` 为执行切片 |
| 附录 | 补充材料 | 混合 | 与主表重复项以主表为准 |

---

## 状态图例

| 标记 | 含义 |
|------|------|
| ✅ | 已有可运行实现（后端或前后端闭环） |
| 🔶 | 部分实现 / 仅后端或仅管理端 |
| ⏳ | 未实现或仅文档级 |
| 📝 | 有专项工作流程报告 |

---

## 一、CPM 统计与透明化

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| CPM 定义与计费公式 | ✅ | `cpm-metrics.service`、订单 `cpm_rate` / `cpm_budget_cap` |
| 有效曝光（3s/2s）与去重 | 🔶 | 当前计费曝光与 `views` 对齐；去重待数据源 |
| 三方看板字段 | 🔶 | API 已含 `cpm_breakdown`；广告主活动详情订单列表已展示 CPM/曝光与说明文案 |
| 更新频率（2h/日/7 日锁定） | 🔶 | 管理端 `PUT /admin/orders/:id/metrics` 回填曝光；`cron-order-metrics-batch.sh` + `metrics:batch-payload` / `lib/orderMetricsBatchPayload` + `scripts/run-order-metrics-batch-from-db.sh`；**一键直连**：`npm run metrics:batch-sync`（`sync-order-metrics-batch-once.ts`，无临时 JSON 文件）；生产 Cron 接入仍为 🔶 |

**报告**：`docs/GSTACK_AIAADS_CPM_WORKFLOW_REPORT.md` 📝

---

## 二、结算与资金

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 平台抽成 | ✅ | 默认 10%，与订单字段一致 |
| 广告主扣款流水 | ✅ | `order_payment`（完成结算且存在冻结时） |
| KOL 入账 | ✅ | `order_income` + 余额 |
| 冻结 / 解冻 | ✅ | `budget_freeze` / `budget_release`；`orders.frozen_amount` |
| 拒单解冻 | ✅ | KOL `reject` 路径 |
| 管理端取消解冻 | ✅ | `cancelled` + 有冻结时事务内解冻 |
| 纠纷全额退款 | ✅ | `refund_full` 时解冻 + `frozen_amount` 清零 + 订单 `cancelled`；流水金额与冻结释放一致 |
| 纠纷部分退款 | ✅ | `refund_partial`：`refund_amount ≤ frozen_amount`，`releasePartialFrozenBudgetTx` + 退款流水 |
| 全球支付/税务全自动 | ⏳ | 文档示例级，非 MVP 强制 |

**报告**：`docs/GSTACK_AIAADS_BUDGET_FREEZE_WORKFLOW_REPORT.md` 📝

---

## 三、KOL 检索与筛选

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 多维度筛选 | ✅ | `GET /api/v1/kols`：`searchKols` 支持平台/粉丝/互动率/类目/地区；**关键词** OR 匹配 username/displayName/bio/category；关键词命中时返回 **`search_rank`**（规则分 + `matched_fields`，可解释排序，非向量） |
| 可解释推荐 | ✅ | `GET /api/v1/kols/recommend?campaignId=`：`ai-matching` 规则评分 + **活动归属校验**（仅活动所属广告主） |
| 单条公开摘要 | ✅ | `GET /api/v1/kols/:id`：发现页摘要（与列表口径一致，不含敏感流水） |
| ES / 向量检索 | ⏳ | 演进目标，见审计报告 |

---

## 四、内容与合规

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 管理端内容审核 | 🔶 | 见 `ContentReview` / admin content 路由 |
| 异步 AI 评分 | ⏳ | 可后续接队列 |

---

## 五、频次与风控

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 滑动窗口接单限制 | ✅ | `orders.service#acceptOrder` 前 `kolFrequencyService.assertCanAcceptOrder`；环境变量 `KOL_ACCEPT_*` |
| KOL 可观测 | ✅ | `GET /kols/me/frequency`；任务广场、我的任务、**工作台**展示剩余接单额度 |
| 滑动聚合表 / 平台差异 | ⏳ | 仍以 `orders` 滚动计数为 MVP；草案索引 `docs/drafts/README.md` |

---

## 六、邀请与增长

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 邀请码生成与核销 | ✅ | `invite_codes`、注册绑定、`adminInviteCodesAPI`、注册页可选字段 |
| 设备 / IP 反作弊 | ⏳ | 草案占位见 `docs/drafts/006_invite_growth_placeholder.sql` |

---

## 七、预算控制

| 需求要点 | 状态 | 说明 |
|----------|------|------ |
| 冻结与超额保护 | ✅ | 见第二节 |
| 活动级预算告警 | 🔶 | API + 管理端看板卡片 + `scripts/cron-budget-risks.sh`；可选 Webhook（`AIADS_BUDGET_ALERT_WEBHOOK_URL`） |

---

## 八、管理端与前端

| 需求要点 | 状态 | 说明 |
|----------|------|------|
| 订单列表展示计价/冻结 | ✅ | `Orders.tsx` + `adminApi.getOrders` 字段归一 |
| 活动列表 | ✅ | `Campaigns.tsx` + `AdminCampaignDetail.tsx` + `adminApi` 活动字段归一化 |
| 订单管理 | ✅ | `AppRouter` `/admin/orders` → `Orders.tsx`；`/orders/disputes` 路由顺序已修正 |
| 广告主管理 | ✅ | `Advertisers.tsx` + `AdminAdvertiserDetail.tsx` + `adminAdvertiserAPI` 字段归一 |
| 批量订单指标 | ✅ | `PUT /admin/orders/metrics/batch` + `scripts/cron-order-metrics-batch.sh` |
| E2E | 🔶 | `admin-smoke`；`admin-api-*`；**`integration-order-lifecycle-api`**（建单→完成→`order_payment`，需集成账号）；见 `ADMIN_API_SPEC` §9.5；`npm run test:e2e:api`；Vite **4173** |
| 指标回填 API | ✅ | `PUT /api/v1/admin/orders/:id/metrics`；同步活动 `totalViews`/`totalLikes`/`totalComments` 并写 `TrackingEvent.metrics_sync` |

---

## 九、建议的下一批迭代（按价值排序）

1. **定时同步任务**：平台拉数 → 组装 JSON → 调用 `PUT /orders/metrics/batch`（`metrics:batch-payload` / `metrics:batch-sync`；`run-order-metrics-batch-from-db.sh` 为 bash+curl 路径；生产 Worker 可在拉数后调用同一 `buildOrderMetricsBatchItems` 或 HTTP 批量接口）。
2. **E2E**：**`integration-order-lifecycle-api.spec.ts`** 覆盖 HTTP 链路至 `order_payment` 流水（与审计 §8.2 一致）；需集成账号；批量指标 API 见 `admin-api-metrics-batch.spec.ts`。
3. **KOL 匹配**：关键词检索已加 **`search_rank` 规则分**；再考虑向量/ES 全局排序。
4. **频次/邀请**：独立表结构 + 最小规则引擎（与需求第五章、第六章对齐）。

---

## 引用

- 需求原文：`docs/全球中小KOL广告投放平台核心功能设计深度拆解_optimized.md`
- 方法论审计：`docs/GSTACK_AIAADS_WORK_AUDIT_REPORT.md`
- 下一阶段规划（gstack）：`docs/GSTACK_AIAADS_PHASE_NEXT.md`
