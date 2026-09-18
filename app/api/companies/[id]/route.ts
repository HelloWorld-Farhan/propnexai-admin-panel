import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/server-session";
import { getCompanyById } from "@/src/server/repositories/company.repository";

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(JSON.stringify(company)));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;

    // Fetch company BEFORE deleting so we can email the owner
    const company = await getCompanyById(id);
    const ownerEmail = (company as any)?.ownerEmail || (company as any)?.contactEmail || null;
    const ownerName  = (company as any)?.ownerName  || (company as any)?.name || "User";

    const { deleteCompanyById } = await import("@/src/server/repositories/company.repository");
    const success = await deleteCompanyById(id);

    if (!success) {
      return NextResponse.json({ error: "Not found or cannot delete demo" }, { status: 404 });
    }

    // Fire user_deleted email (fire-and-forget)
    if (ownerEmail) {
      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user_deleted",
          name: ownerName,
          email: ownerEmail,
        }),
      }).catch((err) => console.error("user_deleted webhook failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Company Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const { name, assignedNumber } = body as { name?: string, assignedNumber?: string };
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const { prisma } = await import("@/lib/prisma");

    const updated = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id },
        data: { name: name.trim() },
      });

      if (assignedNumber !== undefined) {
        const cleanedNumber = assignedNumber.trim();
        
        if (cleanedNumber) {
          // Check if there is an existing phone number assigned to this company
          const existingPhone = await tx.phoneNumber.findFirst({
            where: { companyId: id },
          });

          if (existingPhone) {
            // Update existing
            await tx.phoneNumber.update({
              where: { id: existingPhone.id },
              data: { number: cleanedNumber },
            });
          } else {
            // Find parent company ID (for assignedParentTenantId)
            const parentComp = await tx.company.findUnique({ where: { id } });
            
            // Note: allocating a completely new phone number ID and public ID if none exists
            const { allocatePhoneNumberEntityId, generatePublicId } = await import("@/src/server/lib/public-id");
            const phoneNumberId = await allocatePhoneNumberEntityId(tx, id);
            const publicId = generatePublicId(parentComp?.cli || "CLI", "UNASSIGNED", phoneNumberId);
            
            await tx.phoneNumber.create({
              data: {
                companyId: id,
                phoneNumberId,
                publicId,
                number: cleanedNumber,
                provider: "PROPNEX",
                status: "ACTIVE",
                assignedParentTenantId: parentComp?.parentCompanyId,
              },
            });
          }
        }
      }
      return comp;
    });

    return NextResponse.json({ success: true, company: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
