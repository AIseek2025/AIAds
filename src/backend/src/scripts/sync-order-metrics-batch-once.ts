/**
 * 从数据库读取订单指标并一次性 PUT 到管理端 `orders/metrics/batch`（无中间文件，便于 Cron / Worker）。
 *
 * 环境变量：
 *   AIADS_ADMIN_TOKEN     必填（--dry-run 时可选）
 *   AIADS_ADMIN_API       默认 http://localhost:8080/api/v1/admin
 *   AIADS_HTTP_TIMEOUT_MS 默认 120000
 *
 * 参数与 generate-order-metrics-batch-payload 一致：--limit / --cpm-only / --views-delta
 * 额外：--dry-run 仅打印 JSON 到 stdout，不发起 HTTP
 */
import prisma from '../config/database';
import { buildOrderMetricsBatchItems, parseMetricsBatchArgs } from './lib/orderMetricsBatchPayload';

function parseArgv(argv: string[]): {
  args: ReturnType<typeof parseMetricsBatchArgs>;
  dryRun: boolean;
} {
  const dryRun = argv.includes('--dry-run');
  const filtered = argv.filter((a) => a !== '--dry-run');
  return { args: parseMetricsBatchArgs(filtered), dryRun };
}

async function main(): Promise<void> {
  const { args, dryRun } = parseArgv(process.argv.slice(2));
  const base = (process.env.AIADS_ADMIN_API || 'http://localhost:8080/api/v1/admin').replace(/\/$/, '');
  const token = process.env.AIADS_ADMIN_TOKEN || '';
  const timeoutMs = Math.max(1000, parseInt(process.env.AIADS_HTTP_TIMEOUT_MS || '120000', 10) || 120000);

  const items = await buildOrderMetricsBatchItems(prisma, args);

  if (items.length === 0) {
    process.stderr.write('[sync-order-metrics-batch-once] 无匹配订单，请调整 --limit / --cpm-only 或确认库内有数据\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  const body = JSON.stringify({ items });

  if (dryRun) {
    process.stdout.write(`${JSON.stringify({ items }, null, 2)}\n`);
    await prisma.$disconnect();
    return;
  }

  if (!token) {
    process.stderr.write('[sync-order-metrics-batch-once] 请设置 AIADS_ADMIN_TOKEN\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  const url = `${base}/orders/metrics/batch`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: ac.signal,
    });
  } catch (e: unknown) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[sync-order-metrics-batch-once] 请求失败: ${msg}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }
  clearTimeout(t);

  const text = await res.text();
  if (!res.ok) {
    process.stderr.write(`[sync-order-metrics-batch-once] HTTP ${res.status} ${res.statusText}\n${text}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  process.stdout.write(`${text}\n`);
  await prisma.$disconnect();
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  void prisma.$disconnect();
  process.exit(1);
});
