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

  // Fetch ALL non-demo companies — we filter sub-companies in JS because
  // Prisma's `parentCompanyId: null` filter doesn't match missing MongoDB fields
  const companies = await prisma.company.findMany({
    where: { 
      isDemo: false, status: { not: "SUSPENDED" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      creditBalance: true,
      contact: true,
      setupConfig: true,
      _count: { select: { aiAgents: true, childCompanies: true } },
      childCompanies: { select: { status: true } },
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true } } },
      },
      phoneNumbers: {
        take: 1,
        select: { number: true },
      },
    },
  });

  // Filter out sub-companies (those that have a real parentCompanyId set)
  const parentCompanies = companies.filter((c) => !c.parentCompanyId);

  return parentCompanies.map((company) => {
    // Sum credits of parent and all its child companies
    const childComps = companies.filter((c) => c.parentCompanyId === company.id);
    const childCredits = childComps.reduce((sum, c) => sum + (c.creditBalance?.creditsRemaining ?? 0), 0);
    const parentCredits = company.creditBalance?.creditsRemaining ?? 0;
    const totalCredits = parentCredits + childCredits;

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      status: company.status,
      contractId: company.contractId,
      cli: company.cli,
      companyCode: company.companyCode,
      claimed: company.ownerUserId != null,
      createdAt: company.createdAt,
      creditsRemaining: totalCredits,
      creditsUsed: company.creditBalance?.creditsUsed ?? 0,
      totalChannels: company.setupConfig?.totalChannels ?? 0,
      agentCount: company._count.aiAgents,
      childCompanyCount: company._count.childCompanies,
      unverifiedChildCompanyCount: company.childCompanies?.filter((c: any) => c.status !== "ACTIVE").length || 0,
      agentsAllocated: company.setupConfig?.agentsAllocated ?? 0,
      pocEmail: company.ownerUserId
        ? (company.members[0]?.user.email ?? company.contact?.email ?? "—")
        : (company.contact?.email ?? "—"),
      lowCredit: totalCredits < threshold,
      assignedNumber: (company as any).phoneNumbers?.[0]?.number || null,
    };
  });
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
      childCompanies: {
        orderBy: { createdAt: "desc" },
        include: { 
          phoneNumbers: { take: 1, select: { number: true } },
          creditBalance: { select: { creditsRemaining: true } }
        },
      },
    },
  });

  if (!company || company.isDemo) {
    return null;
  }

  const sharedNumbers = await prisma.phoneNumber.findMany({
    where: { assignedParentTenantId: id },
    orderBy: { number: "asc" },
  });

  if (sharedNumbers.length > 0) {
    (company as any).phoneNumbers = [...company.phoneNumbers, ...sharedNumbers];
  }

  return company;
}

export async function deleteCompanyById(id: string) {
  const company = await prisma.company.findUnique({ 
    where: { id },
    include: { creditBalance: true, childCompanies: true } 
  });
  if (!company || company.isDemo) {
    return false;
  }

  const blockedUntil = new Date();
  blockedUntil.setMonth(blockedUntil.getMonth() + 6);

  await prisma.company.update({
    where: { id },
    data: {
      status: "SUSPENDED",
      blockedUntil,
    }
  });

  // Also block all child companies
  if (company.childCompanies && company.childCompanies.length > 0) {
    await prisma.company.updateMany({
      where: { parentCompanyId: id },
      data: {
        status: "SUSPENDED",
        blockedUntil,
      }
    });
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

  if (ownerEmail) {
    const { notificationService } = require("@/src/server/services/notification.service");
    notificationService.sendCompanyBlockedEmail({
      companyName: company.name,
      ownerName,
      email: ownerEmail,
      blockedUntil: blockedUntil.toISOString()
    }).catch((err: any) => console.error("Webhook trigger failed:", err));
  }

  return true;
}

export async function deleteAllCompanies() {
  await prisma.company.deleteMany({
    where: { isDemo: false },
  });
  return true;
}

export async function verifySubCompany(
  subCompanyId: string,
  parentCompanyId: string,
  assignedNumber: string,
) {
  // Validate the sub-company exists and belongs to the parent
  const existing = await prisma.company.findUnique({
    where: { id: subCompanyId },
  });

  if (!existing) {
    throw new Error("Sub-company not found");
  }

  if ((existing as any).parentCompanyId !== parentCompanyId) {
    throw new Error("Sub-company does not belong to the specified parent");
  }

  return prisma.$transaction(async (tx) => {
    // Activate the child company
    const updated = await tx.company.update({
      where: { id: subCompanyId },
      data: { status: "ACTIVE" } as any,
    });

    // Assign the phone number to the child company
    if (assignedNumber?.trim()) {
      const phoneNumberId = await allocatePhoneNumberEntityId(tx, subCompanyId);
      const publicId = generatePublicId(existing.cli, "UNASSIGNED", phoneNumberId);
      const cleanedNumber = assignedNumber.trim();

      await tx.phoneNumber.create({
        data: {
          companyId: subCompanyId,
          phoneNumberId,
          publicId,
          number: cleanedNumber,
          provider: "PROPNEX",
          status: "ACTIVE",
          // Link back to parent tenant for shared number visibility
          assignedParentTenantId: parentCompanyId,
        },
      });

      // Transfer past inbound calls from parent to sub-company
      const pastCalls = await tx.callLog.findMany({
        where: {
          companyId: parentCompanyId,
          direction: "INBOUND",
        },
      });

      const matchingCalls = pastCalls.filter((call) => {
        const payload = call.providerWebhook as any;
        if (!payload) return false;
        const calledNo = String(payload.callid || payload.calledno || "");
        return calledNo && calledNo.includes(cleanedNumber);
      });

      if (matchingCalls.length > 0) {
        const callIds = matchingCalls.map(c => c.id);
        const totalCreditsToDeduct = matchingCalls.reduce((sum, c) => sum + (c.creditsUsed || 0), 0);

        // Reassign calls to sub-company
        await tx.callLog.updateMany({
          where: { id: { in: callIds } },
          data: { companyId: subCompanyId },
        });

        // Deduct credits for past calls from the sub-company
        if (totalCreditsToDeduct > 0) {
          await tx.creditBalance.updateMany({
            where: { companyId: subCompanyId },
            data: {
              creditsRemaining: { decrement: totalCreditsToDeduct },
              creditsUsed: { increment: totalCreditsToDeduct },
            },
          });

          // Refund the parent company
          await tx.creditBalance.updateMany({
            where: { companyId: parentCompanyId },
            data: {
              creditsRemaining: { increment: totalCreditsToDeduct },
              creditsUsed: { decrement: totalCreditsToDeduct },
            },
          });

          await tx.creditUsage.create({
            data: {
              companyId: subCompanyId,
              amount: totalCreditsToDeduct,
              reason: "CALL",
              description: `Deducted credits for ${matchingCalls.length} past inbound calls upon number assignment`,
            },
          });

          // Refund the parent company since the sub-company is now paying for these past calls out of its allocated chunk
          await tx.creditBalance.updateMany({
            where: { companyId: parentCompanyId },
            data: {
              creditsRemaining: { increment: totalCreditsToDeduct },
              creditsUsed: { decrement: totalCreditsToDeduct },
            },
          });
        }
      }
    }

    return updated;
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
}
