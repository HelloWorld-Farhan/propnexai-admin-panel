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
  return prisma.agentLibraryEntry.create({ data });
}

export async function updateAgentLibraryEntry(
  id: string,
  data: Partial<AgentLibraryInput>,
) {
  return prisma.agentLibraryEntry.update({ where: { id }, data });
}

export async function deleteAgentLibraryEntry(id: string) {
  const deployed = await prisma.aiAgent.count({ where: { libraryEntryId: id } });
  if (deployed > 0) {
    throw new Error("Cannot delete: agents are deployed from this library entry");
  }
  return prisma.agentLibraryEntry.delete({ where: { id } });
}

export async function getAgentLibraryEntry(id: string) {
  return prisma.agentLibraryEntry.findUnique({
    where: { id },
    include: { _count: { select: { deployedAgents: true } } },
  });
}
