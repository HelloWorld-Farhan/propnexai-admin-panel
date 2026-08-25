const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const numbers = await prisma.phoneNumber.findMany({
    include: { company: true }
  });
  let count = 0;
  for (const n of numbers) {
    if (n.companyId && !n.company) {
      console.log('Deleting orphaned number:', n.number, n.id);
      await prisma.phoneNumber.delete({
        where: { id: n.id }
      });
      count++;
    }
  }
  console.log('Done, deleted', count, 'orphaned numbers');
}
main();
