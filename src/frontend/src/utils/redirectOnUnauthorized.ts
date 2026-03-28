import { APP_PATHS } from '../constants/appPaths';

/**
 * 主站 Axios 401 等场景：与 `api.ts` 拦截器一致，避免散落字面量 `/login`。
 */
export function redirectToAppLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== APP_PATHS.login) {
    window.location.href = APP_PATHS.login;
  }
}

/**
 * 管理端 Axios 刷新失败等场景：与 `adminApi.ts` 拦截器一致。
 */
export function redirectToAdminLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== APP_PATHS.adminLogin) {
    window.location.href = APP_PATHS.adminLogin;
  }
}
