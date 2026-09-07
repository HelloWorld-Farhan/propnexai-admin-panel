import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server-session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unreadApplications = await prisma.jobApplication.findMany({
      where: {
        isRead: false,
      },
      orderBy: {
        appliedAt: "desc",
      },
      include: {
        job: {
          select: { title: true, jobId: true },
        },
      },
    });

    return NextResponse.json({ success: true, count: unreadApplications.length, data: unreadApplications });
  } catch (error) {
    console.error("Error fetching unread applications:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.jobApplication.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking application read:", error);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}
