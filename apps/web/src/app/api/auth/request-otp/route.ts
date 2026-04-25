import { sendOtp } from '@/modules/otp/otp.service';
import { handleError, AppError } from '@/utils/errors';

/** POST /api/auth/request-otp — mobile phone login step 1, public */
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) throw new AppError('phone is required');
    await sendOtp(phone);
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
