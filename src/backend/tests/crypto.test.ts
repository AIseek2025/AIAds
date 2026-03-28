import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  hashVerificationCode,
  verifyVerificationCode,
  generateVerificationCode,
  generateRandomString,
  TokenError,
} from '../src/utils/crypto';

describe('hashPassword / verifyPassword', () => {
  it('verifies same password and rejects wrong password', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    expect(await verifyPassword('Str0ng!Pass', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('verification code helpers', () => {
  it('hashVerificationCode and verifyVerificationCode round-trip', () => {
    const h = hashVerificationCode('654321');
    expect(verifyVerificationCode('654321', h)).toBe(true);
    expect(verifyVerificationCode('000000', h)).toBe(false);
  });

  it('generateVerificationCode is 6 digits', () => {
    expect(generateVerificationCode()).toMatch(/^\d{6}$/);
  });
});

describe('generateRandomString', () => {
  it('default length is 64 hex chars', () => {
    expect(generateRandomString().length).toBe(64);
  });

  it('custom byte length doubles hex length', () => {
    expect(generateRandomString(8).length).toBe(16);
  });
});

describe('extractTokenFromHeader', () => {
  it('returns token for Bearer scheme', () => {
    expect(extractTokenFromHeader('Bearer eyJhbG')).toBe('eyJhbG');
  });

  it('returns null for missing or invalid header', () => {
    expect(extractTokenFromHeader(undefined)).toBeNull();
    expect(extractTokenFromHeader('Basic x')).toBeNull();
    expect(extractTokenFromHeader('Bearer')).toBeNull();
  });
});

describe('JWT generateTokens decodeToken verifyToken', () => {
  it('decodeToken reads payload without signature check', () => {
    const pair = generateTokens({
      sub: 'user-1',
      email: 'a@b.co',
      role: 'advertiser',
    });
    const d = decodeToken(pair.accessToken);
    expect(d?.sub).toBe('user-1');
    expect(d?.email).toBe('a@b.co');
  });

  it('verifyToken access round-trip', () => {
    const pair = generateTokens({
      sub: 'user-2',
      email: 'x@y.co',
      role: 'kol',
    });
    const v = verifyToken(pair.accessToken, 'access');
    expect(v.sub).toBe('user-2');
    expect(v.role).toBe('kol');
  });

  it('verifyToken throws TokenError for garbage', () => {
    expect(() => verifyToken('not.a.jwt', 'access')).toThrow(TokenError);
  });

  it('verifyToken fails when token type does not match verifier', () => {
    const pair = generateTokens({
      sub: 'user-3',
      email: 'z@w.co',
      role: 'advertiser',
    });
    expect(() => verifyToken(pair.refreshToken, 'access')).toThrow(TokenError);
    expect(() => verifyToken(pair.accessToken, 'refresh')).toThrow(TokenError);
  });

  it('decodeToken returns null for invalid token string', () => {
    expect(decodeToken('')).toBeNull();
  });
});

