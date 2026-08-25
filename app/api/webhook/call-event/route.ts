import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint to receive Voicelink call events
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Minimal expected fields from Voicelink
    // Assuming structure: { call_id, did_number, customer_number, status, duration, custom_parameters: '{"companyId": "..."}' }
    const { call_id, did_number, customer_number, status, duration, custom_parameters } = payload;
    
    let companyId = null;
    let name = "Unknown";
    
    if (custom_parameters) {
      try {
        const parsed = JSON.parse(custom_parameters);
        companyId = parsed.companyId;
        name = parsed.name || name;
      } catch (e) {
        // ignore
      }
    }
    
    if (!companyId) {
      // Find company by matching outbound number (did_number)
      const numberRecord = await prisma.assignedNumber.findFirst({
        where: { number: { contains: (did_number || "").replace("+", "") } }
      });
      if (numberRecord) {
        companyId = numberRecord.companyId;
      }
    }
    
    if (!companyId) {
      return NextResponse.json({ error: "Could not map call to any company" }, { status: 400 });
    }
    
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 1. Log the call
    // First, ensure the lead exists or create it
    let leadId = null;
    if (customer_number) {
      let lead = await prisma.lead.findFirst({
        where: { phone: customer_number, companyId }
      });
      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            name,
            phone: customer_number,
            companyId,
            status: "NEW"
          }
        });
      }
      leadId = lead.id;
    }

    // Create call log
    await prisma.callLog.create({
      data: {
        companyId,
        leadId,
        assignedNumberId: undefined, // Optionally link if we have the ID
        direction: "OUTBOUND",
        status: status === "completed" || status === "answered" ? "COMPLETED" : "FAILED",
        durationSeconds: duration ? parseInt(duration, 10) : 0,
        recordingUrl: payload.recording_url || null,
        transcript: payload.transcript || null,
        voicelinkCallId: call_id,
        startedAt: new Date()
      }
    });

    // 2. Deduct credit
    // Only deduct credit if the call was actually answered/completed and has a duration, 
    // or deduct 1 credit per call regardless. Let's deduct 1 credit.
    await prisma.company.update({
      where: { id: companyId },
      data: {
        creditsRemaining: { decrement: 1 },
        creditsUsed: { increment: 1 }
      }
    });

    return NextResponse.json({ success: true, message: "Call logged and credit deducted" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
