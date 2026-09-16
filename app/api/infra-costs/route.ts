import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const notification = await prisma.infraCostNotification.create({
      data: {
        email: body.email || null,
        companyName: body.companyName || null,
        subCompanyName: body.subCompanyName || null,
        companyId: body.companyId,
        subCompanyId: body.subCompanyId || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        recurrenceType: body.recurrenceType || "ONCE",
        message: body.message || null,
      },
    });

    if (body.companyId) {
      await prisma.systemEvent.create({
        data: {
          companyId: body.companyId,
          type: "NOTIFICATION_CREATED",
          title: "Infra Cost Notification Created",
          message: `Created ${body.recurrenceType} notification for ${body.companyName || 'Company'}.`,
        }
      }).catch(console.error);
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error("POST /api/infra-costs Error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const notifications = await prisma.infraCostNotification.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        subCompany: { select: { name: true } },
      }
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/infra-costs Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
