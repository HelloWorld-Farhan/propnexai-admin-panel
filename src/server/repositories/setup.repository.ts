import { prisma } from "@/lib/prisma";
import {
  allocatePhoneNumberEntityId,
  generatePublicId,
} from "@/src/server/lib/public-id";
import { notificationService } from "@/src/server/services/notification.service";

export async function upsertCompanyContact(
  companyId: string,
  data: { name: string; email: string; phone?: string; title?: string },
) {
  return prisma.companyContact.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
}

type AdminContactUpdateInput = {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
};

export type AdminContactUpdateResult =
  | { ok: true; contact: Awaited<ReturnType<typeof upsertCompanyContact>> }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function updateCompanyContactForAdmin(
  companyId: string,
  data: AdminContactUpdateInput,
): Promise<AdminContactUpdateResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      claimedAt: true,
      contact: { select: { email: true } },
    },
  });

  if (!company) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const isClaimed = company.claimedAt != null;

  if (!isClaimed) {
    if (!company.contact) {
      return {
        ok: false,
        status: 400,
        error:
          "Owner contact is set when the Contract ID is linked. It cannot be configured before claim.",
      };
    }

    const contact = await upsertCompanyContact(companyId, {
      name: data.name,
      email: company.contact.email,
      phone: data.phone,
      title: data.title,
    });
    return { ok: true, contact };
  }

  const lockedEmail = company.contact?.email;
  if (!lockedEmail) {
    return {
      ok: false,
      status: 400,
      error: "Owner contact email is not available.",
    };
  }

  if (
    data.email &&
    data.email.trim().toLowerCase() !== lockedEmail.toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      error: "Owner email cannot be changed after the Contract ID is linked.",
    };
  }

  const contact = await upsertCompanyContact(companyId, {
    name: data.name,
    email: lockedEmail,
    phone: data.phone,
    title: data.title,
  });
  return { ok: true, contact };
}

export async function upsertSetupConfig(
  companyId: string,
  data: {
    totalChannels: number;
    serviceNumber?: string | null;
    ivrTemplateId?: string | null;
    deltaSeconds: number;
    agentsAllocated: number;
  },
) {
  const serviceNumber = data.serviceNumber?.trim() || null;
  const ivrTemplateId = data.ivrTemplateId?.trim() || null;

  const config = await prisma.companySetupConfig.upsert({
    where: { companyId },
    create: { companyId, ...data, serviceNumber, ivrTemplateId },
    update: { ...data, serviceNumber, ivrTemplateId },
  });

  const existingChannels = await prisma.companyChannel.findMany({
    where: { companyId },
    orderBy: { channelIndex: "asc" },
  });

  if (existingChannels.length < data.totalChannels) {
    const toCreate = [];
    for (let i = existingChannels.length; i < data.totalChannels; i++) {
      toCreate.push({
        companyId,
        channelIndex: i + 1,
        label: `Channel ${i + 1}`,
      });
    }
    if (toCreate.length > 0) {
      await prisma.companyChannel.createMany({ data: toCreate });
    }
  } else if (existingChannels.length > data.totalChannels) {
    const toRemove = existingChannels
      .filter((c) => c.channelIndex > data.totalChannels)
      .map((c) => c.id);
    if (toRemove.length > 0) {
      await prisma.companyChannel.deleteMany({ where: { id: { in: toRemove } } });
    }
  }

  return config;
}

export async function assignChannelPhone(
  companyId: string,
  channelId: string,
  phoneNumber: string | null,
) {
  let phoneNumberId: string | null = null;
  const trimmed = phoneNumber?.trim() ?? "";

  if (trimmed) {
    const phone = await prisma.$transaction(async (tx) => {
      const [company, campaign] = await Promise.all([
        tx.company.findUnique({
          where: { id: companyId },
          select: { cli: true },
        }),
        tx.campaign.findFirst({
          where: { companyId },
          orderBy: { createdAt: "asc" },
          select: { id: true, resourceKey: true },
        }),
      ]);

      if (!company?.cli) {
        throw new Error("Company public identity is not configured");
      }
      if (!campaign?.resourceKey) {
        throw new Error(
          "At least one campaign is required before assigning a phone number",
        );
      }

      const existing = await tx.phoneNumber.findFirst({
        where: {
          companyId,
          campaignId: campaign.id,
          number: trimmed,
        },
      });
      if (existing) {
        return existing;
      }

      const phoneNumberId = await allocatePhoneNumberEntityId(tx, companyId);
      const publicId = generatePublicId(
        company.cli,
        campaign.resourceKey,
        phoneNumberId,
      );

      return tx.phoneNumber.create({
        data: {
          companyId,
          campaignId: campaign.id,
          number: trimmed,
          provider: "PROPNEX",
          phoneNumberId,
          publicId,
        },
      });
    });
    phoneNumberId = phone.id;
  }

  return prisma.companyChannel.update({
    where: { id: channelId, companyId },
    data: { phoneNumberId },
  });
}

