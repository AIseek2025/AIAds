# AIAds 下一阶段规划（gstack 节奏）

**依据**：《全球中小KOL广告投放平台核心功能设计深度拆解》、`AIADS_REQUIREMENTS_MASTER_BACKLOG.md`、`GSTACK_AIAADS_WORK_AUDIT_REPORT.md`  
**方法**：Think → Plan → Build → Review → Test → Ship → Reflect（与 `skill/gstack` 精神对齐，非 CLI 绑定）

---

## Wave A — 可度量闭环（进行中 / 近期）

| 目标 | 产出 | 完成定义 |
|------|------|----------|
| 纠纷资金一致 | 全额/部分退款与冻结、流水一致 | 集成测试或手工对账脚本通过 |
| 预算巡检可观测 | Cron + 可选 Webhook | 命中风险活动时外部系统收到 JSON |
| 指标批量回填 | 已有 batch API + `cron-order-metrics-batch.sh`（`--dry-run` / JSON 校验 / `AIADS_CURL_MAX_TIME`） | 生产 Cron 接入或演练记录 |

---

## Wave B — 数据与信任

| 目标 | 说明 |
|------|------|
| 定时拉数管道 | 对接平台或手工导入 → `PUT .../metrics/batch`；`npm run metrics:batch-payload`（DB→stdout JSON）、`npm run metrics:batch-sync`（DB→Node `fetch` 直连 batch，无中间文件）、`scripts/run-order-metrics-batch-from-db.sh`（bash+curl）；示例见 `scripts/examples/order-metrics-batch.example.json` |
| E2E 主路径 | Playwright：根目录或 `tests/` 执行 `npm run test:e2e:api`；`tests/global-setup.ts` 加载根/`tests` 的 `.env`，可无 TOKEN 时用邮箱密码换 Token、无 ORDER_ID 时自动取列表首单；含 smoke、批量指标、登录、订单/看板/统计、财务、KOL、订单详情；**`integration-order-lifecycle-api`**：广告主+KOL 账号与余额具备时跑「建单→完成→order_payment」流水断言；`check-e2e-api-env.sh`；env 见 `ADMIN_API_SPEC` §9.5 与 `tests/.env.example`；`baseURL` 4173 |
| CPM 展示 | 广告主活动详情「订单列表」接入真实 `GET /orders?campaign_id=`，展示 `cpm_breakdown`、曝光与同步说明文案 |

**最近更新（Wave B 增量）**：订单列表 API 附带 `kol` 摘要；`CampaignDetail` 订单 Tab 与 `orderAPI`。

---

## Wave C — 匹配与治理（文档第三～六章）

| 目标 | 说明 |
|------|------|
| 可解释匹配 | **已落地**：`ai-matching` 与 `GET /kols/recommend`；活动维度 + 归属校验；`GET /kols` 关键词检索带 **`search_rank`**（规则分，页内排序） |
| 发现 API | **已落地**：`GET /kols`、`GET /kols/:id`（原前端调用此前无后端路由） |
| 频次 | 滑动窗口数据模型 + 接单前校验 |
| 邀请 | 邀请码表 + 注册绑定 + 基础反作弊；草案占位见 `docs/drafts/006_invite_growth_placeholder.sql` |

---

## Wave D — 演进架构（文档第八章）

单体模块化边界清晰后，再拆：搜索（ES）、消息（Kafka）、结算子域等；**不以当前迭代强绑微服务**。

---

## 本迭代交付物（2026-03-27）

- 文档：`AIADS_REQUIREMENTS_MASTER_BACKLOG.md` 增加「章节对照总表」；本文件（含 Wave B E2E / 定时拉数脚本说明）。
- 后端：纠纷 `refund_partial` 与 `releasePartialFrozenBudgetTx`；全额退款流水与冻结金额一致。
- 运维：`scripts/cron-budget-risks.sh` 支持 `AIADS_BUDGET_ALERT_WEBHOOK_URL`。
- 指标管道：共享 `lib/orderMetricsBatchPayload.ts`；`generate-order-metrics-batch-payload.ts`、`sync-order-metrics-batch-once.ts`（`npm run metrics:batch-sync`）、`npm run metrics:batch-from-db`、`run-order-metrics-batch-from-db.sh`、`scripts/examples/crontab-order-metrics.example`；单元测试 `orderMetricsBatchPayload.test.ts`（含 `buildOrderMetricsBatchItems`）；E2E：`test:e2e:api`（含 login、auth-guard、orders-list、dashboard-stats、finance-smoke、order-by-id 等）。
- Wave C 预备：`docs/drafts/README.md`、`005`/`006` SQL 占位；`ADMIN_API_SPEC` §9.4 运维与批量指标、§9.5 E2E 环境变量。
- 前端：活动详情订单 Tab 展示 CPM `cpm_breakdown`；曝光列 Tooltip 区分原始/计费曝光；`ProtectedAdminRoute` 挂载时调用 `checkAuth()`，未登录可正确跳转 `/admin/login`（E2E smoke 与路由一致）。
