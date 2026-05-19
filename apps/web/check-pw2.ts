import bcrypt from 'bcryptjs';
import prisma from './src/lib/prisma';
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'superadmin@yulaa.ai' }, select: { passwordHash: true } });
  const passwords = ['Admin@123', 'admin@123', 'Password@1', 'Yulaa@123', 'Admin123', 'admin123', 'password', 'Yulaa2024', '12345678'];
  for (const pw of passwords) {
    const ok = await bcrypt.compare(pw, user!.passwordHash!);
    if (ok) { console.log('PASSWORD FOUND:', pw); break; }
  }
  console.log('Done checking');
  await prisma.$disconnect();
}
main().catch(console.error);
