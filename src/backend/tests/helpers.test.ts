import type { Request } from 'express';
import {
  generateRequestId,
  truncate,
  slugify,
  pick,
  omit,
  isEmpty,
  deepClone,
  flattenObject,
  daysDifference,
  addDays,
  isPast,
  isFuture,
  formatISODate,
  parseISODate,
  formatCurrency,
  formatNumber,
  retry,
  getClientIP,
  getUserAgent,
  sleep,
} from '../src/utils/helpers';

describe('helpers', () => {
  it('generateRequestId starts with req_', () => {
    expect(generateRequestId().startsWith('req_')).toBe(true);
  });

  it('truncate appends ellipsis when needed', () => {
    expect(truncate('abc', 10)).toBe('abc');
    expect(truncate('abcdef', 3)).toBe('abc...');
    expect(truncate('', 5)).toBe('');
  });

  it('slugify normalizes string', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('Foo Bar')).toBe('foo-bar');
  });

  it('getClientIP prefers x-forwarded-for first hop', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      socket: { remoteAddress: '::1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('203.0.113.1');
  });

  it('getClientIP falls back to socket address', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '192.168.0.2' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('192.168.0.2');
  });

  it('getUserAgent reads header or unknown', () => {
    expect(
      getUserAgent({ headers: { 'user-agent': 'jest-test' } } as unknown as Request)
    ).toBe('jest-test');
    expect(getUserAgent({ headers: {} } as unknown as Request)).toBe('unknown');
  });

  it('sleep resolves after delay', async () => {
    const t0 = Date.now();
    await sleep(5);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(3);
  });

  it('pick and omit', () => {
    const o = { a: 1, b: 2, c: 3 };
    expect(pick(o, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(omit(o, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('isEmpty', () => {
    expect(isEmpty({})).toBe(true);
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('deepClone', () => {
    const x = { n: [1, { y: 2 }] };
    const c = deepClone(x);
    expect(c).toEqual(x);
    expect(c.n).not.toBe(x.n);
  });

  it('flattenObject', () => {
    expect(flattenObject({ a: { b: 1 }, c: 2 })).toEqual({ 'a.b': 1, c: 2 });
    expect(flattenObject({ x: { y: { z: 3 } } })).toEqual({ 'x.y.z': 3 });
  });

  it('daysDifference and addDays', () => {
    const d1 = new Date(2024, 0, 1);
    const d2 = new Date(2024, 0, 11);
    expect(daysDifference(d1, d2)).toBe(10);
    expect(addDays(d1, 5).getDate()).toBe(6);
  });

  it('isPast and isFuture', () => {
    const past = new Date(2000, 0, 1);
    const future = new Date(2100, 0, 1);
    expect(isPast(past)).toBe(true);
    expect(isFuture(future)).toBe(true);
  });

  it('formatISODate round-trips with parseISODate', () => {
    const d = new Date('2024-06-15T12:30:00.000Z');
    expect(parseISODate(formatISODate(d)).toISOString()).toBe(d.toISOString());
  });

  it('formatCurrency', () => {
    expect(formatCurrency(1234.5, 'USD')).toContain('1');
  });

  it('formatNumber adds grouping', () => {
    expect(formatNumber(1234567)).toMatch(/1/);
    expect(formatNumber(1234567)).toContain('234');
  });

  it('retry returns on first success', async () => {
    let n = 0;
    const v = await retry(async () => {
      n += 1;
      return 42;
    }, 3);
    expect(v).toBe(42);
    expect(n).toBe(1);
  });

  it('retry throws after maxRetries failures', async () => {
    let n = 0;
    await expect(
      retry(async () => {
        n += 1;
        throw new Error('fail');
      }, 2, 1)
    ).rejects.toThrow('fail');
    expect(n).toBe(2);
  });
});
