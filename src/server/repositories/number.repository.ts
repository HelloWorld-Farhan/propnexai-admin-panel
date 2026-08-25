import type {
  PhoneNumberStatus,
  TelephonyProvider,
  CallDirection,
  CallLog,
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
    where: { companyId: { not: null } },
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
  direction?: CallDirection | null;
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
    if (existing.direction !== input.direction && input.direction) {
      const updatedNumber = await prisma.phoneNumber.update({
        where: { id: existing.id },
        data: { direction: "BOTH" as any },
        include: numberInclude,
      });
      return updatedNumber;
    }
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Bypass cached TS server Prisma type error
        direction: input.direction ?? null,
      },
      include: numberInclude,
    });



    await tx.supportRequest.updateMany({
      where: {
        companyId: input.companyId as string,
        reason: "OTHER",
        message: { contains: "Number Assignment Request" },
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
        } as unknown as object // Prisma JSON filtering might need raw or specific querying, but we can just use runCommandRaw for CallLog update, and raw query for finding.
      });
      // Actually, since it's MongoDB, it's safer to just do a raw query to find them first
    } catch(e) {}

    // Let's use the safer raw command approach, but we need to know the credits to transfer.
    // A better approach is to do a raw query to find the calls, sum the credits grouped by old companyId, then do the updates.
    try {
      const rawCalls = await tx.callLog.findMany({
        where: {
          phoneNumber: { number: number },
          companyId: { not: input.companyId as string }
        }
      });

      if (rawCalls && rawCalls.length > 0) {
        // Deduplicate calls by callLogId to prevent double cloning if multiple companies share the number
        const uniqueCalls = new Map<string, CallLog>();
        for (const call of rawCalls) {
          if (call.callLogId) {
            uniqueCalls.set(call.callLogId, call);
          }
        }

        let totalCharge = 0;

        for (const call of Array.from(uniqueCalls.values())) {
          const credits = call.creditsUsed || 0;
          
          try {
            await tx.callLog.upsert({
              where: {
                companyId_callLogId: {
                  companyId: input.companyId as string,
                  callLogId: call.callLogId
                }
              },
              update: {},
              create: {
                companyId: input.companyId as string,
                callLogId: call.callLogId,
                publicId: call.publicId || `CLONED-${call.callLogId}`,
                direction: call.direction,
                status: call.status,
                startedAt: call.startedAt ? new Date(call.startedAt as any) : new Date(),
                durationSeconds: call.durationSeconds,
                recordingUrl: call.recordingUrl,
                transcriptUrl: call.transcriptUrl,
                creditsUsed: credits,
                provider: call.provider,
                providerCallId: call.providerCallId,
                providerWebhook: call.providerWebhook
              }
            });
            totalCharge += credits;
          } catch (e) {
            // Ignore if it already exists or fails
          }
        }

        // Charge new company for the cloned calls
        if (totalCharge > 0) {
          await tx.creditBalance.updateMany({
            where: { companyId: input.companyId as string },
            data: {
              creditsRemaining: { decrement: totalCharge },
              creditsUsed: { increment: totalCharge }
            }
          });
          
          await tx.creditUsage.create({
            data: {
              companyId: input.companyId as string,
              amount: totalCharge,
              reason: "CALL",
              description: `Deducted credits for ${uniqueCalls.size} historical calls upon number assignment`
            }
          });
        }
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
    direction?: CallDirection | null;
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

  const result = await prisma.$transaction(async (tx) => {
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Bypass cached TS server Prisma type error
        direction: input.direction,
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
          message: { contains: "Number Assignment Request" },
          status: "NEW",
        },
        data: { status: "RESOLVED" }
      });

      try {
        const rawCalls = await tx.callLog.findMany({
          where: {
            phoneNumber: { number: existing.number },
            companyId: { not: nextCompanyId }
          }
        });

        if (rawCalls && rawCalls.length > 0) {
          // Deduplicate calls by callLogId to prevent double cloning if multiple companies share the number
          const uniqueCalls = new Map<string, CallLog>();
          for (const call of rawCalls) {
            if (call.callLogId) {
              uniqueCalls.set(call.callLogId, call);
            }
          }

          let totalCharge = 0;

          for (const call of Array.from(uniqueCalls.values())) {
            const credits = call.creditsUsed || 0;
            
            try {
              await tx.callLog.upsert({
                where: {
                  companyId_callLogId: {
                    companyId: nextCompanyId,
                    callLogId: call.callLogId
                  }
                },
                update: {},
                create: {
                  companyId: nextCompanyId,
                  callLogId: call.callLogId,
                  publicId: call.publicId || `CLONED-${call.callLogId}`,
                  direction: call.direction,
                  status: call.status,
                  startedAt: call.startedAt ? new Date(call.startedAt as any) : new Date(),
                  durationSeconds: call.durationSeconds,
                  recordingUrl: call.recordingUrl,
                  transcriptUrl: call.transcriptUrl,
                  creditsUsed: credits,
                  provider: call.provider,
                  providerCallId: call.providerCallId,
                  providerWebhook: call.providerWebhook
                }
              });
              totalCharge += credits;
            } catch (e) {
              // Ignore if it already exists or fails
            }
          }

          // Charge new company for the cloned calls
          if (totalCharge > 0) {
            await tx.creditBalance.updateMany({
              where: { companyId: nextCompanyId },
              data: {
                creditsRemaining: { decrement: totalCharge },
                creditsUsed: { increment: totalCharge }
              }
            });
            
            await tx.creditUsage.create({
              data: {
                companyId: nextCompanyId,
                amount: totalCharge,
                reason: "CALL",
                description: `Deducted credits for ${uniqueCalls.size} historical calls upon number assignment`
              }
            });
          }
        }
      } catch (e) {
        console.error("Failed to backfill orphaned call logs:", e);
      }
    }

    return updatedNumber;
  });

  if (companyChanged && nextCompanyId) {
    try {
      const fullCompany = await prisma.company.findUnique({
        where: { id: nextCompanyId as string },
        include: {
          members: {
            where: { role: "OWNER", status: "ACTIVE" },
            include: { user: true }
          },
          creditBalance: true
        }
      });
      const user = fullCompany?.members?.[0]?.user;
      if (user && user.email) {
        const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "subcompany_approved", // We can keep this or use number_assigned depending on the script
            email: user.email,
            subcompanyName: fullCompany.name,
            assignedNumber: result.number || "Pending",
            direction: (result as any).direction || "INBOUND",
            credits: fullCompany.creditBalance?.creditsRemaining || 0
          }),
        }).catch(err => console.error("Failed to send number assignment webhook:", err));
      }
    } catch (e) {
      console.error("Failed to process number assignment webhook:", e);
    }
  }

  return result;
}

export async function deletePhoneNumberForAdmin(id: string) {
  const existing = await prisma.phoneNumber.findUnique({ 
    where: { id },
    include: {
      company: {
        include: {
          members: {
            include: { user: true }
          },
          contact: true,
          creditBalance: true
        }
      }
    }
  });
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

  // Fire webhook notification for number removal
  try {
    const user = existing.company?.members?.[0]?.user;
    if (user && user.email) {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "number_removed",
          email: user.email,
          subcompanyName: existing.company?.name || "Unknown Company",
          removedNumber: existing.number,
          credits: existing.company?.creditBalance?.creditsRemaining || 0
        }),
      }).catch(err => console.error("Failed to send number removal webhook:", err));
    }
  } catch (e) {
    console.error("Failed to process number removal webhook:", e);
  }
}
