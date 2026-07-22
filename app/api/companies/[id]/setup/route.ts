import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { isValidObdServiceNumber } from "@/lib/obd-service-numbers";
import { prisma } from "@/lib/prisma";
import { upsertSetupConfig } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  totalChannels: z.number().int().min(0),
  serviceNumber: z.string().trim().optional().nullable(),
  deltaSeconds: z.number().int().min(0),
  agentsAllocated: z.number().int().min(0).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const serviceNumber = body.serviceNumber?.trim() || null;

    if (serviceNumber && !isValidObdServiceNumber(serviceNumber)) {
      return NextResponse.json(
        { error: "Invalid service number" },
        { status: 400 },
      );
    }

    const existing = await prisma.companySetupConfig.findUnique({
      where: { companyId: id },
      select: { agentsAllocated: true },
    });

    const config = await upsertSetupConfig(id, {
      totalChannels: body.totalChannels,
      serviceNumber,
      deltaSeconds: body.deltaSeconds,
      agentsAllocated: body.agentsAllocated ?? existing?.agentsAllocated ?? 0,
    });
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
