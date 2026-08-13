import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/server-session";
import {
  AgentInUseError,
  ChannelAssignmentConflictError,
} from "@/lib/types/agent-config";
import {
  formatZodError,
  setEnabledSchema,
  updateAgentSchema,
} from "@/lib/validation/agent-config";
import {
  deleteCompanyAgent,
  getCompanyAgent,
  serializeAgent,
  setAgentEnabled,
  updateCompanyAgent,
} from "@/src/server/repositories/agent-config.repository";

function handleAgentError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
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
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    await requireAdminSession();
    const { id, agentId } = await params;
    const agent = await getCompanyAgent(id, agentId);
    return NextResponse.json(serializeAgent(agent));
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to get agent" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    await requireAdminSession();
    const { id, agentId } = await params;
    const body = updateAgentSchema.parse(await request.json());
    const agent = await updateCompanyAgent(id, agentId, body);
    return NextResponse.json(serializeAgent(agent));
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    await requireAdminSession();
    const { id, agentId } = await params;
    const body = setEnabledSchema.parse(await request.json());
    const agent = await setAgentEnabled(id, agentId, body.enabled);
    return NextResponse.json(serializeAgent(agent));
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    await requireAdminSession();
    const { id, agentId } = await params;
    await deleteCompanyAgent(id, agentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = handleAgentError(error);
    if (response) return response;
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
