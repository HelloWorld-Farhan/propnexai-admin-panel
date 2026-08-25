import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import { isValidObdServiceNumber } from "@/lib/obd-service-numbers";
import { prisma } from "@/lib/prisma";
import { upsertSetupConfig } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  totalChannels: z.number().int().min(0),
  serviceNumber: z.string().trim().optional().nullable(),
  ivrTemplateId: z.string().trim().optional().nullable(),
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
    const ivrTemplateId = body.ivrTemplateId?.trim() || null;

    if (serviceNumber && !(await isValidObdServiceNumber(serviceNumber))) {
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
      ivrTemplateId,
      deltaSeconds: body.deltaSeconds,
      agentsAllocated: body.agentsAllocated ?? existing?.agentsAllocated ?? 0,
    });
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to validate service number" },
      { status: 502 },
    );
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.companySetupConfig.findUnique({
      where: { companyId: id },
    });

    if (body.serviceNumber && body.serviceNumber.trim() && body.serviceNumber !== existing?.serviceNumber) {
      if (!(await isValidObdServiceNumber(body.serviceNumber.trim()))) {
        return NextResponse.json({ error: "Invalid service number" }, { status: 400 });
      }
    }

    const config = await upsertSetupConfig(id, {
      totalChannels: body.totalChannels ?? existing?.totalChannels ?? 0,
      serviceNumber: body.serviceNumber ?? existing?.serviceNumber ?? null,
      ivrTemplateId: body.ivrTemplateId ?? existing?.ivrTemplateId ?? null,
      deltaSeconds: body.deltaSeconds ?? existing?.deltaSeconds ?? 2,
      agentsAllocated: body.agentsAllocated ?? existing?.agentsAllocated ?? 0,
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error("Setup PATCH Error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update setup config" }, { status: 500 });
  }
}
