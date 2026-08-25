const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const numbers = await prisma.phoneNumber.findMany({
    where: { companyId: null }
  });
  console.log('Unassigned numbers:', numbers.length);
  for (const n of numbers) {
    if (n.publicId && n.publicId.includes('-sub-')) {
      console.log('Orphaned from subcompany:', n.number);
      await prisma.phoneNumber.delete({ where: { id: n.id } });
    }
  }
}
main();
