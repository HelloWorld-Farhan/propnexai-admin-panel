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

      // 3 & 4. Process Phone Numbers Holistically
      const desiredNumbers = new Map<string, { direction: "INBOUND" | "OUTBOUND" | "BOTH", channels: number | null }>();

      // Add inbounds
      for (const n of cleanedInbounds) {
        const num = n.number.trim();
        desiredNumbers.set(num, { direction: "INBOUND", channels: n.channels });
      }

      // Add outbounds (upgrade to BOTH if already INBOUND)
      for (const n of cleanedOutbounds) {
        const num = n.number.trim();
        if (desiredNumbers.has(num)) {
          desiredNumbers.set(num, { direction: "BOTH", channels: n.channels ?? desiredNumbers.get(num)!.channels });
        } else {
          desiredNumbers.set(num, { direction: "OUTBOUND", channels: n.channels });
        }
      }

      // Now sync with existing phone numbers
      const existingNumbers = company.phoneNumbers || [];
      const existingNumberMap = new Map(existingNumbers.map(p => [p.number, p]));

      // Updates and Deletes
      for (const p of existingNumbers) {
        const desired = desiredNumbers.get(p.number);
        if (!desired) {
          // No longer needed in either direction
          await tx.phoneNumber.delete({ where: { id: p.id } });
        } else {
          // Update if direction or channels changed
          if (p.direction !== desired.direction || p.channels !== desired.channels) {
            await tx.phoneNumber.update({
              where: { id: p.id },
              data: { direction: desired.direction, channels: desired.channels }
            });
          }
          // Remove from map so we know what's left to create
          desiredNumbers.delete(p.number);
        }
      }

      // Creates
      for (const [number, desired] of desiredNumbers.entries()) {
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
            direction: desired.direction,
            channels: desired.channels
          } as any,
        });
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
