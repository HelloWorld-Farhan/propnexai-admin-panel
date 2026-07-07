"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AGENT_STATUSES,
  AGENT_TYPES,
  COMMUNICATION_CHANNEL_TYPES,
  COMMUNICATION_CHANNEL_LABELS,
  type ChannelConflict,
  type CommunicationChannelSlot,
  type CommunicationChannelType,
  type CompanyAgentRow,
  type ModelConfig,
} from "@/lib/types/agent-config";
import { validateScratchAgentForm } from "@/lib/validation/agent-config";

export type AgentFormValues = {
  name: string;
  description: string;
  type: (typeof AGENT_TYPES)[number];
  status: (typeof AGENT_STATUSES)[number];
  enabled: boolean;
  systemPrompt: string;
  firstMessage: string;
  modelProvider: string;
  modelName: string;
  temperature: string;
  maxTokens: string;
  selectedChannels: CommunicationChannelType[];
};

const emptyForm: AgentFormValues = {
  name: "",
  description: "",
  type: "INBOUND",
  status: "ACTIVE",
  enabled: true,
  systemPrompt: "",
  firstMessage: "",
  modelProvider: "",
  modelName: "",
  temperature: "",
  maxTokens: "",
  selectedChannels: [],
};

function agentToForm(agent?: CompanyAgentRow | null): AgentFormValues {
  if (!agent) return emptyForm;

  const model = (agent.modelConfig ?? {}) as ModelConfig;

  return {
    name: agent.name,
    description: agent.description ?? "",
    type: agent.type as AgentFormValues["type"],
    status: agent.status as AgentFormValues["status"],
    enabled: agent.enabled,
    systemPrompt: agent.systemPrompt ?? "",
    firstMessage: agent.firstMessage ?? "",
    modelProvider: model.provider ?? "",
    modelName: model.name ?? "",
    temperature:
      model.temperature !== undefined ? String(model.temperature) : "",
    maxTokens: model.maxTokens !== undefined ? String(model.maxTokens) : "",
    selectedChannels: (agent.communicationChannels ?? []).map((c) => c.type),
  };
}

