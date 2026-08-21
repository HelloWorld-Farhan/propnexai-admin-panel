import type {
  PhoneNumberStatus,
  TelephonyProvider,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  allocatePhoneNumberEntityId,
  generatePublicId,
} from "@/src/server/lib/public-id";

const numberInclude = {
  company: { select: { id: true, name: true, slug: true, cli: true } },
  campaign: { select: { id: true, name: true, resourceKey: true } },
  inboundAgent: { select: { id: true, name: true } },
  outboundAgent: { select: { id: true, name: true } },
} as const;

export type PhoneNumberAdminRow = Awaited<
  ReturnType<typeof listPhoneNumbersForAdmin>
>[number];

export async function listPhoneNumbersForAdmin() {
  return prisma.phoneNumber.findMany({
    orderBy: [{ updatedAt: "desc" }, { number: "asc" }],
    include: numberInclude,
  });
}

export async function listNumberFormOptions() {
  const companies = await prisma.company.findMany({
    where: { isDemo: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      campaigns: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      },
      aiAgents: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true, status: true },
      },
    },
  });

  return companies;
}

async function resolvePublicIdParts(
  companyId: string,
  campaignId: string | null | undefined,
) {
  const [company, campaign] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, cli: true },
    }),
    campaignId
      ? prisma.campaign.findFirst({
          where: { id: campaignId, companyId },
          select: { id: true, resourceKey: true },
        })
      : Promise.resolve(null),
  ]);

  if (!company) {
    throw new Error("Company not found");
  }
  if (campaignId && !campaign) {
    throw new Error("Campaign not found for this company");
  }

  return {
    company,
    campaign,
    campaignResourceKey: campaign?.resourceKey ?? "UNASSIGNED",
  };
}

