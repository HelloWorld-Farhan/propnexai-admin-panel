import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  getDialerStatus,
  startCalling,
  stopCalling,
} from "@/lib/media-server-client";
import { getCompanyById } from "@/src/server/repositories/company.repository";

const updateSchema = z.object({
  enabled: z.boolean(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = await getDialerStatus(id);
    return NextResponse.json({
      enabled: status.enabled,
      companyId: status.companyId ?? id,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to fetch calling status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = updateSchema.parse(await request.json());
    const result = body.enabled ? await startCalling(id) : await stopCalling(id);

    return NextResponse.json({
      enabled: result.enabled ?? body.enabled,
      companyId: result.companyId ?? id,
      assignedCount: result.assignedCount,
      skipped: result.skipped,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update calling status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
