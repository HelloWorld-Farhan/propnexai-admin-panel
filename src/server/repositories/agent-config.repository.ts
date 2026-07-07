import type {
  AgentStatus,
  AgentType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  COMMUNICATION_CHANNEL_TYPES,
  type CommunicationChannelInput,
  type CommunicationChannelType,
} from "@/lib/types/agent-config";
import {
  AgentInUseError,
  AgentLimitReachedError,
  ChannelAssignmentConflictError,
} from "@/lib/types/agent-config";

const agentInclude = {
  libraryEntry: { select: { name: true, slug: true } },
  communicationChannels: { orderBy: { type: "asc" as const } },
} satisfies Prisma.AiAgentInclude;

export async function assertAgentAllocationAvailable(companyId: string) {
  const [agentCount, setupConfig] = await Promise.all([
    prisma.aiAgent.count({ where: { companyId } }),
    prisma.companySetupConfig.findUnique({ where: { companyId } }),
  ]);

  const limit = setupConfig?.agentsAllocated ?? 0;
  if (limit > 0 && agentCount >= limit) {
    throw new AgentLimitReachedError(limit);
  }
}

export async function listCompanyAgents(companyId: string) {
  return prisma.aiAgent.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: agentInclude,
  });
}

export async function getCompanyAgent(companyId: string, agentId: string) {
  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, companyId },
    include: agentInclude,
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  return agent;
}

const AUTO_ASSIGN_CHANNEL_PRIORITY: CommunicationChannelType[] = [
  "VOICE",
  ...COMMUNICATION_CHANNEL_TYPES.filter((type) => type !== "VOICE"),
];

export async function listCommunicationChannelSlots(companyId: string) {
  const assignments = await prisma.agentCommunicationChannel.findMany({
    where: { companyId },
    include: { aiAgent: { select: { id: true, name: true } } },
    orderBy: { type: "asc" },
  });

  const byType = new Map(
    assignments.map((row) => [row.type as CommunicationChannelType, row]),
  );

  return COMMUNICATION_CHANNEL_TYPES.map((type) => {
    const assignment = byType.get(type);
    return {
      type,
      assignedAgentId: assignment?.aiAgent.id ?? null,
      assignedAgentName: assignment?.aiAgent.name ?? null,
    };
  });
}

async function findUnassignedCommunicationChannelTypes(companyId: string) {
  const assigned = await prisma.agentCommunicationChannel.findMany({
    where: { companyId },
    select: { type: true },
  });
  const assignedTypes = new Set(
    assigned.map((row) => row.type as CommunicationChannelType),
  );

  return AUTO_ASSIGN_CHANNEL_PRIORITY.filter((type) => !assignedTypes.has(type));
}

async function autoAssignFirstUnassignedChannel(
  companyId: string,
  agentId: string,
) {
  const [nextType] = await findUnassignedCommunicationChannelTypes(companyId);
  if (!nextType) return;

  await assignAgentChannels(companyId, agentId, [{ type: nextType }], {
    replaceConflicts: false,
  });
}

async function findChannelConflicts(
  companyId: string,
  agentId: string,
  channels: CommunicationChannelInput[],
) {
  if (channels.length === 0) return [];

  const types = channels.map((c) => c.type);
  const existing = await prisma.agentCommunicationChannel.findMany({
    where: {
      companyId,
      type: { in: types },
      aiAgentId: { not: agentId },
    },
    include: { aiAgent: { select: { id: true, name: true } } },
  });

  return existing.map((row) => ({
    type: row.type as CommunicationChannelType,
    currentAgentId: row.aiAgent.id,
    currentAgentName: row.aiAgent.name,
  }));
}

async function assignAgentChannels(
  companyId: string,
  agentId: string,
  channels: CommunicationChannelInput[],
  options: { replaceConflicts: boolean },
) {
  if (channels.length === 0) return;

  const conflicts = await findChannelConflicts(companyId, agentId, channels);
  if (conflicts.length > 0 && !options.replaceConflicts) {
    throw new ChannelAssignmentConflictError(conflicts);
  }

  const types = channels.map((c) => c.type);

  await prisma.$transaction(async (tx) => {
    await tx.agentCommunicationChannel.deleteMany({
      where: { companyId, type: { in: types } },
    });

    await tx.agentCommunicationChannel.createMany({
      data: channels.map((channel) => ({
        companyId,
        aiAgentId: agentId,
        type: channel.type,
        enabled: channel.enabled ?? true,
        settings: (channel.settings ?? {}) as Prisma.InputJsonValue,
      })),
    });
  });
}

async function syncAgentChannels(
  companyId: string,
  agentId: string,
  channels: CommunicationChannelInput[] | undefined,
  replaceConflicts: boolean,
) {
  if (channels === undefined) return;

  await prisma.agentCommunicationChannel.deleteMany({
    where: { companyId, aiAgentId: agentId },
  });

  if (channels.length > 0) {
    await assignAgentChannels(companyId, agentId, channels, {
      replaceConflicts,
    });
  }
}

