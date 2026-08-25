const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const numbers = await prisma.phoneNumber.findMany({});
  let count = 0;
  for (const n of numbers) {
    if (!n.direction && n.companyId) {
      await prisma.phoneNumber.update({
        where: { id: n.id },
        data: { direction: 'INBOUND' }
      });
      count++;
    }
  }
  console.log('Done, updated', count, 'numbers manually');
}
main();
