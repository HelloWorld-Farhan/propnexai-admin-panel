import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
    
    let phoneNumberId = undefined;
    
    if (!companyId) {
      // Find company by matching outbound number (did_number)
      const numberRecord = await prisma.phoneNumber.findFirst({
        where: { number: { contains: (did_number || "").replace("+", "") } }
      });
      if (numberRecord) {
        companyId = numberRecord.companyId;
        phoneNumberId = numberRecord.id;
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
      
      // Need a valid stage to create a lead
      const defaultStage = await prisma.leadPipelineStage.findFirst({
        where: { companyId, isDefault: true }
      });
      
      if (!lead && defaultStage) {
        lead = await prisma.lead.create({
          data: {
            firstName: name,
            phone: customer_number,
            companyId,
            stageId: defaultStage.id
          }
        });
      }
      if (lead) {
        leadId = lead.id;
      }
    }

    const finalStatus = status === "completed" || status === "answered" ? "COMPLETED" : "FAILED";
    const durationInt = duration ? parseInt(duration, 10) : 0;
    
    // Check if we have a pending call log for this customer
    const existingPending = await prisma.callLog.findFirst({
      where: {
        companyId,
        receiverNumber: customer_number,
        status: { in: ["PENDING", "QUEUED", "DISPATCHING"] }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (existingPending) {
      await prisma.callLog.update({
        where: { id: existingPending.id },
        data: {
          status: finalStatus,
          durationSeconds: durationInt,
          recordingUrl: payload.recording_url || null,
          providerCallId: call_id,
          leadId,
          creditsUsed: 1
        }
      });
    } else {
      // Generate random IDs for the call log
      const randomId = crypto.randomBytes(4).toString("hex").toUpperCase();
      const callLogIdStr = `CL${randomId}`;
      const publicIdStr = `v1.PNX.CP000000.${callLogIdStr}`; // Mock public ID

      await prisma.callLog.create({
        data: {
          companyId,
          leadId,
          phoneNumberId: phoneNumberId,
          direction: "OUTBOUND",
          status: finalStatus,
          durationSeconds: durationInt,
          recordingUrl: payload.recording_url || null,
          providerCallId: call_id,
          startedAt: new Date(),
          callLogId: callLogIdStr,
          publicId: publicIdStr,
          creditsUsed: 1
        }
      });
    }

    // 2. Deduct credit
    // Update credit balance
    const creditBalance = await prisma.creditBalance.findUnique({ where: { companyId } });
    if (creditBalance) {
      await prisma.creditBalance.update({
        where: { companyId },
        data: {
          creditsRemaining: { decrement: 1 },
          creditsUsed: { increment: 1 }
        }
      });
    }

    return NextResponse.json({ success: true, message: "Call logged and credit deducted" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
