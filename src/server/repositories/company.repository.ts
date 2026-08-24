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
        select: { number: true }, // fetch ALL numbers (no take:1)
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
      assignedNumber: (company as any).phoneNumbers?.[0]?.number || null, // legacy: first number
      assignedNumbers: ((company as any).phoneNumbers || []).map((p: any) => p.number).filter(Boolean), // ALL numbers
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
          phoneNumbers: { select: { number: true } },
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
    include: { creditBalance: true, childCompanies: true, members: true, phoneNumbers: true } 
  });
  if (!company || company.isDemo) {
    return false;
  }

  // If this is a CHILD (sub-company), hard-delete it fully so the user's
  // credentials are completely cleared on the main website.
  if (company.parentCompanyId) {
    const parentId = company.parentCompanyId;
    await prisma.$transaction(async (tx) => {
      
      // --- Safe Deletion Sync Logic ---
      
      // 1. Rollback Credits to Parent
      const remainingCredits = company.creditBalance?.creditsRemaining || 0;
      const usedCredits = company.creditBalance?.creditsUsed || 0;
      if (remainingCredits > 0 || usedCredits > 0) {
        await tx.creditBalance.updateMany({
          where: { companyId: parentId },
          data: {
            creditsRemaining: { increment: remainingCredits },
            creditsUsed: { increment: usedCredits }
          }
        });
      }

      // 2. Re-parent Call Logs (inbound and outbound)
      const callLogs = await tx.callLog.findMany({ 
        where: { companyId: id },
        select: { id: true, callLogId: true, publicId: true }
      });
      if (callLogs.length > 0) {
        await Promise.all(
          callLogs.map((log) =>
            tx.callLog.update({
              where: { id: log.id },
              data: {
                companyId: parentId,
                callLogId: `${log.callLogId}-sub-${id.slice(-4)}`,
                publicId: `${log.publicId}-sub-${id.slice(-4)}`,
              }
            })
          )
        );
      }

      // Unassign phone numbers (if any) and suffix them to prevent ID collision in the unassigned pool
      const phoneNumbers = await tx.phoneNumber.findMany({ 
        where: { companyId: id },
        select: { id: true, phoneNumberId: true, publicId: true, number: true }
      });
      if (phoneNumbers.length > 0) {
        await Promise.all(
          phoneNumbers.map((phone) =>
            tx.phoneNumber.update({
              where: { id: phone.id },
              data: {
                companyId: null,
                assignedParentTenantId: parentId,
                phoneNumberId: `${phone.phoneNumberId}-sub-${id.slice(-4)}`,
                publicId: `${phone.publicId}-sub-${id.slice(-4)}`,
                number: `${phone.number}-sub-${id.slice(-4)}`,
              }
            })
          )
        );
      }

      // --- Continue Hard Deletion (leaves first, then company) ---
      
      await Promise.all([
        tx.campaignInvitation.deleteMany({ where: { companyId: id } }),
        tx.supportRequest.deleteMany({ where: { companyId: id } }),
        tx.billingQuote.deleteMany({ where: { companyId: id } }),
        tx.callInternalNote.deleteMany({ where: { companyId: id } }),
        tx.callTranscript.deleteMany({ where: { callLog: { companyId: id } } }),
        tx.callLogProviderEvent.deleteMany({ where: { callLog: { companyId: id } } }),
        tx.contactRetryJob.deleteMany({ where: { companyId: id } }),
        tx.campaignDocument.deleteMany({ where: { companyId: id } }),
        tx.campaignActivity.deleteMany({ where: { companyId: id } }),
        
        // Call logs are now owned by the parent, so they won't be deleted here
        tx.callLog.deleteMany({ where: { companyId: id } }),
        tx.dialerCall.deleteMany({ where: { companyId: id } }),
        tx.campaignExecution.deleteMany({ where: { companyId: id } }),
        tx.campaign.deleteMany({ where: { companyId: id } }),
        tx.outboundCampaign.deleteMany({ where: { companyId: id } }),
        tx.lead.deleteMany({ where: { companyId: id } }),
        tx.leadSource.deleteMany({ where: { companyId: id } }),
        tx.leadPipelineStage.deleteMany({ where: { companyId: id } }),
        tx.uploadedContact.deleteMany({ where: { companyId: id } }),
        tx.agentCommunicationChannel.deleteMany({ where: { companyId: id } }),
        tx.agentPromptTemplate.deleteMany({ where: { companyId: id } }),
        tx.knowledgeSource.deleteMany({ where: { companyId: id } }),
        tx.aiAgent.deleteMany({ where: { companyId: id } }),
        tx.companyChannel.deleteMany({ where: { companyId: id } }),
        tx.companySetupConfig.deleteMany({ where: { companyId: id } }),
        tx.companyContact.deleteMany({ where: { companyId: id } }),
        tx.companyBillingRates.deleteMany({ where: { companyId: id } }),
        tx.billingSubscription.deleteMany({ where: { companyId: id } }),
        tx.billingInvoice.deleteMany({ where: { companyId: id } }),
        tx.creditUsage.deleteMany({ where: { companyId: id } }),
        tx.creditBalance.deleteMany({ where: { companyId: id } }),
        tx.phoneNumber.deleteMany({ where: { companyId: id } }),
        tx.invitation.deleteMany({ where: { companyId: id } }),
        tx.companyMember.deleteMany({ where: { companyId: id } }),
        tx.apiKey.deleteMany({ where: { companyId: id } }),
        tx.auditLog.deleteMany({ where: { companyId: id } }),
        tx.notification.deleteMany({ where: { companyId: id } }),
        tx.systemEvent.deleteMany({ where: { companyId: id } }),
        tx.analyticsSnapshot.deleteMany({ where: { companyId: id } }),
        tx.schedulerEvent.deleteMany({ where: { companyId: id } }),
        tx.integration.deleteMany({ where: { companyId: id } }),
        tx.webhookEndpoint.deleteMany({ where: { companyId: id } }),
        tx.csvImportBatch.deleteMany({ where: { companyId: id } }),
        tx.role.deleteMany({ where: { companyId: id } }),
        tx.channel.deleteMany({ where: { companyId: id } }),
        tx.companyResourceSequence.deleteMany({ where: { companyId: id } }),
      ]);
      
      // Finally delete the company itself
      await tx.company.delete({ where: { id } });
    }, { maxWait: 15000, timeout: 60000 });
    return true;
  }

  // For PARENT companies — keep suspend behavior (safer, preserves history)
  const blockedUntil = new Date();
  blockedUntil.setMonth(blockedUntil.getMonth() + 6);

  await prisma.company.update({
    where: { id },
    data: {
      status: "SUSPENDED",
      blockedUntil,
    }
  });

  // Also suspend all child companies
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

  const result = await prisma.$transaction(async (tx) => {
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
      const matchingCalls = await tx.callLog.findMany({
        where: {
          phoneNumber: { number: cleanedNumber },
          direction: "INBOUND",
          companyId: { not: subCompanyId }
        },
      });

      if (matchingCalls.length > 0) {
        // Deduplicate calls by callLogId to prevent double cloning
        const uniqueCalls = new Map<string, any>();
        for (const call of matchingCalls) {
          if (call.callLogId) {
            uniqueCalls.set(call.callLogId, call);
          }
        }

        let totalCreditsToDeduct = 0;

        for (const call of Array.from(uniqueCalls.values())) {
          const credits = call.creditsUsed || 0;
          
          try {
            await tx.callLog.upsert({
              where: {
                companyId_callLogId: {
                  companyId: subCompanyId,
                  callLogId: call.callLogId
                }
              },
              update: {},
              create: {
                companyId: subCompanyId,
                callLogId: call.callLogId,
                publicId: call.publicId || `CLONED-${call.callLogId}`,
                direction: call.direction,
                status: call.status,
                startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
                durationSeconds: call.durationSeconds,
                recordingUrl: call.recordingUrl,
                transcriptUrl: call.transcriptUrl,
                creditsUsed: credits,
                provider: call.provider,
                providerCallId: call.providerCallId,
                providerWebhook: call.providerWebhook
              }
            });
            totalCreditsToDeduct += credits;
          } catch (e) {
            // Ignore if it already exists or fails
          }
        }

        // Deduct credits for past calls from the sub-company
        if (totalCreditsToDeduct > 0) {
          await tx.creditBalance.updateMany({
            where: { companyId: subCompanyId },
            data: {
              creditsRemaining: { decrement: totalCreditsToDeduct },
              creditsUsed: { increment: totalCreditsToDeduct },
            },
          });

          await tx.creditUsage.create({
            data: {
              companyId: subCompanyId,
              amount: totalCreditsToDeduct,
              reason: "CALL",
              description: `Deducted credits for ${uniqueCalls.size} past inbound calls upon number assignment`,
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

  // Fire webhook after transaction
  try {
    const fullCompany = await prisma.company.findUnique({
      where: { id: subCompanyId },
      include: {
        members: {
          where: { role: "OWNER", status: "ACTIVE" },
          include: { user: true }
        },
        creditBalance: true
      }
    });
    const user = fullCompany?.members?.[0]?.user;
    if (user && user.email) {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subcompany_approved",
          email: user.email,
          subcompanyName: fullCompany.name,
          assignedNumber: assignedNumber || "Pending",
          credits: fullCompany.creditBalance?.creditsRemaining || 0
        }),
      }).catch(err => console.error("Failed to send subcompany approved webhook:", err));
    }
  } catch (e) {
    console.error("Failed to process subcompany approved webhook:", e);
  }

  return result;
}
