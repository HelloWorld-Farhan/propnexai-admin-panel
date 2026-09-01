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
    select: { parentCompanyId: true, name: true, members: { include: { user: true } } }
  });
  
  if (!company) throw new Error("Company not found");

  // ── Core write: just the balance update, no raw commands ─────────────
  const balance = await prisma.creditBalance.upsert({
    where: { companyId },
    create: {
      companyId,
      creditsRemaining: amount,
      creditsUsed: 0,
    },
    update: {
      creditsRemaining: { increment: amount },
    },
  });

  // ── Side effects (all outside any transaction) ────────────────────────
  // CreditUsage log
  await prisma.creditUsage.create({
    data: { companyId, amount, reason: "PURCHASE", description },
  }).catch(console.error);

  // Resolve pending credit support requests
  await prisma.supportRequest.updateMany({
    where: { companyId, reason: "BILLING_CREDITS", status: "NEW" },
    data: { status: "RESOLVED" },
  }).catch(console.error);

  // BillingHistory (raw command — must be outside transaction)
  try {
    await prisma.$runCommandRaw({
      insert: "BillingHistory",
      documents: [{
        companyId: { $oid: companyId },
        date: { $date: new Date().toISOString() },
        description: description || "Credit Top-up via Admin",
        type: "Top-up",
        credits: amount,
        amount: 0,
        status: "Completed",
      }]
    });
  } catch (err) {
    console.error("Failed to insert into BillingHistory:", err);
  }

  // Email notification
  notificationService.sendCreditUpdateEmail({
    companyName: company.name || companyId,
    amount,
    newBalance: balance.creditsRemaining,
    type: "TOP_UP",
  }).catch(console.error);

  // Google Sheets webhook
  try {
    const user = company.members?.[0]?.user;
    if (user?.email) {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "credit_added",
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email.split("@")[0],
          amount,
        }),
      }).catch(err => console.error("Failed to send credit added webhook:", err));
    }
  } catch (e) {
    console.error("Failed to process credit webhook:", e);
  }

  return balance;
}

