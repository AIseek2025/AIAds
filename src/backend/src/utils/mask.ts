/**
 * Sensitive data masking utilities
 * Used to protect user privacy in API responses and logs
 */

/**
 * Mask phone number, showing only first 3 and last 4 digits
 * Example: 13812345678 -> 138****5678
 * @param phone - Phone number to mask
 * @returns Masked phone number
 */
export function maskPhone(phone: string): string {
  if (!phone) {
    return phone;
  }

  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Only mask if phone has at least 11 digits (Chinese phone format)
  if (digits.length >= 11) {
    return digits.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  // For shorter numbers, mask middle portion
  if (digits.length > 4) {
    const visible = Math.floor(digits.length / 2);
    return digits.slice(0, visible) + '****' + digits.slice(-visible);
  }

  return '****';
}

/**
 * Mask email address, showing only first 3 characters of username
 * Example: test@example.com -> tes****@example.com
 * @param email - Email address to mask
 * @returns Masked email address
 */
export function maskEmail(email: string): string {
  if (!email) {
    return email;
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return '****';
  }

  const [username, domain] = parts;

  if (username.length <= 3) {
    return `****@${domain}`;
  }

  // Show first 3 characters, mask the rest
  const masked = username.slice(0, 3) + '****';
  return `${masked}@${domain}`;
}

/**
 * Mask Chinese ID number (身份证号)
 * Example: 110101199001011234 -> 110101********1234
 * @param idNumber - ID number to mask
 * @returns Masked ID number
 */
export function maskIdNumber(idNumber: string): string {
  if (!idNumber) {
    return idNumber;
  }

  const digits = idNumber.replace(/\D/g, '');

  // Chinese ID is 18 digits
  if (digits.length === 18) {
    return digits.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }

  // For other lengths, mask middle portion
  if (digits.length > 8) {
    return digits.slice(0, 6) + '********' + digits.slice(-4);
  }

  return '****';
}

/**
 * Mask bank card number
 * Example: 6222021234567890123 -> 6222 **** **** 7890
 * @param cardNumber - Card number to mask
 * @returns Masked card number
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) {
    return cardNumber;
  }

  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length >= 16) {
    // Group by 4 and mask middle groups
    const groups = digits.match(/.{1,4}/g);
    if (groups && groups.length >= 4) {
      const lastGroup = groups[groups.length - 1];
      const firstGroup = groups[0];
      return `${firstGroup} **** **** ${lastGroup}`;
    }
  }

  // For shorter numbers, mask middle
  if (digits.length > 8) {
    return digits.slice(0, 4) + ' **** **** ' + digits.slice(-4);
  }

  return '****';
}

/**
 * Mask real name, showing only first character
 * Example: 张三 -> 张*，王小明 -> 王**
 * @param name - Name to mask
 * @returns Masked name
 */
export function maskRealName(name: string): string {
  if (!name) {
    return name;
  }

  const trimmed = name.trim();
  if (trimmed.length <= 1) {
    return '*';
  }

  return trimmed.charAt(0) + '*'.repeat(trimmed.length - 1);
}

/**
 * Mask verification code for logging (always show asterisks)
 * @returns Masked verification code
 */
export function maskVerificationCode(): string {
  return '******';
}

/**
 * Apply masking to user object for safe API response
 * P2 Fix: Added complete field masking including bankAccount, alipayAccount, wechatPayAccount
 * @param user - User object with sensitive fields
 * @returns User object with masked sensitive fields
 */
type MaskUserSensitiveFields = {
  phone?: string | null;
  email?: string | null;
  realName?: string | null;
  idNumber?: string | null;
  bankAccount?: string | null;
  alipayAccount?: string | null;
  wechatPayAccount?: string | null;
};

export function maskUserData(user: object): Record<string, unknown> {
  const u = user as MaskUserSensitiveFields;
  const raw = user as Record<string, unknown>;
  const masked: Record<string, unknown> = { ...raw };

  if (u.phone) {
    masked.phone = maskPhone(u.phone);
  }

  if (u.email) {
    masked.email = maskEmail(u.email);
  }

  if (u.realName) {
    masked.realName = maskRealName(u.realName);
  }

  // UserResponse（公开 API）使用 snake_case 的 real_name
  const realNameSnake = raw['real_name'];
  if (typeof realNameSnake === 'string' && realNameSnake.length > 0) {
    masked['real_name'] = maskRealName(realNameSnake);
  }

  if (u.idNumber) {
    masked.idNumber = maskIdNumber(u.idNumber);
  }

  // P2 Fix: Mask additional sensitive fields
  if (u.bankAccount) {
    masked.bankAccount = maskCardNumber(u.bankAccount);
  }

  if (u.alipayAccount) {
    masked.alipayAccount = maskPhone(u.alipayAccount);
  }

  if (u.wechatPayAccount) {
    masked.wechatPayAccount = maskPhone(u.wechatPayAccount);
  }

  return masked;
}

/**
 * Apply masking to advertiser object for safe API response
 * P2 Fix: Added advertiser-specific field masking
 */
type MaskAdvertiserSensitiveFields = {
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  bankAccount?: string | null;
};

export function maskAdvertiserData(advertiser: object): Record<string, unknown> {
  const a = advertiser as MaskAdvertiserSensitiveFields;
  const masked: Record<string, unknown> = { ...(advertiser as Record<string, unknown>) };

  if (a.phone) {
    masked.phone = maskPhone(a.phone);
  }

  if (a.email) {
    masked.email = maskEmail(a.email);
  }

  if (a.companyName) {
    // Mask partial company name for privacy
    masked.companyName = maskCompanyName(a.companyName);
  }

  if (a.taxId) {
    masked.taxId = maskTaxId(a.taxId);
  }

  if (a.bankAccount) {
    masked.bankAccount = maskCardNumber(a.bankAccount);
  }

  return masked;
}

/**
 * Mask company name
 * Example: ABC Technology Ltd -> A** Technology Ltd
 */
export function maskCompanyName(name: string): string {
  if (!name) {
    return name;
  }
  const trimmed = name.trim();
  if (trimmed.length <= 1) {
    return '*';
  }
  return trimmed.charAt(0) + '** ' + trimmed.split(' ').slice(1).join(' ');
}

/**
 * Mask tax ID
 * Example: 91310101MA1234567X -> 913101**********567X
 */
export function maskTaxId(taxId: string): string {
  if (!taxId) {
    return taxId;
  }
  const trimmed = taxId.trim();
  if (trimmed.length >= 18) {
    return trimmed.slice(0, 6) + '**********' + trimmed.slice(-4);
  }
  return '****';
}
