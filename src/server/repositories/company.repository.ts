import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";
import { companySlugFromName } from "@/src/server/lib/company-slug";
import { generateUniqueContractId } from "@/src/server/lib/contract-id";

export async function createCompanyForAdmin(input: { name: string }) {
  const name = input.name.trim();
  const contractId = await generateUniqueContractId(prisma);
  const slug = companySlugFromName(name);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        slug,
        contractId,
      },
    });

    await tx.creditBalance.create({
      data: {
        companyId: company.id,
        creditsRemaining: 0,
        creditsUsed: 0,
      },
    });

    return company;
  });
}

export async function listCompaniesForAdmin() {
  const threshold = getLowCreditThreshold();

  const companies = await prisma.company.findMany({
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
    claimed: company.ownerUserId != null,
    createdAt: company.createdAt,
    creditsRemaining: company.creditBalance?.creditsRemaining ?? 0,
    creditsUsed: company.creditBalance?.creditsUsed ?? 0,
    totalChannels: company.setupConfig?.totalChannels ?? 0,
    agentCount: company._count.aiAgents,
    agentsAllocated: company.setupConfig?.agentsAllocated ?? 0,
    pocEmail: company.contact?.email ?? company.members[0]?.user.email ?? "—",
    lowCredit: (company.creditBalance?.creditsRemaining ?? 0) < threshold,
  }));
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
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
        include: { libraryEntry: { select: { name: true, slug: true } } },
      },
      billingSubscription: true,
      billingInvoices: { orderBy: { issuedAt: "desc" }, take: 10 },
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      },
    },
  });
}