async function assertAgentsBelongToCompany(
  companyId: string,
  inboundAgentId: string | null | undefined,
  outboundAgentId: string | null | undefined,
) {
  const ids = [inboundAgentId, outboundAgentId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (ids.length === 0) return;

  const agents = await prisma.aiAgent.findMany({
    where: { companyId, id: { in: ids } },
    select: { id: true },
  });
  const found = new Set(agents.map((agent) => agent.id));

  if (inboundAgentId && !found.has(inboundAgentId)) {
    throw new Error("Inbound agent not found for this company");
  }
  if (outboundAgentId && !found.has(outboundAgentId)) {
    throw new Error("Outbound agent not found for this company");
  }
}

export async function createPhoneNumberForAdmin(input: {
  number: string;
  companyId: string;
  campaignId?: string | null;
  label?: string | null;
  provider?: TelephonyProvider;
  status?: PhoneNumberStatus;
  inboundAgentId?: string | null;
  outboundAgentId?: string | null;
}) {
  const number = input.number.trim();
  const campaignId = input.campaignId ?? null;

  await assertAgentsBelongToCompany(
    input.companyId as string,
    input.inboundAgentId,
    input.outboundAgentId,
  );

  const { company, campaignResourceKey } = await resolvePublicIdParts(
    input.companyId as string,
    campaignId,
  );

  const existing = await prisma.phoneNumber.findFirst({
    where: {
      companyId: input.companyId as string,
      campaignId,
      number,
    },
  });
  if (existing) {
    throw new Error("This number is already assigned to that company/campaign");
  }

  return prisma.$transaction(async (tx) => {
    const phoneNumberId = await allocatePhoneNumberEntityId(tx, input.companyId);
    const publicId = generatePublicId(
      company.cli,
      campaignResourceKey,
      phoneNumberId,
    );

    const createdNumber = await tx.phoneNumber.create({
      data: {
        companyId: input.companyId as string,
        campaignId,
        number,
        label: input.label ?? null,
        provider: input.provider ?? "PROPNEX",
        status: input.status ?? "ACTIVE",
        phoneNumberId,
        publicId,
        inboundAgentId: input.inboundAgentId ?? null,
        outboundAgentId: input.outboundAgentId ?? null,
      },
      include: numberInclude,
    });



    await tx.supportRequest.updateMany({
      where: {
        companyId: input.companyId as string,
        reason: "OTHER",
        message: "Number Assignment Request",
        status: "NEW",
      },
      data: { status: "RESOLVED" }
    });

    try {
      // Find all past calls that matched this number, regardless of current company
      const pastCalls = await tx.callLog.findMany({
        where: {
          OR: [
            { providerWebhook: { string_contains: `"callid":"${number}"` } },
            { providerWebhook: { string_contains: `"calledno":"${number}"` } },
            { providerWebhook: { string_contains: `"phoneNumber":"${number}"` } },
          ]
        } as any // Prisma JSON filtering might need raw or specific querying, but we can just use runCommandRaw for CallLog update, and raw query for finding.
      });
      // Actually, since it's MongoDB, it's safer to just do a raw query to find them first
    } catch(e) {}

    // Let's use the safer raw command approach, but we need to know the credits to transfer.
    // A better approach is to do a raw query to find the calls, sum the credits grouped by old companyId, then do the updates.
    try {
      const db = (prisma as any).$transaction ? prisma : prisma;
      const rawCalls = await prisma.callLog.findRaw({
        filter: {
          $or: [
            { "providerWebhook.callid": number },
            { "providerWebhook.calledno": number },
            { "providerWebhook.message.call.phoneNumber": number }
          ],
          companyId: { $ne: { $oid: input.companyId } }
        }
      }) as unknown as any[];

      if (rawCalls && rawCalls.length > 0) {
        // Group by old companyId to refund them
        const refunds: Record<string, number> = {};
        let totalCharge = 0;

        for (const call of rawCalls) {
          const oldCompId = call.companyId?.$oid;
          const credits = call.creditsUsed || 0;
          if (oldCompId && credits > 0) {
            refunds[oldCompId] = (refunds[oldCompId] || 0) + credits;
            totalCharge += credits;
          }
        }

        // Refund old companies
        for (const [oldCompId, amount] of Object.entries(refunds)) {
          await tx.creditBalance.updateMany({
            where: { companyId: oldCompId },
            data: {
              creditsRemaining: { increment: amount },
              creditsUsed: { decrement: amount }
            }
          });
        }

        // Charge new company
        if (totalCharge > 0) {
          await tx.creditBalance.updateMany({
            where: { companyId: input.companyId },
            data: {
              creditsRemaining: { decrement: totalCharge },
              creditsUsed: { increment: totalCharge }
            }
          });
        }

        // Update the call logs
        await prisma.$runCommandRaw({
          update: "CallLog",
          updates: [
            {
              q: {
                _id: { $in: rawCalls.map(c => c._id) }
              },
              u: {
                $set: { companyId: { $oid: input.companyId } }
              },
              multi: true
            }
          ]
        });
      }
    } catch (err) {
      console.error("Failed to backfill call logs:", err);
    }

    return createdNumber;
  });
}

export async function updatePhoneNumberForAdmin(
  id: string,
  input: {
    companyId?: string;
    campaignId?: string | null;
    label?: string | null;
    provider?: TelephonyProvider;
    status?: PhoneNumberStatus;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  },
) {
  const existing = await prisma.phoneNumber.findUnique({
    where: { id },
    include: numberInclude,
  });
  if (!existing) {
    throw new Error("Phone number not found");
  }

  const nextCompanyId = (input.companyId ?? existing.companyId) as string;
  const nextCampaignId =
    input.campaignId === undefined ? existing.campaignId : input.campaignId;
  const nextInboundAgentId =
    input.inboundAgentId === undefined
      ? existing.inboundAgentId
      : input.inboundAgentId;
  const nextOutboundAgentId =
    input.outboundAgentId === undefined
      ? existing.outboundAgentId
      : input.outboundAgentId;

  await assertAgentsBelongToCompany(
    nextCompanyId as string,
    nextInboundAgentId,
    nextOutboundAgentId,
  );

  const companyChanged = nextCompanyId !== existing.companyId;
  const campaignChanged = nextCampaignId !== existing.campaignId;

  const duplicate = await prisma.phoneNumber.findFirst({
    where: {
      companyId: nextCompanyId as string,
      campaignId: nextCampaignId,
      number: existing.number,
      NOT: { id },
    },
  });
  if (duplicate) {
    throw new Error("This number is already assigned to that company/campaign");
  }

  const { company, campaignResourceKey } = await resolvePublicIdParts(
    nextCompanyId as string,
    nextCampaignId,
  );

  return prisma.$transaction(async (tx) => {
    let phoneNumberId = existing.phoneNumberId;
    let publicId = existing.publicId;

    if (companyChanged) {
      phoneNumberId = await allocatePhoneNumberEntityId(tx, nextCompanyId);
      publicId = generatePublicId(company.cli, campaignResourceKey, phoneNumberId);

      // Clear channel bindings in the previous company when reassigning.
      await tx.companyChannel.updateMany({
        where: { phoneNumberId: id },
        data: { phoneNumberId: null },
      });
    } else if (campaignChanged) {
      publicId = generatePublicId(company.cli, campaignResourceKey, phoneNumberId);
    }

    const updatedNumber = await tx.phoneNumber.update({
      where: { id },
      data: {
        companyId: nextCompanyId as string,
        campaignId: nextCampaignId,
        label: input.label === undefined ? undefined : input.label,
        provider: input.provider,
        status: input.status,
        inboundAgentId: nextInboundAgentId,
        outboundAgentId: nextOutboundAgentId,
        phoneNumberId,
        publicId,
      },
      include: numberInclude,
    });

    if (companyChanged) {

      await tx.supportRequest.updateMany({
        where: {
          companyId: nextCompanyId as string,
          reason: "OTHER",
          message: "Number Assignment Request",
          status: "NEW",
        },
        data: { status: "RESOLVED" }
      });

      try {
        const rawCalls = await prisma.callLog.findRaw({
          filter: {
            $or: [
              { "providerWebhook.callid": existing.number },
              { "providerWebhook.calledno": existing.number },
              { "providerWebhook.message.call.phoneNumber": existing.number }
            ],
            companyId: { $ne: { $oid: nextCompanyId } }
          }
        }) as unknown as any[];

        if (rawCalls && rawCalls.length > 0) {
          const refunds: Record<string, number> = {};
          let totalCharge = 0;

          for (const call of rawCalls) {
            const oldCompId = call.companyId?.$oid;
            const credits = call.creditsUsed || 0;
            if (oldCompId && credits > 0) {
              refunds[oldCompId] = (refunds[oldCompId] || 0) + credits;
              totalCharge += credits;
            }
          }

          // Refund old companies
          for (const [oldCompId, amount] of Object.entries(refunds)) {
            await tx.creditBalance.updateMany({
              where: { companyId: oldCompId },
              data: {
                creditsRemaining: { increment: amount },
                creditsUsed: { decrement: amount }
              }
            });
          }

          // Charge new company
          if (totalCharge > 0) {
            await tx.creditBalance.updateMany({
              where: { companyId: nextCompanyId },
              data: {
                creditsRemaining: { decrement: totalCharge },
                creditsUsed: { increment: totalCharge }
              }
            });
          }

          // Update the call logs
          await prisma.$runCommandRaw({
            update: "CallLog",
            updates: [
              {
                q: {
                  _id: { $in: rawCalls.map(c => c._id) }
                },
                u: { $set: { companyId: { $oid: nextCompanyId } } },
                multi: true
              }
            ]
          });
        }
      } catch (e) {
        console.error("Failed to backfill orphaned call logs:", e);
      }
    }

    return updatedNumber;
  });
}

export async function deletePhoneNumberForAdmin(id: string) {
  const existing = await prisma.phoneNumber.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Phone number not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.companyChannel.updateMany({
      where: { phoneNumberId: id },
      data: { phoneNumberId: null },
    });
    await tx.callLog.updateMany({
      where: { phoneNumberId: id },
      data: { phoneNumberId: null },
    });
    await tx.phoneNumber.delete({ where: { id } });
  });
}