function ChannelPicker({
  selectedChannels,
  onToggle,
}: {
  selectedChannels: CommunicationChannelType[];
  onToggle: (type: CommunicationChannelType, checked: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Communication channels</p>
        <p className="text-xs text-muted-foreground">
          Select which channels this agent handles. Each channel type can only be
          assigned to one agent per company.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {COMMUNICATION_CHANNEL_TYPES.map((type) => (
          <label
            key={type}
            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              className="size-4 rounded border"
              checked={selectedChannels.includes(type)}
              onChange={(e) => onToggle(type, e.target.checked)}
            />
            {COMMUNICATION_CHANNEL_LABELS[type]}
          </label>
        ))}
      </div>
    </div>
  );
}

function ChannelSelectDropdown({
  agentId,
  selectedChannel,
  channelSlots,
  loading,
  onChange,
}: {
  agentId: string;
  selectedChannel: CommunicationChannelType | "";
  channelSlots: CommunicationChannelSlot[];
  loading: boolean;
  onChange: (type: CommunicationChannelType | "") => void;
}) {
  function slotLabel(slot: CommunicationChannelSlot) {
    const label = COMMUNICATION_CHANNEL_LABELS[slot.type];
    if (slot.assignedAgentId === agentId) {
      return `${label} (current)`;
    }
    if (!slot.assignedAgentId) {
      return `${label} (unassigned)`;
    }
    return `${label} (assigned to ${slot.assignedAgentName})`;
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Communication channel</p>
        <p className="text-xs text-muted-foreground">
          Select a channel for this agent. Choosing a channel assigned to another
          agent will prompt you to confirm reassignment.
        </p>
      </div>
      <Select
        value={selectedChannel || "none"}
        onValueChange={(value) =>
          onChange(value === "none" ? "" : (value as CommunicationChannelType))
        }
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading channels..." : "Select channel"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No channel</SelectItem>
          {channelSlots.map((slot) => (
            <SelectItem key={slot.type} value={slot.type}>
              {slotLabel(slot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function buildPayload(form: AgentFormValues, replaceChannelConflicts?: boolean) {
  const hasModelConfig =
    form.modelProvider.trim() ||
    form.modelName.trim() ||
    form.temperature.trim() ||
    form.maxTokens.trim();

  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    type: form.type,
    status: form.status,
    enabled: form.enabled,
    systemPrompt: form.systemPrompt || undefined,
    firstMessage: form.firstMessage || undefined,
    channels: form.selectedChannels.map((type) => ({ type })),
    replaceChannelConflicts,
  };

  if (hasModelConfig) {
    payload.modelConfig = {
      provider: form.modelProvider.trim(),
      name: form.modelName.trim(),
      ...(form.temperature.trim()
        ? { temperature: Number(form.temperature) }
        : {}),
      ...(form.maxTokens.trim()
        ? { maxTokens: Number.parseInt(form.maxTokens, 10) }
        : {}),
    };
  }

  return payload;
}

type AgentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  agent?: CompanyAgentRow | null;
  onSaved: () => Promise<void>;
  onConflict: (
    conflicts: ChannelConflict[],
    retry: () => Promise<void>,
  ) => void;
};

export function AgentFormDialog({
  open,
  onOpenChange,
  companyId,
  agent,
  onSaved,
  onConflict,
}: AgentFormDialogProps) {
  const [form, setForm] = useState<AgentFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [channelSlots, setChannelSlots] = useState<CommunicationChannelSlot[]>([]);
  const [loadingChannelSlots, setLoadingChannelSlots] = useState(false);

  const isEditing = !!agent;

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (!agent) {
      setForm(emptyForm);
      setLoadingAgent(false);
      setChannelSlots([]);
      return;
    }

    setForm(agentToForm(agent));
    setChannelSlots([]);

    let cancelled = false;
    setLoadingAgent(true);
    setLoadingChannelSlots(true);

    void Promise.all([
      fetch(`/api/companies/${companyId}/agents/${agent.id}`).then(async (res) =>
        res.ok ? res.json() : null,
      ),
      fetch(`/api/companies/${companyId}/agents/channel-slots`).then(async (res) =>
        res.ok ? res.json() : [],
      ),
    ])
      .then(([agentData, slotsData]: [CompanyAgentRow | null, CommunicationChannelSlot[]]) => {
        if (!cancelled && agentData) {
          setForm(agentToForm(agentData));
        }
        if (!cancelled && Array.isArray(slotsData)) {
          setChannelSlots(slotsData);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAgent(false);
          setLoadingChannelSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, agent, companyId]);

  function toggleChannel(type: CommunicationChannelType, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      selectedChannels: checked
        ? [...prev.selectedChannels, type]
        : prev.selectedChannels.filter((t) => t !== type),
    }));
  }

  function setSelectedChannel(type: CommunicationChannelType | "") {
    setForm((prev) => ({
      ...prev,
      selectedChannels: type ? [type] : [],
    }));
  }

  async function submit(replaceChannelConflicts = false) {
    const payload = buildPayload(form, replaceChannelConflicts);

    const validationErrors = validateScratchAgentForm({
      name: form.name,
      type: form.type,
      status: form.status,
      enabled: form.enabled,
      description: form.description || undefined,
      systemPrompt: form.systemPrompt || undefined,
      firstMessage: form.firstMessage || undefined,
      modelConfig: payload.modelConfig as ModelConfig | undefined,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    const url = isEditing
      ? `/api/companies/${companyId}/agents/${agent!.id}`
      : `/api/companies/${companyId}/agents`;

    const res = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.status === 409) {
      const data = (await res.json()) as {
        conflicts?: ChannelConflict[];
      };
      if (data.conflicts?.length) {
        onConflict(data.conflicts, () => submit(true));
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setErrors({
        form: (data.error as string) ?? "Failed to save agent",
      });
    }

    onOpenChange(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit agent" : "Create agent"}</DialogTitle>
          {isEditing ? (
            <DialogDescription>
              Update agent settings and communication channel assignments.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="grid gap-4">
          {loadingAgent ? (
            <p className="text-sm text-muted-foreground">Loading agent details...</p>
          ) : null}

          {errors.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    type: value as AgentFormValues["type"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    status: value as AgentFormValues["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="agent-enabled">Enabled</Label>
            <Switch
              id="agent-enabled"
              checked={form.enabled}
              onCheckedChange={(enabled) => setForm({ ...form, enabled })}
            />
          </div>

          {isEditing ? (
            <ChannelSelectDropdown
              agentId={agent!.id}
              selectedChannel={form.selectedChannels[0] ?? ""}
              channelSlots={channelSlots}
              loading={loadingChannelSlots}
              onChange={setSelectedChannel}
            />
          ) : (
            <ChannelPicker
              selectedChannels={form.selectedChannels}
              onToggle={toggleChannel}
            />
          )}

          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) =>
                setForm({ ...form, systemPrompt: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>First message</Label>
            <Textarea
              value={form.firstMessage}
              onChange={(e) =>
                setForm({ ...form, firstMessage: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Model configuration</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input
                  value={form.modelProvider}
                  onChange={(e) =>
                    setForm({ ...form, modelProvider: e.target.value })
                  }
                  placeholder="OpenAI"
                />
                {errors.modelProvider ? (
                  <p className="text-sm text-destructive">{errors.modelProvider}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Model name</Label>
                <Input
                  value={form.modelName}
                  onChange={(e) =>
                    setForm({ ...form, modelName: e.target.value })
                  }
                  placeholder="gpt-4o-mini"
                />
                {errors.modelName ? (
                  <p className="text-sm text-destructive">{errors.modelName}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) =>
                    setForm({ ...form, temperature: e.target.value })
                  }
                  placeholder="0.7"
                />
              </div>
              <div className="space-y-2">
                <Label>Max tokens</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxTokens}
                  onChange={(e) =>
                    setForm({ ...form, maxTokens: e.target.value })
                  }
                  placeholder="1024"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={saving || loadingAgent}
            >
              {saving ? "Saving..." : isEditing ? "Save changes" : "Create agent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
