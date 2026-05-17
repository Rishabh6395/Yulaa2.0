import prisma from './src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({
    select: { 
      email: true, status: true, 
      userRoles: { select: { role: { select: { code: true } }, school: { select: { name: true } }, isPrimary: true } } 
    },
    take: 30
  });
  for (const u of users) {
    const roles = u.userRoles.map(r => `${r.role.code}@${r.school?.name ?? 'global'}`).join(', ');
    console.log(`${u.email} [${u.status}] → ${roles}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
