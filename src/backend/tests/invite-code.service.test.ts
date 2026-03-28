import { normalizeInviteCode, randomInviteCode } from '../src/services/invite-code.service';

describe('normalizeInviteCode', () => {
  it('trims, uppercases and strips non-alphanumeric', () => {
    expect(normalizeInviteCode('  ab-cd_12  ')).toBe('ABCD12');
    expect(normalizeInviteCode('x#y@z')).toBe('XYZ');
  });

  it('returns empty string for undefined or empty', () => {
    expect(normalizeInviteCode(undefined)).toBe('');
    expect(normalizeInviteCode('')).toBe('');
  });

  it('removes unicode and spaces from mixed input', () => {
    expect(normalizeInviteCode('ab 你好 cd')).toBe('ABCD');
  });

  it('treats nullish as empty', () => {
    expect(normalizeInviteCode(null as unknown as string | undefined)).toBe('');
  });
});

describe('randomInviteCode', () => {
  it('default length 8 and uses charset without ambiguous chars', () => {
    const c = randomInviteCode();
    expect(c.length).toBe(8);
    expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    expect(c).not.toMatch(/[0O1I]/);
  });

  it('respects custom length', () => {
    expect(randomInviteCode(12).length).toBe(12);
    expect(randomInviteCode(4).length).toBe(4);
  });
});
