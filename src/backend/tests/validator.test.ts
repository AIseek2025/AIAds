import { z } from 'zod';
import {
  emailSchema,
  loginSchema,
  paginationSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resetPasswordBodySchema,
  verifyCodeBodySchema,
  loginEmailCodeSchema,
  sendVerificationCodeSchema,
  rechargeSchema,
  createOrderSchema,
  applyTaskSchema,
  updateKolSchema,
  submitOrderSchema,
  withdrawSchema,
  updateCampaignSchema,
  createKolSchema,
  uuidSchema,
  phoneSchema,
  passwordSchema,
  updateUserSchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  createCampaignSchema,
  kolSearchSchema,
  bindKolAccountSchema,
  syncKolDataSchema,
  reviseOrderSchema,
  validateRequest,
  sanitizeString,
  generateUUID,
  apiResponseSchema,
  ValidationError,
} from '../src/utils/validator';

describe('validator schemas', () => {
  it('emailSchema accepts valid email', () => {
    expect(emailSchema.parse('a@b.co')).toBe('a@b.co');
    expect(() => emailSchema.parse('not-an-email')).toThrow();
  });

  it('paginationSchema coerces and defaults', () => {
    const a = paginationSchema.parse({});
    expect(a.page).toBe(1);
    expect(a.page_size).toBe(20);
    const b = paginationSchema.parse({ page: '2', page_size: '10', order: 'asc' });
    expect(b.page).toBe(2);
    expect(b.page_size).toBe(10);
    expect(b.order).toBe('asc');
  });

  it('loginSchema requires email and non-empty password', () => {
    const ok = loginSchema.parse({ email: 'a@b.co', password: 'any' });
    expect(ok.email).toBe('a@b.co');
    expect(() => loginSchema.parse({ email: 'bad', password: 'x' })).toThrow();
  });

  it('registerSchema validates password complexity', () => {
    const ok = registerSchema.parse({
      email: 'u@example.com',
      password: 'Abcd1234!',
    });
    expect(ok.email).toBe('u@example.com');
    expect(() =>
      registerSchema.parse({
        email: 'u@example.com',
        password: 'short',
      })
    ).toThrow();
  });

  it('refreshTokenSchema requires non-empty refresh_token', () => {
    expect(refreshTokenSchema.parse({ refresh_token: 'x' }).refresh_token).toBe('x');
    expect(() => refreshTokenSchema.parse({ refresh_token: '' })).toThrow();
  });

  it('changePasswordSchema applies password rules to new_password', () => {
    const ok = changePasswordSchema.parse({
      current_password: 'old',
      new_password: 'Abcd1234!',
    });
    expect(ok.new_password).toBe('Abcd1234!');
    expect(() =>
      changePasswordSchema.parse({
        current_password: 'old',
        new_password: 'weak',
      })
    ).toThrow();
  });

  it('resetPasswordBodySchema requires code and strong new_password', () => {
    const ok = resetPasswordBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '123456',
      new_password: 'Abcd1234!',
    });
    expect(ok.new_password).toBe('Abcd1234!');
    expect(() =>
      resetPasswordBodySchema.parse({
        type: 'email',
        target: 'a@b.co',
        code: '12345',
        new_password: 'Abcd1234!',
      })
    ).toThrow();
  });

  it('verifyCodeBodySchema', () => {
    expect(
      verifyCodeBodySchema.parse({
        type: 'email',
        target: 'a@b.co',
        code: '000000',
      }).code
    ).toBe('000000');
  });

  it('loginEmailCodeSchema', () => {
    expect(loginEmailCodeSchema.parse({ email: 'a@b.co', code: '123456' }).email).toBe('a@b.co');
    expect(() => loginEmailCodeSchema.parse({ email: 'x', code: '123456' })).toThrow();
  });

  it('sendVerificationCodeSchema', () => {
    const ok = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'a@b.co',
      purpose: 'login',
    });
    expect(ok.purpose).toBe('login');
    expect(() =>
      sendVerificationCodeSchema.parse({
        type: 'email',
        target: '',
      })
    ).toThrow();
  });

  it('rechargeSchema requires positive amount and payment_method', () => {
    const ok = rechargeSchema.parse({
      amount: 100,
      payment_method: 'alipay',
    });
    expect(ok.amount).toBe(100);
    expect(() => rechargeSchema.parse({ amount: -1, payment_method: 'alipay' })).toThrow();
    expect(() => rechargeSchema.parse({ amount: 10, payment_method: 'cash' as 'alipay' })).toThrow();
  });

  it('createOrderSchema requires uuids and fixed-price offered_price', () => {
    const cid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const kid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const ok = createOrderSchema.parse({
      campaign_id: cid,
      kol_id: kid,
      offered_price: 50,
    });
    expect(ok.offered_price).toBe(50);
    expect(() => createOrderSchema.parse({ campaign_id: 'x', kol_id: kid, offered_price: 1 })).toThrow();
    expect(() => createOrderSchema.parse({ campaign_id: cid, kol_id: kid })).toThrow();
  });

  it('createOrderSchema CPM pricing requires cpm_rate and offered_price cap', () => {
    const cid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const kid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const ok = createOrderSchema.parse({
      campaign_id: cid,
      kol_id: kid,
      pricing_model: 'cpm',
      cpm_rate: 12,
      offered_price: 800,
    });
    expect(ok.cpm_rate).toBe(12);
    expect(() =>
      createOrderSchema.parse({
        campaign_id: cid,
        kol_id: kid,
        pricing_model: 'cpm',
        cpm_rate: 5,
      })
    ).toThrow();
  });

  it('phoneSchema optional E.164 style', () => {
    expect(phoneSchema.parse(undefined)).toBeUndefined();
    expect(phoneSchema.parse('+8613800138000')).toBe('+8613800138000');
    expect(() => phoneSchema.parse('abc')).toThrow();
  });

  it('passwordSchema enforces complexity', () => {
    expect(() => passwordSchema.parse('short')).toThrow();
    expect(passwordSchema.parse('Abcd1234!')).toBe('Abcd1234!');
  });

  it('applyTaskSchema allows empty object', () => {
    expect(applyTaskSchema.parse({})).toEqual({});
  });

  it('updateKolSchema rejects non-positive base_price', () => {
    expect(() => updateKolSchema.parse({ base_price: -1 })).toThrow();
  });

  it('submitOrderSchema requires at least one draft url', () => {
    expect(() => submitOrderSchema.parse({ draft_urls: [] })).toThrow();
    const ok = submitOrderSchema.parse({
      draft_urls: ['https://example.com/p'],
    });
    expect(ok.draft_urls?.length).toBe(1);
  });

  it('withdrawSchema requires amount and account fields', () => {
    expect(() => withdrawSchema.parse({ amount: 0, payment_method: 'alipay', account_name: 'a', account_number: '1' })).toThrow();
    const ok = withdrawSchema.parse({
      amount: 10,
      payment_method: 'alipay',
      account_name: '张三',
      account_number: '6222000000000000',
    });
    expect(ok.amount).toBe(10);
  });

  it('updateCampaignSchema rejects non-positive budget', () => {
    expect(() => updateCampaignSchema.parse({ budget: -1 })).toThrow();
  });

  it('createKolSchema requires platform and ids', () => {
    const ok = createKolSchema.parse({
      platform: 'tiktok',
      platform_username: 'u',
      platform_id: '1',
    });
    expect(ok.platform).toBe('tiktok');
    expect(() => createKolSchema.parse({ platform: 'facebook', platform_username: 'u', platform_id: '1' })).toThrow();
  });

  it('uuidSchema validates RFC UUID', () => {
    expect(uuidSchema.parse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBeDefined();
    expect(() => uuidSchema.parse('not-uuid')).toThrow();
    expect(() => uuidSchema.parse('')).toThrow();
  });

  it('updateUserSchema optional fields', () => {
    expect(updateUserSchema.parse({})).toEqual({});
    expect(updateUserSchema.parse({ nickname: 'ok', language: 'zh_CN' }).language).toBe('zh_CN');
    expect(() => updateUserSchema.parse({ language: 'bad' })).toThrow();
  });

  it('createAdvertiserSchema requires company_name', () => {
    const ok = createAdvertiserSchema.parse({ company_name: 'ACME' });
    expect(ok.company_name).toBe('ACME');
    expect(() => createAdvertiserSchema.parse({ company_name: '' })).toThrow();
  });

  it('updateAdvertiserSchema allows partial update', () => {
    expect(updateAdvertiserSchema.parse({ company_name: 'X' }).company_name).toBe('X');
  });

  it('createCampaignSchema requires title and positive budget', () => {
    const ok = createCampaignSchema.parse({ title: 'T', budget: 100 });
    expect(ok.budget).toBe(100);
    expect(() => createCampaignSchema.parse({ title: '', budget: 100 })).toThrow();
    expect(() => createCampaignSchema.parse({ title: 'T', budget: 0 })).toThrow();
  });

  it('createCampaignSchema accepts objective and target_audience', () => {
    const ok = createCampaignSchema.parse({
      title: 'Summer',
      budget: 200,
      objective: 'conversion',
      target_audience: { gender: 'all', locations: ['US'] },
    });
    expect(ok.objective).toBe('conversion');
    expect(ok.target_audience?.locations).toEqual(['US']);
  });

  it('createCampaignSchema accepts ISO date start_date and end_date', () => {
    const ok = createCampaignSchema.parse({
      title: 'T',
      budget: 100,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
    expect(ok.start_date).toBe('2026-01-01');
    expect(ok.end_date).toBe('2026-12-31');
  });

  it('updateAdvertiserSchema allows nullable website and company_name_en', () => {
    const a = updateAdvertiserSchema.parse({ website: null, company_name_en: null });
    expect(a.website).toBeNull();
    expect(a.company_name_en).toBeNull();
  });

  it('updateCampaignSchema allows status and partial fields', () => {
    const ok = updateCampaignSchema.parse({
      status: 'paused',
      title: 'New',
    });
    expect(ok.status).toBe('paused');
    expect(() => updateCampaignSchema.parse({ budget: 0 })).toThrow();
  });

  it('kolSearchSchema coerces numeric query fields', () => {
    const a = kolSearchSchema.parse({ min_followers: '1000' as unknown as number });
    expect(a.min_followers).toBe(1000);
  });

  it('bindKolAccountSchema requires platform and ids', () => {
    const ok = bindKolAccountSchema.parse({
      platform: 'youtube',
      platform_username: 'u',
      platform_id: 'id1',
    });
    expect(ok.platform).toBe('youtube');
  });

  it('syncKolDataSchema optional account_ids', () => {
    expect(syncKolDataSchema.parse({})).toEqual({});
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    expect(syncKolDataSchema.parse({ account_ids: [id] }).account_ids).toEqual([id]);
  });

  it('reviseOrderSchema requires draft_urls', () => {
    expect(() => reviseOrderSchema.parse({ draft_urls: [] })).toThrow();
    expect(
      reviseOrderSchema.parse({ draft_urls: ['https://example.com/x'], message: 'm' }).draft_urls?.length
    ).toBe(1);
  });

  it('applyTaskSchema accepts optional message draft_urls expected_price', () => {
    const ok = applyTaskSchema.parse({
      message: 'hi',
      expected_price: 99,
      draft_urls: ['https://example.com/a'],
    });
    expect(ok.expected_price).toBe(99);
  });

  it('paginationSchema order desc', () => {
    const p = paginationSchema.parse({ page: 1, page_size: 10, order: 'desc' });
    expect(p.order).toBe('desc');
  });

  it('paginationSchema rejects page_size over 100', () => {
    expect(() => paginationSchema.parse({ page: 1, page_size: 101 })).toThrow();
  });

  it('rechargeSchema rejects non-enumerated payment_method', () => {
    expect(() =>
      rechargeSchema.parse({
        amount: 100,
        payment_method: 'crypto' as 'alipay',
      })
    ).toThrow();
  });

  it('withdrawSchema accepts paypal', () => {
    const ok = withdrawSchema.parse({
      amount: 50,
      payment_method: 'paypal',
      account_name: 'A',
      account_number: 'p@x.com',
    });
    expect(ok.payment_method).toBe('paypal');
  });

  it('bindKolAccountSchema optional avatar url', () => {
    const ok = bindKolAccountSchema.parse({
      platform: 'instagram',
      platform_username: 'u',
      platform_id: '1',
      platform_avatar_url: 'https://cdn.example.com/a.png',
    });
    expect(ok.platform_avatar_url).toContain('https://');
  });

  it('registerSchema role and invite_code preprocess', () => {
    const a = registerSchema.parse({
      email: 'u@example.com',
      password: 'Abcd1234!',
      role: 'kol',
      invite_code: 'ABCD',
    });
    expect(a.role).toBe('kol');
    expect(registerSchema.parse({ email: 'u@example.com', password: 'Abcd1234!', invite_code: '' }).invite_code).toBeUndefined();
  });

  it('rechargeSchema optional payment_proof', () => {
    const ok = rechargeSchema.parse({
      amount: 10,
      payment_method: 'bank_transfer',
      payment_proof: 'https://example.com/p.png',
    });
    expect(ok.payment_proof).toContain('https://');
  });

  it('kolSearchSchema keyword only', () => {
    expect(kolSearchSchema.parse({ keyword: 'beauty' }).keyword).toBe('beauty');
  });

  it('updateUserSchema currency ISO4217 length', () => {
    expect(updateUserSchema.parse({ currency: 'USD' }).currency).toBe('USD');
    expect(() => updateUserSchema.parse({ currency: 'US' })).toThrow();
  });

  it('createOrderSchema defaults pricing_model fixed', () => {
    const cid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const kid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const ok = createOrderSchema.parse({ campaign_id: cid, kol_id: kid, offered_price: 10 });
    expect(ok.pricing_model).toBe('fixed');
  });

  it('sendVerificationCodeSchema rejects invalid type', () => {
    expect(() =>
      sendVerificationCodeSchema.parse({ type: 'fax' as unknown as 'email', target: 'a@b.co' })
    ).toThrow();
  });

  it('verifyCodeBodySchema requires 6-digit code', () => {
    expect(() =>
      verifyCodeBodySchema.parse({
        type: 'email',
        target: 'a@b.co',
        code: '12345',
      })
    ).toThrow();
  });

  it('registerSchema rejects invalid role', () => {
    expect(() =>
      registerSchema.parse({
        email: 'u@example.com',
        password: 'Abcd1234!',
        role: 'admin' as 'advertiser',
      })
    ).toThrow();
  });

  it('resetPasswordBodySchema rejects short code', () => {
    expect(() =>
      resetPasswordBodySchema.parse({
        type: 'email',
        target: 'a@b.co',
        code: '12345',
        new_password: 'Abcd1234!',
      })
    ).toThrow();
  });

  it('loginEmailCodeSchema rejects invalid email', () => {
    expect(() => loginEmailCodeSchema.parse({ email: 'bad', code: '123456' })).toThrow();
  });

  it('changePasswordSchema rejects weak new_password', () => {
    expect(() =>
      changePasswordSchema.parse({
        current_password: 'old',
        new_password: 'weak',
      })
    ).toThrow();
  });
});

describe('validator helpers', () => {
  it('validateRequest returns parsed payload', () => {
    const out = validateRequest(loginSchema, { email: 'a@b.co', password: 'secret' });
    expect(out.email).toBe('a@b.co');
  });

  it('validateRequest throws ValidationError on Zod failure', () => {
    expect(() => validateRequest(loginSchema, {})).toThrow(ValidationError);
  });

  it('sanitizeString removes angle brackets and trims', () => {
    expect(sanitizeString('  <x>hi  ')).toBe('xhi');
  });

  it('generateUUID is valid v4-shaped uuid', () => {
    expect(() => uuidSchema.parse(generateUUID())).not.toThrow();
  });

  it('apiResponseSchema parses success envelope', () => {
    const s = apiResponseSchema(z.object({ n: z.number() }));
    const r = s.parse({ success: true, data: { n: 1 }, message: 'ok' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ n: 1 });
  });
});
