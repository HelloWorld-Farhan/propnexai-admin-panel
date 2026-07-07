import { prisma } from "@/lib/prisma";

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
    deltaSeconds: number;
    agentsAllocated: number;
  },
) {
  const config = await prisma.companySetupConfig.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
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
    const phone = await prisma.phoneNumber.upsert({
      where: { companyId_number: { companyId, number: trimmed } },
      create: { companyId, number: trimmed, provider: "PROPNEX" },
      update: {},
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

    return balance;
  });
}
