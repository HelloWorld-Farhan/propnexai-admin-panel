import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const pending = await prisma.company.findMany({
      where: {
        tenantType: "CHILD",
        status: { not: "ACTIVE" }, // e.g. "PENDING"
        isDemo: false
      },
      include: {
        parentCompany: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, count: pending.length, pending });
  } catch (error: any) {
    console.error("[SUB_COMPANY_VERIFICATIONS_ERROR]", error);
    return NextResponse.json({ success: false, count: 0, pending: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId } = body;
    
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Missing companyId" }, { status: 400 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { status: "ACTIVE" }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SUB_COMPANY_DISMISS_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
