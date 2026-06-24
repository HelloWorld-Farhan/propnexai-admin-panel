import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { upsertBillingRates } from "@/src/server/repositories/billing.repository";

const schema = z.object({
  costPerChannel: z.number().min(0),
  costPerCredit: z.number().positive("Cost per credit must be greater than 0"),
  pulseTimeSeconds: z
    .number()
    .int()
    .positive("Pulse time must be greater than 0"),
  setupOneTimeCost: z.number().min(0),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const rates = await upsertBillingRates(id, body);
    return NextResponse.json(rates);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((issue) => issue.message).join("; ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
