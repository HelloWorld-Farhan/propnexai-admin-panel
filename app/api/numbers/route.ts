import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
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

    // Fetch the company to get the owner's email for the webhook
    if (!number.companyId) return NextResponse.json(JSON.parse(JSON.stringify(number)), { status: 201 }); const company = await prisma.company.findUnique({
      where: { id: number.companyId as string },
      include: {
        members: {
          include: { user: true }
        }
      }
    });

    if (company && company.members.length > 0) {
      const user = company.members[0].user;
      if (user && user.email) {
        // Send Webhook to Google Apps Script
        const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "number_assigned",
            email: user.email,
            name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email.split("@")[0],
            assignedNumber: number.number,
          }),
        }).catch(err => console.error("Failed to send number assignment webhook:", err));
        
        // Also resolve any pending Number Assignment Requests in SupportRequest
        await prisma.supportRequest.updateMany({
          where: {
            companyId: company.id,
            reason: "OTHER",
            message: { contains: "Number Assignment Request" },
            status: "NEW"
          },
          data: { status: "RESOLVED" }
        });
      }
    }

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
        error.message.includes("already assigned") ||
        error.message.includes("outgoing service numbers"))
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
