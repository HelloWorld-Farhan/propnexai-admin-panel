import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateUniqueCliFromName } from "@/src/server/lib/cli";

const schema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const body = schema.parse({ name: searchParams.get("name") ?? "" });
    const cli = await generateUniqueCliFromName(prisma, body.name);

    return NextResponse.json({ cli });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/companies/suggest-cli failed:", error);
    return NextResponse.json(
      { error: "Failed to generate CLI." },
      { status: 500 },
    );
  }
}