export async function createCompanyAgent(
  companyId: string,
  data: {
    name: string;
    description?: string;
    type: AgentType;
    status?: AgentStatus;
    enabled?: boolean;
    systemPrompt?: string;
    firstMessage?: string;
    modelConfig?: Prisma.InputJsonValue;
    channels?: CommunicationChannelInput[];
    replaceChannelConflicts?: boolean;
  },
) {
  await assertAgentAllocationAvailable(companyId);

  const agent = await prisma.aiAgent.create({
    data: {
      companyId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status ?? "ACTIVE",
      enabled: data.enabled ?? true,
      systemPrompt: data.systemPrompt,
      firstMessage: data.firstMessage,
      modelConfig: data.modelConfig ?? {},
    },
    include: agentInclude,
  });

  if (data.channels?.length) {
    await assignAgentChannels(companyId, agent.id, data.channels, {
      replaceConflicts: data.replaceChannelConflicts ?? false,
    });
  } else {
    await autoAssignFirstUnassignedChannel(companyId, agent.id);
  }

  return getCompanyAgent(companyId, agent.id);
}

export async function deployAgentFromLibrary(
  companyId: string,
  libraryEntryId: string,
) {
  await assertAgentAllocationAvailable(companyId);

  const entry = await prisma.agentLibraryEntry.findUniqueOrThrow({
    where: { id: libraryEntryId },
  });

  const agent = await prisma.aiAgent.create({
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
    include: agentInclude,
  });

  await autoAssignFirstUnassignedChannel(companyId, agent.id);

  return getCompanyAgent(companyId, agent.id);
}

export async function updateCompanyAgent(
  companyId: string,
  agentId: string,
  data: {
    name?: string;
    description?: string;
    type?: AgentType;
    status?: AgentStatus;
    enabled?: boolean;
    systemPrompt?: string;
    firstMessage?: string;
    modelConfig?: Prisma.InputJsonValue;
    channels?: CommunicationChannelInput[];
    replaceChannelConflicts?: boolean;
  },
) {
  await getCompanyAgent(companyId, agentId);

  const updateData: Prisma.AiAgentUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
  if (data.firstMessage !== undefined) updateData.firstMessage = data.firstMessage;
  if (data.modelConfig !== undefined) updateData.modelConfig = data.modelConfig;

  await prisma.aiAgent.update({
    where: { id: agentId },
    data: updateData,
  });

  await syncAgentChannels(
    companyId,
    agentId,
    data.channels,
    data.replaceChannelConflicts ?? false,
  );

  return getCompanyAgent(companyId, agentId);
}

export async function setAgentEnabled(
  companyId: string,
  agentId: string,
  enabled: boolean,
) {
  await getCompanyAgent(companyId, agentId);

  return prisma.aiAgent.update({
    where: { id: agentId },
    data: { enabled },
    include: agentInclude,
  });
}

export async function deleteCompanyAgent(companyId: string, agentId: string) {
  await getCompanyAgent(companyId, agentId);

  const [dialerCallCount, campaignCount] = await Promise.all([
    prisma.dialerCall.count({ where: { companyId, aiAgentId: agentId } }),
    prisma.campaign.count({ where: { companyId, aiAgentId: agentId } }),
  ]);

  if (dialerCallCount > 0 || campaignCount > 0) {
    throw new AgentInUseError(
      "Agent has call history or campaigns and cannot be deleted",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.channel.updateMany({
      where: { companyId, aiAgentId: agentId },
      data: { aiAgentId: null },
    });
    await tx.lead.updateMany({
      where: { companyId, assignedAiAgentId: agentId },
      data: { assignedAiAgentId: null },
    });
    await tx.phoneNumber.updateMany({
      where: { companyId, inboundAgentId: agentId },
      data: { inboundAgentId: null },
    });
    await tx.phoneNumber.updateMany({
      where: { companyId, outboundAgentId: agentId },
      data: { outboundAgentId: null },
    });
    await tx.agentCommunicationChannel.deleteMany({
      where: { companyId, aiAgentId: agentId },
    });
    await tx.aiAgent.delete({ where: { id: agentId } });
  });
}

export function serializeAgent(
  agent: Awaited<ReturnType<typeof getCompanyAgent>>,
) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    type: agent.type,
    status: agent.status,
    enabled: agent.enabled,
    systemPrompt: agent.systemPrompt,
    firstMessage: agent.firstMessage,
    modelConfig: agent.modelConfig as Record<string, unknown>,
    libraryEntry: agent.libraryEntry,
    communicationChannels: agent.communicationChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      enabled: channel.enabled,
      settings: channel.settings as Record<string, unknown>,
    })),
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}
