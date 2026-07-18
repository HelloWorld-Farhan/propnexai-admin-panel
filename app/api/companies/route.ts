import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { createCompanyForAdmin } from "@/src/server/repositories/company.repository";

const schema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
});

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = schema.parse(await request.json());
    const company = await createCompanyForAdmin(body);
    revalidatePath("/companies");

    return NextResponse.json(
      {
        id: company.id,
        name: company.name,
        slug: company.slug,
        contractId: company.contractId,
        createdAt: company.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A company with that identifier already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/companies failed:", error);
    return NextResponse.json(
      { error: "Failed to create company." },
      { status: 500 },
    );
  }
}
