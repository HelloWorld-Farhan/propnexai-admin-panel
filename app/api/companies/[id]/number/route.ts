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

    // Webhook and Resolution Logic
    try {
      const companyWithMembers = await prisma.company.findUnique({
        where: { id },
        include: { members: { include: { user: true } }, parentCompany: true }
      });
      if (companyWithMembers && companyWithMembers.members.length > 0) {
        const user = companyWithMembers.members[0].user;
        if (user && user.email) {
          const isSubCompany = !!companyWithMembers.parentCompanyId;
          const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
          
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: isSubCompany ? "number_assigned_subcompany" : "number_assigned",
              email: user.email,
              name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email.split("@")[0],
              assignedNumber: numTrimmed,
              direction: body.direction || "GENERAL",
              subcompanyName: isSubCompany ? companyWithMembers.name : undefined
            }),
          }).catch(err => console.error("Failed to send number assignment webhook:", err));
          
          await prisma.supportRequest.updateMany({
            where: {
              companyId: id,
              reason: "OTHER",
              message: { contains: "Number Assignment Request" },
              status: "NEW"
            },
            data: { status: "RESOLVED" }
          });
        }
      }
    } catch (e) {
      console.error("Webhook/SupportRequest resolution error:", e);
    }

    return NextResponse.json({ success: true, phoneNumber: created });
  } catch (error: any) {
    console.error("[ADD_COMPANY_NUMBER_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
