import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import {
  AgentInUseError,
  AgentLimitReachedError,
  ChannelAssignmentConflictError,
} from "@/lib/types/agent-config";
import {
  createAgentSchema,
  formatZodError,
} from "@/lib/validation/agent-config";
import {
  createCompanyAgent,
  deployAgentFromLibrary,
  listCompanyAgents,
  serializeAgent,
} from "@/src/server/repositories/agent-config.repository";

function handleAgentError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
  }
  if (error instanceof AgentLimitReachedError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ChannelAssignmentConflictError) {
    return NextResponse.json(
      { error: "Channel assignment conflict", conflicts: error.conflicts },
      { status: 409 },
    );
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "Agent not found") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof AgentInUseError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const agents = await listCompanyAgents(id);
    return NextResponse.json(agents.map(serializeAgent));
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = createAgentSchema.parse(await request.json());

    if ("libraryEntryId" in body) {
      const agent = await deployAgentFromLibrary(id, body.libraryEntryId);
      return NextResponse.json(serializeAgent(agent), { status: 201 });
    }

    const agent = await createCompanyAgent(id, {
      name: body.name,
      description: body.description,
      type: body.type,
      status: body.status,
      enabled: body.enabled,
      systemPrompt: body.systemPrompt,
      firstMessage: body.firstMessage,
      modelConfig: body.modelConfig,
      channels: body.channels,
      replaceChannelConflicts: body.replaceChannelConflicts,
    });

    return NextResponse.json(serializeAgent(agent), { status: 201 });
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
