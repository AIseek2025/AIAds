import { getAdvertiserLowBalanceAlertCny } from '../src/utils/advertiserUiConfig';

describe('getAdvertiserLowBalanceAlertCny', () => {
  const key = 'ADVERTISER_LOW_BALANCE_ALERT_CNY';
  let backup: string | undefined;

  beforeEach(() => {
    backup = process.env[key];
  });

  afterEach(() => {
    if (backup === undefined) delete process.env[key];
    else process.env[key] = backup;
  });

  it('未设置时默认 500', () => {
    delete process.env[key];
    expect(getAdvertiserLowBalanceAlertCny()).toBe(500);
  });

  it('合法正数', () => {
    process.env[key] = '300';
    expect(getAdvertiserLowBalanceAlertCny()).toBe(300);
  });

  it('非法或负数回退 500', () => {
    process.env[key] = 'bad';
    expect(getAdvertiserLowBalanceAlertCny()).toBe(500);
    process.env[key] = '-1';
    expect(getAdvertiserLowBalanceAlertCny()).toBe(500);
  });

  it('零为合法阈值', () => {
    process.env[key] = '0';
    expect(getAdvertiserLowBalanceAlertCny()).toBe(0);
  });

  it('parses large finite amounts', () => {
    process.env[key] = '999999.5';
    expect(getAdvertiserLowBalanceAlertCny()).toBe(999999.5);
  });
});
