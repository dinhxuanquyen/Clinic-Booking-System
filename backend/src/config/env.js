import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, '../../.env') });

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || process.env.CENTRAL_MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_central',
  centralMongoUri: process.env.MONGO_URI || process.env.CENTRAL_MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_central',
  clinicDbPrefix: process.env.CLINIC_DB_PREFIX || 'clinic_branch',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  geminiApiKey: cleanEnvValue(process.env.GEMINI_API_KEY),
  geminiModel: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-3.5-flash',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || `${process.env.EMAIL_FROM_NAME || 'BookingCare Mini'} <no-reply@example.com>`
  },
  email: {
    fromName: process.env.EMAIL_FROM_NAME || 'BookingCare Mini',
    support: process.env.EMAIL_SUPPORT || 'support@clinicbooking.vn',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_SUPPORT || ''
  }
};
