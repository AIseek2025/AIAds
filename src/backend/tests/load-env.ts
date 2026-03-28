import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.test') });

/** Ensure JWT helpers pass length checks when .env.test is missing or uses short placeholders */
function ensureSecret(key: string, fallback: string): void {
  const v = process.env[key];
  if (!v || v.length < 32) {
    process.env[key] = fallback;
  }
}

ensureSecret('JWT_SECRET', 'jest_jwt_secret______________________________');
ensureSecret('JWT_REFRESH_SECRET', 'jest_jwt_refresh_secret___________________');
ensureSecret('ADMIN_JWT_SECRET', 'jest_admin_jwt_secret_______________________');
ensureSecret('ADMIN_JWT_REFRESH_SECRET', 'jest_admin_refresh_secret_________________');
