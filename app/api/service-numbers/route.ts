import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { fetchObdServiceNumbers } from "@/lib/obd-service-numbers";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchObdServiceNumbers();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load OBD service numbers" },
      { status: 502 },
    );
  }
}
