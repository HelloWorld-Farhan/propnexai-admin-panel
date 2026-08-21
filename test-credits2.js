const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const companyId = '6a86f276cc43528d28d018db';
    const amount = 5000;
    const description = 'Approved credit request';
    const res = await prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.upsert({
        where: { companyId },
        create: { companyId, creditsRemaining: amount, creditsUsed: 0 },
        update: { creditsRemaining: { increment: amount } },
      });
      await tx.creditUsage.create({
        data: { companyId, amount, reason: 'MANUAL_ADJUSTMENT', description },
      });
      
      try {
        await prisma.$runCommandRaw({
          insert: "BillingHistory",
          documents: [
            {
              companyId: { $oid: companyId },
              date: { $date: new Date().toISOString() },
              description: description || "Credit Top-up via Admin",
              type: "Top-up",
              credits: amount,
              amount: 0,
              status: "Completed",
            }
          ]
        });
      } catch (err) {
        console.error("Failed to insert into BillingHistory:", err);
      }
      
      await tx.supportRequest.updateMany({
        where: {
          companyId,
          reason: "BILLING_CREDITS",
          status: "NEW"
        },
        data: { status: "RESOLVED" }
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
