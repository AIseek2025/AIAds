import { describe, it, expect } from 'vitest';
import { getAdminOrdersActiveTab } from '../adminOrdersActiveTab';

describe('getAdminOrdersActiveTab', () => {
  it('URL 要求纠纷时固定为 3', () => {
    expect(getAdminOrdersActiveTab(true, 0)).toBe(3);
    expect(getAdminOrdersActiveTab(true, 1)).toBe(3);
  });

  it('无纠纷参数时使用已选 tab', () => {
    expect(getAdminOrdersActiveTab(false, 0)).toBe(0);
    expect(getAdminOrdersActiveTab(false, 2)).toBe(2);
    expect(getAdminOrdersActiveTab(false, 3)).toBe(3);
  });
});
