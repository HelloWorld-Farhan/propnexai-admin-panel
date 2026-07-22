import type { Prisma } from "@prisma/client";

export function formatPhoneNumberEntityId(sequence: number): string {
  if (sequence < 1) {
    throw new Error("Resource sequence must be >= 1");
  }
  return `PH${String(sequence).padStart(6, "0")}`;
}

export function generatePublicId(
  cli: string,
  campaignResourceKey: string,
  entityId: string,
): string {
  return `v1.${cli}.${campaignResourceKey}.${entityId}`;
}

export async function allocatePhoneNumberEntityId(
  tx: Prisma.TransactionClient,
  companyId: string,
): Promise<string> {
  const resourceType = "PHONE_NUMBER";
  const existing = await tx.companyResourceSequence.findUnique({
    where: {
      companyId_resourceType: {
        companyId,
        resourceType,
      },
    },
  });

  const nextSequence = (existing?.lastSequence ?? 0) + 1;
  const phoneNumberId = formatPhoneNumberEntityId(nextSequence);

  await tx.companyResourceSequence.upsert({
    where: {
      companyId_resourceType: {
        companyId,
        resourceType,
      },
    },
    create: {
      companyId,
      resourceType,
      lastSequence: nextSequence,
    },
    update: {
      lastSequence: nextSequence,
    },
  });

  return phoneNumberId;
}
