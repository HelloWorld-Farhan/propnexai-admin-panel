const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { name: true, settings: true, ownerUserId: true } });
  console.log(JSON.stringify(c, null, 2));
}
main().finally(() => prisma.$disconnect());
