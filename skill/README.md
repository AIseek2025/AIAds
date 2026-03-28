# gstack（本地技能库副本）

本目录用于存放 [gstack](https://github.com/garrytan/gstack) 的本地副本，供团队对照其 **SKILL 流程、文档结构与工程纪律**，与 AIAds 业务开发解耦。

## 获取方式

在仓库根目录执行：

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git skill/gstack
```

如需固定到某次提交（可审计）：

```bash
cd skill/gstack && git fetch --depth 1 origin <commit-sha> && git checkout <commit-sha>
```

## 本次会话已拉取的版本（供报告引用）

- 路径：`skill/gstack/`
- 提交：`4f435e45c517822014a852804c3da57bab121516`（`4f435e4`，标签/版本以该仓库 `VERSION` 或 release 说明为准）

> 说明：`skill/gstack/` 在 `.gitignore` 中忽略，避免将上游完整历史推入 AIAds 主仓库；审计时以本地 `git -C skill/gstack rev-parse HEAD` 为准。

## AIAds 与本仓库对齐的迭代记录（摘要）

- **2026-03-28（Wave 闭环增量）**：① 订单接单/结算 → 站内通知（广告主「已接单」、KOL「已结算」）；② 广告主工作台预算占用 ≥85% 预警（活动列表拉取 + 跳转活动详情）；③ KOL 工作台展示接单滚动窗口额度（与任务广场列表一致，频控仅约束接单 API）；④ backlog §五/§六 与 `005` 草案注释同步；⑤ 修复广告主 Dashboard 余额查询未挂载 `useQuery` 的问题（与 `advertiserBalanceQueryKey` 一致）。
- **2026-03-28（Wave 运营闭环）**：① 管理端订单状态 `PUT` 校验与 Prisma `OrderStatus` 对齐；② 纠纷处理 API 与后台表单对齐（处理方式/部分退款/裁决说明/是否通知），`escalate` 写入纠纷状态 `investigating`；③ 纠纷结案、管理端改状态、活动审核通过/驳回 → 站内通知；④ 通知中心「全部 / 未读」筛选；⑤ 广告主 Dashboard 可用余额低于 500 元时展示低余额提示。
- **2026-03-28（Wave 运营指标）**：① 管理端 `dashboard/stats` 增加 `orders.disputed` / `orders.pendingDisputes`（缓存键 `v3`）；② 运营待办中心 + 顶栏铃铛计入纠纷工单并跳转 `/admin/orders?tab=disputes`；③ 管理首页订单统计展示纠纷与深链；④ `GET /advertisers/me/balance` 返回 `low_balance_alert_cny`（`ADVERTISER_LOW_BALANCE_ALERT_CNY`）；⑤ 广告主 Dashboard 按服务端阈值展示低余额条。
- **2026-03-28（Wave 预算风险治理）**：① `AIADS_BUDGET_RISK_THRESHOLD` + `getBudgetRiskThreshold()` 统一 budget-risks API、聚合统计与 Cron 语义；② `dashboard/stats` 增加 `campaigns.budgetRiskCount` / `budgetRiskThreshold`（缓存 `v4`）；③ 运营待办 + 顶栏铃铛计入预算预警并跳转 `/admin/campaigns#budget-risk`；④ 活动管理页锚点滚动与阈值对齐；⑤ 管理首页预算风险表与预警条按服务端阈值拉数。
- **2026-03-28（Wave 公开 UI 配置贯穿）**：① 前端 `usePublicUiConfig` + `budgetUtilizationRatio` / `isBudgetAtOrAboveRisk` 与 `GET /public/ui-config` 缓存复用；② 广告主仪表盘/活动列表/活动详情/创建活动预算步骤按 `budget_risk_threshold` 展示预警（列表「占用率」列 + 行高亮）；③ 充值页与订单中心低余额文案对齐 `low_balance_alert_cny`；④ KOL 仪表盘在 `/kols/me/frequency` 失败时用公开频控参数兜底提示；⑤ 管理端活动列表改用同一 hook，阈值展示与 `budgetRiskTh` 一致。
- **2026-03-28（Wave 频控组件 + 分析/发现闭环）**：① 抽取 `KolFrequencyAlerts`（仪表盘/任务广场/我的任务复用，频控接口失败时 `public/ui-config` 兜底）；② 广告主「数据分析」页低余额条、预算风险汇总、「高消耗活动」表增加占用率/预警列；③ 广告主订单详情、KOL 发现页低余额提示与充值深链；④ 仪表盘低余额阈值与 `public` 配置对齐；⑤ Vitest 覆盖 `budgetUtilizationRatio` / `isBudgetAtOrAboveRisk`。
- **2026-03-28（Wave 低余额组件 + 通知跳转）**：① `utils/lowBalanceAlert` + `AdvertiserLowBalanceAlert` 统一仪表盘/数据分析/订单列表与详情/KOL 发现低余额条；② 任务广场「活动详情」页接入 `KolFrequencyAlerts` 与 Hub 刷新；③ 通知中心外链 `http(s)` 新窗口打开，站内路径安全 `navigate`；④ 空列表文案区分未读/全部；⑤ Vitest 覆盖 `getLowBalanceAlertCny` / `isAdvertiserLowBalance`。
- **2026-03-28（Wave 预算风险横幅 + KOL 频控补全）**：① `AdvertiserBudgetRiskBanner` 统一仪表盘与数据分析预算风险 UI；② 充值页 `AdvertiserLowBalanceAlert`（`recharge` 文案）；③ KOL 收益/经营分析/账号绑定/我的资料页接入 `KolFrequencyAlerts` 与 Hub 刷新；④ Vitest 覆盖 `AdvertiserBudgetRiskBanner`。
- **2026-03-28（Wave 管理端可维护性 + E2E 自检）**：① 管理订单页 `?tab=disputes` 与 Tab 状态用 `getAdminOrdersActiveTab` 派生，去除 effect 内 setState，切换 Tab 时清除 query；② `adminOrdersActiveTab` 单元测试；③ 修复 `AdminInviteCodes` 未使用 import；④ `check-e2e-api-env.sh` 输出广告主/KOL 变量并提示 integration-order-lifecycle 是否可跑；⑤ Playwright：`/admin/orders?tab=disputes` 未登录跳转登录页。
- **2026-03-28（Wave 通知跳转一致 + 预算/指标单测）**：① `openNotificationActionUrl` 统一顶栏通知预览与通知中心的外链/站内路由（修复预览里相对路径被错误拼接）；② Vitest 覆盖；③ 后端 `getBudgetRiskThreshold` 环境解析与钳制；④ `parseMetricsBatchArgs` 的 `--limit` 下限；⑤ `genTransactionNo` 格式与唯一性。
- **2026-03-28（Wave 广告主订单口径 + 创建活动资金提示）**：① `advertiserOrderGrossSpendCny` 统一仪表盘/数据分析/活动详情订单表/订单列表的 CPM gross 与 price；② Vitest；③ 创建/编辑活动向导 `AdvertiserLowBalanceAlert`（`campaign-wizard`）+ Hub 刷新余额与编辑态活动；④ `cpm-metrics` 单测补零曝光与零佣金分成。
- **2026-03-28（Wave 订单冻结字段 + 公开 API 回归）**：① `advertiserOrderFrozenCny` 与 gross 同文件，统一仪表盘/数据分析/活动详情/订单列表冻结列；② Vitest；③ 后端 `getAdvertiserLowBalanceAlertCny` 环境单测；④ Playwright：`api-public-health` 断言 `GET /health` 与 `GET /public/ui-config`（需 `AIADS_E2E_API_BASE`）；⑤ `test:e2e:api` 纳入该 spec。
