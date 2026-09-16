import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
        message: body.message || null,
        pausedUntil: body.pausedUntil ? new Date(body.pausedUntil) : null,
      },
    });

    if (body.companyId) {
      await prisma.systemEvent.create({
        data: {
          companyId: body.companyId,
          type: "NOTIFICATION_EDITED",
          title: "Infra Cost Notification Updated",
          message: `Updated notification for ${body.companyName || 'Company'}.`,
        }
      }).catch(console.error);
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error("PUT /api/infra-costs/[id] Error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const existing = await prisma.infraCostNotification.findUnique({ where: { id } });
    
    await prisma.infraCostNotification.delete({
      where: { id },
    });

    if (existing?.companyId) {
      await prisma.systemEvent.create({
        data: {
          companyId: existing.companyId,
          type: "NOTIFICATION_DELETED",
          title: "Infra Cost Notification Deleted",
          message: `Deleted notification for ${existing.companyName || 'Company'}.`,
        }
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/infra-costs/[id] Error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
