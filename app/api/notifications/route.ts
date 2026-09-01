import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        readAt: null,
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: true,
        company: true
      }
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}
