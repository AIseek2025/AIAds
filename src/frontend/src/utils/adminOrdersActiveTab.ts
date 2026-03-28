/**
 * 管理端订单页：`?tab=disputes` 时固定打开「纠纷」Tab（index 3），否则使用用户选择的 tab。
 */
export function getAdminOrdersActiveTab(disputeTabFromUrl: boolean, storedTab: number): number {
  return disputeTabFromUrl ? 3 : storedTab;
}
