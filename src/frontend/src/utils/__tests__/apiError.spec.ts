import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, getApiErrorCode, isKolProfileNotFoundError } from '../apiError';

function axiosLike(data: unknown, status = 500) {
  return { response: { status, data } };
}

describe('getApiErrorMessage', () => {
  it('reads error.message from axios response', () => {
    expect(getApiErrorMessage(axiosLike({ error: { message: '  bad  ' } }), 'x')).toBe('bad');
  });

  it('reads top-level message', () => {
    expect(getApiErrorMessage(axiosLike({ message: 'oops' }), 'x')).toBe('oops');
  });

  it('falls back to Error then default', () => {
    expect(getApiErrorMessage(new Error('e'), 'd')).toBe('e');
    expect(getApiErrorMessage({}, 'd')).toBe('d');
  });
});

describe('getApiErrorCode', () => {
  it('reads error.code', () => {
    expect(getApiErrorCode(axiosLike({ error: { code: 'MFA_REQUIRED' } }))).toBe('MFA_REQUIRED');
  });

  it('returns undefined when missing', () => {
    expect(getApiErrorCode({})).toBeUndefined();
  });
});

describe('isKolProfileNotFoundError', () => {
  it('is true for 404 NOT_FOUND with 资料', () => {
    expect(
      isKolProfileNotFoundError(
        axiosLike({ error: { message: 'KOL 资料不存在', code: 'NOT_FOUND' } }, 404)
      )
    ).toBe(true);
  });

  it('is false for non-404', () => {
    expect(
      isKolProfileNotFoundError(
        axiosLike({ error: { message: 'KOL 资料不存在', code: 'NOT_FOUND' } }, 400)
      )
    ).toBe(false);
  });
});
