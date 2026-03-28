import * as crypto from 'crypto';
import type { Prisma, UserRole } from '@prisma/client';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export function normalizeInviteCode(raw: string | undefined): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function requireInviteEnv(): boolean {
  const v = process.env.REQUIRE_INVITE_CODE_FOR_REGISTRATION;
  return v === '1' || v?.toLowerCase() === 'true';
}

export function randomInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += chars[crypto.randomInt(chars.length)];
  }
  return s;
}

export class InviteCodeService {
  /**
   * 注册前校验：返回将核销的邀请码 id；无需邀请码时返回 null。
   */
  async resolveForRegister(
    role: UserRole,
    inviteRaw: string | undefined
  ): Promise<{ inviteId: string } | null> {
    const need = requireInviteEnv();
    const normalized = normalizeInviteCode(inviteRaw);

    if (!normalized) {
      if (need) {
        throw new ApiError('需要填写有效邀请码', 400, 'INVITE_CODE_REQUIRED');
      }
      return null;
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { code: normalized },
    });

    if (!invite || !invite.active) {
      throw new ApiError('邀请码无效或已停用', 400, 'INVALID_INVITE_CODE');
    }
    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      throw new ApiError('邀请码已过期', 400, 'INVITE_CODE_EXPIRED');
    }
    if (invite.usedCount >= invite.maxUses) {
      throw new ApiError('邀请码已用尽', 400, 'INVITE_CODE_EXHAUSTED');
    }
    if (invite.roleTarget !== role) {
      throw new ApiError('邀请码与注册角色不匹配', 400, 'INVITE_ROLE_MISMATCH');
    }

    return { inviteId: invite.id };
  }

  /**
   * 事务内扣减名额（与 user.create 同事务，先扣再建用户并带 inviteCodeId）
   */
  async assertRedeemSlot(tx: Prisma.TransactionClient, inviteId: string): Promise<void> {
    const invite = await tx.inviteCode.findUnique({ where: { id: inviteId } });
    if (!invite || !invite.active) {
      throw new ApiError('邀请码无效或已停用', 400, 'INVALID_INVITE_CODE');
    }
    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      throw new ApiError('邀请码已过期', 400, 'INVITE_CODE_EXPIRED');
    }
    if (invite.usedCount >= invite.maxUses) {
      throw new ApiError('邀请码已用尽', 400, 'INVITE_CODE_EXHAUSTED');
    }
    const updated = await tx.inviteCode.updateMany({
      where: {
        id: inviteId,
        usedCount: invite.usedCount,
        active: true,
      },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ApiError('邀请码核销失败，请重试', 409, 'INVITE_REDEEM_FAILED');
    }
  }
}

export const inviteCodeService = new InviteCodeService();
