import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import type { PaginationResponse } from '../../types';

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
  /** Stored as JSON; callers may pass DTOs — persisted via Prisma.InputJsonValue */
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  geoLocation?: unknown;
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
        requestBody: data.requestBody as Prisma.InputJsonValue | undefined,
        responseStatus: data.responseStatus,
        responseBody: data.responseBody as Prisma.InputJsonValue | undefined,
        oldValues: data.oldValues as Prisma.InputJsonValue | undefined,
        newValues: data.newValues as Prisma.InputJsonValue | undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        geoLocation: data.geoLocation as Prisma.InputJsonValue | undefined,
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

export type AdminAuditLogListItem = Prisma.AdminAuditLogGetPayload<{
  select: {
    id: true;
    adminId: true;
    adminEmail: true;
    adminName: true;
    action: true;
    resourceType: true;
    resourceId: true;
    resourceName: true;
    requestMethod: true;
    requestPath: true;
    ipAddress: true;
    geoLocation: true;
    status: true;
    createdAt: true;
  };
}>;

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
}): Promise<PaginationResponse<AdminAuditLogListItem>> {
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

  const where: Prisma.AdminAuditLogWhereInput = {};

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
    const createdAt: Prisma.DateTimeFilter = {};
    if (createdAfter) {
      createdAt.gte = new Date(createdAfter);
    }
    if (createdBefore) {
      createdAt.lte = new Date(createdBefore);
    }
    where.createdAt = createdAt;
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
