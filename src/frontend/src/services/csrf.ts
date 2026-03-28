import axios from 'axios';

/** 与 `api.ts` / 后端 `GET /api/v1/csrf-token` 同源的 API 根路径（不含末尾斜杠） */
export function getApiBaseUrlForCsrf(): string {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  return raw.replace(/\/$/, '');
}

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

export function clearCsrfToken(): void {
  cachedToken = null;
}

/** 拉取并缓存 CSRF（依赖后端 Set-Cookie + 响应体 token）；需 `withCredentials`。 */
export async function ensureCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (!inflight) {
    inflight = fetchCsrfTokenOnce().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function fetchCsrfTokenOnce(): Promise<string> {
  const base = getApiBaseUrlForCsrf();
  const { data } = await axios.get<{ success?: boolean; data?: { csrfToken?: string } }>(
    `${base}/csrf-token`,
    { withCredentials: true }
  );
  const token = data?.data?.csrfToken;
  if (!token) {
    throw new Error('CSRF token missing in response');
  }
  cachedToken = token;
  return token;
}
