import { Prisma, type TransactionStatus, type TransactionType, type Withdrawal } from '@prisma/client';
import prisma from '../config/database';
import { sumFrozenAmountForKol } from './order-frozen.util';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { EarningsResponse, EarningsDetail, BalanceResponse, WithdrawRequest, WithdrawalResponse } from '../types';

const earningsHistoryTx = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    order: {
      select: {
        orderNo: true,
        campaign: {
          select: {
            title: true,
          },
        },
      },
    },
  },
});

type EarningsHistoryTransaction = Prisma.TransactionGetPayload<typeof earningsHistoryTx>;

export class EarningsService {
  /**
   * Get KOL earnings summary
   */
  async getEarnings(kolId: string): Promise<EarningsResponse> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Calculate withdrawn amount from completed transactions
    const withdrawnTransactions = await prisma.transaction.aggregate({
      where: {
        kolId,
        type: 'withdrawal',
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    const withdrawnAmount = withdrawnTransactions._sum.amount?.toNumber() || 0;

    return {
      total_earnings: kol.totalEarnings.toNumber(),
      available_balance: kol.availableBalance.toNumber(),
      pending_balance: kol.pendingBalance.toNumber(),
      withdrawn_amount: withdrawnAmount,
    };
  }

  /**
   * Get KOL balance
   */
  async getBalance(kolId: string): Promise<BalanceResponse> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
      select: {
        availableBalance: true,
        pendingBalance: true,
        totalEarnings: true,
        currency: true,
      },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Calculate withdrawn amount
    const withdrawnTransactions = await prisma.transaction.aggregate({
      where: {
        kolId,
        type: 'withdrawal',
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    const withdrawnAmount = withdrawnTransactions._sum.amount?.toNumber() || 0;

    const orders_frozen_total = await sumFrozenAmountForKol(kolId);

    return {
      available_balance: kol.availableBalance.toNumber(),
      pending_balance: kol.pendingBalance.toNumber(),
      total_earnings: kol.totalEarnings.toNumber(),
      withdrawn_amount: withdrawnAmount,
      orders_frozen_total,
      currency: kol.currency,
    };
  }

  /**
   * Get earnings history (transaction history)
   */
  async getEarningsHistory(
    kolId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      type?: string;
      status?: string;
    }
  ): Promise<{ items: EarningsDetail[]; total: number }> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const where: Prisma.TransactionWhereInput = {
      kolId,
      OR: [{ type: 'order_income' }, { type: 'withdrawal' }, { type: 'adjustment' }, { type: 'bonus' }],
    };

    if (filters?.type) {
      where.type = filters.type as TransactionType;
    }

    if (filters?.status) {
      where.status = filters.status as TransactionStatus;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...earningsHistoryTx,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      items: transactions.map((t) => this.formatEarningsDetail(t)),
      total,
    };
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(kolId: string, data: WithdrawRequest): Promise<WithdrawalResponse> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Check available balance
    if (kol.availableBalance.toNumber() < data.amount) {
      throw new ApiError('可用余额不足', 400, 'INSUFFICIENT_BALANCE');
    }

    // Check minimum withdrawal amount
    const minWithdrawal = 10; // Minimum 10 CNY
    if (data.amount < minWithdrawal) {
      throw new ApiError(`最低提现金额为${minWithdrawal}元`, 400, 'BELOW_MINIMUM');
    }

    // Calculate withdrawal fee (2% for bank transfer, 1% for others)
    const feeRate = data.payment_method === 'bank_transfer' ? 0.02 : 0.01;
    const fee = Math.round(data.amount * feeRate * 100) / 100; // Round to 2 decimal places
    const actualAmount = data.amount - fee;

    // Generate withdrawal number
    const withdrawalNo = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create withdrawal record and update balance in a transaction
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Create withdrawal record
      const wd = await tx.withdrawal.create({
        data: {
          kolId,
          withdrawalNo,
          amount: data.amount,
          fee,
          actualAmount,
          currency: kol.currency,
          paymentMethod: data.payment_method,
          accountName: data.account_name,
          accountNumber: data.account_number,
          bankName: data.bank_name,
          status: 'pending',
          description: data.remarks,
          metadata: {
            bank_code: data.bank_code,
            swift_code: data.swift_code,
          },
        },
      });

      // Update KOL balance
      await tx.kol.update({
        where: { id: kolId },
        data: {
          availableBalance: { decrement: data.amount },
          pendingBalance: { increment: data.amount },
        },
      });

      // Create pending withdrawal transaction
      await tx.transaction.create({
        data: {
          kolId,
          withdrawalId: wd.id,
          transactionNo: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          type: 'withdrawal',
          amount: data.amount,
          status: 'pending',
          description: `提现申请 - ${withdrawalNo}`,
          metadata: {
            payment_method: data.payment_method,
            account_name: data.account_name,
            account_number: data.account_number,
          },
        },
      });

      return wd;
    });

    logger.info('Withdrawal request created', {
      kolId,
      withdrawalId: withdrawal.id,
      amount: data.amount,
    });

    return this.formatWithdrawalResponse(withdrawal);
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(
    kolId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: string;
    }
  ): Promise<{ items: WithdrawalResponse[]; total: number }> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const where: Prisma.WithdrawalWhereInput = { kolId };

