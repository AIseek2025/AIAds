/**
 * Playwright 全局准备：加载 .env、在无 TOKEN 时用邮箱密码换 Token、可选自动选取首条订单 ID。
 * 另：广告主 / KOL 门户账号可用 `AIADS_E2E_*_EMAIL` + `PASSWORD` 换取 `AIADS_E2E_ADVERTISER_TOKEN` / `AIADS_E2E_KOL_TOKEN`（与 integration / role-api-smoke 共用）。
 */
import type { FullConfig } from '@playwright/test';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

function loadEnvFiles(): void {
  const cwd = process.cwd();
  loadEnv({ path: path.join(cwd, '..', '.env') });
  loadEnv({ path: path.join(cwd, '.env') });
}

function normalizeBase(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  return raw.replace(/\/$/, '');
}

async function loginForToken(
  base: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${base}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as {
    success?: boolean;
    data?: { tokens?: { access_token?: string } };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: ${body?.message ?? JSON.stringify(body).slice(0, 200)}`
    );
  }
  const token = body.data?.tokens?.access_token;
  if (typeof token !== 'string' || token.length < 10) {
    throw new Error('响应中缺少 data.tokens.access_token');
  }
  return token;
}

/** POST /api/v1/auth/login（广告主 / KOL 门户，非管理端） */
async function loginPortalToken(
  base: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as {
    success?: boolean;
    data?: { tokens?: { access_token?: string } };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `portal HTTP ${res.status}: ${body?.message ?? JSON.stringify(body).slice(0, 200)}`
    );
  }
  const token = body.data?.tokens?.access_token;
  if (typeof token !== 'string' || token.length < 10) {
    throw new Error('门户响应中缺少 data.tokens.access_token');
  }
  return token;
}

async function fetchFirstOrderId(base: string, token: string): Promise<string | undefined> {
  const res = await fetch(`${base}/api/v1/admin/orders?page=1&page_size=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as {
    data?: { items?: Array<{ id?: string }> };
  };
  const id = body.data?.items?.[0]?.id;
  return typeof id === 'string' ? id : undefined;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  loadEnvFiles();

  const base = normalizeBase(process.env.AIADS_E2E_API_BASE);
  if (!base) {
    console.log(
      '[E2E globalSetup] 未设置 AIADS_E2E_API_BASE，admin-api-* 将按用例内条件 skip（仅前端 smoke 仍执行）'
    );
    return;
  }

  if (!process.env.AIADS_E2E_ADMIN_TOKEN?.trim()) {
    const email = process.env.AIADS_E2E_ADMIN_EMAIL?.trim();
    const password = process.env.AIADS_E2E_ADMIN_PASSWORD;
    if (email && password) {
      try {
        process.env.AIADS_E2E_ADMIN_TOKEN = await loginForToken(base, email, password);
        console.log('[E2E globalSetup] 已使用 AIADS_E2E_ADMIN_EMAIL/PASSWORD 换取 AIADS_E2E_ADMIN_TOKEN');
      } catch (e) {
        console.warn('[E2E globalSetup] 登录换 token 失败（将依赖手动设置 TOKEN 或跳过需鉴权用例）:', e);
      }
    } else {
      console.log(
        '[E2E globalSetup] 未设置 TOKEN 且缺少 EMAIL+PASSWORD，需鉴权用例将 skip'
      );
    }
  }

  const token = process.env.AIADS_E2E_ADMIN_TOKEN?.trim();
  if (token && !process.env.AIADS_E2E_ORDER_ID?.trim()) {
    try {
      const oid = await fetchFirstOrderId(base, token);
      if (oid) {
        process.env.AIADS_E2E_ORDER_ID = oid;
        console.log('[E2E globalSetup] 未设置 AIADS_E2E_ORDER_ID，已使用列表首条订单:', oid);
      }
    } catch {
      /* 忽略：库中可无订单 */
    }
  }

  if (!process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim()) {
    const email = process.env.AIADS_E2E_ADVERTISER_EMAIL?.trim();
    const password = process.env.AIADS_E2E_ADVERTISER_PASSWORD;
    if (email && password) {
      try {
        process.env.AIADS_E2E_ADVERTISER_TOKEN = await loginPortalToken(base, email, password);
        console.log(
          '[E2E globalSetup] 已使用 AIADS_E2E_ADVERTISER_EMAIL/PASSWORD 换取 AIADS_E2E_ADVERTISER_TOKEN'
        );
      } catch (e) {
        console.warn('[E2E globalSetup] 广告主门户换 token 失败（role-api-smoke 将 skip）:', e);
      }
    }
  }

  if (!process.env.AIADS_E2E_KOL_TOKEN?.trim()) {
    const email = process.env.AIADS_E2E_KOL_EMAIL?.trim();
    const password = process.env.AIADS_E2E_KOL_PASSWORD;
    if (email && password) {
      try {
        process.env.AIADS_E2E_KOL_TOKEN = await loginPortalToken(base, email, password);
        console.log('[E2E globalSetup] 已使用 AIADS_E2E_KOL_EMAIL/PASSWORD 换取 AIADS_E2E_KOL_TOKEN');
      } catch (e) {
        console.warn('[E2E globalSetup] KOL 门户换 token 失败（role-api-smoke 将 skip）:', e);
      }
    }
  }
}
