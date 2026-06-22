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

export async function upsertSetupConfig(
  companyId: string,
  data: {
    totalChannels: number;
    pulseTimeSeconds: number;
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
  phoneNumberId: string | null,
) {
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

export async function deployAgentFromLibrary(
  companyId: string,
  libraryEntryId: string,
) {
  const [company, entry, agentCount, setupConfig] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.agentLibraryEntry.findUniqueOrThrow({ where: { id: libraryEntryId } }),
    prisma.aiAgent.count({ where: { companyId } }),
    prisma.companySetupConfig.findUnique({ where: { companyId } }),
  ]);

  const limit = setupConfig?.agentsAllocated ?? 0;
  if (limit > 0 && agentCount >= limit) {
    throw new Error(`Agent limit reached (${limit})`);
  }

  return prisma.aiAgent.create({
    data: {
      companyId,
      libraryEntryId: entry.id,
      name: entry.name,
      type: entry.defaultType,
      category: entry.category,
      firstMessage: entry.defaultFirstMessage,
      systemPrompt: entry.samplePrompt,
      demoAudioUrl: entry.demoAudioUrl,
    },
  });
}
