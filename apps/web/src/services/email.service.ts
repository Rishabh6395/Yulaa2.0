const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Yulaa';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  || 'http://localhost:3000';

const SENDER = {
  name:  process.env.BREVO_SENDER_NAME  || APP_NAME,
  email: process.env.BREVO_SENDER_EMAIL || 'noreply@yulaa.in',
};

// ─── Base HTML wrapper ────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f766e;padding:28px 40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This email was sent by ${APP_NAME}. If you didn't request this, please ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Core send function ───────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  toName?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Dev fallback — log to console so development still works
    console.log('\n[EmailService] BREVO_API_KEY not set — logging email instead:');
    console.log(`  To     : ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    if (payload.text) console.log(`  Body   : ${payload.text}`);
    console.log('');
    return;
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
  const toList = toAddresses.map(email => ({
    email,
    ...(payload.toName ? { name: payload.toName } : {}),
  }));

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: SENDER,
      to: toList,
      subject: payload.subject,
      htmlContent: payload.html,
      ...(payload.text ? { textContent: payload.text } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[EmailService] Brevo error:', res.status, err);
    throw new Error(`Email delivery failed: ${res.status}`);
  }
}

// ─── Pre-built email templates ────────────────────────────────────────────────

export async function sendWelcomeEmail(
  to: string,
  name: string,
  tempPassword?: string,
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Welcome to ${APP_NAME}! 🎉</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${name}, your account has been created.</p>

    ${tempPassword ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">Your Login Credentials</p>
      <p style="margin:0;font-size:14px;color:#166534;">Email: <strong>${to}</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#166534;">Password: <strong style="font-family:monospace;font-size:16px;letter-spacing:1px;">${tempPassword}</strong></p>
    </div>
    <p style="margin:0 0 24px;font-size:13px;color:#ef4444;font-weight:500;">⚠️ Please change your password after your first login.</p>
    ` : ''}

    <a href="${APP_URL}/login" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Login to ${APP_NAME}
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;">Need help? Contact your school administrator.</p>
  `);

  await sendEmail({
    to,
    toName: name,
    subject: `Welcome to ${APP_NAME} — Your Account is Ready`,
    html,
    text: tempPassword
      ? `Hi ${name}, your account is ready. Email: ${to} | Temp Password: ${tempPassword} | Login: ${APP_URL}/login`
      : `Hi ${name}, welcome to ${APP_NAME}. Login at ${APP_URL}/login`,
  });
}

export async function sendPasswordResetOtpEmail(
  to: string,
  name: string,
  otp: string,
  expiryMinutes = 10,
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Password Reset OTP</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${name}, use the code below to reset your password.</p>

    <div style="text-align:center;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your OTP</p>
      <p style="margin:0;font-size:42px;font-weight:800;color:#0f766e;letter-spacing:12px;font-family:monospace;">${otp}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">Valid for <strong>${expiryMinutes} minutes</strong></p>
    </div>

    <p style="margin:0;font-size:13px;color:#ef4444;font-weight:500;">
      🔒 Never share this OTP with anyone. ${APP_NAME} will never ask for it.
    </p>
  `);

  await sendEmail({
    to,
    toName: name,
    subject: `${otp} is your ${APP_NAME} password reset OTP`,
    html,
    text: `Hi ${name}, your ${APP_NAME} password reset OTP is: ${otp}. Valid for ${expiryMinutes} minutes. Do not share it.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset Your Password</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Click the button below to reset your password. This link expires in 1 hour.</p>
    <a href="${resetLink}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Reset Password
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">If you didn't request this, you can safely ignore this email.</p>
  `);

  await sendEmail({
    to,
    subject: `Reset your ${APP_NAME} password`,
    html,
    text: `Reset your ${APP_NAME} password: ${resetLink}`,
  });
}
