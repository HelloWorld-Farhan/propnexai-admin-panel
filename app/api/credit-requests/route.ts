import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const requests = await prisma.supportRequest.findMany({
      where: {
        reason: "BILLING_CREDITS",
        status: "NEW",
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, requests }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Failed to fetch credit requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch credit requests" },
      { status: 500, headers: corsHeaders }
    );
  }
}
