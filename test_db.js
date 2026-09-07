require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.company.findMany({ where: { tenantType: 'CHILD' }});
  console.log('Subcompanies:', c.length);
  await prisma.$disconnect();
}
run();
