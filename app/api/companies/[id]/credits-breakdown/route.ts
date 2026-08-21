import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;

    // Fetch the parent company
    const parent = await prisma.company.findUnique({
      where: { id },
      include: { creditBalance: true }
    });

    if (!parent) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch sub-companies
    const subCompanies = await prisma.company.findMany({
      where: { parentCompanyId: id },
      include: { creditBalance: true },
      orderBy: { createdAt: "asc" }
    });

    const breakdown = [];

    // Add parent
    breakdown.push({
      name: parent.name + " (Main)",
      creditsRemaining: parent.creditBalance?.creditsRemaining || 0
    });

    // Add sub-companies
    for (const sub of subCompanies) {
      breakdown.push({
        name: sub.name,
        creditsRemaining: sub.creditBalance?.creditsRemaining || 0
      });
    }

    const total = breakdown.reduce((sum, item) => sum + item.creditsRemaining, 0);

    return NextResponse.json({
      breakdown,
      total
    });
  } catch (error: any) {
    console.error("Credits breakdown error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
