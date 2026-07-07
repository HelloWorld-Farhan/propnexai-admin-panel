import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { listCommunicationChannelSlots } from "@/src/server/repositories/agent-config.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const slots = await listCommunicationChannelSlots(id);
    return NextResponse.json(slots);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to list channel slots" },
      { status: 500 },
    );
  }
}
