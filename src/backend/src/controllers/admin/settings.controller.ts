import { Request, Response } from 'express';
import { adminSettingsService } from '../../services/admin/settings.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const updateSystemConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

const createAdminSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位'),
  name: z.string().min(1, '需要填写姓名'),
  roleId: z.string().uuid('角色 ID 格式不正确'),
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  avatarUrl: z.string().url().optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1, '需要填写角色名称'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const updateSensitiveWordSchema = z.object({
  word: z.string().min(1, '需要填写敏感词'),
  type: z.enum(['keyword', 'phrase', 'regex']),
  severity: z.enum(['low', 'medium', 'high']),
  action: z.enum(['block', 'review', 'ignore']).default('block'),
});

export class AdminSettingsController {
  /**
   * GET /api/v1/admin/settings/system
   * Get system configuration
   */
  getSystemConfig = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req).id;

    const result = await adminSettingsService.getSystemConfig(adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/settings/system
   * Update system configuration
   */
  updateSystemConfig = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateSystemConfigSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.updateSystemConfig(req.body.key, req.body.value, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '系统配置已更新',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/admins
   * Get admin list
   */
  getAdminList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, role } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      status: status as string,
      role: role as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminSettingsService.getAdminList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/settings/admins
   * Create new admin
   */
  createAdmin = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(createAdminSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.createAdmin(req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '管理员创建成功',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/admin/settings/admins/:id
   * Get admin by ID
   */
  getAdminById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminSettingsService.getAdminById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/settings/admins/:id
   * Update admin
   */
  updateAdmin = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateAdminSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.updateAdmin(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '管理员信息已更新',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/admin/settings/admins/:id
   * Delete admin
   */
  deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.deleteAdmin(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '管理员已删除',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/roles
   * Get role list
   */
  getRoleList = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req).id;

    const result = await adminSettingsService.getRoleList(adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/settings/roles
   * Create new role
   */
  createRole = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(createRoleSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.createRole(req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '角色创建成功',
    };

    res.status(201).json(response);
  });

  /**
   * PUT /api/v1/admin/settings/roles/:id
   * Update role
   */
  updateRole = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateRoleSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.updateRole(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '角色信息已更新',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/admin/settings/roles/:id
   * Delete role
   */
  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.deleteRole(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '角色已删除',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/audit-logs
   * Get audit logs
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, admin_id, action, resource_type, status, created_after, created_before, ip_address } =
      req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      adminId: admin_id as string,
      action: action as string,
      resourceType: resource_type as string,
      status: status as string,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      ipAddress: ip_address as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminSettingsService.getAuditLogs(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/audit-logs/export
   * Export audit logs
   */
  exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { admin_id, action, resource_type, status, created_after, created_before, format = 'csv' } = req.query;

    const filters = {
      adminId: admin_id as string,
      action: action as string,
      resourceType: resource_type as string,
      status: status as string,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      format: format as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminSettingsService.exportAuditLogs(filters, adminId);

    // Set download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`
    );

    const response: ApiResponse<string> = {
      success: true,
      data: result.csvData,
    };

    res.status(200).send(response.data);
  });

  /**
   * GET /api/v1/admin/settings/system-monitor
   * Get system monitoring data
   */
  getSystemMonitor = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req).id;

    const result = await adminSettingsService.getSystemMonitor(adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/sensitive-words
   * Get sensitive words list
   */
  getSensitiveWords = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type, severity } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      type: type as string,
      severity: severity as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminSettingsService.getSensitiveWords(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/settings/sensitive-words
   * Add sensitive word
   */
  addSensitiveWord = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateSensitiveWordSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.addSensitiveWord(req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '敏感词已添加',
    };

    res.status(201).json(response);
  });

  /**
   * DELETE /api/v1/admin/settings/sensitive-words/:id
   * Delete sensitive word
   */
  deleteSensitiveWord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.deleteSensitiveWord(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '敏感词已删除',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/settings/backup/create
   * Create system backup
   */
  createBackup = asyncHandler(async (req: Request, res: Response) => {
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.createBackup(adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '备份创建成功',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/settings/backup/list
   * Get backup list
   */
  getBackupList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminSettingsService.getBackupList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/settings/backup/restore
   * Restore from backup
   */
  restoreBackup = asyncHandler(async (req: Request, res: Response) => {
    const backupSchema = z.object({
      backupId: z.string().uuid(),
      confirm: z.boolean().refine((val) => val === true, '必须确认恢复操作'),
    });

    if (!parseBodyOrRespond(backupSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminSettingsService.restoreBackup(req.body.backupId, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '系统正在恢复，请稍候',
    };

    res.status(200).json(response);
  });
}

export const adminSettingsController = new AdminSettingsController();
