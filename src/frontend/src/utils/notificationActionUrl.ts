import type { NavigateFunction } from 'react-router-dom';

/**
 * 站内通知 `action_url`：外链新窗口打开，站内路径走 `navigate`（与通知中心列表一致）。
 */
export function openNotificationActionUrl(
  actionUrl: string | null | undefined,
  navigate: NavigateFunction
): void {
  const u = actionUrl?.trim() ?? '';
  if (!u) return;
  if (/^https?:\/\//i.test(u)) {
    window.open(u, '_blank', 'noopener,noreferrer');
    return;
  }
  navigate(u.startsWith('/') ? u : `/${u}`);
}
