const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'propnexai.official@gmail.com' } });
  if (!user) return console.log("User not found");
  const member = await prisma.companyMember.findFirst({ where: { userId: user.id } });
  if (!member) return console.log("Member not found");
  const phoneRecords = await prisma.phoneNumber.findMany({
    where: { 
      OR: [
        { companyId: member.companyId },
        { company: { parentCompanyId: member.companyId } }
      ]
    }
  });
  console.log("Phone records:", JSON.stringify(phoneRecords, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
