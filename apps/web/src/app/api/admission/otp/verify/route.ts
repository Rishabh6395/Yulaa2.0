import { verifyOtp } from '@/modules/otp/otp.service';
import { handleError, AppError } from '@/utils/errors';

/** POST /api/admission/otp/verify — public, no auth */
export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();
    if (!phone || !otp) throw new AppError('phone and otp are required');
    const token = await verifyOtp(phone, otp);
    return Response.json({ verified: true, token });
  } catch (err) { return handleError(err); }
}
