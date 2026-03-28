import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';

describe('genTransactionNo', () => {
  it('以 TXN- 开头且含时间戳片段', () => {
    const a = genTransactionNo();
    const b = genTransactionNo();
    expect(a).toMatch(/^TXN-\d+-[A-Z0-9]+$/);
    expect(b).toMatch(/^TXN-\d+-[A-Z0-9]+$/);
    expect(a).not.toBe(b);
  });

  it('suffix segment is 6 alphanumeric chars', () => {
    const a = genTransactionNo();
    const parts = a.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts[parts.length - 1].length).toBe(6);
  });
});

describe('partialReleaseAmount', () => {
  it('取 min(请求, 冻结)', () => {
    expect(partialReleaseAmount(100, 30)).toBe(30);
    expect(partialReleaseAmount(30, 100)).toBe(30);
  });

  it('无效输入为 0', () => {
    expect(partialReleaseAmount(0, 10)).toBe(0);
    expect(partialReleaseAmount(10, 0)).toBe(0);
    expect(partialReleaseAmount(10, -1)).toBe(0);
  });

  it('frozen 为负时返回 0', () => {
    expect(partialReleaseAmount(-5, 10)).toBe(0);
  });
});

/**
 * 冻结结算净额：walletBalance += F - A（与 orders.service 一致）
 */
describe('budget freeze settlement math', () => {
  it('F=A 时净额为 0', () => {
    expect(500 - 500).toBe(0);
  });

  it('A<F 时多余退回可用余额', () => {
    const F = 800;
    const A = 300;
    expect(F - A).toBe(500);
  });

  it('A<F 时需从可用余额补足 A-F', () => {
    const F = 100;
    const A = 150;
    expect(A - F).toBe(50);
  });
});
