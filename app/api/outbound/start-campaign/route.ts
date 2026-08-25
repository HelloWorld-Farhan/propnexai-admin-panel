import { NextResponse } from "next/server";
import { getCompanyById } from "@/src/server/repositories/company.repository";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const VOICELINK_API_URL = "https://app.voicelink.co.in/api";

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
    const loginRes = await fetch(`${VOICELINK_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "propnex",
        password: "PropnexAi2025@#*",
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        did_number: outboundNumber.number.replace("+", ""),
        call_limit: company.channels || 1, // Default to 1 channel if not set
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
      await prisma.callLog.createMany({
        data: formattedLeads.map((lead: any) => {
          const randomId = crypto.randomBytes(4).toString("hex").toUpperCase();
          const callLogIdStr = `CL${randomId}`;
          const publicIdStr = `v1.PNX.CP000000.${callLogIdStr}`; // Mock public ID
          
          return {
            companyId,
            phoneNumberId: outboundNumber.id,
            direction: "OUTBOUND",
            status: "PENDING",
            callerNumber: outboundNumber.number,
            receiverNumber: lead.customer_number,
            callLogId: callLogIdStr,
            publicId: publicIdStr,
            startedAt: new Date(),
            durationSeconds: 0,
            creditsUsed: 0
          };
        })
      });
    } catch (dbError) {
      console.error("Failed to insert pending call logs:", dbError);
      // We don't fail the whole request if this fails, the campaign is already started.
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
