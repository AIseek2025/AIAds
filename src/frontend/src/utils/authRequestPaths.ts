/**
 * 主站 `api` 拦截器用：区分「登录/注册等未登录态调用」与「需带 access 的业务请求」，
 * 避免对错误密码等 401 误触发 refresh 或全站跳转。
 */
export function isPublicAuthRequestPath(url: string): boolean {
  const path = url.split('?')[0];
  return (
    path.endsWith('/auth/login') ||
    path.endsWith('/auth/register') ||
    path.endsWith('/auth/login-email-code') ||
    path.endsWith('/auth/verification-code') ||
    path.endsWith('/auth/verify-code') ||
    path.endsWith('/auth/reset-password') ||
    path.endsWith('/auth/forgot-password')
  );
}

export function isAuthRefreshPath(url: string): boolean {
  const path = url.split('?')[0];
  return path.endsWith('/auth/refresh');
}
