import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to dismiss notification", error);
    return NextResponse.json({ success: false, error: "Failed to dismiss notification" }, { status: 500 });
  }
}
