import { Prisma, PrismaClient } from '@prisma/client';
import { errors, ApiError } from '../middleware/errorHandler';

/** 交互式事务内 ORM 客户端 */
export type OrderTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export function genTransactionNo(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function freezeBudgetOnOrderCreate(
  tx: OrderTx,
  params: {
    advertiserId: string;
    orderId: string;
    orderNo: string;
    freezeAmount: Prisma.Decimal;
  }
): Promise<void> {
  const adv = await tx.advertiser.findUnique({
    where: { id: params.advertiserId },
  });
  if (!adv) {
    throw errors.notFound('广告主不存在');
  }
  if (adv.walletBalance.toNumber() < params.freezeAmount.toNumber()) {
    throw new ApiError('可用余额不足，无法冻结订单预算', 400, 'INSUFFICIENT_BALANCE');
  }

  await tx.advertiser.update({
    where: { id: params.advertiserId },
    data: {
      walletBalance: { decrement: params.freezeAmount },
      frozenBalance: { increment: params.freezeAmount },
    },
  });

  await tx.transaction.create({
    data: {
      advertiserId: params.advertiserId,
      orderId: params.orderId,
      transactionNo: genTransactionNo(),
      type: 'budget_freeze',
      amount: params.freezeAmount,
      status: 'completed',
      description: `冻结订单预算 ${params.orderNo}`,
      completedAt: new Date(),
    },
  });
}

export async function releaseFrozenBudgetTx(
  tx: OrderTx,
  order: {
    id: string;
    advertiserId: string;
    orderNo: string;
    frozenAmount: Prisma.Decimal;
  }
): Promise<void> {
  if (order.frozenAmount.toNumber() <= 0) {
    return;
  }

  await tx.advertiser.update({
    where: { id: order.advertiserId },
    data: {
      walletBalance: { increment: order.frozenAmount },
      frozenBalance: { decrement: order.frozenAmount },
    },
  });

  await tx.transaction.create({
    data: {
      advertiserId: order.advertiserId,
      orderId: order.id,
      transactionNo: genTransactionNo(),
      type: 'budget_release',
      amount: order.frozenAmount,
      status: 'completed',
      description: `解冻订单预算 ${order.orderNo}`,
      completedAt: new Date(),
    },
  });
}

/** 纠纷部分退款：从订单冻结中释放至多 requestedAmount，返回实际释放金额（元） */
export function partialReleaseAmount(frozen: number, requested: number): number {
  if (requested <= 0 || frozen <= 0) {
    return 0;
  }
  return Math.min(requested, frozen);
}

export async function releasePartialFrozenBudgetTx(
  tx: OrderTx,
  order: {
    id: string;
    advertiserId: string;
    orderNo: string;
    frozenAmount: Prisma.Decimal;
  },
  requestedAmount: Prisma.Decimal
): Promise<number> {
  const frozen = order.frozenAmount.toNumber();
  const req = requestedAmount.toNumber();
  const actual = partialReleaseAmount(frozen, req);
  if (actual <= 0) {
    return 0;
  }
  const actualDec = new Prisma.Decimal(actual);

  await tx.advertiser.update({
    where: { id: order.advertiserId },
    data: {
      walletBalance: { increment: actualDec },
      frozenBalance: { decrement: actualDec },
    },
  });

  await tx.transaction.create({
    data: {
      advertiserId: order.advertiserId,
      orderId: order.id,
      transactionNo: genTransactionNo(),
      type: 'budget_release',
      amount: actualDec,
      status: 'completed',
      description: `纠纷部分解冻订单预算 ${order.orderNo}`,
      completedAt: new Date(),
    },
  });

  await tx.order.update({
    where: { id: order.id },
    data: { frozenAmount: { decrement: actualDec } },
  });

  return actual;
}
