import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const forms = await prisma.formSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, forms });
  } catch (error) {
    console.error("Failed to fetch form submissions", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch form submissions" },
      { status: 500 }
    );
  }
}
