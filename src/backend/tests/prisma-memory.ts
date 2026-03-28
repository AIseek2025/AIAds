import { randomUUID } from 'crypto';

type UserRow = Record<string, unknown>;
type AdminRow = Record<string, unknown>;
type RoleRow = Record<string, unknown>;

const usersById = new Map<string, UserRow>();
const usersByEmail = new Map<string, string>();
const adminsById = new Map<string, AdminRow>();
const adminsByEmail = new Map<string, string>();
const rolesById = new Map<string, RoleRow>();
const rolesByName = new Map<string, string>();
const inviteCodesById = new Map<string, Record<string, unknown>>();
const inviteCodesByCode = new Map<string, string>();

/** 仅用于 order 聚合与单测：KOL 维度订单冻结金额合计 */
const orderFrozenTotalByKolId = new Map<string, number>();
/** 活动维度订单冻结合计（sumFrozenAmountForCampaign） */
const orderFrozenTotalByCampaignId = new Map<string, number>();
/** 广告主维度订单冻结合计（sumFrozenAmountForAdvertiser） */
const orderFrozenTotalByAdvertiserId = new Map<string, number>();

function frozenDecimal(n: number): { toNumber: () => number } {
  return { toNumber: () => n };
}

/** 单测写入内存订单冻结合计（与真实 DB 无关） */
export function seedOrderFrozenForKol(kolId: string, total: number): void {
  orderFrozenTotalByKolId.set(kolId, total);
}

export function seedOrderFrozenForCampaign(campaignId: string, total: number): void {
  orderFrozenTotalByCampaignId.set(campaignId, total);
}

export function seedOrderFrozenForAdvertiser(advertiserId: string, total: number): void {
  orderFrozenTotalByAdvertiserId.set(advertiserId, total);
}

function pick<T extends Record<string, unknown>>(obj: T, select?: Record<string, boolean>): Partial<T> {
  if (!select) {
    return obj;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(select)) {
    if (select[k] && k in obj) {
      out[k] = obj[k];
    }
  }
  return out as Partial<T>;
}

function applyUserUpdate(row: UserRow, data: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as object)) {
      const inc = (v as { increment: number }).increment;
      row[k] = ((row[k] as number) || 0) + inc;
    } else {
      row[k] = v;
    }
  }
  row.updatedAt = new Date();
}

export function resetPrismaMemory(): void {
  usersById.clear();
  usersByEmail.clear();
  adminsById.clear();
  adminsByEmail.clear();
  rolesById.clear();
  rolesByName.clear();
  orderFrozenTotalByKolId.clear();
  orderFrozenTotalByCampaignId.clear();
  orderFrozenTotalByAdvertiserId.clear();
  inviteCodesById.clear();
  inviteCodesByCode.clear();
}

