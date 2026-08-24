import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const LOCK_HOURS = 24;

export async function POST(request: Request) {
  try {
    const { companyId, companyName, email, name } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the sub-company and check it's genuinely pending
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        parentCompany: { select: { name: true } },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // If already active, nothing to remind about
    if (company.status === "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Company is already active" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Enforce 24h lock — we store the last reminder time in a SupportRequest record
    // with reason = "SUBCOMPANY_REMINDER" so we don't pollute number-requests.
    const existing = await prisma.supportRequest.findFirst({
      where: {
        companyId,
        reason: "OTHER",
        message: "Subcompany Verification Reminder",
        status: "NEW",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      const hoursSinceLast =
        (Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < LOCK_HOURS) {
        const hoursLeft = LOCK_HOURS - hoursSinceLast;
        return NextResponse.json(
          { success: false, error: "24h_lock", hoursLeft },
          { status: 429, headers: corsHeaders }
        );
      }

      // Reset the timestamp to now (re-arm the lock for another 24h)
      await prisma.supportRequest.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
    } else {
      // Create a tracking record
      await prisma.supportRequest.create({
        data: {
          name: name || "Unknown User",
          email: email || "",
          companyId,
          reason: "OTHER",
          message: "Subcompany Verification Reminder",
          status: "NEW",
        },
      });
    }

    // Fire email to admin via Google Apps Script webhook
    const webhookUrl =
      "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "subcompany_reminder",
        subcompanyName: companyName || company.name,
        parentCompanyName: company.parentCompany?.name || "Unknown",
        userEmail: email || "",
        userName: name || "Unknown User",
      }),
    }).catch((err) => console.error("Webhook failed:", err));

    return NextResponse.json(
      { success: true, message: "Reminder sent to admin." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[SUB_COMPANY_REMINDER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
