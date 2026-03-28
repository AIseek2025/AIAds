# AIAds Release Notes

## 工程迭代记录（未单独发版）

- **2026-03-27**：扩展管理端 API 回归（Playwright `test:e2e:api`：财务流水 `finance/transactions`、KOL 列表 `admin/kols`、根目录 `npm run test:e2e:api` 转发、`scripts/check-e2e-api-env.sh`）；`tests/README.md`；此前已含订单列表、看板/统计、财务 overview/deposits、可选订单详情等；Wave C 草案见 `docs/drafts/README.md`。

## v1.0.1

- 发布日期：2026-03-27
- 发布类型：生产修复发布
- Git commit：`00ba403`
- 生产发布记录：见 `DEPLOY_PROD.md`

## 发布概述

本次发布聚焦于生产可用性修复和前端稳定性提升，目标是解决首页白屏问题，并清理影响前端正式构建的存量 TypeScript 报错，确保线上页面可正常访问、构建链路可稳定通过。

## 本次变更

### 1. 首页白屏修复

- 修复前端路由懒加载兜底组件引用错误
- 恢复首页正常渲染，生产首页当前显示为登录页
- 页面可正常展示品牌标题、登录表单、Google 登录入口和注册链接

### 2. 前端构建稳定性修复

- 清理前端管理台 `build:check` 存量 TypeScript 报错
- 补齐多处管理台页面实际使用到的兼容类型字段
- 修正部分 MUI 组件导入与类型不匹配问题
- 修复通用表格组件 `id` 类型兼容问题

### 3. Mock 数据与管理台兼容调整

- 补齐 `DashboardStats` mock 数据结构
- 对管理后台旧页面使用的历史字段做兼容保留
- 降低 demo/mock 页面对严格类型定义的阻塞

## 验证结果

### 本地验证

- `src/frontend` 下 `npm run build:check` 已通过
- 本次修改文件未发现新增 linter 报错

### 生产验证

- 已执行生产发布脚本：`bash /opt/aiads/bin/deploy-prod-aliyun.sh 00ba403`
- 当前生产代码目录：`/opt/aiads-releases/20260327-043400`
- `pm2` 进程 `aiads-api` 状态正常
- `https://aiads.fun/api/v1/health` 返回成功
- `https://aiads.fun/` 返回 `HTTP 200`
- 首页可视化验收通过，未再出现白屏

## 影响范围

- 影响模块：前端首页路由、管理后台前端、前端类型定义、mock 数据
- 不影响内容：同机其他项目、服务器 Nginx 其他站点、非 AIAds 进程

## 风险与后续建议

- 本次以兼容性修复为主，管理后台部分类型仍存在“接口定义先兼容、后续再收敛”的历史包袱
- 建议后续补一轮管理后台类型模型统一，逐步减少兼容字段
- 建议后续按版本继续维护该文件，形成持续可追踪的发布记录

## 相关文档

- `DEPLOY_PROD.md`
- `docs/RELEASE_NOTES_V1.md`
- `README.md`
