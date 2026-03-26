import prisma from '../../config/database';
import { logger } from '../../utils/logger';

// Admin audit log data
export interface AdminAuditLogData {
  adminId: string;
  adminEmail?: string;
  adminName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  requestMethod: string;
  requestPath: string;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: any;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  geoLocation?: any;
  status?: string;
  errorMessage?: string;
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(data: AdminAuditLogData): Promise<void> {
  try {
    // Get admin info if not provided
    let { adminEmail, adminName } = data;
    
    if (!adminEmail || !adminName) {
      const admin = await prisma.admin.findUnique({
        where: { id: data.adminId },
        select: { email: true, name: true },
      });
      
      if (admin) {
        adminEmail = adminEmail || admin.email;
        adminName = adminName || admin.name;
      }
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        adminEmail: adminEmail || 'unknown',
        adminName: adminName || 'unknown',
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        requestMethod: data.requestMethod,
        requestPath: data.requestPath,
        requestBody: data.requestBody,
        responseStatus: data.responseStatus,
        responseBody: data.responseBody,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        geoLocation: data.geoLocation,
        status: data.status || 'success',
        errorMessage: data.errorMessage,
      },
    });

    logger.debug('Admin action logged', {
      adminId: data.adminId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  } catch (error) {
    logger.error('Failed to log admin action', { error, adminId: data.adminId });
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Get admin audit logs with pagination
 */
export async function getAdminAuditLogs(filters: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  resourceType?: string;
  status?: string;
  createdAfter?: string;
  createdBefore?: string;
  ipAddress?: string;
}) {
  const {
    page = 1,
    limit = 20,
    adminId,
    action,
    resourceType,
    status,
    createdAfter,
    createdBefore,
    ipAddress,
  } = filters;

  const skip = (page - 1) * limit;
  const take = limit;

  const where: any = {};

  if (adminId) {
    where.adminId = adminId;
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

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
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
        geoLocation: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

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
