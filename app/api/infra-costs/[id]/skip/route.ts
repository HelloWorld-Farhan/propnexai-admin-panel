import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notification = await prisma.infraCostNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.recurrenceType === "ONCE") {
       // If it's ONCE, skipping means basically pausing it forever.
       const farFuture = new Date();
       farFuture.setFullYear(farFuture.getFullYear() + 10);
       const updated = await prisma.infraCostNotification.update({
         where: { id },
         data: { pausedUntil: farFuture }
       });
       return NextResponse.json(updated);
    }

    // It's recurring, so we shift the start and end dates forward by the interval.
    const parts = notification.recurrenceType.split("_");
    const interval = parseInt(parts[1]) || 1;

    const newStart = new Date(notification.startDate);
    newStart.setMonth(newStart.getMonth() + interval);

    const newEnd = new Date(notification.endDate);
    newEnd.setMonth(newEnd.getMonth() + interval);

    const updated = await prisma.infraCostNotification.update({
      where: { id },
      data: {
        startDate: newStart,
        endDate: newEnd,
        pausedUntil: null // Clear any pause
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/infra-costs/[id]/skip Error:", error);
    return NextResponse.json({ error: "Failed to skip notification" }, { status: 500 });
  }
}
