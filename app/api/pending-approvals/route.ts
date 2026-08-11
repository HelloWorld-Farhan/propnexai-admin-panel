import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const pending = await prisma.pendingApproval.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, pending }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Failed to fetch pending approvals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending approvals" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400, headers: corsHeaders });
    }

    const pending = await prisma.pendingApproval.upsert({
      where: { email },
      update: {},
      create: { email, status: "PENDING" },
    });

    return NextResponse.json({ success: true, pending }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Failed to create pending approval:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create pending approval" },
      { status: 500, headers: corsHeaders }
    );
  }
}
