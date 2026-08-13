import { SupportRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import {
  listSupportRequests,
  updateSupportRequestStatus,
} from "@/src/server/repositories/support-request.repository";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(SupportRequestStatus),
});

export async function GET() {
  try {
    await requireAdminSession();
    const requests = await listSupportRequests();
    return NextResponse.json(requests);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/support-requests failed:", error);
    return NextResponse.json(
      { error: "Failed to load support requests." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const body = patchSchema.parse(await request.json());
    const updated = await updateSupportRequestStatus(body.id, body.status);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/support-requests failed:", error);
    return NextResponse.json(
      { error: "Failed to update support request." },
      { status: 500 },
    );
  }
}
