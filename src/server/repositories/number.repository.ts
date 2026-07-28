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
    input.companyId,
    input.inboundAgentId,
    input.outboundAgentId,
  );

  const { company, campaignResourceKey } = await resolvePublicIdParts(
    input.companyId,
    campaignId,
  );

  const existing = await prisma.phoneNumber.findFirst({
    where: {
      companyId: input.companyId,
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

    return tx.phoneNumber.create({
      data: {
        companyId: input.companyId,
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

  const nextCompanyId = input.companyId ?? existing.companyId;
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
    nextCompanyId,
    nextInboundAgentId,
    nextOutboundAgentId,
  );

  const companyChanged = nextCompanyId !== existing.companyId;
  const campaignChanged = nextCampaignId !== existing.campaignId;

  const duplicate = await prisma.phoneNumber.findFirst({
    where: {
      companyId: nextCompanyId,
      campaignId: nextCampaignId,
      number: existing.number,
      NOT: { id },
    },
  });
  if (duplicate) {
    throw new Error("This number is already assigned to that company/campaign");
  }

  const { company, campaignResourceKey } = await resolvePublicIdParts(
    nextCompanyId,
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

    return tx.phoneNumber.update({
      where: { id },
      data: {
        companyId: nextCompanyId,
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
