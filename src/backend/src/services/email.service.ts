import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || apiKey === 'your-sendgrid-api-key') {
    logger.warn('SENDGRID_API_KEY not configured — emails will be skipped');
    return false;
  }

  sgMail.setApiKey(apiKey);
  configured = true;
  logger.info('SendGrid configured', { from: from ?? 'noreply@aiads.com' });
  return true;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'noreply@aiads.com';
}

export async function sendVerificationEmail(to: string, code: string, purpose: string): Promise<boolean> {
  if (!ensureConfigured()) {
    logger.warn('Email not sent (SendGrid not configured)', { to, purpose });
    return false;
  }

  const purposeLabel = purpose === 'login' ? '登录' : purpose === 'reset_password' ? '重置密码' : '注册';

  const msg = {
    to,
    from: getFrom(),
    subject: `AIAds ${purposeLabel}验证码`,
    text: `您的 AIAds ${purposeLabel}验证码是：${code}，有效期 5 分钟。如非本人操作，请忽略此邮件。`,
    html: buildVerificationHtml(code, purposeLabel),
  };

  try {
    await sgMail.send(msg);
    logger.info('Verification email sent', { to, purpose });
    return true;
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error('Failed to send verification email', { to, purpose, error: detail });
    return false;
  }
}

function buildVerificationHtml(code: string, purposeLabel: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:40px;">
      <tr><td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:28px;font-weight:800;color:#1976d2;">AIAds</span>
        <p style="color:#888;font-size:14px;margin:4px 0 0;">全球 KOL 营销平台</p>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:16px;">
        <p style="font-size:16px;color:#333;margin:0;">您的<strong>${purposeLabel}</strong>验证码：</p>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px;">
        <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#1976d2;background:#f0f7ff;border-radius:8px;padding:12px 32px;">${code}</span>
      </td></tr>
      <tr><td style="text-align:center;color:#999;font-size:13px;">
        <p style="margin:0 0 4px;">验证码有效期 <strong>5 分钟</strong>，请尽快使用。</p>
        <p style="margin:0;">如非本人操作，请忽略此邮件。</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
