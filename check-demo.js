const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
const prisma = new PrismaClient();
prisma.company.findFirst({ where: { name: 'Demo1' } })
  .then(c => console.log('Found:', c?.id))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
