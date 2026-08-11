import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";
import { normalizeCli } from "@/src/server/lib/cli";
import { generateUniqueCompanyCode } from "@/src/server/lib/company-code";
import { companySlugFromName } from "@/src/server/lib/company-slug";
import { generateUniqueContractId } from "@/src/server/lib/contract-id";

export async function createCompanyForAdmin(input: { 
  name: string; 
  cli: string; 
  pendingUserEmail?: string; 
}) {
  const name = input.name.trim();
  const cli = normalizeCli(input.cli);
  if (!cli) {
    throw new Error("CLI must be 2-5 uppercase letters.");
  }

  const contractId = await generateUniqueContractId(prisma);
  const companyCode = await generateUniqueCompanyCode(prisma);
  const slug = companySlugFromName(name);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        slug,
        contractId,
        cli,
        companyCode,
        ownerUserId: null,
      },
    });

    await tx.creditBalance.create({
      data: {
        companyId: company.id,
        creditsRemaining: 0,
        creditsUsed: 0,
      },
    });

    if (input.pendingUserEmail) {
      // Find the user or create a placeholder User in DB
      let user = await tx.user.findFirst({
        where: { email: input.pendingUserEmail },
      });
      
      if (!user) {
        user = await tx.user.create({
          data: {
            email: input.pendingUserEmail,
            clerkUserId: `local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            status: "ACTIVE",
          }
        });
      }

      // Make them the owner
      await tx.company.update({
        where: { id: company.id },
        data: { ownerUserId: user.id },
      });

      // Add CompanyMember
      await tx.companyMember.create({
        data: {
          companyId: company.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: new Date(),
        }
      });

      // Update PendingApproval status
      await tx.pendingApproval.update({
        where: { email: input.pendingUserEmail },
        data: { status: "APPROVED" },
      });
    }

    return company;
  });
}

export async function listCompaniesForAdmin() {
  const threshold = getLowCreditThreshold();

  const companies = await prisma.company.findMany({
    where: { isDemo: false },
    orderBy: { createdAt: "desc" },
    include: {
      creditBalance: true,
      contact: true,
      setupConfig: true,
      _count: { select: { aiAgents: true } },
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true } } },
      },
    },
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    contractId: company.contractId,
    cli: company.cli,
    companyCode: company.companyCode,
    claimed: company.ownerUserId != null,
    createdAt: company.createdAt,
    creditsRemaining: company.creditBalance?.creditsRemaining ?? 0,
    creditsUsed: company.creditBalance?.creditsUsed ?? 0,
    totalChannels: company.setupConfig?.totalChannels ?? 0,
    agentCount: company._count.aiAgents,
    agentsAllocated: company.setupConfig?.agentsAllocated ?? 0,
    pocEmail: company.ownerUserId
      ? (company.members[0]?.user.email ?? company.contact?.email ?? "—")
      : (company.contact?.email ?? "—"),
    lowCredit: (company.creditBalance?.creditsRemaining ?? 0) < threshold,
  }));
}

export async function getCompanyById(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      creditBalance: true,
      contact: true,
      setupConfig: true,
      billingRates: true,
      channels: {
        orderBy: { channelIndex: "asc" },
        include: { phoneNumber: true },
      },
      phoneNumbers: { orderBy: { number: "asc" } },
      aiAgents: {
        orderBy: { createdAt: "desc" },
        include: {
          libraryEntry: { select: { name: true, slug: true } },
          communicationChannels: { orderBy: { type: "asc" } },
        },
      },
      billingSubscription: true,
      billingInvoices: { orderBy: { issuedAt: "desc" }, take: 10 },
      campaigns: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          resourceKey: true,
          aiEnabled: true,
          createdAt: true,
          execution: { select: { status: true } },
        },
      },
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!company || company.isDemo) {
    return null;
  }

  return company;
}

export async function deleteCompanyById(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company || company.isDemo) {
    return false;
  }

  await prisma.company.delete({
    where: { id },
  });
  return true;
}

export async function deleteAllCompanies() {
  await prisma.company.deleteMany({
    where: { isDemo: false },
  });
  return true;
}
