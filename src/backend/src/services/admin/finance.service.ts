import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { decimalToNumber } from '../../utils/decimal';
import type { PaginationResponse } from '../../types';
import { cacheService } from '../cache.service';

function mergeWithdrawalMetadata(
  current: Prisma.JsonValue,
  patch: Record<string, Prisma.InputJsonValue>
): Prisma.InputJsonValue {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, Prisma.InputJsonValue>) }
      : {};
  return { ...base, ...patch };
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function withdrawalMetaNotes(meta: Prisma.JsonValue): { note?: string; adminNote?: string } {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const o = meta as Record<string, unknown>;
    return {
      note: typeof o.note === 'string' ? o.note : undefined,
      adminNote: typeof o.adminNote === 'string' ? o.adminNote : undefined,
    };
  }
  return {};
}

type TransactionListRow = Prisma.TransactionGetPayload<{
  include: {
    advertiser: { select: { id: true; userId: true; companyName: true } };
    kol: { select: { id: true; userId: true; platform: true; platformUsername: true } };
  };
}>;

type WithdrawalDetailRow = Prisma.WithdrawalGetPayload<{
  include: {
    kol: {
      include: {
        user: { select: { email: true; nickname: true } };
      };
    };
  };
}>;

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

export type ApproveWithdrawalResponse = {
  id: string;
  status: string;
  processedAt: Date | null;
  message: string;
};

export type RejectWithdrawalResponse = {
  id: string;
  status: string;
  rejectedAt: Date;
  rejectedBy: string;
  rejectionReason: string;
  message: string;
};

export type FinanceOverviewResponse = {
  period: string;
  /** 全站已完成流水合计（所有类型、completed） */
  total_completed_volume: number;
  /** 待审核提现笔数 */
  pending_withdrawals: number;
  /** 周期内平台费 + 佣金（completed），与 period 对齐；默认 period=month 即自然月 */
  monthly_revenue: number;
  /** 待确认 / 处理中充值笔数 */
  pending_recharges: number;
  /** 发票待处理（暂无发票表时为 0） */
  pending_invoices: number;
};

function overviewPeriodBounds(period: string, now = new Date()): { gte: Date; lte: Date } | null {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  if (period === 'month' || period === '') {
    const gte = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const lte = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return { gte, lte };
  }
  if (period === 'year') {
    const gte = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const lte = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    return { gte, lte };
  }
  if (period === 'week') {
    const day = now.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(Date.UTC(y, m, d + mondayOffset, 0, 0, 0, 0));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return { gte: monday, lte: sunday };
  }
  return null;
}

