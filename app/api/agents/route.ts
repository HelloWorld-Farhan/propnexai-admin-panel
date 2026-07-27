import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createAgentLibraryEntry,
  deleteAgentLibraryEntry,
  updateAgentLibraryEntry,
} from "@/src/server/repositories/agent-library.repository";

//hello

const agentSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  profile: z.string().min(1),
  category: z.string().min(1),
  useCases: z.array(z.string()).default([]),
  defaultType: z.enum(["INBOUND", "OUTBOUND", "HYBRID"]),
  estimatedSetupMinutes: z.number().int().min(1).default(5),
  samplePrompt: z.string().min(1),
  defaultFirstMessage: z.string().min(1),
  demoAudioUrl: z.string().min(1),
  avatarGradient: z.string().optional(),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = agentSchema.parse(await request.json());
    const entry = await createAgentLibraryEntry(body);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
    const body = z
      .object({ id: z.string().min(1) })
      .merge(agentSchema.partial())
      .parse(await request.json());
    const { id, ...data } = body;
    const entry = await updateAgentLibraryEntry(id, data);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteAgentLibraryEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 },
    );
  }
}
