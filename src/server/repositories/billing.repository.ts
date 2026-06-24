import { prisma } from "@/lib/prisma";

export async function upsertBillingRates(
  companyId: string,
  data: {
    costPerChannel: number;
    costPerCredit: number;
    pulseTimeSeconds: number;
    setupOneTimeCost: number;
    currency?: string;
  },
) {
  return prisma.companyBillingRates.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
}
