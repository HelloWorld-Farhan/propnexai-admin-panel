import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/server-session";
import { getDashboardStats } from "@/src/server/repositories/dashboard.repository";

export async function GET() {
  try {
    await requireAdminSession();
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
