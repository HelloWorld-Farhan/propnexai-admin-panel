import { NextResponse } from "next/server";
import { getCompanyById } from "@/src/server/repositories/company.repository";
import { prisma } from "@/lib/prisma";
import { CallDirection, CallStatus } from "@prisma/client";
import crypto from "crypto";
import axios from "axios";

const VOICELINK_API_URL = "https://app.voicelink.co.in/api";
export const preferredRegion = 'bom1';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, leads } = body;

    if (!companyId || !leads || leads.length === 0) {
      return NextResponse.json(
        { error: "companyId and leads are required" },
        { status: 400 }
      );
    }

    // 1. Fetch Company details and their outbound number
    const company = await getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if ((company.creditBalance?.creditsRemaining || 0) < leads.length) {
      return NextResponse.json(
        { error: "Insufficient credits to start campaign for these leads." },
        { status: 400 }
      );
    }

    // Get assigned outbound number
    const outboundNumber = (company.phoneNumbers || []).find(
      (n: any) => n.direction === "OUTBOUND" || n.direction === "BOTH"
    );

    if (!outboundNumber) {
      return NextResponse.json(
        { error: "No outbound number assigned to this company." },
        { status: 400 }
      );
    }

    // 3 & 4. Send leads to our own Hostinger server (propnexai-main-server)
    // which is not blocked by Voicelink's firewall.
    const didNumber = outboundNumber.number.replace("+", "");
    const mainServerUrl = "http://200.234.34.240:3001"; // Hardcoded to 3001 as requested
    
    let addLeadData = null;
    try {
      console.log(`Forwarding ${leads.length} leads to Hostinger server to bypass firewall...`);
      const res = await axios.post(`${mainServerUrl}/api/obd/voicelink/add-leads`, {
        leads,
        didNumber,
        companyId,
      }, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        }
      });
      
      addLeadData = res.data;
      console.log("Hostinger successfully processed Voicelink requests:", addLeadData);
    } catch (err: any) {
      console.error("Failed to forward leads to Hostinger:", err.message);
      throw err;
    }

    // 5. Create PENDING CallLogs for the UI to display immediately
    try {
      const defaultStage = await prisma.leadPipelineStage.findFirst({
        where: { companyId, isDefault: true }
      });
      
      const callLogsToCreate: any[] = [];
      
      for (const lead of leads) {
        let dbLead = await prisma.lead.findFirst({
          where: { companyId, phone: lead.phone }
        });
        
        if (!dbLead && defaultStage) {
          dbLead = await prisma.lead.create({
            data: {
              firstName: lead.name || "Unknown",
              phone: lead.phone,
              companyId,
              stageId: defaultStage.id
            }
          });
        }
        
        if (dbLead) {
          const randomId = crypto.randomBytes(4).toString("hex").toUpperCase();
          const callLogIdStr = `CL${randomId}`;
          const publicIdStr = `v1.PNX.CP000000.${callLogIdStr}`;
          
          callLogsToCreate.push({
            companyId,
            phoneNumberId: outboundNumber.id,
            leadId: dbLead.id,
            direction: CallDirection.OUTBOUND,
            status: CallStatus.PENDING,
            callLogId: callLogIdStr,
            publicId: publicIdStr,
            startedAt: new Date(),
            durationSeconds: 0,
            creditsUsed: 0
          });
        }
      }
      
      if (callLogsToCreate.length > 0) {
        await prisma.callLog.createMany({ data: callLogsToCreate as any });
      }
    } catch (dbError) {
      console.error("Failed to insert pending call logs:", dbError);
    }

    return NextResponse.json({
      success: true,
      message: "Campaign started successfully",
      voicelinkResponse: addLeadData,
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }
    });
  } catch (error: any) {
    console.error("Start campaign error:", error);
    
    // Check if it's an axios error with a response
    const errorMessage = error.response?.data?.message 
      || error.response?.data 
      || error.message 
      || "Failed to start campaign";

    return NextResponse.json(
      { error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage) },
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
      }
    );
  }
}
