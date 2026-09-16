import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const notification = await prisma.infraCostNotification.update({
      where: { id },
      data: {
        email: body.email || null,
        companyName: body.companyName || null,
        subCompanyName: body.subCompanyName || null,
        companyId: body.companyId,
        subCompanyId: body.subCompanyId || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        recurrenceType: body.recurrenceType,
        pausedUntil: body.pausedUntil ? new Date(body.pausedUntil) : null,
      },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error("PUT /api/infra-costs/[id] Error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.infraCostNotification.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/infra-costs/[id] Error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
