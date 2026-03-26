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
  if (!phone) return phone;
  
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
  if (!email) return email;
  
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
  if (!idNumber) return idNumber;
  
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
  if (!cardNumber) return cardNumber;
  
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
  if (!name) return name;
  
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
export function maskUserData(user: {
  phone?: string | null;
  email?: string | null;
  realName?: string | null;
  idNumber?: string | null;
  bankAccount?: string | null;
  alipayAccount?: string | null;
  wechatPayAccount?: string | null;
  [key: string]: any;
}): Record<string, any> {
  const masked: Record<string, any> = { ...user };

  if (user.phone) {
    masked.phone = maskPhone(user.phone);
  }

  if (user.email) {
    masked.email = maskEmail(user.email);
  }

  if (user.realName) {
    masked.realName = maskRealName(user.realName);
  }

  if (user.idNumber) {
    masked.idNumber = maskIdNumber(user.idNumber);
  }

  // P2 Fix: Mask additional sensitive fields
  if (user.bankAccount) {
    masked.bankAccount = maskCardNumber(user.bankAccount);
  }

  if (user.alipayAccount) {
    masked.alipayAccount = maskPhone(user.alipayAccount);
  }

  if (user.wechatPayAccount) {
    masked.wechatPayAccount = maskPhone(user.wechatPayAccount);
  }

  return masked;
}

/**
 * Apply masking to advertiser object for safe API response
 * P2 Fix: Added advertiser-specific field masking
 */
export function maskAdvertiserData(advertiser: {
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  bankAccount?: string | null;
  [key: string]: any;
}): Record<string, any> {
  const masked: Record<string, any> = { ...advertiser };

  if (advertiser.phone) {
    masked.phone = maskPhone(advertiser.phone);
  }

  if (advertiser.email) {
    masked.email = maskEmail(advertiser.email);
  }

  if (advertiser.companyName) {
    // Mask partial company name for privacy
    masked.companyName = maskCompanyName(advertiser.companyName);
  }

  if (advertiser.taxId) {
    masked.taxId = maskTaxId(advertiser.taxId);
  }

  if (advertiser.bankAccount) {
    masked.bankAccount = maskCardNumber(advertiser.bankAccount);
  }

  return masked;
}

/**
 * Mask company name
 * Example: ABC Technology Ltd -> A** Technology Ltd
 */
export function maskCompanyName(name: string): string {
  if (!name) return name;
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
  if (!taxId) return taxId;
  const trimmed = taxId.trim();
  if (trimmed.length >= 18) {
    return trimmed.slice(0, 6) + '**********' + trimmed.slice(-4);
  }
  return '****';
}
