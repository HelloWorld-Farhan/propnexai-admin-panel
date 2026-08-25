import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
import { allocatePhoneNumberEntityId, generatePublicId } from "@/src/server/lib/public-id";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const { name, totalChannels, inboundNumbers, outboundNumbers } = body as {
      name: string;
      totalChannels: number;
      inboundNumbers: { number: string; channels: number | null }[];
      outboundNumbers: { number: string; channels: number | null }[];
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, parentCompanyId: true, name: true, phoneNumbers: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const cleanedInbounds = inboundNumbers.filter(n => n.number.trim().length > 0);
    const cleanedOutbounds = outboundNumbers.filter(n => n.number.trim().length > 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update company name
      await tx.company.update({
        where: { id },
        data: { name: name.trim() },
      });

      // 2. Update setup config totalChannels
      const existingSetup = await tx.companySetupConfig.findUnique({ where: { companyId: id } });
      if (existingSetup) {
        await tx.companySetupConfig.update({
          where: { companyId: id },
          data: { totalChannels },
        });
      } else {
        await tx.companySetupConfig.create({
          data: {
            companyId: id,
            totalChannels,
            deltaSeconds: 2,
            agentsAllocated: 0,
          },
        });
      }

      // 3. Process Inbound Numbers — include BOTH direction numbers
      const existingInbounds = company.phoneNumbers.filter(p => p.direction === "INBOUND" || p.direction === "BOTH");
      const existingInboundSet = new Set(existingInbounds.map(p => p.number));
      const newInboundMap = new Map(cleanedInbounds.map(n => [n.number.trim(), n.channels]));

      // Delete removed inbounds (only pure INBOUND, not BOTH)
      for (const p of existingInbounds) {
        if (!newInboundMap.has(p.number)) {
          if (p.direction === "BOTH") {
            // Downgrade to OUTBOUND instead of deleting
            await tx.phoneNumber.update({
              where: { id: p.id },
              data: { direction: "OUTBOUND" }
            });
          } else {
            await tx.phoneNumber.delete({ where: { id: p.id } });
          }
        } else {
          // Update channels
          await tx.phoneNumber.update({
            where: { id: p.id },
            data: { channels: newInboundMap.get(p.number) }
          });
        }
      }

      // Create added inbounds
      for (const item of cleanedInbounds) {
        const number = item.number.trim();
        if (!existingInboundSet.has(number)) {
          // Check if it exists as OUTBOUND — upgrade to BOTH
          const existingOutbound = company.phoneNumbers.find(p => p.number === number && p.direction === "OUTBOUND");
          if (existingOutbound) {
            await tx.phoneNumber.update({
              where: { id: existingOutbound.id },
              data: { direction: "BOTH", channels: item.channels }
            });
          } else {
            const phoneNumberId = await allocatePhoneNumberEntityId(tx as any, id);
            const publicId = generatePublicId(company.name.substring(0, 3).toUpperCase(), "UNASSIGNED", phoneNumberId);
            await tx.phoneNumber.create({
              data: {
                number,
                companyId: id,
                status: "ACTIVE",
                provider: "PROPNEX",
                phoneNumberId,
                publicId,
                assignedParentTenantId: company.parentCompanyId,
                direction: "INBOUND",
                channels: item.channels
              } as any,
            });
          }
        }
      }

      // 4. Process Outbound Numbers — include BOTH direction numbers
      const existingOutbounds = company.phoneNumbers.filter(p => p.direction === "OUTBOUND" || p.direction === "BOTH");
      const existingOutboundSet = new Set(existingOutbounds.map(p => p.number));
      const newOutboundMap = new Map(cleanedOutbounds.map(n => [n.number.trim(), n.channels]));

      // Delete removed outbounds (only pure OUTBOUND, not BOTH)
      for (const p of existingOutbounds) {
        if (!newOutboundMap.has(p.number)) {
          if (p.direction === "BOTH") {
            // Downgrade to INBOUND instead of deleting
            await tx.phoneNumber.update({
              where: { id: p.id },
              data: { direction: "INBOUND" }
            });
          } else {
            await tx.phoneNumber.delete({ where: { id: p.id } });
          }
        } else {
          // Update channels
          await tx.phoneNumber.update({
            where: { id: p.id },
            data: { channels: newOutboundMap.get(p.number) }
          });
        }
      }

      // Create added outbounds
      for (const item of cleanedOutbounds) {
        const number = item.number.trim();
        if (!existingOutboundSet.has(number)) {
          // Check if it exists as INBOUND — upgrade to BOTH
          const existingInbound = company.phoneNumbers.find(p => p.number === number && p.direction === "INBOUND");
          if (existingInbound) {
            await tx.phoneNumber.update({
              where: { id: existingInbound.id },
              data: { direction: "BOTH", channels: item.channels }
            });
          } else {
            const phoneNumberId = await allocatePhoneNumberEntityId(tx as any, id);
            const publicId = generatePublicId(company.name.substring(0, 3).toUpperCase(), "UNASSIGNED", phoneNumberId);
            await tx.phoneNumber.create({
              data: {
                number,
                companyId: id,
                status: "ACTIVE",
                provider: "PROPNEX",
                phoneNumberId,
                publicId,
                assignedParentTenantId: company.parentCompanyId,
                direction: "OUTBOUND",
                channels: item.channels
              } as any,
            });
          }
        }
      }

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Full update error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to update sub-company" }, { status: 500 });
  }
}
