import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

/** Fire-and-forget GAS email — never blocks the response */
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

    // ── Email logic ────────────────────────────────────────────────────────────
    // Determine if start date is today AND already past 10 AM
    const now = new Date();
    const startDate = new Date(body.startDate);
    const isToday =
      startDate.getFullYear() === now.getFullYear() &&
      startDate.getMonth() === now.getMonth() &&
      startDate.getDate() === now.getDate();
    const isPast10AM = now.getHours() >= 10;

    const emailPayload = {
      companyName: body.companyName || "",
      email: body.email || "",
      // userName will fall back to companyName in GAS if not provided
      name: body.companyName || "",
      startDate: body.startDate,
      endDate: body.endDate,
      message: body.message || "",
    };

    // Always fire admin reminder immediately when notification is created
    await sendEmail({ type: "infra_cost_reminder_admin", ...emailPayload });

    // Fire user reminder immediately if:
    // — start date is today and it's already past 10 AM (can't wait for 10 AM trigger)
    // — OR start date is in the past (edge case)
    if (body.email && ((isToday && isPast10AM) || startDate <= now)) {
      await sendEmail({ type: "infra_cost_reminder_user", ...emailPayload });
    }
    // For future dates: the GAS time-based trigger handles sending at 10 AM
    // ──────────────────────────────────────────────────────────────────────────

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
