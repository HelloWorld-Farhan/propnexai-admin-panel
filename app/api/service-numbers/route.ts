import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { getObdServiceNumbers } from "@/lib/obd-service-numbers";

export async function GET() {
  try {
    await requireAdminSession();
    const numbers = getObdServiceNumbers();

    return NextResponse.json({
      numbers,
      defaultNumber: numbers[0] ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
