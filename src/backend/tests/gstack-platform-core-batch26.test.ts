/**
 * GStack 平台核心域单测第二十六批次（30 条）：NotificationService.notify* 与 createSafe 契约、
 * tokenRotation（存储/校验/轮换/作废/全量失效）、accountLock（失败计数/锁定/解锁/TTL）、
 * helpers（isFuture/pick/omit/daysDifference/slugify）、Zod（kolSearch/recharge/pagination）。
 */

import { notificationService } from '../src/services/notifications.service';
import {
  storeRefreshToken,
  validateRefreshToken,
  invalidateRefreshToken,
  rotateRefreshToken,
  invalidateAllUserTokens,
} from '../src/services/tokenRotation.service';
import {
  recordLoginFailure,
  isAccountLocked,
  resetLoginFailures,
  getLockRemainingTime,
  manuallyLockAccount,
  manuallyUnlockAccount,
} from '../src/services/accountLock.service';
import {
  isFuture,
  pick,
  omit,
  daysDifference,
  slugify,
} from '../src/utils/helpers';
import { kolSearchSchema, rechargeSchema, paginationSchema } from '../src/utils/validator';

const OID = '550e8400-e29b-41d4-a716-446655440001';
const CID = '660e8400-e29b-41d4-a716-446655440003';

describe('gstack batch26 — NotificationService.notify* → createSafe', () => {
  beforeEach(() => {
    jest.spyOn(notificationService, 'createSafe').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifyOrderPendingForKol 写入订单待确认文案与链接', () => {
    notificationService.notifyOrderPendingForKol('kol-u1', OID, '夏季活动', 'ON-9');
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'kol-u1',
        type: 'order',
        title: '新合作订单待确认',
        relatedId: OID,
        actionUrl: `/kol/my-tasks/${OID}`,
        actionText: '查看订单',
      })
    );
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toContain('夏季活动');
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toContain('ON-9');
  });

  it('notifyOrderAcceptedForAdvertiser 广告主侧接单', () => {
    notificationService.notifyOrderAcceptedForAdvertiser('adv-u', OID, 'O-A');
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'adv-u',
        title: 'KOL 已接受订单',
        actionUrl: `/advertiser/orders/${OID}`,
      })
    );
  });

  it('notifyOrderRejectedForAdvertiser 带原因', () => {
    notificationService.notifyOrderRejectedForAdvertiser('adv-u', OID, 'O-R', '档期已满');
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'KOL 已拒绝订单',
      })
    );
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toContain('档期已满');
  });

  it('notifyOrderRejectedForAdvertiser 无原因走默认退款文案', () => {
    notificationService.notifyOrderRejectedForAdvertiser('adv-u', OID, 'O-R2');
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toContain('冻结预算已退回');
  });

  it('notifyOrderSubmittedForAdvertiser 提交作品', () => {
    notificationService.notifyOrderSubmittedForAdvertiser('adv-u', OID, 'O-S');
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'KOL 已提交作品',
        actionText: '去审核',
      })
    );
  });

  it('notifyOrderCompletedForKol 金额本地化格式', () => {
    notificationService.notifyOrderCompletedForKol('kol-x', OID, 'O-C', 1234.5);
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toMatch(/1,234\.50/);
  });

  it('notifyDisputeOutcomeForParties 同时通知广告主与 KOL', () => {
    notificationService.notifyDisputeOutcomeForParties({
      advertiserUserId: 'a1',
      kolUserId: 'k1',
      orderId: OID,
      orderNo: 'D-1',
      resolution: 'refund_full',
      ruling: 'r',
      refundAmountYuan: 10,
    });
    expect(notificationService.createSafe).toHaveBeenCalledTimes(2);
  });

  it('notifyDisputeOutcomeForParties 裁决超长截断', () => {
    const long = 'x'.repeat(500);
    notificationService.notifyDisputeOutcomeForParties({
      advertiserUserId: 'a1',
      kolUserId: null,
      orderId: OID,
      orderNo: 'D-2',
      resolution: 'no_refund',
      ruling: long,
      refundAmountYuan: null,
    });
    const content = (notificationService.createSafe as jest.Mock).mock.calls[0][0].content as string;
    expect(content).toContain('…');
    expect(content.length).toBeLessThan(long.length + 200);
  });

  it('notifyAfterAdminOrderStatusChange approved 仅通知 KOL', () => {
    notificationService.notifyAfterAdminOrderStatusChange({
      orderId: OID,
      orderNo: 'AO-1',
      next: 'approved',
      advertiserUserId: 'a0',
      kolUserId: 'k0',
    });
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'k0',
        title: '作品已通过审核',
      })
    );
  });

  it('notifyAfterAdminOrderStatusChange cancelled 通知双方', () => {
    notificationService.notifyAfterAdminOrderStatusChange({
      orderId: OID,
      orderNo: 'AO-2',
      next: 'cancelled',
      reason: '违规',
      advertiserUserId: 'a0',
      kolUserId: 'k0',
    });
    expect(notificationService.createSafe).toHaveBeenCalledTimes(2);
  });

  it('notifyCampaignReviewForAdvertiser 审核通过', () => {
    notificationService.notifyCampaignReviewForAdvertiser('adv', CID, '标题', true);
    expect(notificationService.createSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'campaign',
        title: '活动审核通过',
        actionUrl: `/advertiser/campaigns/${CID}`,
      })
    );
  });

  it('notifyCampaignReviewForAdvertiser 驳回带备注', () => {
    notificationService.notifyCampaignReviewForAdvertiser('adv', CID, '标题', false, '  材料不全  ');
    expect((notificationService.createSafe as jest.Mock).mock.calls[0][0].content).toContain('材料不全');
  });
});