export async function addCredits(
  companyId: string,
  amount: number,
  description: string,
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { parentCompanyId: true, name: true }
  });
  
  if (!company) throw new Error("Company not found");
  
  const targetCompanyId = companyId;

  return prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where: { companyId: targetCompanyId },
      create: {
        companyId: targetCompanyId,
        creditsRemaining: amount,
        creditsUsed: 0,
      },
      update: {
        creditsRemaining: { increment: amount },
      },
    });

    await tx.creditUsage.create({
      data: {
        companyId: targetCompanyId,
        amount,
        reason: "MANUAL_ADJUSTMENT",
        description,
      },
    });

    try {
      await prisma.$runCommandRaw({
        insert: "BillingHistory",
        documents: [
          {
            companyId: { $oid: targetCompanyId },
            date: { $date: new Date().toISOString() },
            description: description || "Credit Top-up via Admin",
            type: "Top-up",
            credits: amount,
            amount: 0,
            status: "Completed",
          }
        ]
      });

      // Fire and forget notification
      notificationService.sendCreditUpdateEmail({
        companyName: company.name || targetCompanyId,
        amount,
        newBalance: balance.creditsRemaining,
        type: "TOP_UP"
      }).catch(console.error);

      return balance;
    } catch (err) {
      console.error("Failed to insert into BillingHistory:", err);
    }

    // Resolve any pending Credit Requests for this company
    await tx.supportRequest.updateMany({
      where: {
        companyId,
        reason: "BILLING_CREDITS",
        status: "NEW"
      },
      data: { status: "RESOLVED" }
    });

    // Send webhook for credit update
    try {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        include: { members: { include: { user: true } } }
      });
      if (company && company.members.length > 0) {
        const user = company.members[0].user;
        if (user && user.email) {
          const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "credit_added",
              email: user.email,
              name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email.split("@")[0],
              amount: amount,
            }),
          }).catch(err => console.error("Failed to send credit added webhook:", err));
        }
      }
    } catch (e) {
      console.error("Failed to process credit webhook:", e);
    }

    return balance;
  });
}

