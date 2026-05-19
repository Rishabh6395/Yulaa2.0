import prisma from './src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, passwordHash: true },
    take: 5
  });
  for (const u of users) {
    console.log(`${u.email}: hash starts with ${u.passwordHash?.substring(0,10)}...`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