export async function updateCredits(
  companyId: string,
  delta: number,
  description: string,
) {
  if (delta === 0) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { parentCompanyId: true, name: true }
  });
  
  if (!company) throw new Error("Company not found");

  // Read current balance BEFORE transaction
  const existingBalance = await prisma.creditBalance.findUnique({
    where: { companyId }
  });

  let finalBalance: any;
  const affectedSubCompanies: { id: string; subCut: number }[] = [];

  if (delta > 0) {
    // ── ADDITION ────────────────────────────────────────────────────────
    finalBalance = await prisma.creditBalance.upsert({
      where: { companyId },
      create: { companyId, creditsRemaining: delta, creditsUsed: 0 },
      update: { creditsRemaining: { increment: delta } },
    });

    // Log CreditUsage (non-transactional, best-effort)
    await prisma.creditUsage.create({
      data: {
        companyId,
        amount: delta,
        reason: "MANUAL_ADJUSTMENT",
        description: `Admin added ${delta}`,
      },
    }).catch(console.error);

  } else {
    // ── DEDUCTION ───────────────────────────────────────────────────────
    const cutAmount = Math.abs(delta);

    // ── DEDUCTION: absolute SET (not relative decrement) ───────────────────
    // Reading CURRENT balance from DB right now (freshest possible read)
    const dbBalance = await prisma.creditBalance.findUnique({ where: { companyId } });
    const actualRemaining = dbBalance?.creditsRemaining ?? 0;
    const actualUsed = dbBalance?.creditsUsed ?? 0;

    // How much to actually cut from main (can't cut more than available)
    const actualMainCut = Math.min(cutAmount, Math.max(0, actualRemaining));
    const remainder = cutAmount - actualMainCut;

    const newRemaining = actualRemaining - actualMainCut;
    const newUsed = actualUsed + actualMainCut;

    console.log(`[updateCredits] company=${companyId} actualRemaining=${actualRemaining} cutAmount=${cutAmount} actualMainCut=${actualMainCut} newRemaining=${newRemaining}`);

    let mainBalance;
    if (actualMainCut > 0 || !dbBalance) {
      // Use upsert with ABSOLUTE values — no relative increment/decrement
      mainBalance = await prisma.creditBalance.upsert({
        where: { companyId },
        create: {
          companyId,
          creditsRemaining: newRemaining,
          creditsUsed: newUsed,
        },
        update: {
          creditsRemaining: newRemaining,
          creditsUsed: newUsed,
        },
      });
      console.log(`[updateCredits] After write: creditsRemaining=${mainBalance.creditsRemaining} creditsUsed=${mainBalance.creditsUsed}`);
    } else {
      mainBalance = dbBalance;
      console.log(`[updateCredits] No main cut needed (balance already 0)`);
    }

    // Re-fetch childIds based on remainder (only needed if mainCut exhausted balance)
    if (remainder > 0) {
      const freshChildren = (await prisma.company.findMany({
        where: { parentCompanyId: companyId, status: { not: "SUSPENDED" } },
        select: { id: true },
      })).map((c) => c.id);

      const subCutEach = freshChildren.length > 0
        ? Number((remainder / freshChildren.length).toFixed(4))
        : 0;

      if (subCutEach > 0 && freshChildren.length > 0) {
        for (const childId of freshChildren) {
          const childBal = await prisma.creditBalance.findUnique({ where: { companyId: childId } });
          const childRemaining = childBal?.creditsRemaining ?? 0;
          const childUsed = childBal?.creditsUsed ?? 0;
          await prisma.creditBalance.upsert({
            where: { companyId: childId },
            create: { companyId: childId, creditsRemaining: -subCutEach, creditsUsed: subCutEach },
            update: {
              creditsRemaining: childRemaining - subCutEach,
              creditsUsed: childUsed + subCutEach,
            },
          });
          affectedSubCompanies.push({ id: childId, subCut: subCutEach });
        }
      } else if (freshChildren.length === 0) {
        // No sub-companies: force main to go negative
        const forcedBal = await prisma.creditBalance.upsert({
          where: { companyId },
          create: { companyId, creditsRemaining: actualRemaining - cutAmount, creditsUsed: actualUsed + cutAmount },
          update: { creditsRemaining: actualRemaining - cutAmount, creditsUsed: actualUsed + cutAmount },
        });
        mainBalance = forcedBal;
      }
    }

    finalBalance = mainBalance;

    // ── SIDE EFFECTS outside transaction ─────────────────────────────────
    // Log CreditUsage for main company
    if (actualMainCut > 0) {
      await prisma.creditUsage.create({
        data: {
          companyId,
          amount: actualMainCut,
          reason: "MANUAL_ADJUSTMENT",
          description: description || `Admin deducted ${actualMainCut}`,
        },
      }).catch(console.error);
    }

    // Log CreditUsage for each sub-company
    for (const { id: childId, subCut } of affectedSubCompanies) {
      if (subCut > 0) {
        await prisma.creditUsage.create({
          data: {
            companyId: childId,
            amount: subCut,
            reason: "MANUAL_ADJUSTMENT",
            description: `Admin deducted ${subCut} (Cascaded from Parent)`,
          },
        }).catch(console.error);
      }
    }

    // Resolve any billing support requests
    await prisma.supportRequest.updateMany({
      where: { companyId, reason: "BILLING_CREDITS", status: "NEW" },
      data: { status: "RESOLVED" },
    }).catch(console.error);
  }

  // ── BillingHistory (raw command, always outside transaction) ────────────
  try {
    await prisma.$runCommandRaw({
      insert: "BillingHistory",
      documents: [{
        companyId: { $oid: companyId },
        date: { $date: new Date().toISOString() },
        description: description || "Credit Set via Admin",
        type: delta < 0 ? "Deduction" : "Top-up",
        credits: delta,
        amount: 0,
        status: "Completed",
      }]
    });
  } catch (err) {
    console.error("Failed to insert into BillingHistory:", err);
  }

  // BillingHistory for each affected sub-company
  for (const sub of affectedSubCompanies) {
    try {
      await prisma.$runCommandRaw({
        insert: "BillingHistory",
        documents: [{
          companyId: { $oid: sub.id },
          date: { $date: new Date().toISOString() },
          description: description || "Credit Cut Cascaded from Parent via Admin",
          type: "Deduction",
          credits: -sub.subCut,
          amount: 0,
          status: "Completed",
        }]
      });
    } catch (err) {
      console.error("Failed BillingHistory for sub-company:", err);
    }
  }

  // ── Email notification ──────────────────────────────────────────────────
  notificationService.sendCreditUpdateEmail({
    companyName: company.name || companyId,
    amount: Math.abs(delta),
    newBalance: finalBalance?.creditsRemaining || 0,
    type: delta < 0 ? "DEDUCTION" : "TOP_UP",
  }).catch(console.error);

  // ── Webhook to Google Sheets ────────────────────────────────────────────
  try {
    const fullCompany = await prisma.company.findUnique({
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

  // ── Trigger voice web sync ─────────────────────────────────────────────
  try {
    const voiceWebUrl = process.env.VOICE_WEB_URL || "https://www.propnexai.com";
    fetch(`${voiceWebUrl}/api/internal-sync-credits`, { method: "GET" }).catch(() => {});
  } catch (_) {}

  return finalBalance;
}

