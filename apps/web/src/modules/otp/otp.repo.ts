import prisma from '@/lib/prisma';

export async function upsertOtp(phone: string, email: string | null, otp: string, expiresAt: Date) {
  // Delete old unverified OTPs for this phone before inserting fresh one
  await prisma.otpVerification.deleteMany({ where: { phone, verified: false } });
  return prisma.otpVerification.create({ data: { phone, email, otp, expiresAt } });
}

export async function findValidOtp(phone: string, otp: string) {
  return prisma.otpVerification.findFirst({
    where: { phone, otp, verified: false, expiresAt: { gt: new Date() } },
  });
}

export async function markVerified(id: string) {
  return prisma.otpVerification.update({ where: { id }, data: { verified: true } });
}
