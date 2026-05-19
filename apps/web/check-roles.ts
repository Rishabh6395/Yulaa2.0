import prisma from './src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['priya.teacher@dps45.edu.in', 'parent.singh@gmail.com'] } },
    include: { userRoles: { include: { role: true }, orderBy: { isPrimary: 'desc' } } }
  });
  for (const u of users) {
    console.log(`${u.email}:`);
    for (const ur of u.userRoles) {
      console.log(`  ${ur.role.code} isPrimary=${ur.isPrimary}`);
    }
  }
  await prisma.$disconnect();
}
main().catch(console.error);
