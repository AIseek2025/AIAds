import { decimalToNumber } from '../src/utils/decimal';

describe('decimalToNumber', () => {
  it('returns 0 for nullish', () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber(undefined)).toBe(0);
  });

  it('uses Prisma Decimal toNumber when present', () => {
    expect(decimalToNumber({ toNumber: () => 12.5 })).toBe(12.5);
    expect(decimalToNumber({ toNumber: () => NaN })).toBe(0);
  });

  it('coerces finite numbers and strings', () => {
    expect(decimalToNumber(42)).toBe(42);
    expect(decimalToNumber('3.14')).toBeCloseTo(3.14);
    expect(decimalToNumber('x')).toBe(0);
  });

  it('non-finite numbers become 0', () => {
    expect(decimalToNumber(Infinity)).toBe(0);
    expect(decimalToNumber(Number.NaN)).toBe(0);
  });

  it('coerces bigint to number when finite', () => {
    expect(decimalToNumber(BigInt(42))).toBe(42);
  });

  it('negative finite numbers pass through', () => {
    expect(decimalToNumber(-3.5)).toBe(-3.5);
  });
});
