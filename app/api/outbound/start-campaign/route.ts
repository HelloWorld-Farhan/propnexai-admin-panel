import { NextResponse } from "next/server";
import { getCompanyById } from "@/src/server/repositories/company.repository";
import { prisma } from "@/lib/prisma";
import { CallDirection, CallStatus } from "@prisma/client";
import crypto from "crypto";

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

    // 2. Authenticate with Voicelink
    const loginRes = await fetch(`${VOICELINK_API_URL}/v1/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        username: "propnex",
        password: "PropnexAi2025@#",
      }),
    });

    if (!loginRes.ok) {
      throw new Error("Failed to authenticate with Voicelink");
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.access_token;

    if (!token) {
      throw new Error("Invalid authentication response from Voicelink");
    }

    // 3. Format leads for Voicelink Bulk API
    const formattedLeads = leads.map((lead: any) => ({
      customer_number: lead.phone,
      custom_parameters: JSON.stringify({ name: lead.name, companyId }),
    }));

    // 4. Send leads to Voicelink
    const addLeadRes = await fetch(`${VOICELINK_API_URL}/v1/add_lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        did_number: outboundNumber.number.replace("+", ""),
        call_limit: Math.max(1, Math.floor(Number(company.channels || 1))), // Ensure it's an integer >= 1
        leads: formattedLeads,
      }),
    });

    if (!addLeadRes.ok) {
      const errorText = await addLeadRes.text();
      throw new Error(`Voicelink API error: ${errorText}`);
    }

    const addLeadData = await addLeadRes.json();

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
    return NextResponse.json(
      { error: error.message || "Failed to start campaign" },
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
