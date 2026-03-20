import { sendOtp } from '@/modules/otp/otp.service';
import { handleError, AppError } from '@/utils/errors';

/** POST /api/admission/otp/send — public, no auth */
export async function POST(request: Request) {
  try {
    const { phone, email } = await request.json();
    if (!phone) throw new AppError('phone is required');
    await sendOtp(phone, email);
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
