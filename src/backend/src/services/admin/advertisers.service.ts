import { PaymentMethod, Prisma, TransactionStatus, TransactionType, VerificationStatus } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { PaginationResponse } from '../../types';
import { decimalToNumber } from '../../utils/decimal';
import { sumFrozenAmountForAdvertiser, sumFrozenAmountForAdvertisers } from '../order-frozen.util';

// Types and interfaces
export interface AdvertiserListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  verificationStatus?: string;
  industry?: string;
  minBalance?: number;
  maxBalance?: number;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AdvertiserListItem {
  id: string;
  user_id: string;
  company_name: string;
  contact_person: string | null;
  contact_email: string | null;
  industry: string | null;
  verification_status: string;
  wallet_balance: number;
  frozen_balance: number;
  /** 该广告主全部订单 frozen_amount 合计（列表批量聚合） */
  orders_frozen_total: number;
  active_campaigns: number;
  created_at: string;
}

export interface AdvertiserDetail {
  id: string;
  user_id: string;
  company_name: string;
  company_name_en?: string;
  business_license: string | null;
  business_license_url: string | null;
  legal_representative: string | null;
  industry: string | null;
  company_size?: string;
  website?: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address?: string;
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  wallet_balance: number;
  frozen_balance: number;
  total_recharged: number;
  total_spent: number;
  /** 该广告主全部订单 frozen_amount 合计（区别于账户冻结 frozen_balance） */
  orders_frozen_total: number;
  statistics: {
    total_campaigns: number;
    active_campaigns: number;
    total_orders: number;
    completed_orders: number;
  };
  created_at: string;
  updated_at: string;
}

export interface VerifyAdvertiserRequest {
  action: 'approve' | 'reject';
  note?: string;
  rejection_reason?: string;
}

export interface BalanceAdjustmentRequest {
  amount: number;
  type: 'manual' | 'refund' | 'compensation' | 'penalty';
  reason: string;
  notify_advertiser: boolean;
}

export interface FreezeAccountRequest {
  reason: string;
  freeze_amount?: number;
}

export interface UnfreezeAccountRequest {
  reason: string;
  unfreeze_amount?: number;
}

