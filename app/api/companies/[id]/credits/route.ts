import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import { addCredits } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  amount: z.number().min(0.01, "Minimum credit top-up is 0.01"),
  description: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const balance = await addCredits(id, body.amount, body.description);
    return NextResponse.json(balance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Add credits error:", error);
    return NextResponse.json({ error: error.message || "Failed to add credits" }, { status: 500 });
  }
}
