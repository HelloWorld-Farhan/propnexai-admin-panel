import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { assignChannelPhone } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  channelId: z.string().min(1),
  phoneNumberId: z.string().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const channel = await assignChannelPhone(id, body.channelId, body.phoneNumberId);
    return NextResponse.json(channel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