export interface TransactionRecord {
  id: string;
  transaction_no: string;
  amount: number;
  payment_method: string | null;
  status: string;
  balance_before: number;
  balance_after: number;
  description: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ConsumptionRecord {
  id: string;
  transaction_no: string;
  order_id: string | null;
  campaign_id: string | null;
  amount: number;
  type: string;
  status: string;
  balance_before: number;
  balance_after: number;
  description: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RechargeFilters {
  page: number;
  pageSize: number;
  status?: string;
  paymentMethod?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ConsumptionFilters {
  page: number;
  pageSize: number;
  type?: string;
  status?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface VerifyAdvertiserResponse {
  id: string;
  verification_status: string;
  verified_at: string | undefined;
  verified_by: string;
}

export interface BalanceAdjustmentResponse {
  id: string;
  advertiser_id: string;
  amount: number;
  type: BalanceAdjustmentRequest['type'];
  before_balance: number;
  after_balance: number;
  admin_id: string;
  created_at: string;
}

export interface FreezeAccountResponse {
  id: string;
  frozen_balance: number;
  frozen_at: string;
  frozen_reason: string;
}

export interface UnfreezeAccountResponse {
  id: string;
  frozen_balance: number;
  unfrozen_at: string;
}

export class AdminAdvertiserService {
  /**
   * Get advertiser list with pagination and filters
   */
  async getAdvertiserList(
    filters: AdvertiserListFilters,
    adminId: string
  ): Promise<PaginationResponse<AdvertiserListItem>> {
    const {
      page,
      pageSize,
      keyword,
      verificationStatus,
      industry,
      minBalance,
      maxBalance,
      createdAfter,
      createdBefore,
      sort,
      order,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: Prisma.AdvertiserWhereInput = {};

    if (keyword) {
      where.OR = [
        { companyName: { contains: keyword, mode: 'insensitive' } },
        { contactPerson: { contains: keyword, mode: 'insensitive' } },
        { contactEmail: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (verificationStatus) {
      where.verificationStatus = verificationStatus as VerificationStatus;
    }

    if (industry) {
      where.industry = industry;
    }

    if (minBalance !== undefined || maxBalance !== undefined) {
      const walletBalance: Prisma.DecimalFilter = {};
      if (minBalance !== undefined) {
        walletBalance.gte = new Prisma.Decimal(minBalance);
      }
      if (maxBalance !== undefined) {
        walletBalance.lte = new Prisma.Decimal(maxBalance);
      }
      where.walletBalance = walletBalance;
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

    const sortKey =
      sort === 'created_at' || sort === undefined || sort === null
        ? 'createdAt'
        : sort === 'updated_at'
          ? 'updatedAt'
          : sort === 'wallet_balance'
            ? 'walletBalance'
            : sort === 'company_name'
              ? 'companyName'
              : 'createdAt';

    // Get total count
    const total = await prisma.advertiser.count({ where });

    // Get items
    const items = await prisma.advertiser.findMany({
      where,
      skip,
      take,
      orderBy: { [sortKey]: order ?? 'desc' } as Record<string, 'asc' | 'desc'>,
      select: {
        id: true,
        userId: true,
        companyName: true,
        contactPerson: true,
        contactEmail: true,
        industry: true,
        verificationStatus: true,
        walletBalance: true,
        frozenBalance: true,
        activeCampaigns: true,
        createdAt: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    const frozenByAdvertiser = await sumFrozenAmountForAdvertisers(items.map((a) => a.id));

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'list',
      resourceType: 'advertisers',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/advertisers',
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.list',
      filters,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        user_id: item.userId,
        company_name: item.companyName,
        contact_person: item.contactPerson,
        contact_email: item.contactEmail,
        industry: item.industry,
        verification_status: item.verificationStatus,
        wallet_balance: decimalToNumber(item.walletBalance),
        frozen_balance: decimalToNumber(item.frozenBalance),
        orders_frozen_total: frozenByAdvertiser.get(item.id) ?? 0,
        active_campaigns: item.activeCampaigns,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get advertiser details by ID
   */
  async getAdvertiserById(advertiserId: string, adminId: string): Promise<AdvertiserDetail> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
      include: {
        user: true,
        campaigns: {
          select: {
            id: true,
            status: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    // Calculate statistics
    const totalCampaigns = advertiser.campaigns.length;
    const activeCampaigns = advertiser.campaigns.filter((c) => c.status === 'active').length;
    const totalOrders = advertiser.orders.length;
    const completedOrders = advertiser.orders.filter((o) => o.status === 'completed').length;

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'advertisers',
      resourceId: advertiserId,
      resourceName: advertiser.companyName,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.view',
      targetId: advertiserId,
    });

    const orders_frozen_total = await sumFrozenAmountForAdvertiser(advertiserId);

    return {
      id: advertiser.id,
      user_id: advertiser.userId,
      company_name: advertiser.companyName,
      company_name_en: undefined,
      business_license: advertiser.businessLicense,
      business_license_url: advertiser.businessLicenseUrl,
      legal_representative: advertiser.contactPerson,
      industry: advertiser.industry,
      company_size: undefined,
      website: undefined,
      contact_person: advertiser.contactPerson,
      contact_phone: advertiser.contactPhone,
      contact_email: advertiser.contactEmail,
      contact_address: undefined,
      verification_status: advertiser.verificationStatus,
      verified_at: advertiser.verifiedAt?.toISOString() || null,
      verified_by: advertiser.verifiedBy,
      wallet_balance: decimalToNumber(advertiser.walletBalance),
      frozen_balance: decimalToNumber(advertiser.frozenBalance),
      total_recharged: decimalToNumber(advertiser.totalRecharged),
      total_spent: decimalToNumber(advertiser.totalSpent),
      orders_frozen_total,
      statistics: {
        total_campaigns: totalCampaigns,
        active_campaigns: activeCampaigns,
        total_orders: totalOrders,
        completed_orders: completedOrders,
      },
      created_at: advertiser.createdAt.toISOString(),
      updated_at: advertiser.updatedAt.toISOString(),
    };
  }

  /**
   * Verify advertiser (approve or reject)
   */
  async verifyAdvertiser(
    advertiserId: string,
    request: VerifyAdvertiserRequest,
    adminId: string,
    adminEmail: string
  ): Promise<VerifyAdvertiserResponse> {
    const { action, note, rejection_reason } = request;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    const updateData: Prisma.AdvertiserUpdateInput = {
      verifiedAt: new Date(),
      verifiedBy: adminId,
    };

    if (action === 'approve') {
      updateData.verificationStatus = 'approved';
      updateData.rejectionReason = null;
    } else {
      updateData.verificationStatus = 'rejected';
      updateData.rejectionReason = rejection_reason || '审核未通过';
    }

    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id: advertiserId },
      data: updateData,
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'verify',
      resourceType: 'advertisers',
      resourceId: advertiserId,
      resourceName: advertiser.companyName,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/verify`,
      requestBody: JSON.stringify(request),
      newValues: JSON.stringify(updateData),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.verify',
      targetId: advertiserId,
      changes: { action, note, rejection_reason },
    });

    return {
      id: advertiserId,
      verification_status: updatedAdvertiser.verificationStatus,
      verified_at: updatedAdvertiser.verifiedAt?.toISOString(),
      verified_by: adminId,
    };
  }

  /**
   * Get recharge records for an advertiser
   */
  async getRechargeRecords(
    advertiserId: string,
    filters: RechargeFilters,
    adminId: string
  ): Promise<PaginationResponse<TransactionRecord>> {
    const { page, pageSize, status, paymentMethod, createdAfter, createdBefore } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Verify advertiser exists
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      advertiserId,
      type: TransactionType.recharge,
    };

    if (status) {
      where.status = status as TransactionStatus;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod as PaymentMethod;
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

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get items
    const items = await prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transactionNo: true,
        amount: true,
        paymentMethod: true,
        status: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'advertiser_recharges',
      resourceId: advertiserId,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/recharges`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.recharges',
      targetId: advertiserId,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        transaction_no: item.transactionNo,
        amount: decimalToNumber(item.amount),
        payment_method: item.paymentMethod,
        status: item.status,
        balance_before: decimalToNumber(item.balanceBefore),
        balance_after: decimalToNumber(item.balanceAfter),
        description: item.description,
        completed_at: item.completedAt?.toISOString() || null,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get consumption records for an advertiser
   */
  async getConsumptionRecords(
    advertiserId: string,
    filters: ConsumptionFilters,
    adminId: string
  ): Promise<PaginationResponse<ConsumptionRecord>> {
    const { page, pageSize, type, status, createdAfter, createdBefore } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Verify advertiser exists
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      advertiserId,
      type: {
        in: [TransactionType.order_payment, TransactionType.platform_fee],
      },
    };

    if (type) {
      where.type = type as TransactionType;
    }

    if (status) {
      where.status = status as TransactionStatus;
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

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get items
    const items = await prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transactionNo: true,
        orderId: true,
        amount: true,
        type: true,
        status: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        completedAt: true,
        createdAt: true,
        order: { select: { campaignId: true } },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'advertiser_consumptions',
      resourceId: advertiserId,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/consumptions`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.consumptions',
      targetId: advertiserId,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        transaction_no: item.transactionNo,
        order_id: item.orderId,
        campaign_id: item.order?.campaignId ?? null,
        amount: decimalToNumber(item.amount),
        type: item.type,
        status: item.status,
        balance_before: decimalToNumber(item.balanceBefore),
        balance_after: decimalToNumber(item.balanceAfter),
        description: item.description,
        completed_at: item.completedAt?.toISOString() || null,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Adjust advertiser balance
   */
  async adjustBalance(
    advertiserId: string,
    request: BalanceAdjustmentRequest,
    adminId: string,
    adminEmail: string
  ): Promise<BalanceAdjustmentResponse> {
    const { amount, type, reason } = request;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    const beforeBalance = decimalToNumber(advertiser.walletBalance);
    const afterBalance = beforeBalance + amount;

    if (afterBalance < 0) {
      throw new ApiError('调整后余额不能为负数', 400, 'INVALID_REQUEST');
    }

    // Create transaction record
    const transactionNo = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        transactionNo,
        advertiserId,
        type: TransactionType.adjustment,
        amount: new Prisma.Decimal(Math.abs(amount)),
        currency: 'CNY',
        balanceBefore: new Prisma.Decimal(beforeBalance),
        balanceAfter: new Prisma.Decimal(afterBalance),
        description: `余额调整：${reason}`,
        status: TransactionStatus.completed,
        completedAt: new Date(),
      },
    });

    // Update advertiser balance
    await prisma.advertiser.update({
      where: { id: advertiserId },
      data: {
        walletBalance: new Prisma.Decimal(afterBalance),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'adjust_balance',
      resourceType: 'advertisers',
      resourceId: advertiserId,
      resourceName: advertiser.companyName,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/balance`,
      requestBody: JSON.stringify(request),
      oldValues: JSON.stringify({ balance: beforeBalance }),
      newValues: JSON.stringify({ balance: afterBalance }),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.adjust_balance',
      targetId: advertiserId,
      changes: { amount, type, reason, beforeBalance, afterBalance },
    });

    return {
      id: transaction.id,
      advertiser_id: advertiserId,
      amount,
      type,
      before_balance: beforeBalance,
      after_balance: afterBalance,
      admin_id: adminId,
      created_at: transaction.createdAt.toISOString(),
    };
  }

  /**
   * Freeze advertiser account
   */
  async freezeAccount(
    advertiserId: string,
    request: FreezeAccountRequest,
    adminId: string,
    adminEmail: string
  ): Promise<FreezeAccountResponse> {
    const { reason, freeze_amount } = request;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    const currentWallet = decimalToNumber(advertiser.walletBalance);
    const currentFrozen = decimalToNumber(advertiser.frozenBalance);
    const freezeAmount = freeze_amount !== undefined ? freeze_amount : currentWallet;

    if (freezeAmount > currentWallet) {
      throw new ApiError('冻结金额不能超过账户余额', 400, 'INVALID_REQUEST');
    }

    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id: advertiserId },
      data: {
        frozenBalance: currentFrozen + freezeAmount,
        walletBalance: currentWallet - freezeAmount,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'freeze',
      resourceType: 'advertisers',
      resourceId: advertiserId,
      resourceName: advertiser.companyName,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/freeze`,
      requestBody: JSON.stringify(request),
      newValues: JSON.stringify({
        frozen_balance: decimalToNumber(updatedAdvertiser.frozenBalance),
        wallet_balance: decimalToNumber(updatedAdvertiser.walletBalance),
      }),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.freeze',
      targetId: advertiserId,
      changes: { reason, freezeAmount },
    });

    return {
      id: advertiserId,
      frozen_balance: decimalToNumber(updatedAdvertiser.frozenBalance),
      frozen_at: new Date().toISOString(),
      frozen_reason: reason,
    };
  }

  /**
   * Unfreeze advertiser account
   */
  async unfreezeAccount(
    advertiserId: string,
    request: UnfreezeAccountRequest,
    adminId: string,
    adminEmail: string
  ): Promise<UnfreezeAccountResponse> {
    const { reason, unfreeze_amount } = request;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new ApiError('广告主不存在', 404, 'NOT_FOUND');
    }

    const currentWallet = decimalToNumber(advertiser.walletBalance);
    const currentFrozen = decimalToNumber(advertiser.frozenBalance);
    const unfreezeAmount = unfreeze_amount !== undefined ? unfreeze_amount : currentFrozen;

    if (unfreezeAmount > currentFrozen) {
      throw new ApiError('解冻金额不能超过冻结余额', 400, 'INVALID_REQUEST');
    }

    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id: advertiserId },
      data: {
        frozenBalance: currentFrozen - unfreezeAmount,
        walletBalance: currentWallet + unfreezeAmount,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'unfreeze',
      resourceType: 'advertisers',
      resourceId: advertiserId,
      resourceName: advertiser.companyName,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/advertisers/${advertiserId}/unfreeze`,
      requestBody: JSON.stringify(request),
      newValues: JSON.stringify({
        frozen_balance: decimalToNumber(updatedAdvertiser.frozenBalance),
        wallet_balance: decimalToNumber(updatedAdvertiser.walletBalance),
      }),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'advertiser.unfreeze',
      targetId: advertiserId,
      changes: { reason, unfreezeAmount },
    });

    return {
      id: advertiserId,
      frozen_balance: decimalToNumber(updatedAdvertiser.frozenBalance),
      unfrozen_at: new Date().toISOString(),
    };
  }
}

export const adminAdvertiserService = new AdminAdvertiserService();
