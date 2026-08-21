import { NextRequest, NextResponse } from "next/server";
import { verifySubCompany } from "@/src/server/repositories/company.repository";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!body.assignedNumber || !body.parentCompanyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const company = await verifySubCompany(id, body.parentCompanyId, body.assignedNumber);

    return NextResponse.json(company);
  } catch (error: any) {
    console.error("[VERIFY_SUB_COMPANY_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
