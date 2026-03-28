import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openNotificationActionUrl } from '../notificationActionUrl';

describe('openNotificationActionUrl', () => {
  const navigate = vi.fn();
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
    navigate.mockReset();
  });

  it('http(s) 使用新窗口打开', () => {
    openNotificationActionUrl('https://example.com/path', navigate);
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/path',
      '_blank',
      'noopener,noreferrer'
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('站内路径走 navigate', () => {
    openNotificationActionUrl('/advertiser/orders', navigate);
    expect(navigate).toHaveBeenCalledWith('/advertiser/orders');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('无首斜杠时补全', () => {
    openNotificationActionUrl('kol/my-tasks', navigate);
    expect(navigate).toHaveBeenCalledWith('/kol/my-tasks');
  });

  it('空字符串不调用', () => {
    openNotificationActionUrl('  ', navigate);
    expect(navigate).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('null / undefined 不调用', () => {
    openNotificationActionUrl(null, navigate);
    openNotificationActionUrl(undefined, navigate);
    expect(navigate).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
