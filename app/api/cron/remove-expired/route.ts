import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Check for authorization header to protect the cron endpoint
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'propnex-cron-123'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find and delete jobs where lastDate is less than today
    const result = await prisma.jobPosting.deleteMany({
      where: {
        lastDate: {
          lt: today
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully removed ${result.count} expired jobs.`,
      count: result.count
    });
  } catch (error: any) {
    console.error("Failed to remove expired jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove expired jobs" },
      { status: 500 }
    );
  }
}
