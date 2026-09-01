import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import { revalidatePath } from "next/cache";
import { updateCredits } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  delta: z.number(),
  description: z.string().min(1),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const balance = await updateCredits(id, body.delta, body.description);
    
    // Invalidate the companies page to ensure fresh data
    // Use 'layout' type to properly handle the (admin) route group
    revalidatePath("/companies", "layout");
    revalidatePath(`/companies/${id}`, "layout");
    
    return NextResponse.json(balance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Update credits error:", error);
    return NextResponse.json({ error: error.message || "Failed to update credits" }, { status: 500 });
  }
}
