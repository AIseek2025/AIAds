import type { UserRole } from '@prisma/client';
import prisma from '../../config/database';
import { errors } from '../../middleware/errorHandler';
import { randomInviteCode } from '../invite-code.service';

export interface InviteCodeRow {
  id: string;
  code: string;
  role_target: UserRole;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

function toRow(r: {
  id: string;
  code: string;
  roleTarget: UserRole;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
  active: boolean;
  note: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InviteCodeRow {
  return {
    id: r.id,
    code: r.code,
    role_target: r.roleTarget,
    max_uses: r.maxUses,
    used_count: r.usedCount,
    expires_at: r.expiresAt ? r.expiresAt.toISOString() : null,
    active: r.active,
    note: r.note,
    created_by_user_id: r.createdByUserId,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export class AdminInviteCodesService {
  async list(page: number, pageSize: number): Promise<{
    items: InviteCodeRow[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }> {
    const p = Math.max(1, page);
    const ps = Math.min(100, Math.max(1, pageSize));
    const [total, rows] = await Promise.all([
      prisma.inviteCode.count(),
      prisma.inviteCode.findMany({
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

  async create(
    input: {
      role_target: UserRole;
      max_uses?: number;
      expires_at?: string | null;
      note?: string | null;
    },
    createdByUserId: string
  ): Promise<InviteCodeRow> {
    let exp: Date | null = null;
    if (input.expires_at && input.expires_at.trim() !== '') {
      const d = new Date(input.expires_at);
      if (Number.isNaN(d.getTime())) {
        throw errors.badRequest('过期时间格式无效');
      }
      exp = d;
    }
    let code = randomInviteCode(8);
    for (let i = 0; i < 8; i++) {
      const exists = await prisma.inviteCode.findUnique({ where: { code } });
      if (!exists) break;
      code = randomInviteCode(8);
    }

    const maxUses = Math.max(1, Math.min(100_000, input.max_uses ?? 1));
    const row = await prisma.inviteCode.create({
      data: {
        code,
        roleTarget: input.role_target,
        maxUses,
        expiresAt: exp,
        note: input.note ?? null,
        createdByUserId,
        active: true,
      },
    });
    return toRow(row);
  }

  async setActive(id: string, active: boolean): Promise<InviteCodeRow> {
    const row = await prisma.inviteCode.update({
      where: { id },
      data: { active },
    });
    return toRow(row);
  }
}

export const adminInviteCodesService = new AdminInviteCodesService();
