import type { AgentType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listAgentLibraryEntries(search?: string) {
  return prisma.agentLibraryEntry.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { deployedAgents: true } } },
  });
}

export type AgentLibraryInput = {
  slug: string;
  name: string;
  profile: string;
  category: string;
  industryCategory?: string;
  tone?: string;
  language?: string;
  voice?: string;
  bestFor?: string;
  useCases: string[];
  defaultType: AgentType;
  estimatedSetupMinutes: number;
  samplePrompt: string;
  defaultFirstMessage: string;
  demoAudioUrl: string;
  avatarGradient?: string;
  isPublished: boolean;
  sortOrder: number;
};

export async function createAgentLibraryEntry(data: AgentLibraryInput) {
  const entry = await prisma.agentLibraryEntry.create({ data });
  await prisma.systemEvent.create({
    data: {
      type: "AGENT_CREATED",
      title: "Agent Library Entry Created",
      message: `Admin created library entry: ${data.name}.`,
    }
  }).catch(console.error);
  return entry;
}

export async function updateAgentLibraryEntry(
  id: string,
  data: Partial<AgentLibraryInput>,
) {
  const entry = await prisma.agentLibraryEntry.update({ where: { id }, data });
  await prisma.systemEvent.create({
    data: {
      type: "AGENT_EDITED",
      title: "Agent Library Entry Updated",
      message: `Admin updated library entry: ${entry.name}.`,
    }
  }).catch(console.error);
  return entry;
}

export async function deleteAgentLibraryEntry(id: string) {
  const deployed = await prisma.aiAgent.count({ where: { libraryEntryId: id } });
  if (deployed > 0) {
    throw new Error("Cannot delete: agents are deployed from this library entry");
  }
  
  const existing = await prisma.agentLibraryEntry.findUnique({ where: { id } });
  const deleted = await prisma.agentLibraryEntry.delete({ where: { id } });
  
  if (existing) {
    await prisma.systemEvent.create({
      data: {
        type: "AGENT_DELETED",
        title: "Agent Library Entry Deleted",
        message: `Admin deleted library entry: ${existing.name}.`,
      }
    }).catch(console.error);
  }
  
  return deleted;
}

export async function getAgentLibraryEntry(id: string) {
  return prisma.agentLibraryEntry.findUnique({
    where: { id },
    include: { _count: { select: { deployedAgents: true } } },
  });
}
