import { z } from 'zod';

// Common validation schemas
export const emailSchema = z
  .string()
  .email('邮箱格式不正确')
  .min(1, '邮箱不能为空')
  .max(255, '邮箱长度不能超过 255 个字符');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, '手机号格式不正确')
  .optional()
  .nullable();

export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(50, '密码长度不能超过 50 个字符')
  .regex(/[A-Z]/, '密码必须包含大写字母')
  .regex(/[a-z]/, '密码必须包含小写字母')
  .regex(/[0-9]/, '密码必须包含数字')
  .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符');

export const uuidSchema = z
  .string()
  .uuid('无效的 UUID 格式');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// User related schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  role: z.enum(['advertiser', 'kol']).optional().default('advertiser'),
  nickname: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
});

export const updateUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional().nullable(),
  language: z.string().length(5).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, '请输入当前密码'),
  new_password: passwordSchema,
});

// Token related schemas
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh Token 不能为空'),
});

export const verificationCodeSchema = z.object({
  type: z.enum(['email', 'phone']),
  target: z.string().min(1, '目标不能为空'),
  code: z.string().length(6, '验证码为 6 位数字'),
});

// Advertiser related schemas
export const createAdvertiserSchema = z.object({
  company_name: z.string().min(1).max(255),
  company_name_en: z.string().max(255).optional(),
  business_license: z.string().max(100).optional(),
  legal_representative: z.string().max(100).optional(),
  contact_person: z.string().max(100).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_email: emailSchema.optional(),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  website: z.string().url().optional(),
});

export const updateAdvertiserSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  company_name_en: z.string().max(255).optional().nullable(),
  contact_person: z.string().max(100).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_email: emailSchema.optional(),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  website: z.string().url().optional().nullable(),
});

export const rechargeSchema = z.object({
  amount: z.number().positive('充值金额必须大于 0'),
  payment_method: z.enum(['alipay', 'wechat', 'bank_transfer']),
  payment_proof: z.string().url().optional(),
});

// Campaign related schemas
export const createCampaignSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  objective: z.enum(['awareness', 'engagement', 'traffic', 'conversion', 'sales']).optional().default('awareness'),
  budget: z.number().positive(),
  budget_type: z.enum(['fixed', 'per_video']).optional().default('fixed'),
  target_audience: z.object({
    age_range: z.string().optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
  }).optional(),
  target_platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo'])).optional(),
  min_followers: z.number().int().positive().optional(),
  max_followers: z.number().int().positive().optional(),
  min_engagement_rate: z.number().positive().optional(),
  required_categories: z.array(z.string()).optional(),
  target_countries: z.array(z.string()).optional(),
  content_requirements: z.string().optional(),
  required_hashtags: z.array(z.string()).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  deadline: z.string().datetime().optional(),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  objective: z.enum(['awareness', 'engagement', 'traffic', 'conversion', 'sales']).optional(),
  budget: z.number().positive().optional(),
  budget_type: z.enum(['fixed', 'per_video']).optional(),
  target_audience: z.object({
    age_range: z.string().optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
  }).optional(),
  target_platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo'])).optional(),
  min_followers: z.number().int().positive().optional(),
  max_followers: z.number().int().positive().optional(),
  min_engagement_rate: z.number().positive().optional(),
  required_categories: z.array(z.string()).optional(),
  target_countries: z.array(z.string()).optional(),
  content_requirements: z.string().optional(),
  required_hashtags: z.array(z.string()).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(['draft', 'pending_review', 'active', 'paused', 'completed', 'cancelled']).optional(),
});

// KOL search schemas
export const kolSearchSchema = z.object({
  platform: z.enum(['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo']).optional(),
  min_followers: z.coerce.number().int().positive().optional(),
  max_followers: z.coerce.number().int().positive().optional(),
  categories: z.string().optional(),
  regions: z.string().optional(),
  min_engagement_rate: z.coerce.number().positive().optional(),
  keyword: z.string().optional(),
});

// Order related schemas
export const createOrderSchema = z.object({
  campaign_id: uuidSchema,
  kol_id: uuidSchema,
  offered_price: z.number().positive(),
  requirements: z.string().max(2000).optional(),
});

// KOL related schemas
export const createKolSchema = z.object({
  platform: z.enum(['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo']),
  platform_username: z.string().min(1).max(255),
  platform_id: z.string().min(1).max(255),
  bio: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
});

export const updateKolSchema = z.object({
  bio: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  base_price: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
});

// KOL Account Binding schemas
export const bindKolAccountSchema = z.object({
  platform: z.enum(['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo']),
  platform_username: z.string().min(1).max(255),
  platform_id: z.string().min(1).max(255),
  platform_display_name: z.string().max(255).optional(),
  platform_avatar_url: z.string().url().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export const syncKolDataSchema = z.object({
  account_ids: z.array(uuidSchema).optional(),
});

// Task schemas
export const applyTaskSchema = z.object({
  message: z.string().max(1000).optional(),
  expected_price: z.number().positive().optional(),
  draft_urls: z.array(z.string().url()).optional(),
});

// KOL Order schemas
export const submitOrderSchema = z.object({
  draft_urls: z.array(z.string().url()).min(1, '至少需要一个作品链接'),
  message: z.string().max(1000).optional(),
});

export const reviseOrderSchema = z.object({
  draft_urls: z.array(z.string().url()).min(1, '至少需要一个作品链接'),
  message: z.string().max(1000).optional(),
});

// Withdrawal schemas
export const withdrawSchema = z.object({
  amount: z.number().positive('提现金额必须大于 0'),
  payment_method: z.enum(['alipay', 'wechat_pay', 'bank_transfer', 'paypal']),
  account_name: z.string().min(1).max(255),
  account_number: z.string().min(1).max(255),
  bank_name: z.string().max(255).optional(),
  bank_code: z.string().max(50).optional(),
  swift_code: z.string().max(50).optional(),
  remarks: z.string().max(500).optional(),
});

// Generic API response schema
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.array(z.object({
        field: z.string().optional(),
        message: z.string(),
      })).optional(),
    }).optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
  });

// Helper function to validate request body
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('验证失败', details);
    }
    throw error;
  }
}

// Custom error class for validation errors
export class ValidationError extends Error {
  details: Array<{ field?: string; message: string }>;

  constructor(message: string, details: Array<{ field?: string; message: string }> = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Helper function to generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper function to sanitize string
export function sanitizeString(str: string): string {
  return str.replace(/[<>]/g, '').trim();
}
