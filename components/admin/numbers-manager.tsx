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
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  direction: "INBOUND" | "OUTBOUND" | "BOTH" | null;
  company: { id: string; name: string; slug: string; cli: string; parentCompanyId: string | null; };
  campaign: { id: string; name: string; resourceKey: string } | null;
  inboundAgent: { id: string; name: string } | null;
  outboundAgent: { id: string; name: string } | null;
  channels?: number | null;
  agentUrl?: string | null;
  updatedAt: string;
};

type NumberFormState = {
  number: string;
  companyId: string;
  direction: "INBOUND" | "OUTBOUND" | "BOTH" | "none";
  channels?: string;
  agentUrl?: string;
};

const EMPTY_FORM: NumberFormState = {
  number: "",
  companyId: "",
  direction: "INBOUND",
  channels: "1",
  agentUrl: "",
};

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      accessorFn: (row) => row.company?.name ?? "Unknown Company",
      header: "Company",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {row.original.company?.name ?? "Unknown Company"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {row.original.company?.cli ?? ""}
          </p>
        </div>
      ),
    },
    {
      id: "direction",
      accessorFn: (row) => row.direction ?? "Unassigned",
      header: "Direction",
      cell: ({ row }) => {
        const dir = row.original.direction || "Unassigned";
        const isActive = dir === "INBOUND" || dir === "OUTBOUND";
        return (
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={isActive ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20" : ""}
          >
            {dir}
          </Badge>
        );
      },
    },
    {
      accessorKey: "channels",
      header: "Channels",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.channels ?? 1}</span>
      ),
    },
    {
      accessorKey: "agentUrl",
      header: "Agent URL",
      cell: ({ row }) => {
        const isOutbound = row.original.direction === "OUTBOUND" || row.original.direction === "BOTH";
        
        if (!isOutbound) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }

        if (!row.original.agentUrl) {
          return <span className="text-xs font-semibold text-red-500">No link assigned</span>;
        }

        return (
          <span className="text-xs font-mono text-emerald-500 break-all" title={row.original.agentUrl}>
            {row.original.agentUrl}
          </span>
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
      companyId: companies[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEdit(row: PhoneNumberRow) {
    setEditingId(row.id);
    setForm({
      number: row.number,
      companyId: row.companyId,
      direction: row.direction ?? "INBOUND",
      channels: row.channels?.toString() || "1",
      agentUrl: row.agentUrl || "",
    });
    setOpen(true);
  }

  function handleCompanyChange(companyId: string) {
    setForm((prev) => ({
      ...prev,
      companyId,
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
      direction: form.direction,
      channels: parseInt(form.channels || "1", 10),
      ...(form.direction === "OUTBOUND" || form.direction === "BOTH" ? { agentUrl: form.agentUrl } : { agentUrl: null }),
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

  function handleDelete(id: string) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/numbers/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to remove number");
    }
    toast.success("Service number removed");
    setDeleteId(null);
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
                <Input
                  value={form.number}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, number: e.target.value }))
                  }
                  placeholder="Enter service number"
                  disabled={!!editingId}
                />
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
                <Label>Direction</Label>
                <Select
                  value={form.direction}
                  onValueChange={(value: "INBOUND" | "OUTBOUND" | "BOTH") =>
                    setForm((prev) => ({ ...prev, direction: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INBOUND">Inbound</SelectItem>
                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Channels</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.channels}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, channels: e.target.value }))
                  }
                  placeholder="Number of concurrent channels"
                />
              </div>

              {(form.direction === "OUTBOUND" || form.direction === "BOTH") && (
                <div className="space-y-2">
                  <Label>Agent URL (Outbound)</Label>
                  <Input
                    type="url"
                    value={form.agentUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, agentUrl: e.target.value }))
                    }
                    placeholder="wss://your-agent-url"
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove service number</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this service number assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="inbound" className="w-full">
        <TabsList>
          <TabsTrigger value="inbound">Inbound</TabsTrigger>
          <TabsTrigger value="outbound">Outbound</TabsTrigger>
        </TabsList>
        <TabsContent value="inbound" className="mt-4">
          <DataTable
            columns={columns}
            data={numbers.filter(n => n.direction !== "OUTBOUND")}
            searchKeys={["number", "company", "campaign"]}
            searchPlaceholder="Search inbound numbers, companies..."
          />
        </TabsContent>
        <TabsContent value="outbound" className="mt-4">
          <DataTable
            columns={columns}
            data={numbers.filter(n => n.direction === "OUTBOUND" || n.direction === "BOTH")}
            searchKeys={["number", "company", "campaign"]}
            searchPlaceholder="Search outbound numbers, companies..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
