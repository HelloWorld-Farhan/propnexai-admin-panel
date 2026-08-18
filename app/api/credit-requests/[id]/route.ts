import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Mark as RESOLVED to dismiss it
    await prisma.supportRequest.update({
      where: { id },
      data: { status: "RESOLVED" }
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Failed to dismiss credit request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dismiss request" },
      { status: 500, headers: corsHeaders }
    );
  }
}
