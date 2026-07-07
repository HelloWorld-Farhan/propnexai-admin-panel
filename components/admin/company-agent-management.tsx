"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AgentFormDialog } from "@/components/admin/agent-form-dialog";
import { DeleteAgentDialog } from "@/components/admin/delete-agent-dialog";
import { ReplaceChannelDialog } from "@/components/admin/replace-channel-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COMMUNICATION_CHANNEL_LABELS,
  type ChannelConflict,
  type CompanyAgentRow,
} from "@/lib/types/agent-config";

type LibraryEntry = {
  id: string;
  name: string;
  slug: string;
  category: string;
  isPublished: boolean;
};

type CompanyAgentManagementProps = {
  companyId: string;
  agents: CompanyAgentRow[];
  agentsAllocated: number;
  libraryEntries: LibraryEntry[];
  onMutated: () => Promise<void>;
};

export function CompanyAgentManagement({
  companyId,
  agents: initialAgents,
  agentsAllocated,
  libraryEntries,
  onMutated,
}: CompanyAgentManagementProps) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CompanyAgentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyAgentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceConflicts, setReplaceConflicts] = useState<ChannelConflict[]>([]);
  const [replaceRetry, setReplaceRetry] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  const atLimit =
    agentsAllocated > 0 && agents.length >= agentsAllocated;

  const refresh = useCallback(async () => {
    await onMutated();
    router.refresh();
  }, [onMutated, router]);

  async function deployFromLibrary() {
    if (!selectedLibraryId) return toast.error("Select a library agent");
    if (atLimit) return toast.error(`Agent limit reached (${agentsAllocated})`);

    setSaving(true);
    const res = await fetch(`/api/companies/${companyId}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryEntryId: selectedLibraryId }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error((data.error as string) ?? "Failed to deploy agent");
    }

    toast.success("Agent deployed");
    setSelectedLibraryId("");
    await refresh();
  }

  async function handleToggleEnabled(agent: CompanyAgentRow, enabled: boolean) {
    const previous = agents;
    setAgents((current) =>
      current.map((row) =>
        row.id === agent.id ? { ...row, enabled } : row,
      ),
    );
    setTogglingIds((ids) => new Set(ids).add(agent.id));

    const res = await fetch(`/api/companies/${companyId}/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });

    setTogglingIds((ids) => {
      const next = new Set(ids);
      next.delete(agent.id);
      return next;
    });

    if (!res.ok) {
      setAgents(previous);
      const data = await res.json().catch(() => ({}));
      return toast.error((data.error as string) ?? "Failed to update agent");
    }

    toast.success(enabled ? "Agent enabled" : "Agent disabled");
    await refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    const res = await fetch(
      `/api/companies/${companyId}/agents/${deleteTarget.id}`,
      { method: "DELETE" },
    );
    setDeleteLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error((data.error as string) ?? "Failed to delete agent");
    }

    toast.success("Agent deleted");
    setDeleteTarget(null);
    await refresh();
  }

  function handleConflict(
    conflicts: ChannelConflict[],
    retry: () => Promise<void>,
  ) {
    setReplaceConflicts(conflicts);
    setReplaceRetry(() => retry);
    setReplaceOpen(true);
  }

  async function confirmReplace() {
    if (!replaceRetry) return;
    setReplaceLoading(true);
    try {
      await replaceRetry();
      setReplaceOpen(false);
      setReplaceRetry(null);
    } finally {
      setReplaceLoading(false);
    }
  }

  async function handleSaved() {
    toast.success(editingAgent ? "Agent updated" : "Agent created");
    setEditingAgent(null);
    await refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Agents</CardTitle>
            <CardDescription>
              {agents.length}
              {agentsAllocated > 0 ? ` / ${agentsAllocated}` : ""} deployed
              {atLimit ? " — allocation limit reached" : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingAgent(null);
                setFormOpen(true);
              }}
              disabled={saving || atLimit}
            >
              Create agent
            </Button>
            <Select
              value={selectedLibraryId}
              onValueChange={setSelectedLibraryId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="From library" />
              </SelectTrigger>
              <SelectContent>
                {libraryEntries
                  .filter((e) => e.isPublished)
                  .map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => void deployFromLibrary()}
              disabled={saving || atLimit}
            >
              Deploy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Connected channels</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No agents deployed yet
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {agent.description?.trim() || "—"}
                      </div>
                    </TableCell>
                    <TableCell>{agent.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          agent.status === "ACTIVE" ? "success" : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={agent.enabled}
                        disabled={togglingIds.has(agent.id)}
                        onCheckedChange={(enabled) =>
                          void handleToggleEnabled(agent, enabled)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.communicationChannels.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          agent.communicationChannels.map((channel) => (
                            <Badge key={channel.id} variant="outline">
                              {COMMUNICATION_CHANNEL_LABELS[channel.type]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAgent(agent);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(agent)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AgentFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAgent(null);
        }}
        companyId={companyId}
        agent={editingAgent}
        onSaved={handleSaved}
        onConflict={handleConflict}
      />

      <DeleteAgentDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        agentName={deleteTarget?.name ?? ""}
        onConfirm={() => void handleDelete()}
        loading={deleteLoading}
      />

      <ReplaceChannelDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        conflicts={replaceConflicts}
        onConfirm={() => void confirmReplace()}
        loading={replaceLoading}
      />
    </>
  );
}
