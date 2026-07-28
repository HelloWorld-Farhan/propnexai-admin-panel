import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createPhoneNumberSchema,
  formatZodError,
} from "@/lib/validation/phone-number";
import {
  createPhoneNumberForAdmin,
  listPhoneNumbersForAdmin,
} from "@/src/server/repositories/number.repository";

export async function GET() {
  try {
    await requireAdminSession();
    const numbers = await listPhoneNumbersForAdmin();
    return NextResponse.json(JSON.parse(JSON.stringify(numbers)));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to list phone numbers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = createPhoneNumberSchema.parse(await request.json());
    const number = await createPhoneNumberForAdmin(body);
    revalidatePath("/numbers");
    return NextResponse.json(JSON.parse(JSON.stringify(number)), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("already assigned"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A phone number with that assignment already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/numbers failed:", error);
    return NextResponse.json(
      { error: "Failed to create phone number" },
      { status: 500 },
    );
  }
}