    if (filters?.status) {
      where.status = filters.status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return {
      items: withdrawals.map((w) => this.formatWithdrawalResponse(w)),
      total,
    };
  }

  /**
   * Process withdrawal (admin action)
   */
  async processWithdrawal(
    withdrawalId: string,
    status: 'approved' | 'rejected',
    failureReason?: string
  ): Promise<WithdrawalResponse> {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw errors.notFound('提现记录不存在');
    }

    if (withdrawal.status !== 'pending') {
      throw new ApiError('只能处理待审核的提现', 400, 'INVALID_STATUS');
    }

    await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      const updateData: Prisma.WithdrawalUpdateInput = {
        status: status === 'approved' ? 'processing' : 'rejected',
      };

      if (status === 'approved') {
        updateData.processedAt = new Date();
      } else if (status === 'rejected') {
        updateData.failureReason = failureReason;
      }

      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: updateData,
      });

      // Update transaction status
      const transaction = await tx.transaction.findFirst({
        where: {
          withdrawalId,
          type: 'withdrawal',
        },
      });

      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: status === 'approved' ? 'processing' : 'cancelled',
            failureReason: status === 'rejected' ? failureReason : undefined,
          },
        });
      }

      // If rejected, refund to available balance
      if (status === 'rejected') {
        await tx.kol.update({
          where: { id: withdrawal.kolId },
          data: {
            pendingBalance: { decrement: withdrawal.amount.toNumber() },
            availableBalance: { increment: withdrawal.amount.toNumber() },
          },
        });
      }
    });

    logger.info('Withdrawal processed', {
      withdrawalId,
      status,
      failureReason,
    });

    const updated = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    return this.formatWithdrawalResponse(updated!);
  }

  /**
   * Complete withdrawal (after payment is sent)
   */
  async completeWithdrawal(withdrawalId: string): Promise<WithdrawalResponse> {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw errors.notFound('提现记录不存在');
    }

    if (withdrawal.status !== 'processing') {
      throw new ApiError('只能完成处理中的提现', 400, 'INVALID_STATUS');
    }

    await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'completed',
        },
      });

      // Update transaction status
      const transaction = await tx.transaction.findFirst({
        where: {
          withdrawalId,
          type: 'withdrawal',
        },
      });

      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }

      // Reduce pending balance (already reduced when requested)
      // The pending balance was already reduced, now we just mark as complete
    });

    logger.info('Withdrawal completed', { withdrawalId });

    const updated = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    return this.formatWithdrawalResponse(updated!);
  }

  /**
   * Format earnings detail
   */
  private formatEarningsDetail(transaction: EarningsHistoryTransaction): EarningsDetail {
    return {
      id: transaction.id,
      order_id: transaction.orderId ?? undefined,
      order_no: transaction.order?.orderNo,
      campaign_title: transaction.order?.campaign?.title,
      type: transaction.type,
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description ?? undefined,
      created_at: transaction.createdAt.toISOString(),
      completed_at: transaction.completedAt?.toISOString(),
    };
  }

  /**
   * Format withdrawal response
   */
  private formatWithdrawalResponse(withdrawal: Withdrawal): WithdrawalResponse {
    return {
      id: withdrawal.id,
      kol_id: withdrawal.kolId,
      withdrawal_no: withdrawal.withdrawalNo,
      amount: withdrawal.amount.toNumber(),
      fee: withdrawal.fee.toNumber(),
      actual_amount: withdrawal.actualAmount.toNumber(),
      currency: withdrawal.currency,
      payment_method: withdrawal.paymentMethod,
      account_name: withdrawal.accountName,
      account_number: withdrawal.accountNumber,
      bank_name: withdrawal.bankName ?? undefined,
      status: withdrawal.status,
      description: withdrawal.description ?? undefined,
      failure_reason: withdrawal.failureReason ?? undefined,
      processed_at: withdrawal.processedAt?.toISOString(),
      created_at: withdrawal.createdAt.toISOString(),
      updated_at: withdrawal.updatedAt.toISOString(),
    };
  }
}

export const earningsService = new EarningsService();
