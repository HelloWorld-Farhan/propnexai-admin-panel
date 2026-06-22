import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { upsertSetupConfig } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  totalChannels: z.number().int().min(0),
  pulseTimeSeconds: z.number().int().min(1),
  deltaSeconds: z.number().int().min(0),
  agentsAllocated: z.number().int().min(0),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const config = await upsertSetupConfig(id, body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