export function createPrismaMemoryMock() {
  const prisma = {
    user: {
      findUnique: async (args: {
        where: { id?: string; email?: string; phone?: string };
        select?: Record<string, boolean>;
      }) => {
        let row: UserRow | undefined;
        if (args.where.email) {
          const id = usersByEmail.get(args.where.email);
          row = id ? usersById.get(id) : undefined;
        } else if (args.where.id) {
          row = usersById.get(args.where.id);
        } else if (args.where.phone) {
          for (const u of usersById.values()) {
            if (u.phone === args.where.phone) {
              row = u;
              break;
            }
          }
        }
        if (!row) {
          return null;
        }
        return pick(row as Record<string, unknown>, args.select) as UserRow;
      },
      create: async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const id = randomUUID();
        const now = new Date();
        const row: UserRow = {
          id,
          email: args.data.email,
          phone: args.data.phone ?? null,
          passwordHash: args.data.passwordHash,
          nickname: args.data.nickname ?? null,
          role: args.data.role ?? 'advertiser',
          status: args.data.status ?? 'pending',
          emailVerified: false,
          failedLoginAttempts: 0,
          lastLoginAt: null,
          lastLoginIp: null,
          mfaEnabled: false,
          avatarUrl: null,
          realName: null,
          phoneVerified: false,
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          currency: 'CNY',
          createdAt: now,
          updatedAt: now,
          inviteCodeId: args.data.inviteCodeId ?? null,
        };
        usersById.set(id, row);
        usersByEmail.set(row.email as string, id);
        return pick(row as Record<string, unknown>, args.select) as UserRow;
      },
      update: async (args: { where: { id?: string; email?: string }; data: Record<string, unknown> }) => {
        let row: UserRow | undefined;
        if (args.where.id) {
          row = usersById.get(args.where.id);
        } else if (args.where.email) {
          const id = usersByEmail.get(args.where.email);
          row = id ? usersById.get(id) : undefined;
        }
        if (!row) {
          throw new Error('User not found');
        }
        applyUserUpdate(row, args.data);
        return pick(row as Record<string, unknown>, undefined) as UserRow;
      },
      delete: async (args: { where: { id?: string; email?: string } }) => {
        let id = args.where.id;
        if (!id && args.where.email) {
          id = usersByEmail.get(args.where.email);
        }
        if (!id) {
          return { count: 0 };
        }
        const row = usersById.get(id);
        if (row) {
          usersByEmail.delete(row.email as string);
          usersById.delete(id);
        }
        return row ?? { count: 0 };
      },
    },

    adminRole: {
      upsert: async (args: {
        where: { name: string };
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      }) => {
        let id = rolesByName.get(args.where.name);
        if (id) {
          const row = rolesById.get(id)!;
          Object.assign(row, args.update);
          row.updatedAt = new Date();
          return row;
        }
        id = randomUUID();
        const now = new Date();
        const row: RoleRow = {
          id,
          name: args.create.name ?? args.where.name,
          description: args.create.description ?? null,
          permissions: args.create.permissions ?? [],
          isSystem: args.create.isSystem ?? false,
          createdAt: now,
          updatedAt: now,
        };
        rolesById.set(id, row);
        rolesByName.set(row.name as string, id);
        return row;
      },
      delete: async (args: { where: { id: string } }) => {
        const row = rolesById.get(args.where.id);
        if (row) {
          rolesByName.delete(row.name as string);
          rolesById.delete(args.where.id);
        }
        return row;
      },
    },

    admin: {
      findUnique: async (args: {
        where: { id?: string; email?: string };
        include?: { adminRole?: { select?: Record<string, boolean> } };
        select?: Record<string, unknown>;
      }) => {
        let row: AdminRow | undefined;
        if (args.where.email) {
          const id = adminsByEmail.get(args.where.email);
          row = id ? adminsById.get(id) : undefined;
        } else if (args.where.id) {
          row = adminsById.get(args.where.id);
        }
        if (!row) {
          return null;
        }

        const roleId = row.roleId as string;
        const role = rolesById.get(roleId);

        if (args.include?.adminRole) {
          const sel = args.include.adminRole.select;
          const roleOut = role ? pick(role as Record<string, unknown>, sel) : null;
          return { ...row, adminRole: roleOut };
        }

        if (args.select && typeof args.select.adminRole === 'object' && args.select.adminRole !== null) {
          const nested = args.select.adminRole as { select?: Record<string, boolean> };
          const roleOut = role ? pick(role as Record<string, unknown>, nested.select) : null;
          const top: Record<string, unknown> = {};
          for (const key of Object.keys(args.select)) {
            if (key === 'adminRole') {
              continue;
            }
            if ((args.select as Record<string, boolean>)[key]) {
              top[key] = row[key];
            }
          }
          return { ...top, adminRole: roleOut } as AdminRow;
        }

        return pick(row as Record<string, unknown>, args.select as Record<string, boolean>) as AdminRow;
      },
      create: async (args: { data: Record<string, unknown> }) => {
        const id = randomUUID();
        const now = new Date();
        const row: AdminRow = {
          id,
          email: args.data.email,
          passwordHash: args.data.passwordHash,
          name: args.data.name,
          avatarUrl: args.data.avatarUrl ?? null,
          roleId: args.data.roleId,
          status: args.data.status ?? 'active',
          lastLoginAt: null,
          lastLoginIp: null,
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
          createdAt: now,
          updatedAt: now,
        };
        adminsById.set(id, row);
        adminsByEmail.set(row.email as string, id);
        return row;
      },
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = adminsById.get(args.where.id);
        if (!row) {
          throw new Error('Admin not found');
        }
        Object.assign(row, args.data);
        row.updatedAt = new Date();
        return row;
      },
      delete: async (args: { where: { id?: string; email?: string } }) => {
        let id = args.where.id;
        if (!id && args.where.email) {
          id = adminsByEmail.get(args.where.email);
        }
        if (!id) {
          return { count: 0 };
        }
        const row = adminsById.get(id);
        if (row) {
          adminsByEmail.delete(row.email as string);
          adminsById.delete(id);
        }
        return row ?? { count: 0 };
      },
    },

    adminAuditLog: {
      create: async (args: { data: Record<string, unknown> }) => ({
        id: randomUUID(),
        ...args.data,
        createdAt: new Date(),
      }),
    },

    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $on: () => undefined,
    $use: () => undefined,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const stub = () => {
    throw new Error(
      'This model is not implemented in prisma-memory; set TEST_USE_REAL_DB=1 for full integration tests.'
    );
  };
  const noopModel = {
    create: stub,
    findUnique: stub,
    findFirst: stub,
    findMany: stub,
    update: stub,
    delete: stub,
    deleteMany: stub,
    count: stub,
    upsert: stub,
    aggregate: stub,
    groupBy: stub,
  };

  const orderModel = {
    ...noopModel,
    aggregate: async (args: {
      where: { kolId?: string; campaignId?: string; advertiserId?: string };
      _sum: { frozenAmount: true };
    }) => {
      const w = args.where;
      if (w.advertiserId != null) {
        const n = orderFrozenTotalByAdvertiserId.get(w.advertiserId) ?? 0;
        return {
          _sum: {
            frozenAmount: n === 0 ? null : frozenDecimal(n),
          },
        };
      }
      if (w.campaignId != null) {
        const n = orderFrozenTotalByCampaignId.get(w.campaignId) ?? 0;
        return {
          _sum: {
            frozenAmount: n === 0 ? null : frozenDecimal(n),
          },
        };
      }
      if (w.kolId != null) {
        const n = orderFrozenTotalByKolId.get(w.kolId) ?? 0;
        return {
          _sum: {
            frozenAmount: n === 0 ? null : frozenDecimal(n),
          },
        };
      }
      throw new Error('order.aggregate: unsupported where in prisma-memory');
    },
    groupBy: async (args: {
      by: string[];
      where: {
        kolId?: { in: string[] };
        campaignId?: { in: string[] };
        advertiserId?: { in: string[] };
      };
      _sum: { frozenAmount: true };
    }) => {
      if (args.by[0] === 'advertiserId' && args.where.advertiserId?.in) {
        return args.where.advertiserId.in.map((advertiserId) => ({
          advertiserId,
          _sum: {
            frozenAmount: frozenDecimal(orderFrozenTotalByAdvertiserId.get(advertiserId) ?? 0),
          },
        }));
      }
      if (args.by[0] === 'campaignId' && args.where.campaignId?.in) {
        return args.where.campaignId.in.map((campaignId) => ({
          campaignId,
          _sum: {
            frozenAmount: frozenDecimal(orderFrozenTotalByCampaignId.get(campaignId) ?? 0),
          },
        }));
      }
      if (args.by[0] === 'kolId' && args.where.kolId?.in) {
        const ids = args.where.kolId.in;
        return ids.map((kolId) => ({
          kolId,
          _sum: {
            frozenAmount: frozenDecimal(orderFrozenTotalByKolId.get(kolId) ?? 0),
          },
        }));
      }
      throw new Error('order.groupBy: unsupported args in prisma-memory');
    },
  };

  const inviteCodeModel = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; code?: string };
    }) => {
      if (where.code) {
        const k = String(where.code)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
        const id = inviteCodesByCode.get(k);
        return id ? inviteCodesById.get(id) ?? null : null;
      }
      if (where.id) return inviteCodesById.get(where.id) ?? null;
      return null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const id = randomUUID();
      const code = String(data.code).toUpperCase();
      const row: Record<string, unknown> = {
        id,
        code,
        roleTarget: data.roleTarget,
        maxUses: data.maxUses ?? 1,
        usedCount: 0,
        expiresAt: data.expiresAt ?? null,
        active: data.active !== false,
        note: data.note ?? null,
        createdByUserId: data.createdByUserId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inviteCodesById.set(id, row);
      inviteCodesByCode.set(code, id);
      return row;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; usedCount?: number; active?: boolean };
      data: { usedCount?: { increment: number } };
    }) => {
      const row = inviteCodesById.get(where.id);
      if (!row) return { count: 0 };
      if (where.active === true && row.active !== true) return { count: 0 };
      if (where.usedCount !== undefined && row.usedCount !== where.usedCount) return { count: 0 };
      if (data.usedCount?.increment) {
        row.usedCount = (row.usedCount as number) + data.usedCount.increment;
      }
      return { count: 1 };
    },
    count: async () => inviteCodesById.size,
    findMany: async ({
      skip,
      take,
    }: {
      orderBy?: { createdAt?: string };
      skip?: number;
      take?: number;
    }) => {
      const all = [...inviteCodesById.values()];
      all.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
      const s = skip ?? 0;
      const t = take ?? 20;
      return all.slice(s, s + t);
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { active?: boolean };
    }) => {
      const row = inviteCodesById.get(where.id);
      if (!row) throw new Error('InviteCode not found');
      if (data.active !== undefined) row.active = data.active;
      row.updatedAt = new Date();
      return row;
    },
  };

  Object.assign(prisma, {
    advertiser: noopModel,
    kol: noopModel,
    kolAccount: noopModel,
    kolStatsHistory: noopModel,
    campaign: noopModel,
    order: orderModel,
    inviteCode: inviteCodeModel,
    transaction: noopModel,
    notification: noopModel,
    auditLog: noopModel,
  });

  return {
    __esModule: true,
    default: prisma,
    connectDatabase: jest.fn(),
    disconnectDatabase: jest.fn(),
    connectionPoolConfig: {},
  };
}
