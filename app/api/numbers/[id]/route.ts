import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  formatZodError,
  updatePhoneNumberSchema,
} from "@/lib/validation/phone-number";
import {
  deletePhoneNumberForAdmin,
  updatePhoneNumberForAdmin,
} from "@/src/server/repositories/number.repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = updatePhoneNumberSchema.parse(await request.json());
    const number = await updatePhoneNumberForAdmin(id, body);
    revalidatePath("/numbers");
    return NextResponse.json(JSON.parse(JSON.stringify(number)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Phone number not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
    console.error("PATCH /api/numbers/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    await deletePhoneNumberForAdmin(id);
    revalidatePath("/numbers");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Phone number not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("DELETE /api/numbers/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete phone number" },
      { status: 500 },
    );
  }
}
