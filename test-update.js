const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { slug: "schoolknot" }});
  console.log("Schoolknot company ID:", company.id);

  const balance = await prisma.creditBalance.findUnique({ where: { companyId: company.id }});
  console.log("Current balance:", balance);

  const updated = await prisma.creditBalance.update({
    where: { companyId: company.id },
    data: { creditsRemaining: { increment: -10 } }
  });
  console.log("Updated balance:", updated);

  const newBalance = await prisma.creditBalance.findUnique({ where: { companyId: company.id }});
  console.log("New balance after increment -10:", newBalance);
  
  // Revert
  await prisma.creditBalance.update({
    where: { companyId: company.id },
    data: { creditsRemaining: { increment: +10 } }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
