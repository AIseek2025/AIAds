import { Prisma, type Advertiser, type Transaction, type TransactionType } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { cacheService } from '../config/redis';
import {
  CreateAdvertiserRequest,
  UpdateAdvertiserRequest,
  AdvertiserResponse,
  RechargeRequest,
  TransactionResponse,
} from '../types';
import { sumFrozenAmountForAdvertiser } from './order-frozen.util';
import { getAdvertiserLowBalanceAlertCny } from '../utils/advertiserUiConfig';

export class AdvertiserService {
  /**
   * Get advertiser by user ID
   */
  async getAdvertiserByUserId(userId: string): Promise<AdvertiserResponse | null> {
    const cacheKey = `advertiser:user:${userId}`;
    const cached = await cacheService.get<AdvertiserResponse>(cacheKey);
    if (cached) {
      const orders_frozen_total = await sumFrozenAmountForAdvertiser(cached.id);
      return { ...cached, orders_frozen_total };
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!advertiser) {
      return null;
    }

    const orders_frozen_total = await sumFrozenAmountForAdvertiser(advertiser.id);
    const response: AdvertiserResponse = {
      ...this.formatAdvertiserResponse(advertiser),
      orders_frozen_total,
    };

    await cacheService.set(cacheKey, response, 300);

    return response;
  }

  /**
   * Create advertiser profile
   */
  async createAdvertiser(userId: string, data: CreateAdvertiserRequest): Promise<AdvertiserResponse> {
    // Check if advertiser already exists
    const existing = await prisma.advertiser.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ApiError('广告主资料已存在', 409, 'CONFLICT');
    }

