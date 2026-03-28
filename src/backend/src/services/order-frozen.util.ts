import prisma from '../config/database';

/** 某 KOL 名下全部合作订单的 frozen_amount 合计（与 /kols/balance、收益页同源）。 */
export async function sumFrozenAmountForKol(kolId: string): Promise<number> {
  const r = await prisma.order.aggregate({
    where: { kolId },
    _sum: { frozenAmount: true },
  });
  return r._sum.frozenAmount?.toNumber() ?? 0;
}

/** 批量查询多 KOL 的订单冻结合计，避免列表 N+1。 */
export async function sumFrozenAmountForKols(kolIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of kolIds) {
    map.set(id, 0);
  }
  if (kolIds.length === 0) return map;
  const rows = await prisma.order.groupBy({
    by: ['kolId'],
    where: { kolId: { in: kolIds } },
    _sum: { frozenAmount: true },
  });
  for (const row of rows) {
    map.set(row.kolId, row._sum.frozenAmount?.toNumber() ?? 0);
  }
  return map;
}

/** 某活动下全部订单的 frozen_amount 合计（管理端活动详情与预算口径一致）。 */
export async function sumFrozenAmountForCampaign(campaignId: string): Promise<number> {
  const r = await prisma.order.aggregate({
    where: { campaignId },
    _sum: { frozenAmount: true },
  });
  return r._sum.frozenAmount?.toNumber() ?? 0;
}

/** 某广告主名下全部订单的 frozen_amount 合计（与活动列表/详情聚合同源，按 advertiser_id）。 */
export async function sumFrozenAmountForAdvertiser(advertiserId: string): Promise<number> {
  const r = await prisma.order.aggregate({
    where: { advertiserId },
    _sum: { frozenAmount: true },
  });
  return r._sum.frozenAmount?.toNumber() ?? 0;
}

/** 批量查询多广告主的订单冻结合计（管理端广告主列表）。 */
export async function sumFrozenAmountForAdvertisers(advertiserIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of advertiserIds) {
    map.set(id, 0);
  }
  if (advertiserIds.length === 0) return map;
  const rows = await prisma.order.groupBy({
    by: ['advertiserId'],
    where: { advertiserId: { in: advertiserIds } },
    _sum: { frozenAmount: true },
  });
  for (const row of rows) {
    map.set(row.advertiserId, row._sum.frozenAmount?.toNumber() ?? 0);
  }
  return map;
}

/** 批量查询多活动的订单冻结合计，避免列表 N+1。 */
export async function sumFrozenAmountForCampaigns(campaignIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of campaignIds) {
    map.set(id, 0);
  }
  if (campaignIds.length === 0) return map;
  const rows = await prisma.order.groupBy({
    by: ['campaignId'],
    where: { campaignId: { in: campaignIds } },
    _sum: { frozenAmount: true },
  });
  for (const row of rows) {
    map.set(row.campaignId, row._sum.frozenAmount?.toNumber() ?? 0);
  }
  return map;
}
