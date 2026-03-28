/**
 * 与 `GET /advertisers/me/balance` 的 `low_balance_alert_cny` 一致。
 * 环境变量：`ADVERTISER_LOW_BALANCE_ALERT_CNY`（默认 500）
 */
export function getAdvertiserLowBalanceAlertCny(): number {
  const raw = process.env.ADVERTISER_LOW_BALANCE_ALERT_CNY;
  const parsed = raw != null && raw !== '' ? Number.parseFloat(raw) : 500;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
}
