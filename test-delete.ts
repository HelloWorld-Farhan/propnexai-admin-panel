import { PrismaClient } from '@prisma/client';
import { deleteCompanyById } from './src/server/repositories/company.repository';

const prisma = new PrismaClient();

async function main() {
  try {
    const child = await prisma.company.findFirst({ where: { name: 'Demo1' } });
    if (!child) {
      console.log('Demo1 not found');
      return;
    }
    console.log('Deleting', child.id);
    const success = await deleteCompanyById(child.id);
    console.log('Success:', success);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
