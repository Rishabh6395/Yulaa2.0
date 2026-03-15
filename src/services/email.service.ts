/**
 * Email service — stub for future integration (SendGrid, Resend, Nodemailer, etc.)
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[EmailService] (dev — not sent)', payload.subject, '->', payload.to);
    return;
  }
  // TODO: integrate email provider
  throw new Error('Email service not configured');
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}!`,
    html: `<p>Hi ${name}, welcome aboard.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  });
}
