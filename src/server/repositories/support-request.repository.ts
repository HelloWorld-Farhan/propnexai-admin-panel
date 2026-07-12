import type { SupportRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listSupportRequests(limit = 100) {
  return prisma.supportRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    include: {
      company: {
        select: { name: true },
      },
    },
  });
}

export async function updateSupportRequestStatus(
  id: string,
  status: SupportRequestStatus,
) {
  return prisma.supportRequest.update({
    where: { id },
    data: { status },
    include: {
      company: {
        select: { name: true },
      },
    },
  });
}
