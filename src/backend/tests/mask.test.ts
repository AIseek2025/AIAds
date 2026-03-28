import {
  maskPhone,
  maskEmail,
  maskUserData,
  maskAdvertiserData,
  maskCompanyName,
  maskTaxId,
  maskCardNumber,
  maskIdNumber,
  maskRealName,
  maskVerificationCode,
} from '../src/utils/mask';

describe('maskPhone', () => {
  it('masks 11-digit Chinese mobile', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('returns empty as-is', () => {
    expect(maskPhone('')).toBe('');
  });

  it('masks 8-digit numeric segment', () => {
    const out = maskPhone('12345678');
    expect(out).toContain('****');
  });
});

describe('maskEmail', () => {
  it('returns empty for empty input', () => {
    expect(maskEmail('')).toBe('');
  });

  it('masks long username', () => {
    expect(maskEmail('hello@example.com')).toBe('hel****@example.com');
  });

  it('short username becomes ****@domain', () => {
    expect(maskEmail('ab@x.com')).toBe('****@x.com');
  });

  it('invalid email without @ becomes ****', () => {
    expect(maskEmail('not-an-email')).toBe('****');
  });
});

describe('maskUserData', () => {
  it('masks phone, email, realName and snake_case real_name', () => {
    const out = maskUserData({
      phone: '13812345678',
      email: 'user@test.com',
      realName: '张三',
      real_name: '李四',
    });
    expect(out.phone).toBe('138****5678');
    expect(out.email).toBe('use****@test.com');
    expect(out.realName).toBe('张*');
    expect(out['real_name']).toBe('李*');
  });
});

describe('maskCompanyName', () => {
  it('masks multi-word company', () => {
    expect(maskCompanyName('ACME Trading Ltd')).toMatch(/^A\*\*/);
    expect(maskCompanyName('ACME Trading Ltd')).toContain('Trading');
  });

  it('single char name is asterisk', () => {
    expect(maskCompanyName('X')).toBe('*');
  });
});

describe('maskAdvertiserData', () => {
  it('masks company and tax id', () => {
    const out = maskAdvertiserData({
      phone: '13900001111',
      email: 'corp@co.jp',
      companyName: 'ACME Trading Ltd',
      taxId: '91310101MA1234567X',
      bankAccount: '6222021234567890123',
    });
    expect(out.phone).toBe('139****1111');
    expect(out.email).toBe('cor****@co.jp');
    expect(typeof out.companyName).toBe('string');
    expect(out.companyName).toBe(maskCompanyName('ACME Trading Ltd'));
    expect(out.taxId).toBe('913101**********567X');
    expect(out.bankAccount).toContain('6222');
  });
});

describe('maskTaxId', () => {
  it('returns **** for short input', () => {
    expect(maskTaxId('123')).toBe('****');
  });

  it('masks 18+ char tax id with head and tail visible', () => {
    const id = '91310101MA1234567X';
    expect(maskTaxId(id)).toBe('913101**********567X');
  });
});

describe('maskIdNumber', () => {
  it('masks 18-digit Chinese ID', () => {
    expect(maskIdNumber('110101199001011234')).toBe('110101********1234');
  });
});

describe('maskRealName', () => {
  it('masks multi-char Chinese name', () => {
    expect(maskRealName('张三')).toBe('张*');
    expect(maskRealName('王小明')).toBe('王**');
  });

  it('single char becomes asterisk', () => {
    expect(maskRealName('张')).toBe('*');
  });
});

describe('maskVerificationCode', () => {
  it('returns fixed mask', () => {
    expect(maskVerificationCode()).toBe('******');
  });
});

describe('maskCardNumber', () => {
  it('masks 16+ digit card', () => {
    const out = maskCardNumber('6222021234567890123');
    expect(out).toContain('6222');
    expect(out).toMatch(/123$/);
  });

  it('short numeric input returns ****', () => {
    expect(maskCardNumber('123456')).toBe('****');
  });
});