export async function updateCredits(
  companyId: string,
  delta: number,
  description: string,
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { parentCompanyId: true, name: true }
  });
  
  if (!company) throw new Error("Company not found");
  
  const targetCompanyId = companyId;

  const result = await prisma.$transaction(async (tx) => {
    if (delta === 0) return null;

    let targetCompanyBalance = await tx.creditBalance.findUnique({
      where: { companyId: targetCompanyId }
    });

    // Handle additions normally
    if (delta > 0) {
      const balance = await tx.creditBalance.upsert({
        where: { companyId: targetCompanyId },
        create: {
          companyId: targetCompanyId,
          creditsRemaining: delta,
          creditsUsed: 0,
        },
        update: {
          creditsRemaining: { increment: delta },
        },
      });

      await tx.creditUsage.create({
        data: {
          companyId: targetCompanyId,
          amount: delta,
          reason: "MANUAL_ADJUSTMENT",
          description: `Admin added ${delta}`,
        },
      });

      try {
        await tx.$runCommandRaw({
          insert: "BillingHistory",
          documents: [{
            companyId: { $oid: targetCompanyId },
            date: { $date: new Date().toISOString() },
            description: description || "Credit Set via Admin",
            type: "Top-up",
            credits: delta,
            amount: 0,
            status: "Completed",
          }]
        });
      } catch (err) {
        console.error("Failed to insert into BillingHistory:", err);
      }

      return balance;
    }

    // Handle deductions (delta < 0)
    const cutAmount = Math.abs(delta);
    const mainCreditsRemaining = Math.max(0, targetCompanyBalance?.creditsRemaining || 0);
    
    // How much the main company can absorb
    const mainCut = Math.min(cutAmount, mainCreditsRemaining);
    const remainder = cutAmount - mainCut;

    // 1. Process Main Company Cut
    let finalMainBalance;
    if (mainCut > 0) {
      finalMainBalance = await tx.creditBalance.update({
        where: { companyId: targetCompanyId },
        data: {
          creditsRemaining: { decrement: mainCut },
          creditsUsed: { increment: mainCut },
        },
      });

      await tx.creditUsage.create({
        data: {
          companyId: targetCompanyId,
          amount: mainCut,
          reason: "MANUAL_ADJUSTMENT",
          description: `Admin deducted ${mainCut}`,
        },
      });
    } else {
      // Main company had no positive balance to absorb — balance stays the same
      finalMainBalance = targetCompanyBalance || await tx.creditBalance.findUnique({
        where: { companyId: targetCompanyId }
      });
    }

    // 2. Process Sub-Companies Cut if there is a remainder
    if (remainder > 0) {
      const childCompanies = await tx.company.findMany({
        where: { parentCompanyId: targetCompanyId, status: { not: "SUSPENDED" } },
        select: { id: true }
      });

      if (childCompanies.length > 0) {
        // Divide remainder evenly
        const subCut = Number((remainder / childCompanies.length).toFixed(4));
        
        for (const child of childCompanies) {
          await tx.creditBalance.upsert({
            where: { companyId: child.id },
            create: {
              companyId: child.id,
              creditsRemaining: -subCut,
              creditsUsed: subCut,
            },
            update: {
              creditsRemaining: { decrement: subCut },
              creditsUsed: { increment: subCut },
            },
          });

          await tx.creditUsage.create({
            data: {
              companyId: child.id,
              amount: subCut,
              reason: "MANUAL_ADJUSTMENT",
              description: `Admin deducted ${subCut} (Cascaded from Parent)`,
            },
          });
          
          try {
            await tx.$runCommandRaw({
              insert: "BillingHistory",
              documents: [{
                companyId: { $oid: child.id },
                date: { $date: new Date().toISOString() },
                description: description || "Credit Cut Cascaded from Parent via Admin",
                type: "Deduction",
                credits: -subCut,
                amount: 0,
                status: "Completed",
              }]
            });
          } catch (err) { console.error("Failed BillingHistory for sub-company:", err); }
        }
      } else {
        // No child companies to absorb the remainder! 
        // We must force the Main company to absorb the remainder (go negative)
        finalMainBalance = await tx.creditBalance.update({
          where: { companyId: targetCompanyId },
          data: {
            creditsRemaining: { decrement: remainder },
            creditsUsed: { increment: remainder },
          },
        });

        await tx.creditUsage.create({
          data: {
            companyId: targetCompanyId,
            amount: remainder,
            reason: "MANUAL_ADJUSTMENT",
            description: `Admin deducted ${remainder} (Forced Negative)`,
          },
        });
      }
    }

    // Insert BillingHistory for Main Company
    try {
      await tx.$runCommandRaw({
        insert: "BillingHistory",
        documents: [
          {
            companyId: { $oid: targetCompanyId },
            date: { $date: new Date().toISOString() },
            description: description || "Credit Set via Admin",
            type: "Deduction",
            credits: -mainCut,
            amount: 0,
            status: "Completed",
          }
        ]
      });
    } catch (err) {
      console.error("Failed to insert into BillingHistory:", err);
    }

    // Send email notification outside transaction - non-blocking
    notificationService.sendCreditUpdateEmail({
      companyName: company.name || targetCompanyId,
      amount: Math.abs(delta),
      newBalance: finalMainBalance?.creditsRemaining || 0,
      type: "DEDUCTION"
    }).catch(console.error);
    
    await tx.supportRequest.updateMany({
      where: {
        companyId,
        reason: "BILLING_CREDITS",
        status: "NEW"
      },
      data: { status: "RESOLVED" }
    });

    try {
      const fullCompany = await tx.company.findUnique({
        where: { id: companyId },
        include: { members: { include: { user: true } } }
      });
      if (fullCompany && fullCompany.members.length > 0) {
        const user = fullCompany.members[0].user;
        if (user && user.email) {
          const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "credit_added",
              email: user.email,
              name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email.split("@")[0],
              amount: Math.abs(delta),
            }),
          }).catch(err => console.error("Failed to send credit added webhook:", err));
        }
      }
    } catch (e) {
      console.error("Failed to process credit webhook:", e);
    }

    return finalMainBalance;
  });

  // Fire-and-forget: trigger voice web sync so the credits widget
  // shows the new balance immediately when the user opens the dashboard.
  try {
    const voiceWebUrl = process.env.VOICE_WEB_URL || "https://www.propnexai.com";
    fetch(`${voiceWebUrl}/api/internal-sync-credits`, { method: "GET" }).catch(() => {});
  } catch (_) {}

  return result;
}
