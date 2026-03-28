import type { PrismaClient } from '@prisma/client';

export type MetricsBatchArgs = {
  limit: number;
  cpmOnly: boolean;
  viewsDelta: number;
};

export type OrderMetricsBatchItem = {
  order_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export function parseMetricsBatchArgs(argv: string[]): MetricsBatchArgs {
  let limit = 50;
  let cpmOnly = false;
  let viewsDelta = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit' && argv[i + 1]) {
      const raw = parseInt(argv[++i], 10);
      const n = Number.isFinite(raw) ? raw : 50;
      const capped = n <= 0 ? 1 : Math.min(200, n);
      limit = Math.max(1, capped);
    } else if (a === '--cpm-only') {
      cpmOnly = true;
    } else if (a === '--views-delta' && argv[i + 1]) {
      viewsDelta = parseInt(argv[++i], 10) || 0;
    }
  }
  return { limit, cpmOnly, viewsDelta };
}

/**
 * 从 DB 组装批量指标请求体中的 items（与 generate 脚本口径一致）。
 */
export async function buildOrderMetricsBatchItems(
  prisma: PrismaClient,
  args: MetricsBatchArgs
): Promise<OrderMetricsBatchItem[]> {
  const orders = await prisma.order.findMany({
    where: args.cpmOnly ? { pricingModel: 'cpm' } : {},
    select: {
      id: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: args.limit,
  });

  return orders.map((o) => ({
    order_id: o.id,
    views: Math.max(0, o.views + args.viewsDelta),
    likes: o.likes,
    comments: o.comments,
    shares: o.shares,
  }));
}
