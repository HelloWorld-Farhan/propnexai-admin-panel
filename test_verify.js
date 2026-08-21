const { verifySubCompany } = require("./dist/server/repositories/company.repository.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const c = await prisma.company.findFirst({ where: { name: "schoolKnot" } });
  const p = await prisma.company.findFirst({ where: { name: "DeveloperTest" } });
  
  console.log("Before verification:");
  let cBal = await prisma.creditBalance.findFirst({ where: { companyId: c.id } });
  let pBal = await prisma.creditBalance.findFirst({ where: { companyId: p.id } });
  console.log("SchoolKnot:", cBal.creditsRemaining, cBal.creditsUsed);
  console.log("DeveloperTest:", pBal.creditsRemaining, pBal.creditsUsed);

  // Call the verify function
  await verifySubCompany(c.id, p.id, "07971501546");
  
  console.log("After verification:");
  cBal = await prisma.creditBalance.findFirst({ where: { companyId: c.id } });
  pBal = await prisma.creditBalance.findFirst({ where: { companyId: p.id } });
  console.log("SchoolKnot:", cBal.creditsRemaining, cBal.creditsUsed);
  console.log("DeveloperTest:", pBal.creditsRemaining, pBal.creditsUsed);
  
  const calls = await prisma.callLog.findMany({ where: { companyId: c.id } });
  console.log("SchoolKnot calls:", calls.length);
}

run().then(() => prisma.$disconnect()).catch(console.error);
