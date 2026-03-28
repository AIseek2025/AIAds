import type { NotificationType, OrderStatus } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';
import type { PaginationResponse } from '../types';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_text: string | null;
  created_at: string;
}

function toRow(n: {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: string | null;
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  actionText: string | null;
  createdAt: Date;
}): NotificationRow {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    related_type: n.relatedType,
    related_id: n.relatedId,
    is_read: n.isRead,
    read_at: n.readAt ? n.readAt.toISOString() : null,
    action_url: n.actionUrl,
    action_text: n.actionText,
    created_at: n.createdAt.toISOString(),
  };
}

export class NotificationService {
  /**
   * 创建通知；失败只记日志，不抛出（避免影响主业务流程）
   */
  async createSafe(input: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    relatedType?: string;
    relatedId?: string;
    actionUrl?: string;
    actionText?: string;
  }): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          content: input.content,
          relatedType: input.relatedType,
          relatedId: input.relatedId,
          actionUrl: input.actionUrl,
          actionText: input.actionText,
        },
      });
    } catch (e) {
      logger.warn('notification.create failed', { err: e, userId: input.userId });
    }
  }

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
    unreadOnly: boolean
  ): Promise<PaginationResponse<NotificationRow>> {
    const p = Math.max(1, page);
    const ps = Math.min(100, Math.max(1, pageSize));
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [total, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / ps));
    return {
      items: rows.map(toRow),
      pagination: {
        page: p,
        page_size: ps,
        total,
        total_pages: totalPages,
        has_next: p < totalPages,
        has_prev: p > 1,
      },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationRow> {
    const n = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) {
      throw errors.notFound('通知不存在');
    }
    if (n.isRead) {
      return toRow(n);
    }
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return toRow(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  /** 新订单待 KOL 确认 */
  notifyOrderPendingForKol(kolUserId: string, orderId: string, campaignTitle: string, orderNo: string): void {
    void this.createSafe({
      userId: kolUserId,
      type: 'order',
      title: '新合作订单待确认',
      content: `活动「${campaignTitle}」向您发来订单 ${orderNo}，请及时处理。`,
      relatedType: 'order',
      relatedId: orderId,
      actionUrl: `/kol/my-tasks/${orderId}`,
      actionText: '查看订单',
    });
  }

  /** KOL 已接单 */
  notifyOrderAcceptedForAdvertiser(advertiserUserId: string, orderId: string, orderNo: string): void {
    void this.createSafe({
      userId: advertiserUserId,
      type: 'order',
      title: 'KOL 已接受订单',
      content: `订单 ${orderNo} 已被 KOL 接受，合作即将开始。`,
      relatedType: 'order',
      relatedId: orderId,
      actionUrl: `/advertiser/orders/${orderId}`,
      actionText: '查看订单',
    });
  }

  /** KOL 拒绝订单 */
  notifyOrderRejectedForAdvertiser(advertiserUserId: string, orderId: string, orderNo: string, reason?: string): void {
    void this.createSafe({
      userId: advertiserUserId,
      type: 'order',
      title: 'KOL 已拒绝订单',
      content: reason ? `订单 ${orderNo} 已被拒绝。原因：${reason}` : `订单 ${orderNo} 已被 KOL 拒绝，冻结预算已退回。`,
      relatedType: 'order',
      relatedId: orderId,
      actionUrl: `/advertiser/orders/${orderId}`,
      actionText: '查看订单',
    });
  }

  /** KOL 已提交作品 */
  notifyOrderSubmittedForAdvertiser(advertiserUserId: string, orderId: string, orderNo: string): void {
    void this.createSafe({
      userId: advertiserUserId,
      type: 'order',
      title: 'KOL 已提交作品',
      content: `订单 ${orderNo} 已提交草稿/作品链接，请审核。`,
      relatedType: 'order',
      relatedId: orderId,
      actionUrl: `/advertiser/orders/${orderId}`,
      actionText: '去审核',
    });
  }

  /** 订单已完成结算（KOL 侧收入入账后） */
  notifyOrderCompletedForKol(kolUserId: string, orderId: string, orderNo: string, kolEarningYuan: number): void {
    const amt = kolEarningYuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    void this.createSafe({
      userId: kolUserId,
      type: 'payment',
      title: '订单已结算',
      content: `订单 ${orderNo} 已完成，本单预估收入 ¥${amt} 已计入可用余额（以实际到账为准）。`,
      relatedType: 'order',
      relatedId: orderId,
      actionUrl: `/kol/my-tasks/${orderId}`,
      actionText: '查看订单',
    });
  }

  /** 平台处理订单纠纷后通知双方（文案一致，便于对账） */
  notifyDisputeOutcomeForParties(input: {
    advertiserUserId: string | null;
    kolUserId: string | null;
    orderId: string;
    orderNo: string;
    resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'escalate';
    ruling: string;
    refundAmountYuan: number | null;
  }): void {
    const rulingShort =
      input.ruling.length > 400 ? `${input.ruling.slice(0, 400)}…` : input.ruling;
    const resLabel: Record<typeof input.resolution, string> = {
      refund_full: '全额退款，订单已取消',
      refund_partial: '部分退款',
      no_refund: '不予退款，纠纷已结案',
      escalate: '纠纷升级，平台将继续跟进',
    };
    const refundLine =
      input.refundAmountYuan != null && input.refundAmountYuan > 0
        ? ` 退款金额：¥${input.refundAmountYuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}。`
        : '';
    const content = `订单 ${input.orderNo}：${resLabel[input.resolution]}。${refundLine} 裁决说明：${rulingShort}`;
    const payload = {
      type: 'order' as const,
      title: '订单纠纷处理结果',
      content,
      relatedType: 'order',
      relatedId: input.orderId,
    };
    if (input.advertiserUserId) {
      void this.createSafe({
        userId: input.advertiserUserId,
        ...payload,
        actionUrl: `/advertiser/orders/${input.orderId}`,
        actionText: '查看订单',
      });
    }
    if (input.kolUserId) {
      void this.createSafe({
        userId: input.kolUserId,
        ...payload,
        actionUrl: `/kol/my-tasks/${input.orderId}`,
        actionText: '查看订单',
      });
    }
  }

  /** 管理端变更订单状态后通知相关方 */
  notifyAfterAdminOrderStatusChange(input: {
    orderId: string;
    orderNo: string;
    next: OrderStatus;
    reason?: string;
    advertiserUserId: string | null;
    kolUserId: string | null;
  }): void {
    const { orderId, orderNo, next, reason, advertiserUserId, kolUserId } = input;
    const reasonSuffix = reason?.trim() ? `（说明：${reason.trim()}）` : '';

    const toKol = (title: string, content: string) => {
      if (!kolUserId) return;
      void this.createSafe({
        userId: kolUserId,
        type: 'order',
        title,
        content,
        relatedType: 'order',
        relatedId: orderId,
        actionUrl: `/kol/my-tasks/${orderId}`,
        actionText: '查看订单',
      });
    };

    const toAdv = (title: string, content: string) => {
      if (!advertiserUserId) return;
      void this.createSafe({
        userId: advertiserUserId,
        type: 'order',
        title,
        content,
        relatedType: 'order',
        relatedId: orderId,
        actionUrl: `/advertiser/orders/${orderId}`,
        actionText: '查看订单',
      });
    };

    switch (next) {
      case 'approved':
        toKol('作品已通过审核', `订单 ${orderNo} 的提交内容已通过审核，请按约定发布。${reasonSuffix}`);
        break;
      case 'revision':
        toKol('作品需修改', `订单 ${orderNo} 需要修改后再提交。${reasonSuffix}`);
        break;
      case 'published':
        toAdv('作品已标记发布', `订单 ${orderNo} 已标记为已发布，请关注后续数据与结算。${reasonSuffix}`);
        break;
      case 'cancelled':
        toKol('订单已取消', `订单 ${orderNo} 已被平台取消。${reasonSuffix}`);
        toAdv('订单已取消', `订单 ${orderNo} 已被平台取消。${reasonSuffix}`);
        break;
      case 'completed':
        toKol('订单已完成', `订单 ${orderNo} 已被标记为已完成。${reasonSuffix}`);
        toAdv('订单已完成', `订单 ${orderNo} 已被标记为已完成。${reasonSuffix}`);
        break;
      case 'in_progress':
        toKol('订单状态更新', `订单 ${orderNo} 状态已更新为「进行中」。${reasonSuffix}`);
        break;
      default:
        break;
    }
  }

  /** 活动审核通过 / 驳回 */
  notifyCampaignReviewForAdvertiser(
    advertiserUserId: string,
    campaignId: string,
    campaignTitle: string,
    approved: boolean,
    note?: string
  ): void {
    const noteLine = note?.trim() ? ` ${note.trim()}` : '';
    void this.createSafe({
      userId: advertiserUserId,
      type: 'campaign',
      title: approved ? '活动审核通过' : '活动审核未通过',
      content: approved
        ? `活动「${campaignTitle}」已通过审核，可以开始投放与下单。`
        : `活动「${campaignTitle}」未通过审核。${noteLine}`,
      relatedType: 'campaign',
      relatedId: campaignId,
      actionUrl: `/advertiser/campaigns/${campaignId}`,
      actionText: '查看活动',
    });
  }
}

export const notificationService = new NotificationService();
