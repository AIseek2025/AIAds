/**
 * 从数据库读取最近订单，生成 `PUT /admin/orders/metrics/batch` 所需 JSON（stdout）。
 * 供 Cron / 演练：平台拉数 Worker 可替换为本脚本之前的自定义组装逻辑。
 *
 * 用法（在 src/backend 目录）：
 *   npx ts-node src/scripts/generate-order-metrics-batch-payload.ts --limit 30
 *   npx ts-node src/scripts/generate-order-metrics-batch-payload.ts --cpm-only --views-delta 100
 *
 * 逻辑与 `lib/orderMetricsBatchPayload.ts`、`sync-order-metrics-batch-once.ts` 共享。
 */
import prisma from '../config/database';
import { buildOrderMetricsBatchItems, parseMetricsBatchArgs } from './lib/orderMetricsBatchPayload';

async function main(): Promise<void> {
  const args = parseMetricsBatchArgs(process.argv.slice(2));
  const items = await buildOrderMetricsBatchItems(prisma, args);

  if (items.length === 0) {
    process.stderr.write(
      '[generate-order-metrics-batch-payload] 无匹配订单，请调整 --limit / --cpm-only 或确认库内有数据\n'
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  process.stdout.write(`${JSON.stringify({ items }, null, 2)}\n`);
  await prisma.$disconnect();
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  void prisma.$disconnect();
  process.exit(1);
});
