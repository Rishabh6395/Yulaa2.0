import bcrypt from 'bcryptjs';
import prisma from './src/lib/prisma';
async function main() {
  const hash = await bcrypt.hash('Test@1234', 10);
  const emails = [
    'superadmin@yulaa.ai',
    'admin@dps45.edu.in',
    'priya.teacher@dps45.edu.in',
    'amit.teacher@dps45.edu.in',
    'parent.singh@gmail.com',
    'parent.patel@gmail.com',
    'admin@stmarys.edu.in',
    'ravi.teacher@stmarys.edu.in',
  ];
  for (const email of emails) {
    await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
    console.log(`✓ Reset: ${email}`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
