import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { hashPassword } from '../../utils/crypto';

// Admin list filters
export interface AdminListFilters {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
}

// Audit log filters
export interface AuditLogFilters {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  resourceType?: string;
  status?: string;
  createdAfter?: string;
  createdBefore?: string;
  ipAddress?: string;
  format?: string;
}

// Create admin request
export interface CreateAdminRequest {
  email: string;
  password: string;
  name: string;
  roleId: string;
}

// Update admin request
export interface UpdateAdminRequest {
  name?: string;
  email?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  avatarUrl?: string;
}

// Create role request
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

// Update role request
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// Sensitive word request
export interface SensitiveWordRequest {
  word: string;
  type: 'keyword' | 'phrase' | 'regex';
  severity: 'low' | 'medium' | 'high';
  action: 'block' | 'review' | 'ignore';
}

// System config response
export interface SystemConfig {
  [key: string]: any;
}

export class AdminSettingsService {
  /**
   * Get system configuration
   */
  async getSystemConfig(adminId: string): Promise<SystemConfig> {
    // In production, load from database or config service
    const config: SystemConfig = {
      siteName: 'AIAds Platform',
      siteUrl: 'https://aiads.com',
      emailFrom: 'noreply@aiads.com',
      maxUploadSize: 10485760, // 10MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
      kolVerificationRequired: true,
      minWithdrawalAmount: 100,
      maxWithdrawalAmount: 100000,
      withdrawalFeePercent: 1,
      platformCommissionPercent: 10,
    };

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'system_config',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/settings/system',
      status: 'success',
    });

    return config;
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(
    key: string,
    value: any,
    adminId: string,
    adminEmail: string
  ): Promise<{ key: string; value: any }> {
    // In production, save to database
    logger.info('System config updated', { key, adminId, adminEmail });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'update',
      resourceType: 'system_config',
      resourceId: key,
      requestMethod: 'PUT',
      requestPath: '/api/v1/admin/settings/system',
      newValues: { [key]: value },
      status: 'success',
    });

    return { key, value };
  }

  /**
   * Get admin list
   */
  async getAdminList(filters: AdminListFilters, adminId: string) {
    const {
      page = 1,
      limit = 20,
      status,
      role,
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (role) {
      where.roleId = role;
    }

    // Get total count
    const total = await prisma.admin.count({ where });

    // Get admins
    const admins = await prisma.admin.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'admin',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/settings/admins',
      status: 'success',
    });

    return {
      items: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        avatarUrl: admin.avatarUrl,
        status: admin.status,
        role: {
          id: admin.adminRole.id,
          name: admin.adminRole.name,
        },
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      })),
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
   * Create new admin
   */
  async createAdmin(
    data: CreateAdminRequest,
    adminId: string,
    adminEmail: string
  ) {
    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new ApiError('邮箱已被使用', 409, 'EMAIL_EXISTS');
    }

    // Check if role exists
    const role = await prisma.adminRole.findUnique({
      where: { id: data.roleId },
    });

    if (!role) {
      throw new ApiError('角色不存在', 404, 'ROLE_NOT_FOUND');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create admin
    const newAdmin = await prisma.admin.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        roleId: data.roleId,
        status: 'active',
      },
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'create',
      resourceType: 'admin',
      resourceId: newAdmin.id,
      resourceName: newAdmin.email,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/settings/admins',
      newValues: { email: newAdmin.email, name: newAdmin.name, roleId: newAdmin.roleId },
      status: 'success',
    });

    logger.info('Admin created', { adminId: newAdmin.id, byAdminId: adminId });

    return {
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      role: {
        id: newAdmin.adminRole.id,
        name: newAdmin.adminRole.name,
      },
    };
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string, currentAdminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId: currentAdminId,
      action: 'view',
      resourceType: 'admin',
      resourceId: adminId,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/settings/admins/${adminId}`,
      status: 'success',
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      avatarUrl: admin.avatarUrl,
      status: admin.status,
      mfaEnabled: admin.mfaEnabled,
      role: {
        id: admin.adminRole.id,
        name: admin.adminRole.name,
        description: admin.adminRole.description,
        permissions: admin.adminRole.permissions,
      },
      lastLoginAt: admin.lastLoginAt,
      lastLoginIp: admin.lastLoginIp,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  /**
   * Update admin
   */
  async updateAdmin(
    adminId: string,
    data: UpdateAdminRequest,
    currentAdminId: string,
    currentAdminEmail: string
  ) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== admin.email) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: data.email },
      });

      if (existingAdmin) {
        throw new ApiError('邮箱已被使用', 409, 'EMAIL_EXISTS');
      }
    }

    // Check role if changing role
    if (data.roleId) {
      const role = await prisma.adminRole.findUnique({
        where: { id: data.roleId },
      });

      if (!role) {
        throw new ApiError('角色不存在', 404, 'ROLE_NOT_FOUND');
      }
    }

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data,
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: currentAdminId,
      adminEmail: currentAdminEmail,
      action: 'update',
      resourceType: 'admin',
      resourceId: adminId,
      resourceName: admin.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/settings/admins/${adminId}`,
      newValues: data,
      status: 'success',
    });

    logger.info('Admin updated', { adminId, byAdminId: currentAdminId });

    return {
      id: updatedAdmin.id,
      email: updatedAdmin.email,
      name: updatedAdmin.name,
      role: {
        id: updatedAdmin.adminRole.id,
        name: updatedAdmin.adminRole.name,
      },
    };
  }

  /**
   * Delete admin
   */
  async deleteAdmin(adminId: string, currentAdminId: string, currentAdminEmail: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Prevent deleting self
    if (adminId === currentAdminId) {
      throw new ApiError('不能删除自己的账号', 400, 'CANNOT_DELETE_SELF');
    }

    // Soft delete
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: currentAdminId,
      adminEmail: currentAdminEmail,
      action: 'delete',
      resourceType: 'admin',
      resourceId: adminId,
      resourceName: admin.email,
      requestMethod: 'DELETE',
      requestPath: `/api/v1/admin/settings/admins/${adminId}`,
      status: 'success',
    });

    logger.info('Admin deleted', { adminId, byAdminId: currentAdminId });

    return {
      id: adminId,
      deletedAt: new Date(),
    };
  }

  /**
   * Get role list
   */
  async getRoleList(adminId: string) {
    const roles = await prisma.adminRole.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'role',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/settings/roles',
      status: 'success',
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    }));
  }

  /**
   * Create role
   */
  async createRole(
    data: CreateRoleRequest,
    adminId: string,
    adminEmail: string
  ) {
    // Check if role name already exists
    const existingRole = await prisma.adminRole.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new ApiError('角色名称已存在', 409, 'ROLE_EXISTS');
    }

    // Create role
    const newRole = await prisma.adminRole.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: JSON.stringify(data.permissions),
        isSystem: false,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'create',
      resourceType: 'role',
      resourceId: newRole.id,
      resourceName: newRole.name,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/settings/roles',
      newValues: data,
      status: 'success',
    });

    logger.info('Role created', { roleId: newRole.id, byAdminId: adminId });

    return {
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
    };
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    data: UpdateRoleRequest,
    adminId: string,
    adminEmail: string
  ) {
    const role = await prisma.adminRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new ApiError('角色不存在', 404, 'ROLE_NOT_FOUND');
    }

    // Prevent modifying system roles
    if (role.isSystem) {
      throw new ApiError('系统角色不可修改', 400, 'CANNOT_MODIFY_SYSTEM_ROLE');
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== role.name) {
      const existingRole = await prisma.adminRole.findUnique({
        where: { name: data.name },
      });

      if (existingRole) {
        throw new ApiError('角色名称已存在', 409, 'ROLE_EXISTS');
      }
    }

    // Update role
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);

    const updatedRole = await prisma.adminRole.update({
      where: { id: roleId },
      data: updateData,
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'update',
      resourceType: 'role',
      resourceId: roleId,
      resourceName: role.name,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/settings/roles/${roleId}`,
      newValues: data,
      status: 'success',
    });

    logger.info('Role updated', { roleId, byAdminId: adminId });

    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      permissions: updatedRole.permissions,
    };
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string, adminId: string, adminEmail: string) {
    const role = await prisma.adminRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new ApiError('角色不存在', 404, 'ROLE_NOT_FOUND');
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      throw new ApiError('系统角色不可删除', 400, 'CANNOT_DELETE_SYSTEM_ROLE');
    }

    // Check if role is in use
    const adminCount = await prisma.admin.count({
      where: { roleId, deletedAt: null },
    });

    if (adminCount > 0) {
      throw new ApiError('角色正在使用中，无法删除', 400, 'ROLE_IN_USE');
    }

    // Soft delete
    await prisma.adminRole.update({
      where: { id: roleId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'delete',
      resourceType: 'role',
      resourceId: roleId,
      resourceName: role.name,
      requestMethod: 'DELETE',
      requestPath: `/api/v1/admin/settings/roles/${roleId}`,
      status: 'success',
    });

    logger.info('Role deleted', { roleId, byAdminId: adminId });

    return {
      id: roleId,
      deletedAt: new Date(),
    };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: AuditLogFilters, _adminId: string) {
    const {
      page = 1,
      limit = 20,
      adminId: filterAdminId,
      action,
      resourceType,
      status,
      createdAfter,
      createdBefore,
      ipAddress,
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {};

    if (filterAdminId) {
      where.adminId = filterAdminId;
    }

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (status) {
      where.status = status;
    }

    if (ipAddress) {
      where.ipAddress = ipAddress;
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

    // Get total count
    const total = await prisma.adminAuditLog.count({ where });

    // Get logs
    const logs = await prisma.adminAuditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        adminId: true,
        adminEmail: true,
        adminName: true,
        action: true,
        resourceType: true,
        resourceId: true,
        resourceName: true,
        requestMethod: true,
        requestPath: true,
        ipAddress: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      items: logs,
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
   * Export audit logs
   */
  async exportAuditLogs(filters: AuditLogFilters, adminId: string) {
    const logs = await this.getAuditLogs(filters, adminId);

    // Generate CSV
    const headers = [
      'ID',
      'Admin Email',
      'Admin Name',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Method',
      'Path',
      'IP Address',
      'Status',
      'Created At',
    ];

    const rows = logs.items.map((log: any) => [
      log.id,
      log.adminEmail,
      log.adminName,
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.resourceName || '',
      log.requestMethod,
      log.requestPath,
      log.ipAddress || '',
      log.status,
      log.createdAt.toISOString(),
    ]);

    const csvData = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'export',
      resourceType: 'audit_logs',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/settings/audit-logs/export',
      status: 'success',
    });

    return {
      csvData,
      total: logs.pagination.total,
    };
  }

  /**
   * Get system monitor data
   */
  async getSystemMonitor(adminId: string) {
    // In production, get real metrics from monitoring service
    const monitor = {
      cpu: {
        usage: 45.2,
        cores: 8,
      },
      memory: {
        used: 4096,
        total: 16384,
        usage: 25.0,
      },
      disk: {
        used: 102400,
        total: 512000,
        usage: 20.0,
      },
      database: {
        connections: 25,
        maxConnections: 100,
        queriesPerSecond: 150,
      },
      cache: {
        hitRate: 95.5,
        memoryUsed: 512,
        keys: 10000,
      },
      queue: {
        pending: 5,
        processing: 2,
        failed: 0,
      },
    };

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'system_monitor',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/settings/system-monitor',
      status: 'success',
    });

    return monitor;
  }

  /**
   * Get sensitive words
   */
  async getSensitiveWords(filters: any, _adminId: string) {
    // In production, load from database
    const { page = 1, limit = 20 } = filters;

    const sensitiveWords = [
      { id: '1', word: 'spam', type: 'keyword', severity: 'low', action: 'block' },
      { id: '2', word: 'fake', type: 'keyword', severity: 'medium', action: 'review' },
    ];

    return {
      items: sensitiveWords,
      pagination: {
        page,
        page_size: limit,
        total: sensitiveWords.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
  }

  /**
   * Add sensitive word
   */
  async addSensitiveWord(
    data: SensitiveWordRequest,
    adminId: string,
    adminEmail: string
  ) {
    // In production, save to database
    const newWord = {
      id: Date.now().toString(),
      ...data,
    };

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'create',
      resourceType: 'sensitive_word',
      resourceId: newWord.id,
      resourceName: data.word,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/settings/sensitive-words',
      newValues: data,
      status: 'success',
    });

    logger.info('Sensitive word added', { word: data.word, adminId });

    return newWord;
  }

  /**
   * Delete sensitive word
   */
  async deleteSensitiveWord(wordId: string, adminId: string, adminEmail: string) {
    // In production, delete from database

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'delete',
      resourceType: 'sensitive_word',
      resourceId: wordId,
      requestMethod: 'DELETE',
      requestPath: `/api/v1/admin/settings/sensitive-words/${wordId}`,
      status: 'success',
    });

    logger.info('Sensitive word deleted', { wordId, adminId });

    return {
      id: wordId,
      deletedAt: new Date(),
    };
  }

  /**
   * Create backup
   */
  async createBackup(adminId: string, adminEmail: string) {
    // In production, create actual database backup
    const backup = {
      id: Date.now().toString(),
      createdAt: new Date(),
      size: 1024000,
      status: 'completed',
    };

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'create',
      resourceType: 'backup',
      resourceId: backup.id,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/settings/backup/create',
      status: 'success',
    });

    logger.info('Backup created', { backupId: backup.id, adminId });

    return backup;
  }

  /**
   * Get backup list
   */
  async getBackupList(filters: any, _adminId: string) {
    const { page = 1, limit = 20 } = filters;

    const backups = [
      {
        id: '1',
        createdAt: new Date(Date.now() - 86400000),
        size: 1024000,
        status: 'completed',
      },
    ];

    return {
      items: backups,
      pagination: {
        page,
        page_size: limit,
        total: backups.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
  }

  /**
   * Restore backup
   */
  async restoreBackup(backupId: string, adminId: string, adminEmail: string) {
    // In production, restore from actual backup
    // This is a critical operation that should be done carefully

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'restore',
      resourceType: 'backup',
      resourceId: backupId,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/settings/backup/restore',
      status: 'success',
    });

    logger.info('Backup restore initiated', { backupId, adminId });

    return {
      backupId,
      status: 'restoring',
      startedAt: new Date(),
    };
  }
}

export const adminSettingsService = new AdminSettingsService();
