"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SupportRequest, SupportRequestStatus } from "@prisma/client";

import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

type SupportRequestRow = SupportRequest & {
  company: { name: string } | null;
};

const REASON_LABELS: Record<string, string> = {
  GENERAL_INQUIRY: "General inquiry",
  SALES_PRICING: "Sales / pricing",
  TECHNICAL_SUPPORT: "Technical support",
  BILLING_CREDITS: "Purchase credits",
  BILLING_CHANNELS: "Purchase channels",
  ENTERPRISE_PLAN: "Enterprise plan",
  ACCOUNT_ACCESS: "Account / access",
  OTHER: "Other",
};

function statusVariant(status: SupportRequestStatus) {
  switch (status) {
    case "NEW":
      return "default" as const;
    case "IN_PROGRESS":
      return "warning" as const;
    case "RESOLVED":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

function StatusSelect({
  request,
  onUpdated,
}: {
  request: SupportRequestRow;
  onUpdated: (updated: SupportRequestRow) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleChange(value: string) {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/support-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, status: value }),
      });
      if (!response.ok) return;
      const updated = (await response.json()) as SupportRequestRow;
      onUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Select
      value={request.status}
      onValueChange={handleChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="h-8 w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NEW">New</SelectItem>
        <SelectItem value="IN_PROGRESS">In progress</SelectItem>
        <SelectItem value="RESOLVED">Resolved</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SupportRequestsTable({
  initialRequests,
}: {
  initialRequests: SupportRequestRow[];
}) {
  const [requests, setRequests] = useState(initialRequests);

  const columns = useMemo<ColumnDef<SupportRequestRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Contact",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-sm">
            {REASON_LABELS[row.original.reason] ?? row.original.reason}
          </span>
        ),
      },
      {
        accessorKey: "planName",
        header: "Plan",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.planName ?? "—"}</span>
        ),
      },
      {
        id: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.company?.name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <p className="max-w-xs truncate text-sm text-muted-foreground">
            {row.original.message}
          </p>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(row.original.status)}>
              {row.original.status.replace("_", " ")}
            </Badge>
            <StatusSelect
              request={row.original}
              onUpdated={(updated) => {
                setRequests((current) =>
                  current.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                );
              }}
            />
          </div>
        ),
      },
    ],
    [],
  );

  async function handleRefresh() {
    const response = await fetch("/api/support-requests");
    if (!response.ok) return;
    const data = (await response.json()) as SupportRequestRow[];
    setRequests(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
      <DataTable columns={columns} data={requests} />
    </div>
  );
}
