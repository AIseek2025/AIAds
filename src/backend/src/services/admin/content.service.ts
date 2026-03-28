import { Prisma, type ContentModeration } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import type { PaginationResponse } from '../../types';

// Content list filters
export interface ContentListFilters {
  page?: number;
  limit?: number;
  contentType?: string;
  sourceType?: string;
  priority?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Approve content request
export interface ApproveContentRequest {
  note?: string;
}

// Reject content request
export interface RejectContentRequest {
  reason: string;
  requireRevision?: boolean;
  revisionNote?: string;
}

// Content response type
export interface ContentResponse {
  id: string;
  contentType: string;
  sourceType: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  contentUrl: string;
  duration?: number;
  submitter: {
    id: string;
    name: string;
    platform?: string;
  };
  relatedOrderId?: string;
  relatedOrder?: {
    id: string;
    orderNo: string;
    campaignTitle?: string;
  } | null;
  priority: string;
  status: string;
  aiScore?: number;
  aiFlags: string[];
  reviewNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** 待审 / 列表分页结构（与全局 PaginationResponse 一致） */
export type ContentPaginatedList = PaginationResponse<ContentResponse>;

export interface ContentReviewHistoryResult {
  items: ContentModeration[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApproveContentResult {
  id: string;
  status: string;
  reviewedAt: Date | null;
  reviewedBy: string;
}

export interface RejectContentResult {
  id: string;
  status: string;
  rejectedAt: Date;
  rejectedBy: string;
  rejectionReason: string;
  requireRevision?: boolean;
  revisionNote?: string;
}

export type BatchVerifyResultItem =
  | {
      contentId: string;
      success: true;
      action: 'approve' | 'reject';
      result: ApproveContentResult | RejectContentResult;
    }
  | { contentId: string; success: false; error: string };

export interface BatchVerifyResult {
  total: number;
  successCount: number;
  failedCount: number;
  results: BatchVerifyResultItem[];
}

export class AdminContentService {
  /**
   * Get pending content for review
   */
  async getPendingContent(
    filters: {
      page?: number;
      limit?: number;
      contentType?: string;
      sourceType?: string;
      priority?: string;
    },
    adminId: string
  ): Promise<ContentPaginatedList> {
    const { page = 1, limit = 20, contentType, sourceType, priority } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ContentModerationWhereInput = {
      status: 'pending',
    };

    if (contentType) {
      where.contentType = contentType;
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (priority) {
      where.priority = priority;
    }

    const [total, contents] = await Promise.all([
      prisma.contentModeration.count({ where }),
      prisma.contentModeration.findMany({
        where,
        skip,
        take,
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'content',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/content/pending',
      status: 'success',
    });

    return {
      items: contents.map((content) => this.formatContentResponse(content)),
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
   * Get content list with filters
   */
  async getContentList(filters: ContentListFilters, _adminId: string): Promise<ContentPaginatedList> {
    const {
      page = 1,
      limit = 20,
      contentType,
      sourceType,
      priority,
      status,
      sort = 'submittedAt',
      order = 'desc',
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ContentModerationWhereInput = {};

    if (contentType) {
      where.contentType = contentType;
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    const [total, contents] = await Promise.all([
      prisma.contentModeration.count({ where }),
      prisma.contentModeration.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order } as Prisma.ContentModerationOrderByWithRelationInput,
      }),
    ]);

    return {
      items: contents.map((content) => this.formatContentResponse(content)),
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
   * Get content by ID
   */
  async getContentById(contentId: string, adminId: string): Promise<ContentResponse> {
    const content = await prisma.contentModeration.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new ApiError('内容不存在', 404, 'CONTENT_NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'content',
      resourceId: contentId,
      resourceName: content.title,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/content/${contentId}`,
      status: 'success',
    });

    return this.formatContentResponse(content);
  }

  /**
   * Approve content
   */
  async approveContent(
    contentId: string,
    data: ApproveContentRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ApproveContentResult> {
    const content = await prisma.contentModeration.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new ApiError('内容不存在', 404, 'CONTENT_NOT_FOUND');
    }

    if (content.status === 'approved') {
      throw new ApiError('内容已审核通过', 400, 'CONTENT_ALREADY_APPROVED');
    }

    // Update content status
    const updatedContent = await prisma.contentModeration.update({
      where: { id: contentId },
      data: {
        status: 'approved',
        reviewNotes: data.note,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'approve',
      resourceType: 'content',
      resourceId: contentId,
      resourceName: content.title,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/content/${contentId}/approve`,
      requestBody: data,
      newValues: { status: 'approved' },
      status: 'success',
    });

    logger.info('Content approved', { contentId, adminId });

    return {
      id: updatedContent.id,
      status: updatedContent.status,
      reviewedAt: updatedContent.reviewedAt,
      reviewedBy: adminId,
    };
  }

  /**
   * Reject content
   */
  async rejectContent(
    contentId: string,
    data: RejectContentRequest,
    adminId: string,
    adminEmail: string
  ): Promise<RejectContentResult> {
    const content = await prisma.contentModeration.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new ApiError('内容不存在', 404, 'CONTENT_NOT_FOUND');
    }

    if (content.status === 'rejected') {
      throw new ApiError('内容已被拒绝', 400, 'CONTENT_ALREADY_REJECTED');
    }

    // Update content status
    const updatedContent = await prisma.contentModeration.update({
      where: { id: contentId },
      data: {
        status: 'rejected',
        rejectionReason: data.reason,
        reviewNotes: data.revisionNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'reject',
      resourceType: 'content',
      resourceId: contentId,
      resourceName: content.title,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/content/${contentId}/reject`,
      requestBody: data,
      newValues: { status: 'rejected', rejectionReason: data.reason },
      status: 'success',
    });

    logger.info('Content rejected', { contentId, adminId, reason: data.reason });

    return {
      id: updatedContent.id,
      status: updatedContent.status,
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason: data.reason,
      requireRevision: data.requireRevision,
      revisionNote: data.revisionNote,
    };
  }

  /**
   * Delete content
   */
  async deleteContent(
    contentId: string,
    data: { reason: string; notifyUser?: boolean; banUser?: boolean },
    adminId: string,
    adminEmail: string
  ): Promise<{ id: string; deleted: boolean }> {
    const content = await prisma.contentModeration.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new ApiError('内容不存在', 404, 'CONTENT_NOT_FOUND');
    }

    // Delete content
    await prisma.contentModeration.delete({
      where: { id: contentId },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'delete',
      resourceType: 'content',
      resourceId: contentId,
      resourceName: content.title,
      requestMethod: 'DELETE',
      requestPath: `/api/v1/admin/content/${contentId}`,
      requestBody: data,
      status: 'success',
    });

    logger.info('Content deleted', { contentId, adminId, reason: data.reason });

    return {
      id: contentId,
      deleted: true,
    };
  }

  /**
   * Format content response
   */
  private formatContentResponse(content: ContentModeration): ContentResponse {
    return {
      id: content.id,
      contentType: content.contentType,
      sourceType: content.sourceType,
      title: content.title,
      description: content.description ?? undefined,
      thumbnailUrl: content.thumbnailUrl ?? undefined,
      contentUrl: content.contentUrl,
      duration: content.duration ?? undefined,
      submitter: {
        id: content.submitterId,
        name: content.submitterName,
        platform: undefined,
      },
      relatedOrderId: content.relatedOrderId ?? undefined,
      relatedOrder: content.relatedOrderId
        ? {
            id: content.relatedOrderId,
            orderNo: '',
            campaignTitle: undefined,
          }
        : null,
      priority: content.priority,
      status: content.status,
      aiScore: content.aiScore ?? undefined,
      aiFlags: content.aiFlags,
      reviewNotes: content.reviewNotes ?? undefined,
      rejectionReason: content.rejectionReason ?? undefined,
      reviewedBy: content.reviewedBy ?? undefined,
      reviewedAt: content.reviewedAt ?? undefined,
      submittedAt: content.submittedAt,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  /**
   * Get review history
   */
  async getReviewHistory(
    filters: { page?: number; limit?: number; status?: string },
    _adminId: string
  ): Promise<ContentReviewHistoryResult> {
    const { page = 1, limit = 20, status } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ContentModerationWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      prisma.contentModeration.count({ where }),
      prisma.contentModeration.findMany({
        where,
        skip,
        take,
        orderBy: { reviewedAt: 'desc' },
      }),
    ]);

    return {
      items,
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
   * Verify content (alias for approve)
   */
  async verifyContent(
    contentId: string,
    data: ApproveContentRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ApproveContentResult> {
    return this.approveContent(contentId, data, adminId, adminEmail);
  }

  /**
   * Batch verify content
   */
  async batchVerify(
    contentIds: string[],
    action: 'approve' | 'reject',
    reason?: string,
    note?: string,
    adminId?: string,
    adminEmail?: string
  ): Promise<BatchVerifyResult> {
    const results: BatchVerifyResultItem[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const contentId of contentIds) {
      try {
        if (action === 'approve') {
          const result = await this.approveContent(contentId, { note }, adminId || 'system', adminEmail || 'system');
          results.push({ contentId, success: true, action: 'approve', result });
          successCount++;
        } else {
          const result = await this.rejectContent(
            contentId,
            { reason: reason || '批量拒绝' },
            adminId || 'system',
            adminEmail || 'system'
          );
          results.push({ contentId, success: true, action: 'reject', result });
          successCount++;
        }
      } catch (error) {
        results.push({ contentId, success: false, error: (error as Error).message });
        failedCount++;
      }
    }

    return {
      total: contentIds.length,
      successCount,
      failedCount,
      results,
    };
  }
}

export const adminContentService = new AdminContentService();
