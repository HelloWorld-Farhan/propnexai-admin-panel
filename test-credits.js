const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const companyId = '6a86f276cc43528d28d018db';
    const amount = 5000;
    const description = 'Test';
    const res = await prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.upsert({
        where: { companyId },
        create: { companyId, creditsRemaining: amount, creditsUsed: 0 },
        update: { creditsRemaining: { increment: amount } },
      });
      await tx.creditUsage.create({
        data: { companyId, amount, reason: 'MANUAL_ADJUSTMENT', description },
      });
      return balance;
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
