import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

async function sendEmail(payload: Record<string, unknown>) {
  if (!GAS_URL) return;
  try {
    await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("GAS email error:", e);
  }
}

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

    // Capture old dates BEFORE shifting (these are the "completed" month)
    const completedStart = new Date(notification.startDate);
    const completedEnd = new Date(notification.endDate);

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

    // Log system event
    if (notification.companyId) {
      await prisma.systemEvent.create({
        data: {
          companyId: notification.companyId,
          type: "NOTIFICATION_EDITED",
          title: "Payment Cycle Completed & Shifted",
          message: `Admin marked ${notification.companyName || 'Company'} payment complete. Shifted to next cycle.`,
        }
      }).catch(console.error);
    }

    // Fire payment-completed email to user (fire-and-forget)
    if (notification.email) {
      sendEmail({
        type: "infra_cost_payment_completed",
        companyName: notification.companyName || "",
        email: notification.email,
        name: notification.companyName || "",
        // The month that was just COMPLETED
        startDate: completedStart.toISOString(),
        endDate: completedEnd.toISOString(),
        message: notification.message || "",
        // The next cycle start (so user knows when next reminder is)
        nextStartDate: newStart.toISOString(),
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/infra-costs/[id]/skip Error:", error);
    return NextResponse.json({ error: "Failed to skip notification" }, { status: 500 });
  }
}
