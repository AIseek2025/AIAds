import { Request, Response } from 'express';
import { adminContentService } from '../../services/admin/content.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const approveContentSchema = z.object({
  note: z.string().optional(),
});

const rejectContentSchema = z.object({
  reason: z.string().min(1, '需要填写拒绝原因'),
  requireRevision: z.boolean().optional(),
  revisionNote: z.string().optional(),
});

const deleteContentSchema = z.object({
  reason: z.string().min(1, '需要填写删除原因'),
  notifyUser: z.boolean().optional(),
  banUser: z.boolean().optional(),
});

const batchVerifySchema = z.object({
  contentIds: z.array(z.string().uuid()).min(1, '至少需要一个内容 ID'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  note: z.string().optional(),
});

export class AdminContentController {
  /**
   * GET /api/v1/admin/content/pending
   * Get pending content for review
   */
  getPendingContent = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, content_type, source_type, priority } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      contentType: content_type as string,
      sourceType: source_type as string,
      priority: priority as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminContentService.getPendingContent(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/content/history
   * Get content review history
   */
  getReviewHistory = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, content_type, reviewed_after, reviewed_before } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      status: status as string,
      contentType: content_type as string,
      reviewedAfter: reviewed_after as string,
      reviewedBefore: reviewed_before as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminContentService.getReviewHistory(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/content
   * Get content list with filters
   */
  getContentList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, content_type, source_type, priority, status, sort, order } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      contentType: content_type as string,
      sourceType: source_type as string,
      priority: priority as string,
      status: status as string,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminContentService.getContentList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/content/:id
   * Get content by ID
   */
  getContentById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminContentService.getContentById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/content/:id/verify
   * Verify content (admin review)
   */
  verifyContent = asyncHandler(async (req: Request, res: Response) => {
    const verifySchema = z.object({
      action: z.enum(['approve', 'reject']),
      reason: z.string().optional(),
      note: z.string().optional(),
      requireRevision: z.boolean().optional(),
      revisionNote: z.string().optional(),
    });

    if (!parseBodyOrRespond(verifySchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminContentService.verifyContent(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: req.body.action === 'approve' ? '内容审核通过' : '内容审核拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/content/:id/approve
   * Approve content
   */
  approveContent = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(approveContentSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminContentService.approveContent(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '内容审核通过',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/content/:id/reject
   * Reject content
   */
  rejectContent = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(rejectContentSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminContentService.rejectContent(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '内容审核拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/content/batch-verify
   * Batch verify content
   */
  batchVerify = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(batchVerifySchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminContentService.batchVerify(
      req.body.contentIds,
      req.body.action,
      req.body.reason,
      req.body.note,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `批量审核完成，成功 ${result.successCount} 个，失败 ${result.failedCount} 个`,
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/admin/content/:id
   * Delete content
   */
  deleteContent = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(deleteContentSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminContentService.deleteContent(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '内容已删除',
    };

    res.status(200).json(response);
  });
}

export const adminContentController = new AdminContentController();