describe('gstack batch26 — tokenRotation + accountLock', () => {
  it('storeRefreshToken 后 validateRefreshToken 返回 userId', async () => {
    await storeRefreshToken('rt-1', 'user-1');
    await expect(validateRefreshToken('rt-1')).resolves.toBe('user-1');
  });

  it('invalidateRefreshToken 后无法再校验原 token', async () => {
    await storeRefreshToken('rt-2', 'user-2');
    await invalidateRefreshToken('rt-2');
    await expect(validateRefreshToken('rt-2')).resolves.toBeNull();
  });

  it('rotateRefreshToken 签发新 token 且新 token 可校验', async () => {
    await storeRefreshToken('old-rt', 'u-rot');
    const fresh = await rotateRefreshToken('old-rt', 'u-rot');
    expect(fresh).toHaveLength(64);
    await expect(validateRefreshToken(fresh)).resolves.toBe('u-rot');
  });

  it('rotateRefreshToken 后旧 refresh token 视为已轮换', async () => {
    await storeRefreshToken('old-rt2', 'u-rot2');
    await rotateRefreshToken('old-rt2', 'u-rot2');
    await expect(validateRefreshToken('old-rt2')).resolves.toBeNull();
  });

  it('invalidateAllUserTokens 清除该用户全部 refresh', async () => {
    await storeRefreshToken('t-a', 'same');
    await storeRefreshToken('t-b', 'same');
    await invalidateAllUserTokens('same');
    await expect(validateRefreshToken('t-a')).resolves.toBeNull();
    await expect(validateRefreshToken('t-b')).resolves.toBeNull();
  });

  it('连续失败达阈值后 isAccountLocked', async () => {
    const uid = 'lock-user-1';
    for (let i = 0; i < 5; i++) {
      await recordLoginFailure(uid);
    }
    await expect(isAccountLocked(uid)).resolves.toBe(true);
  });

  it('未满阈值不锁定', async () => {
    const uid = 'lock-user-2';
    await recordLoginFailure(uid);
    await expect(isAccountLocked(uid)).resolves.toBe(false);
  });

  it('resetLoginFailures 清除失败计数（先失败数次再重置）', async () => {
    const uid = 'lock-user-3';
    await recordLoginFailure(uid);
    await recordLoginFailure(uid);
    await resetLoginFailures(uid);
    await recordLoginFailure(uid);
    await expect(isAccountLocked(uid)).resolves.toBe(false);
  });

  it('manuallyLockAccount / manuallyUnlockAccount', async () => {
    const uid = 'lock-user-4';
    await manuallyLockAccount(uid, 120);
    await expect(isAccountLocked(uid)).resolves.toBe(true);
    await manuallyUnlockAccount(uid);
    await expect(isAccountLocked(uid)).resolves.toBe(false);
  });

  it('getLockRemainingTime 对已锁定账号返回正数 TTL', async () => {
    const uid = 'lock-user-5';
    await manuallyLockAccount(uid, 300);
    await expect(getLockRemainingTime(uid)).resolves.toBe(600);
  });
});

describe('gstack batch26 — helpers + Zod', () => {
  it('isFuture 未来时间为 true', () => {
    const t = new Date(Date.now() + 60_000);
    expect(isFuture(t)).toBe(true);
  });

  it('pick 仅保留指定键', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('omit 排除键', () => {
    expect(omit({ a: 1, b: 2 }, ['b'])).toEqual({ a: 1 });
  });

  it('daysDifference 日历日差', () => {
    const a = new Date('2026-01-01T12:00:00Z');
    const b = new Date('2026-01-04T12:00:00Z');
    expect(daysDifference(a, b)).toBe(3);
  });

  it('slugify 规范化', () => {
    expect(slugify('Hello  World')).toBe('hello-world');
  });

  it('kolSearchSchema 合法查询', () => {
    const r = kolSearchSchema.parse({ keyword: '美妆', platform: 'tiktok' });
    expect(r.keyword).toBe('美妆');
    expect(r.platform).toBe('tiktok');
  });

  it('rechargeSchema 金额下限', () => {
    const r = rechargeSchema.parse({ amount: 100, payment_method: 'alipay' });
    expect(r.amount).toBe(100);
  });

  it('paginationSchema 默认分页', () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.page_size).toBe(20);
  });
});
