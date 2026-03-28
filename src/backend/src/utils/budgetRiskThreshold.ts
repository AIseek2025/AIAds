/**
 * 与 `GET /admin/campaigns/budget-risks` 及 Cron `cron-budget-risks.sh` 使用同一阈值。
 * 环境变量：`AIADS_BUDGET_RISK_THRESHOLD`（0–1，默认 0.85）
 */
export function getBudgetRiskThreshold(): number {
  const raw = process.env.AIADS_BUDGET_RISK_THRESHOLD;
  const n = raw != null && raw !== '' ? Number.parseFloat(raw) : 0.85;
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.85));
}