    // Check if user exists and has advertiser role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    if (user.role !== 'advertiser') {
      throw new ApiError('用户角色不是广告主', 400, 'INVALID_ROLE');
    }

    const advertiser = await prisma.advertiser.create({
      data: {
        userId,
        companyName: data.company_name,
        companyNameEn: data.company_name_en,
        businessLicense: data.business_license,
        legalRepresentative: data.legal_representative,
        contactPerson: data.contact_person,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        industry: data.industry,
        companySize: data.company_size,
        website: data.website,
        verificationStatus: 'pending',
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info('Advertiser profile created', { advertiserId: advertiser.id, userId });

    return this.formatAdvertiserResponse(advertiser);
  }

  /**
   * Update advertiser profile
   */
  async updateAdvertiser(userId: string, data: UpdateAdvertiserRequest): Promise<AdvertiserResponse> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在');
    }

    // Build update data
    const updateData: Prisma.AdvertiserUpdateInput = {};
    if (data.company_name !== undefined) {
      updateData.companyName = data.company_name;
    }
    if (data.company_name_en !== undefined) {
      updateData.companyNameEn = data.company_name_en;
    }
    if (data.contact_person !== undefined) {
      updateData.contactPerson = data.contact_person;
    }
    if (data.contact_phone !== undefined) {
      updateData.contactPhone = data.contact_phone;
    }
    if (data.contact_email !== undefined) {
      updateData.contactEmail = data.contact_email;
    }
    if (data.industry !== undefined) {
      updateData.industry = data.industry;
    }
    if (data.company_size !== undefined) {
      updateData.companySize = data.company_size;
    }
    if (data.website !== undefined) {
      updateData.website = data.website;
    }

    const updated = await prisma.advertiser.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    // Invalidate cache
    await cacheService.delete(`advertiser:user:${userId}`);
    await cacheService.delete(`advertiser:${updated.id}`);

    logger.info('Advertiser profile updated', { advertiserId: updated.id });

    return this.formatAdvertiserResponse(updated);
  }

  /**
   * Recharge advertiser account
   */
  async recharge(userId: string, data: RechargeRequest): Promise<TransactionResponse> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在');
    }

    // Generate transaction number
    const transactionNo = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        advertiserId: advertiser.id,
        transactionNo,
        type: 'recharge',
        amount: data.amount,
        paymentMethod: data.payment_method === 'wechat' ? 'wechat_pay' : data.payment_method,
        paymentRef: data.payment_proof,
        status: 'pending',
        description: `充值申请 - ${data.payment_method}`,
        metadata: {
          payment_proof: data.payment_proof,
        },
      },
    });

    logger.info('Recharge request created', {
      advertiserId: advertiser.id,
      transactionId: transaction.id,
      amount: data.amount,
    });

    // In a real implementation, this would trigger payment processing
    // For now, we'll auto-complete the recharge
    await this.completeRecharge(advertiser.id, transaction.id, data.amount);

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Complete recharge transaction
   */
  private async completeRecharge(advertiserId: string, transactionId: string, amount: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get current balance
      const advertiser = await tx.advertiser.findUnique({
        where: { id: advertiserId },
      });

      if (!advertiser) {
        throw new Error('Advertiser not found');
      }

      const balanceBefore = advertiser.walletBalance.toNumber();
      const balanceAfter = balanceBefore + amount;

      // Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          balanceBefore,
          balanceAfter,
        },
      });

      // Update advertiser balance
      await tx.advertiser.update({
        where: { id: advertiserId },
        data: {
          walletBalance: balanceAfter,
          totalRecharged: { increment: amount },
        },
      });
    });

    // Invalidate cache
    await cacheService.delete(`advertiser:${advertiserId}`);
  }

  /**
   * Get advertiser balance
   */
  async getBalance(userId: string): Promise<{
    wallet_balance: number;
    frozen_balance: number;
    total_recharged: number;
    total_spent: number;
    /** 低于该可用余额（元）时前端展示低余额提示；默认 500，环境变量 ADVERTISER_LOW_BALANCE_ALERT_CNY */
    low_balance_alert_cny: number;
  }> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      select: {
        walletBalance: true,
        frozenBalance: true,
        totalRecharged: true,
        totalSpent: true,
      },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在');
    }

    const low_balance_alert_cny = getAdvertiserLowBalanceAlertCny();

    return {
      wallet_balance: advertiser.walletBalance.toNumber(),
      frozen_balance: advertiser.frozenBalance.toNumber(),
      total_recharged: advertiser.totalRecharged.toNumber(),
      total_spent: advertiser.totalSpent.toNumber(),
      low_balance_alert_cny,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    type?: string
  ): Promise<{ items: TransactionResponse[]; total: number }> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在');
    }

    const where: Prisma.TransactionWhereInput = {
      advertiserId: advertiser.id,
    };

    if (type) {
      where.type = type as TransactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      items: transactions.map((t) => this.formatTransactionResponse(t)),
      total,
    };
  }

  /**
   * Format advertiser response
   */
  private formatAdvertiserResponse(advertiser: Advertiser): AdvertiserResponse {
    return {
      id: advertiser.id,
      user_id: advertiser.userId,
      company_name: advertiser.companyName,
      company_name_en: advertiser.companyNameEn ?? undefined,
      business_license: advertiser.businessLicense ?? undefined,
      business_license_url: advertiser.businessLicenseUrl ?? undefined,
      legal_representative: advertiser.legalRepresentative ?? undefined,
      contact_person: advertiser.contactPerson ?? undefined,
      contact_phone: advertiser.contactPhone ?? undefined,
      contact_email: advertiser.contactEmail ?? undefined,
      contact_address: advertiser.contactAddress ?? undefined,
      industry: advertiser.industry ?? undefined,
      company_size: advertiser.companySize ?? undefined,
      website: advertiser.website ?? undefined,
      verification_status: advertiser.verificationStatus,
      verified_at: advertiser.verifiedAt?.toISOString(),
      wallet_balance: advertiser.walletBalance.toNumber(),
      frozen_balance: advertiser.frozenBalance.toNumber(),
      total_recharged: advertiser.totalRecharged.toNumber(),
      total_spent: advertiser.totalSpent.toNumber(),
      subscription_plan: advertiser.subscriptionPlan,
      subscription_expires_at: advertiser.subscriptionExpiresAt?.toISOString() ?? undefined,
      total_campaigns: advertiser.totalCampaigns,
      active_campaigns: advertiser.activeCampaigns,
      total_orders: advertiser.totalOrders,
      created_at: advertiser.createdAt.toISOString(),
      updated_at: advertiser.updatedAt.toISOString(),
    };
  }

  /**
   * Format transaction response
   */
  private formatTransactionResponse(transaction: Transaction): TransactionResponse {
    return {
      id: transaction.id,
      order_id: transaction.orderId ?? undefined,
      advertiser_id: transaction.advertiserId ?? undefined,
      kol_id: transaction.kolId ?? undefined,
      transaction_no: transaction.transactionNo,
      type: transaction.type,
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      payment_method: transaction.paymentMethod ?? undefined,
      payment_ref: transaction.paymentRef ?? undefined,
      status: transaction.status,
      balance_before: transaction.balanceBefore?.toNumber(),
      balance_after: transaction.balanceAfter?.toNumber(),
      description: transaction.description ?? undefined,
      created_at: transaction.createdAt.toISOString(),
      completed_at: transaction.completedAt?.toISOString(),
      failed_at: transaction.failedAt?.toISOString(),
      failure_reason: transaction.failureReason ?? undefined,
    };
  }
}

export const advertiserService = new AdvertiserService();
