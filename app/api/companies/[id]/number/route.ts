import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePublicId, allocatePhoneNumberEntityId } from "@/src/server/lib/public-id";

// PATCH — update the existing (first) assigned number
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!body.newNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update the phone number associated with this company
    const updated = await prisma.phoneNumber.updateMany({
      where: { companyId: id },
      data: { number: body.newNumber.trim() },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "No phone number found for this sub-company" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[EDIT_SUB_COMPANY_NUMBER_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — add an additional phone number to a company
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!body.newNumber || !body.newNumber.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, parentCompanyId: true, phoneNumbers: { select: { number: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check not already assigned
    const numTrimmed = body.newNumber.trim();
    const alreadyExists = company.phoneNumbers.some((p: any) => p.number === numTrimmed);
    if (alreadyExists) {
      return NextResponse.json({ error: "This number is already assigned to this company" }, { status: 409 });
    }

    // Generate required IDs
    const phoneNumberId = await allocatePhoneNumberEntityId(prisma as any, id);
    const publicId = generatePublicId(company.name.substring(0, 3).toUpperCase(), "UNASSIGNED", phoneNumberId);

    // Create the new phone number record
    const created = await prisma.phoneNumber.create({
      data: {
        number: numTrimmed,
        companyId: id,
        status: "ACTIVE",
        provider: "PROPNEX",
        phoneNumberId,
        publicId,
        assignedParentTenantId: company.parentCompanyId,
        direction: body.direction || null,
      } as any,
    });

    return NextResponse.json({ success: true, phoneNumber: created });
  } catch (error: any) {
    console.error("[ADD_COMPANY_NUMBER_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
