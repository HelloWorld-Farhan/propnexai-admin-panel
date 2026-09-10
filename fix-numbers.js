const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nums = await prisma.phoneNumber.findMany();
  let updated = 0;
  for (const n of nums) {
    const cleaned = n.number.replace(/[\s-()]/g, '').trim();
    if (cleaned !== n.number) {
      await prisma.phoneNumber.update({
        where: { id: n.id },
        data: { number: cleaned }
      });
      console.log(`Updated ${n.number} -> ${cleaned}`);
      updated++;
    }
  }
  console.log('Fixed ' + updated + ' numbers');
}

main().catch(console.error).finally(() => prisma.$disconnect());
