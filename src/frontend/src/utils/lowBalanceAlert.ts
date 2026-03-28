import type { PublicUiConfig } from '../services/publicApi';

export function getLowBalanceAlertCny(
  balance: { low_balance_alert_cny?: number } | null | undefined,
  publicUi: Pick<PublicUiConfig, 'low_balance_alert_cny'> | null | undefined
): number {
  return balance?.low_balance_alert_cny ?? publicUi?.low_balance_alert_cny ?? 500;
}

export function isAdvertiserLowBalance(
  balance: { wallet_balance: number; low_balance_alert_cny?: number } | null | undefined,
  publicUi: Pick<PublicUiConfig, 'low_balance_alert_cny'> | null | undefined
): boolean {
  if (balance == null) return false;
  const line = getLowBalanceAlertCny(balance, publicUi);
  return balance.wallet_balance < line;
}
