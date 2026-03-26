import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { decimalToNumber } from '../../utils/decimal';

// Transaction list filters
export interface TransactionListFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  paymentMethod?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Approve withdrawal request
export interface ApproveWithdrawalRequest {
  note?: string;
  mfaCode?: string;
}

// Reject withdrawal request
export interface RejectWithdrawalRequest {
  reason: string;
  note?: string;
}

// Transaction response type
export interface TransactionResponse {
  id: string;
  transactionNo: string;
  type: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentRef?: string;
  status: string;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  user?: {
    id: string;
    email: string;
    companyName?: string;
  } | null;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// Withdrawal response type
export interface WithdrawalResponse {
  id: string;
  withdrawalNo: string;
  kol: {
    id: string;
    userId: string;
    name: string;
    email: string;
    platform: string;
    platformUsername: string;
  };
  amount: number;
  fee: number;
  actualAmount: number;
  currency: string;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  status: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  note?: string;
  adminNote?: string;
  submittedAt: Date;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

export class AdminFinanceService {
  /**
   * Get transaction list with filters
   */
  async getTransactionList(filters: TransactionListFilters, adminId: string) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      paymentMethod,
      userId,
      minAmount,
      maxAmount,
      createdAfter,
      createdBefore,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (userId) {
      where.OR = [
        { advertiserId: userId },
        { kolId: userId },
      ];
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order },
        include: {
          advertiser: {
            select: {
              id: true,
              userId: true,
              companyName: true,
            },
          },
          kol: {
            select: {
              id: true,
              userId: true,
              platform: true,
              platformUsername: true,
            },
          },
        },
      }),
    ]);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'transaction',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/transactions',
      status: 'success',
    });

    return {
      items: transactions.map((t) => this.formatTransactionResponse(t)),
      pagination: {
        page,
        page_size: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get pending withdrawals
   */
  async getPendingWithdrawals(filters: {
    page?: number;
    limit?: number;
    minAmount?: number;
    maxAmount?: number;
  }, adminId: string) {
    const {
      page = 1,
      limit = 20,
      minAmount,
      maxAmount,
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {
      status: 'pending',
    };

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    const [total, withdrawals] = await Promise.all([
      prisma.withdrawal.count({ where }),
      prisma.withdrawal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          kol: {
            include: {
              user: {
                select: {
                  email: true,
                  nickname: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'withdrawal',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/withdrawals/pending',
      status: 'success',
    });

    return {
      items: withdrawals.map((w) => this.formatWithdrawalResponse(w)),
      pagination: {
        page,
        page_size: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(withdrawalId: string, adminId: string): Promise<WithdrawalResponse> {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        kol: {
          include: {
            user: {
              select: {
                email: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!withdrawal) {
      throw new ApiError('提现记录不存在', 404, 'WITHDRAWAL_NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'withdrawal',
      resourceId: withdrawalId,
      resourceName: withdrawal.withdrawalNo,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/finance/withdrawals/${withdrawalId}`,
      status: 'success',
    });

    return this.formatWithdrawalResponse(withdrawal);
  }

  /**
   * Approve withdrawal
   */
  async approveWithdrawal(withdrawalId: string, data: ApproveWithdrawalRequest, adminId: string, adminEmail: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        kol: true,
      },
    });

    if (!withdrawal) {
      throw new ApiError('提现记录不存在', 404, 'WITHDRAWAL_NOT_FOUND');
    }

    if (withdrawal.status !== 'pending') {
      throw new ApiError('提现申请状态不正确', 400, 'WITHDRAWAL_INVALID_STATUS');
    }

    // Check if KOL has sufficient balance
    if (withdrawal.kol.availableBalance < withdrawal.amount) {
      throw new ApiError('KOL 余额不足', 400, 'INSUFFICIENT_BALANCE');
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'processing',
          processedAt: new Date(),
          metadata: {
            ...(withdrawal.metadata as any) || {},
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
            adminNote: data.note,
          },
        },
      });

      // Deduct from KOL balance
      await tx.kol.update({
        where: { id: withdrawal.kolId },
        data: {
          availableBalance: {
            decrement: Number(withdrawal.amount),
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          kolId: withdrawal.kolId,
          withdrawalId: withdrawalId,
          transactionNo: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          type: 'withdrawal',
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          paymentMethod: withdrawal.paymentMethod as any,
          paymentRef: withdrawalId,
          status: 'processing',
          description: `KOL 提现：${withdrawal.withdrawalNo}`,
        },
      });

      return updatedWithdrawal;
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'approve',
      resourceType: 'withdrawal',
      resourceId: withdrawalId,
      resourceName: withdrawal.withdrawalNo,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/finance/withdrawals/${withdrawalId}/approve`,
      requestBody: data,
      newValues: { status: 'processing' },
      status: 'success',
    });

    logger.info('Withdrawal approved', { withdrawalId, adminId, kolId: withdrawal.kolId });

    return {
      id: result.id,
      status: result.status,
      processedAt: result.processedAt,
      message: '提现申请已批准，款项将在 1-3 个工作日内到账',
    };
  }

  /**
   * Reject withdrawal
   */
  async rejectWithdrawal(withdrawalId: string, data: RejectWithdrawalRequest, adminId: string, adminEmail: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        kol: true,
      },
    });

    if (!withdrawal) {
      throw new ApiError('提现记录不存在', 404, 'WITHDRAWAL_NOT_FOUND');
    }

    if (withdrawal.status !== 'pending') {
      throw new ApiError('提现申请状态不正确', 400, 'WITHDRAWAL_INVALID_STATUS');
    }

    // Update withdrawal status
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'rejected',
        failureReason: data.reason,
        metadata: {
          ...(withdrawal.metadata as any) || {},
          rejectedBy: adminId,
          rejectedAt: new Date().toISOString(),
          rejectionReason: data.reason,
          adminNote: data.note,
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'reject',
      resourceType: 'withdrawal',
      resourceId: withdrawalId,
      resourceName: withdrawal.withdrawalNo,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/finance/withdrawals/${withdrawalId}/reject`,
      requestBody: data,
      newValues: { status: 'rejected', failureReason: data.reason },
      status: 'success',
    });

    logger.info('Withdrawal rejected', { withdrawalId, adminId, reason: data.reason });

    return {
      id: updatedWithdrawal.id,
      status: updatedWithdrawal.status,
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason: data.reason,
      message: '提现申请已拒绝，金额已退回可用余额',
    };
  }

  /**
   * Format transaction response
   */
  private formatTransactionResponse(transaction: any): TransactionResponse {
    const user = transaction.advertiser || transaction.kol;
    return {
      id: transaction.id,
      transactionNo: transaction.transactionNo,
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      paymentRef: transaction.paymentRef,
      status: transaction.status,
      balanceBefore: transaction.balanceBefore ? Number(transaction.balanceBefore) : undefined,
      balanceAfter: transaction.balanceAfter ? Number(transaction.balanceAfter) : undefined,
      description: transaction.description,
      user: user ? {
        id: user.id,
        email: (user as any).user?.email || '',
        companyName: (user as any).companyName,
      } : null,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      failedAt: transaction.failedAt,
      failureReason: transaction.failureReason,
    };
  }

  /**
   * Format withdrawal response
   */
  /**
   * Finance dashboard overview
   */
  async getFinanceOverview(period: string, adminId: string) {
    const [completedVolume, pendingWithdrawals] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: TransactionStatus.completed },
        _sum: { amount: true },
      }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
    ]);

    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'finance_overview',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/overview',
      status: 'success',
    });

    return {
      period,
      total_completed_volume: decimalToNumber(completedVolume._sum?.amount),
      pending_withdrawals: pendingWithdrawals,
    };
  }

  /**
   * Deposit records (recharge transactions)
   */
  async getDeposits(filters: TransactionListFilters, adminId: string) {
    return this.getTransactionList(
      { ...filters, type: TransactionType.recharge },
      adminId
    );
  }

  /**
   * All withdrawals with filters
   */
  async getWithdrawals(
    filters: TransactionListFilters & { kolId?: string },
    adminId: string
  ) {
    const {
      page = 1,
      limit = 20,
      status,
      kolId,
      minAmount,
      maxAmount,
      createdAfter,
      createdBefore,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (kolId) where.kolId = kolId;
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = new Date(createdAfter);
      if (createdBefore) where.createdAt.lte = new Date(createdBefore);
    }

    const [total, withdrawals] = await Promise.all([
      prisma.withdrawal.count({ where }),
      prisma.withdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          kol: {
            include: {
              user: {
                select: { email: true, nickname: true },
              },
            },
          },
        },
      }),
    ]);

    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'withdrawal',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/withdrawals',
      status: 'success',
    });

    return {
      items: withdrawals.map((w) => this.formatWithdrawalResponse(w)),
      pagination: {
        page,
        page_size: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Verify withdrawal (approve or reject) — unified entry
   */
  async verifyWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject',
    reason: string | undefined,
    note: string | undefined,
    adminId: string,
    adminEmail: string
  ) {
    if (action === 'approve') {
      return this.approveWithdrawal(withdrawalId, { note }, adminId, adminEmail);
    }
    return this.rejectWithdrawal(
      withdrawalId,
      { reason: reason || '审核未通过', note },
      adminId,
      adminEmail
    );
  }

  /**
   * Export finance CSV (minimal placeholder rows)
   */
  async exportFinance(
    body: { type: string; startDate: string; endDate: string; format?: string },
    adminId: string
  ) {
    await logAdminAction({
      adminId,
      action: 'export',
      resourceType: 'finance',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/export',
      status: 'success',
    });
    const header = 'type,startDate,endDate\n';
    const row = `${body.type},${body.startDate},${body.endDate}\n`;
    return { csvData: header + row };
  }

  /**
   * Confirm a pending recharge transaction
   */
  async confirmRecharge(
    transactionId: string,
    note: string | undefined,
    adminId: string,
    adminEmail: string
  ) {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) {
      throw new ApiError('交易不存在', 404, 'TRANSACTION_NOT_FOUND');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.completed,
        completedAt: new Date(),
        description: note ? `${tx.description ?? ''} [确认] ${note}`.trim() : tx.description,
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'confirm_recharge',
      resourceType: 'transaction',
      resourceId: transactionId,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/finance/recharge/confirm',
      status: 'success',
    });

    return { id: updated.id, status: updated.status };
  }

  /**
   * Adjust balance for a user (advertiser wallet)
   */
  async adjustBalance(
    userId: string,
    amount: number,
    type: 'add' | 'subtract',
    reason: string,
    note: string | undefined,
    adminId: string,
    adminEmail: string
  ) {
    const advertiser = await prisma.advertiser.findUnique({ where: { userId } });
    if (!advertiser) {
      throw new ApiError('未找到广告主账户', 404, 'ADVERTISER_NOT_FOUND');
    }

    const delta = type === 'add' ? amount : -amount;
    const before = decimalToNumber(advertiser.walletBalance);
    const after = before + delta;
    if (after < 0) {
      throw new ApiError('调整后余额不能为负数', 400, 'INVALID_REQUEST');
    }

    await prisma.$transaction([
      prisma.advertiser.update({
        where: { id: advertiser.id },
        data: { walletBalance: new Prisma.Decimal(after) },
      }),
      prisma.transaction.create({
        data: {
          transactionNo: `BAL-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          advertiserId: advertiser.id,
          type: TransactionType.adjustment,
          amount: new Prisma.Decimal(Math.abs(delta)),
          currency: 'CNY',
          balanceBefore: new Prisma.Decimal(before),
          balanceAfter: new Prisma.Decimal(after),
          description: `管理员余额调整：${reason}${note ? ` (${note})` : ''}`,
          status: TransactionStatus.completed,
          completedAt: new Date(),
        },
      }),
    ]);

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'adjust_balance',
      resourceType: 'finance',
      resourceId: userId,
      requestMethod: 'PUT',
      requestPath: '/api/v1/admin/finance/balance/adjust',
      status: 'success',
    });

    return { userId, new_balance: after };
  }

  private formatWithdrawalResponse(withdrawal: any): WithdrawalResponse {
    return {
      id: withdrawal.id,
      withdrawalNo: withdrawal.withdrawalNo,
      kol: {
        id: withdrawal.kol.id,
        userId: withdrawal.kol.userId,
        name: withdrawal.kol.user?.nickname || withdrawal.kol.platformDisplayName || withdrawal.kol.platformUsername,
        email: withdrawal.kol.user?.email || '',
        platform: withdrawal.kol.platform,
        platformUsername: withdrawal.kol.platformUsername,
      },
      amount: Number(withdrawal.amount),
      fee: Number(withdrawal.fee),
      actualAmount: Number(withdrawal.actualAmount),
      currency: withdrawal.currency,
      paymentMethod: withdrawal.paymentMethod,
      accountName: withdrawal.accountName,
      accountNumber: withdrawal.accountNumber,
      bankName: withdrawal.bankName,
      status: withdrawal.status,
      availableBalance: Number(withdrawal.kol.availableBalance),
      pendingBalance: Number(withdrawal.kol.pendingBalance),
      totalEarnings: Number(withdrawal.kol.totalEarnings),
      note: (withdrawal.metadata as any)?.note,
      adminNote: (withdrawal.metadata as any)?.adminNote,
      submittedAt: withdrawal.createdAt,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
      failureReason: withdrawal.failureReason,
    };
  }
}

export const adminFinanceService = new AdminFinanceService();
