import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { upsertCompanyContact } from "@/src/server/repositories/setup.repository";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = schema.parse(await request.json());

    const company = await prisma.company.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    if (company.ownerUserId == null) {
      if (!company.contact) {
        return NextResponse.json(
          {
            error:
              "Owner contact is set when the Contract ID is linked. It cannot be configured before claim.",
          },
          { status: 400 },
        );
      }

      const contact = await upsertCompanyContact(id, {
        name: body.name,
        email: company.contact.email,
        phone: body.phone,
        title: body.title,
      });
      return NextResponse.json(contact);
    }

    const lockedEmail = company.contact?.email;
    if (!lockedEmail) {
      return NextResponse.json(
        { error: "Owner contact email is not available." },
        { status: 400 },
      );
    }

    if (body.email && body.email.trim().toLowerCase() !== lockedEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Owner email cannot be changed after the Contract ID is linked." },
        { status: 403 },
      );
    }

    const contact = await upsertCompanyContact(id, {
      name: body.name,
      email: lockedEmail,
      phone: body.phone,
      title: body.title,
    });
    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