export class AdminFinanceService {
  /**
   * Get transaction list with filters
   */
  async getTransactionList(
    filters: TransactionListFilters,
    adminId: string
  ): Promise<PaginationResponse<TransactionResponse>> {
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

    const sortField =
      sort === 'created_at' || sort === 'createdAt'
        ? 'createdAt'
        : sort === 'updated_at' || sort === 'updatedAt'
          ? 'updatedAt'
          : sort === 'completed_at' || sort === 'completedAt'
            ? 'completedAt'
            : sort === 'amount'
              ? 'amount'
              : 'createdAt';

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.TransactionWhereInput = {};

    if (type) {
      where.type = type as TransactionType;
    }

    if (status) {
      where.status = status as TransactionStatus;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod as PaymentMethod;
    }

    if (userId) {
      where.OR = [{ advertiserId: userId }, { kolId: userId }];
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      const amount: Prisma.DecimalFilter = {};
      if (minAmount !== undefined) {
        amount.gte = new Prisma.Decimal(minAmount);
      }
      if (maxAmount !== undefined) {
        amount.lte = new Prisma.Decimal(maxAmount);
      }
      where.amount = amount;
    }

    if (createdAfter || createdBefore) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (createdAfter) {
        createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        createdAt.lte = new Date(createdBefore);
      }
      where.createdAt = createdAt;
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: order },
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
  async getPendingWithdrawals(
    filters: {
      page?: number;
      limit?: number;
      minAmount?: number;
      maxAmount?: number;
    },
    adminId: string
  ): Promise<PaginationResponse<WithdrawalResponse>> {
    const { page = 1, limit = 20, minAmount, maxAmount } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.WithdrawalWhereInput = {
      status: 'pending',
    };

    if (minAmount !== undefined || maxAmount !== undefined) {
      const amount: Prisma.DecimalFilter = {};
      if (minAmount !== undefined) {
        amount.gte = new Prisma.Decimal(minAmount);
      }
      if (maxAmount !== undefined) {
        amount.lte = new Prisma.Decimal(maxAmount);
      }
      where.amount = amount;
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
  async approveWithdrawal(
    withdrawalId: string,
    data: ApproveWithdrawalRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ApproveWithdrawalResponse> {
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
          metadata: mergeWithdrawalMetadata(withdrawal.metadata, {
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
            adminNote: data.note ?? '',
          }),
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
          type: TransactionType.withdrawal,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          paymentMethod: withdrawal.paymentMethod as PaymentMethod,
          paymentRef: withdrawalId,
          status: TransactionStatus.processing,
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
  async rejectWithdrawal(
    withdrawalId: string,
    data: RejectWithdrawalRequest,
    adminId: string,
    adminEmail: string
  ): Promise<RejectWithdrawalResponse> {
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
        metadata: mergeWithdrawalMetadata(withdrawal.metadata, {
          rejectedBy: adminId,
          rejectedAt: new Date().toISOString(),
          rejectionReason: data.reason,
          adminNote: data.note ?? '',
        }),
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
  private formatTransactionResponse(transaction: TransactionListRow): TransactionResponse {
    const adv = transaction.advertiser;
    const k = transaction.kol;
    const party = adv ?? k;
    return {
      id: transaction.id,
      transactionNo: transaction.transactionNo,
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod ?? undefined,
      paymentRef: transaction.paymentRef ?? undefined,
      status: transaction.status,
      balanceBefore: transaction.balanceBefore ? Number(transaction.balanceBefore) : undefined,
      balanceAfter: transaction.balanceAfter ? Number(transaction.balanceAfter) : undefined,
      description: transaction.description ?? undefined,
      user: party
        ? {
            id: party.id,
            email: '',
            companyName: adv ? (adv.companyName ?? undefined) : undefined,
          }
        : null,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt ?? undefined,
      failedAt: transaction.failedAt ?? undefined,
      failureReason: transaction.failureReason ?? undefined,
    };
  }

  /**
   * Format withdrawal response
   */
  /**
   * Finance dashboard overview
   */
  async getFinanceOverview(period: string, adminId: string): Promise<FinanceOverviewResponse> {
    const bounds = overviewPeriodBounds(period);
    const platformRevenueWhere: Prisma.TransactionWhereInput = {
      status: TransactionStatus.completed,
      type: { in: [TransactionType.platform_fee, TransactionType.commission] },
      ...(bounds
        ? {
            OR: [
              { completedAt: { gte: bounds.gte, lte: bounds.lte } },
              { completedAt: null, createdAt: { gte: bounds.gte, lte: bounds.lte } },
            ],
          }
        : {}),
    };

    const [completedVolume, pendingWithdrawals, platformRevenue, pendingRecharges] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: TransactionStatus.completed },
        _sum: { amount: true },
      }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.transaction.aggregate({
        where: platformRevenueWhere,
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          type: TransactionType.recharge,
          status: { in: [TransactionStatus.pending, TransactionStatus.processing] },
        },
      }),
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
      monthly_revenue: decimalToNumber(platformRevenue._sum?.amount),
      pending_recharges: pendingRecharges,
      pending_invoices: 0,
    };
  }

  /**
   * Deposit records (recharge transactions)
   */
  async getDeposits(
    filters: TransactionListFilters,
    adminId: string
  ): Promise<PaginationResponse<TransactionResponse>> {
    return this.getTransactionList({ ...filters, type: TransactionType.recharge }, adminId);
  }

  /**
   * All withdrawals with filters
   */
  async getWithdrawals(
    filters: TransactionListFilters & { kolId?: string },
    adminId: string
  ): Promise<PaginationResponse<WithdrawalResponse>> {
    const { page = 1, limit = 20, status, kolId, minAmount, maxAmount, createdAfter, createdBefore } = filters;

    const skip = (page - 1) * limit;
    const where: Prisma.WithdrawalWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (kolId) {
      where.kolId = kolId;
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      const amount: Prisma.DecimalFilter = {};
      if (minAmount !== undefined) {
        amount.gte = new Prisma.Decimal(minAmount);
      }
      if (maxAmount !== undefined) {
        amount.lte = new Prisma.Decimal(maxAmount);
      }
      where.amount = amount;
    }
    if (createdAfter || createdBefore) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (createdAfter) {
        createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        createdAt.lte = new Date(createdBefore);
      }
      where.createdAt = createdAt;
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
  ): Promise<ApproveWithdrawalResponse | RejectWithdrawalResponse> {
    if (action === 'approve') {
      return this.approveWithdrawal(withdrawalId, { note }, adminId, adminEmail);
    }
    return this.rejectWithdrawal(withdrawalId, { reason: reason || '审核未通过', note }, adminId, adminEmail);
  }

  /**
   * Export finance CSV (UTF-8 BOM for Excel)
   */
  async exportFinance(
    body: { type: string; startDate: string; endDate: string; format?: string },
    adminId: string
  ): Promise<{ csvData: string; filenameBase: string }> {
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    end.setHours(23, 59, 59, 999);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new ApiError('日期范围无效', 400, 'INVALID_DATE_RANGE');
    }

    await logAdminAction({
      adminId,
      action: 'export',
      resourceType: 'finance',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/finance/export',
      status: 'success',
    });

    const lines: string[] = [];

    if (body.type === 'withdrawals') {
      const rows = await prisma.withdrawal.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        include: {
          kol: { include: { user: { select: { email: true, nickname: true } } } },
        },
      });
      lines.push(
        ['withdrawal_no', 'kol_email', 'amount', 'currency', 'status', 'created_at', 'account_name', 'account_number']
          .map(csvCell)
          .join(',')
      );
      for (const row of rows) {
        lines.push(
          [
            row.withdrawalNo,
            row.kol.user?.email ?? '',
            row.amount.toString(),
            row.currency,
            row.status,
            row.createdAt.toISOString(),
            row.accountName,
            row.accountNumber,
          ]
            .map(csvCell)
            .join(',')
        );
      }
    } else {
      const typeWhere: Prisma.TransactionWhereInput = {
        createdAt: { gte: start, lte: end },
      };
      if (body.type === 'deposits') {
        typeWhere.type = TransactionType.recharge;
      }
      // transactions | all：区间内全部流水（all 与 transactions 一致，提现请单独选 withdrawals）
      const txs = await prisma.transaction.findMany({
        where: typeWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          advertiser: { select: { companyName: true } },
          kol: { select: { platformUsername: true } },
        },
      });
      lines.push(
        ['transaction_no', 'type', 'amount', 'currency', 'status', 'created_at', 'completed_at', 'party', 'description']
          .map(csvCell)
          .join(',')
      );
      for (const t of txs) {
        const party = t.advertiser?.companyName ?? t.kol?.platformUsername ?? '';
        const desc = (t.description ?? '').replace(/\r?\n/g, ' ');
        lines.push(
          [
            t.transactionNo,
            t.type,
            t.amount.toString(),
            t.currency,
            t.status,
            t.createdAt.toISOString(),
            t.completedAt?.toISOString() ?? '',
            party,
            desc,
          ]
            .map(csvCell)
            .join(',')
        );
      }
    }

    const csvData = `\uFEFF${lines.join('\n')}`;
    const filenameBase = `finance_${body.type}_${body.startDate}_${body.endDate}`;
    return { csvData, filenameBase };
  }

  /**
   * Confirm a pending recharge transaction（入账广告主余额 + totalRecharged）
   */
  async confirmRecharge(
    transactionId: string,
    note: string | undefined,
    adminId: string,
    adminEmail: string
  ): Promise<{ id: string; status: string }> {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        advertiser: { select: { id: true, userId: true } },
      },
    });
    if (!tx) {
      throw new ApiError('交易不存在', 404, 'TRANSACTION_NOT_FOUND');
    }
    if (tx.type !== TransactionType.recharge) {
      throw new ApiError('仅支持充值类交易', 400, 'INVALID_TRANSACTION_TYPE');
    }
    if (tx.status === TransactionStatus.completed) {
      throw new ApiError('该充值已入账', 400, 'RECHARGE_ALREADY_COMPLETED');
    }
    if (tx.status !== TransactionStatus.pending && tx.status !== TransactionStatus.processing) {
      throw new ApiError('当前状态不可确认入账', 400, 'INVALID_TRANSACTION_STATUS');
    }
    if (!tx.advertiserId || !tx.advertiser) {
      throw new ApiError('缺少广告主关联', 400, 'ADVERTISER_REQUIRED');
    }

    const amount = decimalToNumber(tx.amount);

    await prisma.$transaction(async (db) => {
      const adv = await db.advertiser.findUnique({ where: { id: tx.advertiserId! } });
      if (!adv) {
        throw new ApiError('广告主不存在', 404, 'ADVERTISER_NOT_FOUND');
      }
      const balanceBefore = decimalToNumber(adv.walletBalance);
      const balanceAfter = balanceBefore + amount;

      await db.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.completed,
          completedAt: new Date(),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          description: note ? `${tx.description ?? ''} [管理员确认] ${note}`.trim() : tx.description,
        },
      });

      await db.advertiser.update({
        where: { id: adv.id },
        data: {
          walletBalance: new Prisma.Decimal(balanceAfter),
          totalRecharged: { increment: amount },
        },
      });
    });

    await cacheService.delete(`advertiser:user:${tx.advertiser.userId}`);
    await cacheService.delete(`advertiser:${tx.advertiser.id}`);

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

    return { id: transactionId, status: TransactionStatus.completed };
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
  ): Promise<{ userId: string; new_balance: number }> {
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

  private formatWithdrawalResponse(withdrawal: WithdrawalDetailRow): WithdrawalResponse {
    const meta = withdrawalMetaNotes(withdrawal.metadata);
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
      bankName: withdrawal.bankName ?? undefined,
      status: withdrawal.status,
      availableBalance: Number(withdrawal.kol.availableBalance),
      pendingBalance: Number(withdrawal.kol.pendingBalance),
      totalEarnings: Number(withdrawal.kol.totalEarnings),
      note: meta.note,
      adminNote: meta.adminNote,
      submittedAt: withdrawal.createdAt,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt ?? undefined,
      failureReason: withdrawal.failureReason ?? undefined,
    };
  }
}

export const adminFinanceService = new AdminFinanceService();
