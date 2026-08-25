import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const requests = await prisma.supportRequest.findMany({
      where: {
        reason: "OTHER",
        message: { contains: "Number Assignment Request" },
        status: "NEW",
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, requests }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Failed to fetch number requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch number requests" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email, companyId, name, type } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400, headers: corsHeaders });
    }

    const directionLabel = type ? type.toUpperCase() : "GENERAL";
    const requestMessage = `${directionLabel} Number Assignment Request`;

    // Check if there is already an active request
    const existing = await prisma.supportRequest.findFirst({
      where: { 
        email, 
        message: requestMessage, 
        status: "NEW",
        ...(companyId ? { companyId } : {})
      },
    });
    
    if (existing) {
      const hoursSinceLastReminder = (new Date().getTime() - existing.updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReminder < 24) {
        return NextResponse.json({ success: false, error: "24h_lock" }, { status: 429, headers: corsHeaders });
      }

      await prisma.supportRequest.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() }
      });
      
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reminder_number",
          name: name || "Unknown User",
          email,
          direction: directionLabel
        })
      }).catch(err => console.error("Webhook trigger failed:", err));

      return NextResponse.json({ success: true, request: existing }, { status: 200, headers: corsHeaders });
    }

    const newRequest = await prisma.supportRequest.create({
      data: {
        name: name || "Unknown User",
        email,
        companyId: companyId || null,
        reason: "OTHER",
        message: requestMessage,
        status: "NEW",
      },
    });

    const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reminder_number",
        name: name || "Unknown User",
        email,
        direction: directionLabel
      })
    }).catch(err => console.error("Webhook trigger failed:", err));

    return NextResponse.json({ success: true, request: newRequest }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Failed to create number request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500, headers: corsHeaders }
    );
  }
}
