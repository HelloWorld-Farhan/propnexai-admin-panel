import { prisma } from "@/lib/prisma";
import {
  allocatePhoneNumberEntityId,
  generatePublicId,
} from "@/src/server/lib/public-id";

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
  return prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
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

    await tx.creditUsage.create({
      data: {
        companyId,
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
            companyId: { $oid: companyId },
            date: { $date: new Date().toISOString() },
            description: description || "Credit Top-up via Admin",
            type: "Top-up",
            credits: amount,
            amount: 0,
            status: "Completed",
          }
        ]
      });
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
