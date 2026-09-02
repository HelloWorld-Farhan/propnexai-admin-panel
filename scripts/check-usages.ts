import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "satish@schoolknot.com" }
  });
  if (!user) { console.log("User not found!"); return; }
  
  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id }
  });
  if (!member) { console.log("Member not found!"); return; }
  
  const companyId = member.companyId;
  const usages = await prisma.creditUsage.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log("Recent CreditUsages:", JSON.stringify(usages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
