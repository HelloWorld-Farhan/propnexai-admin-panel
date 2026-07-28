"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type CompanyOption = {
  id: string;
  name: string;
  campaigns: Array<{ id: string; name: string; status: string }>;
  aiAgents: Array<{ id: string; name: string; type: string; status: string }>;
};

export type PhoneNumberRow = {
  id: string;
  number: string;
  label: string | null;
  provider: string;
  status: string;
  companyId: string;
  campaignId: string | null;
  inboundAgentId: string | null;
  outboundAgentId: string | null;
  company: { id: string; name: string; slug: string; cli: string };
  campaign: { id: string; name: string; resourceKey: string } | null;
  inboundAgent: { id: string; name: string } | null;
  outboundAgent: { id: string; name: string } | null;
  updatedAt: string;
};

type NumberFormState = {
  number: string;
  companyId: string;
  campaignId: string;
  label: string;
  provider: string;
  status: string;
  inboundAgentId: string;
  outboundAgentId: string;
};

const EMPTY_FORM: NumberFormState = {
  number: "",
  companyId: "",
  campaignId: "none",
  label: "",
  provider: "PROPNEX",
  status: "ACTIVE",
  inboundAgentId: "none",
  outboundAgentId: "none",
};

function DirectionBadges({ row }: { row: PhoneNumberRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={row.inboundAgentId ? "success" : "secondary"}>
        In: {row.inboundAgent?.name ?? "Unassigned"}
      </Badge>
      <Badge variant={row.outboundAgentId ? "default" : "secondary"}>
        Out: {row.outboundAgent?.name ?? "Unassigned"}
      </Badge>
    </div>
  );
}

function toNullableId(value: string): string | null {
  return value === "none" || value.trim() === "" ? null : value;
}

export function NumbersManager({
  numbers,
  companies,
}: {
  numbers: PhoneNumberRow[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NumberFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === form.companyId) ?? null,
    [companies, form.companyId],
  );

  const columns: ColumnDef<PhoneNumberRow>[] = [
    {
      accessorKey: "number",
      header: "Number",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.number}</p>
          {row.original.label ? (
            <p className="text-xs text-muted-foreground">{row.original.label}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "company",
      accessorFn: (row) => row.company.name,
      header: "Company",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.company.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.company.cli}
          </p>
        </div>
      ),
    },
    {
      id: "campaign",
      accessorFn: (row) => row.campaign?.name ?? "",
      header: "Campaign",
      cell: ({ row }) =>
        row.original.campaign ? (
          <div>
            <p className="font-medium">{row.original.campaign.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.campaign.resourceKey}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      id: "direction",
      header: "Inbound / Outbound",
      cell: ({ row }) => <DirectionBadges row={row.original} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "ACTIVE"
              ? "success"
              : row.original.status === "INACTIVE"
                ? "warning"
                : "secondary"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "provider",
      header: "Provider",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete(row.original.id);
            }}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      companyId: companies[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEdit(row: PhoneNumberRow) {
    setEditingId(row.id);
    setForm({
      number: row.number,
      companyId: row.companyId,
      campaignId: row.campaignId ?? "none",
      label: row.label ?? "",
      provider: row.provider,
      status: row.status,
      inboundAgentId: row.inboundAgentId ?? "none",
      outboundAgentId: row.outboundAgentId ?? "none",
    });
    setOpen(true);
  }

  function handleCompanyChange(companyId: string) {
    setForm((prev) => ({
      ...prev,
      companyId,
      campaignId: "none",
      inboundAgentId: "none",
      outboundAgentId: "none",
    }));
  }

  async function handleSave() {
    if (!form.companyId) {
      toast.error("Select a company");
      return;
    }
    if (!editingId && !form.number.trim()) {
      toast.error("Enter a phone number");
      return;
    }

    setSaving(true);

    const assignmentPayload = {
      companyId: form.companyId,
      campaignId: toNullableId(form.campaignId),
      label: form.label.trim() || null,
      provider: form.provider,
      status: form.status,
      inboundAgentId: toNullableId(form.inboundAgentId),
      outboundAgentId: toNullableId(form.outboundAgentId),
    };

    const res = await fetch(
      editingId ? `/api/numbers/${editingId}` : "/api/numbers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? assignmentPayload
            : { ...assignmentPayload, number: form.number.trim() },
        ),
      },
    );
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to save number");
    }

    toast.success(editingId ? "Number updated" : "Number added");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this phone number?")) return;
    const res = await fetch(`/api/numbers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to remove number");
    }
    toast.success("Number removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Add number</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit number assignment" : "Add number"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input
                  value={form.number}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, number: e.target.value }))
                  }
                  placeholder="+9198..."
                  disabled={!!editingId}
                />
                {editingId ? (
                  <p className="text-xs text-muted-foreground">
                    Only assignment fields are updated for existing numbers.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder="Optional label"
                />
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={form.companyId} onValueChange={handleCompanyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campaign</Label>
                <Select
                  value={form.campaignId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, campaignId: value }))
                  }
                  disabled={!selectedCompany}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {(selectedCompany?.campaigns ?? []).map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Inbound agent</Label>
                  <Select
                    value={form.inboundAgentId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, inboundAgentId: value }))
                    }
                    disabled={!selectedCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(selectedCompany?.aiAgents ?? []).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Outbound agent</Label>
                  <Select
                    value={form.outboundAgentId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, outboundAgentId: value }))
                    }
                    disabled={!selectedCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(selectedCompany?.aiAgents ?? []).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, provider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROPNEX">PROPNEX</SelectItem>
                      <SelectItem value="TWILIO">TWILIO</SelectItem>
                      <SelectItem value="EXOTEL">EXOTEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="DISABLED">DISABLED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={numbers}
        searchKeys={["number", "company", "campaign"]}
        searchPlaceholder="Search numbers, companies, campaigns..."
      />
    </div>
  );
}
