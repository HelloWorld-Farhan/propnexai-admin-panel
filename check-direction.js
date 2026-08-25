const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const numbers = await prisma.phoneNumber.findMany({});
  console.log('Total numbers:', numbers.length);
  const nullDir = numbers.filter(n => !n.direction);
  console.log('Numbers without direction:', nullDir.length);
  if (nullDir.length > 0) {
    console.log(nullDir[0]);
  }
}
main();
