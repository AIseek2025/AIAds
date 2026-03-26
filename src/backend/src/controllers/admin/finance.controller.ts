import { Request, Response } from 'express';
import { adminFinanceService } from '../../services/admin/finance.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const approveWithdrawalSchema = z.object({
  note: z.string().optional(),
  mfaCode: z.string().length(6, 'MFA 验证码为 6 位数字').optional(),
});

const rejectWithdrawalSchema = z.object({
  reason: z.string().min(1, '需要填写拒绝原因'),
  note: z.string().optional(),
});

const exportFinanceSchema = z.object({
  type: z.enum(['transactions', 'withdrawals', 'deposits', 'all']),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['csv', 'xlsx', 'pdf']).optional(),
});

export class AdminFinanceController {
  /**
   * GET /api/v1/admin/finance/overview
   * Get finance overview
   */
  getFinanceOverview = asyncHandler(async (req: Request, res: Response) => {
    const { period = 'month' } = req.query;
    const adminId = req.admin?.id!;

    const result = await adminFinanceService.getFinanceOverview(period as string, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/deposits
   * Get deposit records
   */
  getDeposits = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      status,
      payment_method,
      user_id,
      min_amount,
      max_amount,
      created_after,
      created_before,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      status: status as string,
      paymentMethod: payment_method as string,
      userId: user_id as string,
      minAmount: min_amount ? parseFloat(min_amount as string) : undefined,
      maxAmount: max_amount ? parseFloat(max_amount as string) : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = req.admin?.id!;
    const result = await adminFinanceService.getDeposits(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/withdrawals
   * Get withdrawal records
   */
  getWithdrawals = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      status,
      payment_method,
      kol_id,
      min_amount,
      max_amount,
      created_after,
      created_before,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      status: status as string,
      paymentMethod: payment_method as string,
      kolId: kol_id as string,
      minAmount: min_amount ? parseFloat(min_amount as string) : undefined,
      maxAmount: max_amount ? parseFloat(max_amount as string) : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = req.admin?.id!;
    const result = await adminFinanceService.getWithdrawals(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/withdrawals/pending
   * Get pending withdrawals
   */
  getPendingWithdrawals = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, min_amount, max_amount } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      minAmount: min_amount ? parseFloat(min_amount as string) : undefined,
      maxAmount: max_amount ? parseFloat(max_amount as string) : undefined,
    };

    const adminId = req.admin?.id!;
    const result = await adminFinanceService.getPendingWithdrawals(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/withdrawals/:id
   * Get withdrawal by ID
   */
  getWithdrawalById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.admin?.id!;

    const result = await adminFinanceService.getWithdrawalById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/finance/withdrawals/:id/verify
   * Verify withdrawal (approve/reject)
   */
  verifyWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const verifySchema = z.object({
      action: z.enum(['approve', 'reject']),
      reason: z.string().optional(),
      note: z.string().optional(),
      mfaCode: z.string().length(6).optional(),
    });

    validateBody(verifySchema)(req, res, () => {});

    const { id } = req.params;
    const adminId = req.admin?.id!;
    const adminEmail = req.admin?.email!;

    const result = await adminFinanceService.verifyWithdrawal(
      id.toString(),
      req.body.action,
      req.body.reason,
      req.body.note,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: req.body.action === 'approve' ? '提现申请已批准' : '提现申请已拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/finance/withdrawals/:id/approve
   * Approve withdrawal
   */
  approveWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    validateBody(approveWithdrawalSchema)(req, res, () => {});

    const { id } = req.params;
    const adminId = req.admin?.id!;
    const adminEmail = req.admin?.email!;

    const result = await adminFinanceService.approveWithdrawal(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '提现申请已批准',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/finance/withdrawals/:id/reject
   * Reject withdrawal
   */
  rejectWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    validateBody(rejectWithdrawalSchema)(req, res, () => {});

    const { id } = req.params;
    const adminId = req.admin?.id!;
    const adminEmail = req.admin?.email!;

    const result = await adminFinanceService.rejectWithdrawal(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '提现申请已拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/transactions
   * Get transaction list with filters
   */
  getTransactionList = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      type,
      status,
      payment_method,
      user_id,
      min_amount,
      max_amount,
      created_after,
      created_before,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      type: type as string,
      status: status as string,
      paymentMethod: payment_method as string,
      userId: user_id as string,
      minAmount: min_amount ? parseFloat(min_amount as string) : undefined,
      maxAmount: max_amount ? parseFloat(max_amount as string) : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = req.admin?.id!;
    const result = await adminFinanceService.getTransactionList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/finance/export
   * Export finance report
   */
  exportFinance = asyncHandler(async (req: Request, res: Response) => {
    validateBody(exportFinanceSchema)(req, res, () => {});

    const adminId = req.admin?.id!;
    const result = await adminFinanceService.exportFinance(req.body, adminId);

    // Set download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="finance_report_${req.body.type}_${req.body.startDate}_${req.body.endDate}.csv"`
    );

    const response: ApiResponse<string> = {
      success: true,
      data: result.csvData,
    };

    res.status(200).send(response.data);
  });

  /**
   * POST /api/v1/admin/finance/recharge/confirm
   * Confirm recharge
   */
  confirmRecharge = asyncHandler(async (req: Request, res: Response) => {
    const confirmSchema = z.object({
      transactionId: z.string().uuid(),
      note: z.string().optional(),
    });

    validateBody(confirmSchema)(req, res, () => {});

    const adminId = req.admin?.id!;
    const adminEmail = req.admin?.email!;

    const result = await adminFinanceService.confirmRecharge(
      req.body.transactionId,
      req.body.note,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '充值已确认',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/finance/balance/adjust
   * Adjust user balance (super admin only)
   */
  adjustBalance = asyncHandler(async (req: Request, res: Response) => {
    const adjustSchema = z.object({
      userId: z.string().uuid(),
      amount: z.number(),
      reason: z.string().min(1, '需要填写原因'),
      type: z.enum(['add', 'subtract']),
      note: z.string().optional(),
    });

    validateBody(adjustSchema)(req, res, () => {});

    const adminId = req.admin?.id!;
    const adminEmail = req.admin?.email!;

    const result = await adminFinanceService.adjustBalance(
      req.body.userId,
      req.body.amount,
      req.body.type,
      req.body.reason,
      req.body.note,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '余额已调整',
    };

    res.status(200).json(response);
  });
}

export const adminFinanceController = new AdminFinanceController();
