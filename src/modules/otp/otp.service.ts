import twilio from 'twilio';
import { signToken, verifyToken } from '@/lib/auth';
import { AppError } from '@/utils/errors';
import * as repo from './otp.repo';

const OTP_TTL_MINUTES = 10;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Normalise phone: strip spaces/dashes, add +91 for bare 10-digit Indian numbers */
function normalisePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
  throw new AppError('Invalid phone number format — enter a 10-digit number or include country code', 400);
}

async function sendViaTwilio(to: string, otp: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    throw new AppError('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment.', 500);
  }

  const client = twilio(sid, token);
  try {
    await client.messages.create({
      to,
      from,
      body: `Your Yulaa admission OTP is ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.`,
    });
  } catch (err: any) {
    // Map common Twilio error codes to human-readable messages
    const code: number = err?.code ?? 0;
    const twilioErrors: Record<number, string> = {
      21267: 'Alphanumeric sender IDs are not supported on Twilio trial accounts. Set TWILIO_PHONE_NUMBER to your actual Twilio number (e.g. +1XXXXXXXXXX).',
      21608: 'This number is not verified on your Twilio trial account. Verify the recipient number at twilio.com/console, or upgrade to a paid account.',
      21211: `Invalid destination phone number: ${to}`,
      21614: `Phone number ${to} is not a mobile number and cannot receive SMS.`,
      20003: 'Twilio authentication failed — check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
    };
    const message = twilioErrors[code] ?? `SMS delivery failed: ${err.message ?? 'unknown Twilio error'}`;
    throw new AppError(message, 502);
  }
}

export async function sendOtp(phone: string, email?: string): Promise<void> {
  const e164      = normalisePhone(phone);
  const otp       = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Persist first — if SMS fails the user can retry without DB issues
  await repo.upsertOtp(e164, email ?? null, otp, expiresAt);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev && (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.startsWith('ACxxx'))) {
    // Dev fallback: log to console so you can test without real Twilio creds
    console.log(`\n[OTP - DEV MODE] ──────────────────────`);
    console.log(`  Phone : ${e164}`);
    console.log(`  OTP   : ${otp}`);
    console.log(`  Exp   : ${expiresAt.toISOString()}`);
    console.log(`────────────────────────────────────────\n`);
  } else {
    await sendViaTwilio(e164, otp);
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<string> {
  const e164   = normalisePhone(phone);
  const record = await repo.findValidOtp(e164, otp);
  if (!record) throw new AppError('Invalid or expired OTP', 400);
  await repo.markVerified(record.id);

  // Short-lived admission token (15 min) — used by /api/admission/apply
  const token = signToken({ phone: e164, email: record.email, purpose: 'admission' }, '15m');
  return token;
}

export function validateAdmissionToken(token: string): { phone: string; email: string | null } {
  const payload = verifyToken(token) as any;
  if (!payload || payload.purpose !== 'admission') {
    throw new AppError('OTP verification required — token missing or invalid', 401);
  }
  return { phone: payload.phone, email: payload.email ?? null };
}
