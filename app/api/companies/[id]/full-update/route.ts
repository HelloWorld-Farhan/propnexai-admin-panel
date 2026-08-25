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
      inboundNumbers: string[];
      outboundNumbers: string[];
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

    const cleanedInbounds = inboundNumbers.map(n => n.trim()).filter(n => n.length > 0);
    const cleanedOutbounds = outboundNumbers.map(n => n.trim()).filter(n => n.length > 0);

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

      // 3. Process Inbound Numbers
      const existingInbounds = company.phoneNumbers.filter(p => p.direction === "INBOUND");
      const existingInboundSet = new Set(existingInbounds.map(p => p.number));
      const newInboundSet = new Set(cleanedInbounds);

      // Delete removed inbounds
      for (const p of existingInbounds) {
        if (!newInboundSet.has(p.number)) {
          await tx.phoneNumber.delete({ where: { id: p.id } });
        }
      }

      // Create added inbounds
      for (const number of cleanedInbounds) {
        if (!existingInboundSet.has(number)) {
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
            } as any,
          });
        }
      }

      // 4. Process Outbound Numbers
      const existingOutbounds = company.phoneNumbers.filter(p => p.direction === "OUTBOUND");
      const existingOutboundSet = new Set(existingOutbounds.map(p => p.number));
      const newOutboundSet = new Set(cleanedOutbounds);

      // Delete removed outbounds
      for (const p of existingOutbounds) {
        if (!newOutboundSet.has(p.number)) {
          await tx.phoneNumber.delete({ where: { id: p.id } });
        }
      }

      // Create added outbounds
      for (const number of cleanedOutbounds) {
        if (!existingOutboundSet.has(number)) {
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
            } as any,
          });
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
