import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
