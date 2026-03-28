import type { AxiosError } from 'axios';

/**
 * 从 axios / fetch 或后端 ApiResponse 错误结构中取出可读文案
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (
      error as {
        response?: {
          data?: {
            error?: { message?: string };
            message?: string;
          };
        };
      }
    ).response?.data;
    const msg = res?.error?.message ?? res?.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

/** 从 axios 响应体 `error.code` 读取业务码（如 MFA_REQUIRED） */
export function getApiErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (
      error as {
        response?: { data?: { error?: { code?: string } } };
      }
    ).response?.data;
    const code = res?.error?.code;
    if (typeof code === 'string' && code.trim()) return code.trim();
  }
  return undefined;
}

/** GET /kols/me 在尚未创建资料时返回 404，message 含「KOL 资料不存在」等 */
export function isKolProfileNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  const ax = error as AxiosError<{ error?: { message?: string; code?: string } }>;
  if (ax.response?.status !== 404) return false;
  const msg = getApiErrorMessage(error, '');
  const code = getApiErrorCode(error);
  if (code === 'NOT_FOUND' && (msg.includes('资料') || msg.includes('KOL'))) return true;
  return msg.includes('KOL') && msg.includes('资料');
}
