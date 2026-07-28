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
  direction: "INBOUND" | "OUTBOUND";
};

const EMPTY_FORM: NumberFormState = {
  number: "",
  companyId: "",
  campaignId: "none",
  direction: "OUTBOUND",
};

function encodeDirectionLabel(direction: "INBOUND" | "OUTBOUND"): string {
  return `DIRECTION:${direction}`;
}

function parseDirectionFromLabel(
  label: string | null | undefined,
): "INBOUND" | "OUTBOUND" {
  if (!label) return "OUTBOUND";
  const normalized = label.trim().toUpperCase();
  if (normalized === "DIRECTION:INBOUND") return "INBOUND";
  if (normalized === "DIRECTION:OUTBOUND") return "OUTBOUND";
  return "OUTBOUND";
}

function toNullableId(value: string): string | null {
  return value === "none" || value.trim() === "" ? null : value;
}

export function NumbersManager({
  numbers,
  companies,
  serviceNumbers,
}: {
  numbers: PhoneNumberRow[];
  companies: CompanyOption[];
  serviceNumbers: string[];
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
      header: "Service Number",
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
      accessorFn: (row) => parseDirectionFromLabel(row.label),
      header: "Direction",
      cell: ({ row }) => {
        const direction = parseDirectionFromLabel(row.original.label);
        return (
          <Badge variant={direction === "OUTBOUND" ? "default" : "secondary"}>
            {direction}
          </Badge>
        );
      },
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
      number: serviceNumbers[0] ?? "",
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
      direction: parseDirectionFromLabel(row.label),
    });
    setOpen(true);
  }

  function handleCompanyChange(companyId: string) {
    setForm((prev) => ({
      ...prev,
      companyId,
      campaignId: "none",
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
      label: encodeDirectionLabel(form.direction),
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

    toast.success(editingId ? "Service number updated" : "Service number added");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this service number assignment?")) return;
    const res = await fetch(`/api/numbers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to remove number");
    }
    toast.success("Service number removed");
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
                {editingId
                  ? "Edit service number assignment"
                  : "Add service number assignment"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Service number</Label>
                <Select
                  value={form.number}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, number: value }))
                  }
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service number" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceNumbers.map((number) => (
                      <SelectItem key={number} value={number}>
                        {number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingId ? (
                  <p className="text-xs text-muted-foreground">
                    Number cannot be changed after creation.
                  </p>
                ) : null}
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

              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={form.direction}
                  onValueChange={(value: "INBOUND" | "OUTBOUND") =>
                    setForm((prev) => ({ ...prev, direction: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                    <SelectItem value="INBOUND">Inbound</SelectItem>
                  </SelectContent>
                </Select>
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
        searchPlaceholder="Search service numbers, companies, campaigns..."
      />
    </div>
  );
}
