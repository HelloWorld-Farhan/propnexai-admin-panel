import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";
import { normalizeCli } from "@/src/server/lib/cli";
import { generateUniqueCompanyCode } from "@/src/server/lib/company-code";
import { companySlugFromName } from "@/src/server/lib/company-slug";
import { generateUniqueContractId } from "@/src/server/lib/contract-id";
import { generatePublicId, allocatePhoneNumberEntityId } from "@/src/server/lib/public-id";

export async function createCompanyForAdmin(input: { 
  name: string; 
  cli: string; 
  pendingUserEmail?: string; 
  assignedNumber?: string;
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
        assignedNumber: input.assignedNumber || null,
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

    if (input.assignedNumber) {
      const phoneNumberId = await allocatePhoneNumberEntityId(tx, company.id);
      const publicId = generatePublicId(company.cli, "UNASSIGNED", phoneNumberId);

      await tx.phoneNumber.create({
        data: {
          companyId: company.id,
          phoneNumberId,
          publicId,
          number: input.assignedNumber.trim(),
          provider: "PROPNEX",
          status: "ACTIVE",
        },
      });
    }

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
  }, {
    maxWait: 10000,
    timeout: 30000,
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
    assignedNumber: company.assignedNumber || null,
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

  let ownerEmail = "";
  let ownerName = "";
  if (company.ownerUserId) {
    const owner = await prisma.user.findUnique({ where: { id: company.ownerUserId } });
    if (owner) {
      ownerEmail = owner.email;
      ownerName = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
    }
  }

  // Pre-delete models to clean up DB
  await prisma.lead.deleteMany({ where: { companyId: id } });
  await prisma.phoneNumber.deleteMany({ where: { companyId: id } });
  await prisma.companyMember.deleteMany({ where: { companyId: id } });

  // Use runCommandRaw to fully bypass Prisma's emulated cascades so CallLogs are kept intact forever
  await prisma.$runCommandRaw({
    delete: "Company",
    deletes: [{ q: { _id: { $oid: id } }, limit: 1 }]
  });

  if (company.ownerUserId) {
    try {
      await prisma.user.deleteMany({ where: { id: company.ownerUserId } });
    } catch (e) {
      console.error("Could not delete user:", e);
    }
  }

  if (ownerEmail) {
    try {
      await prisma.pendingApproval.deleteMany({ where: { email: ownerEmail } });
    } catch (e) {
      console.error("Could not delete pending approval:", e);
    }

    const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "user_deleted",
        name: ownerName,
        email: ownerEmail
      })
    }).catch(err => console.error("Webhook trigger failed:", err));
  }

  return true;
}

export async function deleteAllCompanies() {
  await prisma.company.deleteMany({
    where: { isDemo: false },
  });
  return true;
}
