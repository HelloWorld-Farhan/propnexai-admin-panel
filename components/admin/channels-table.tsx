"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import type { MockChannel } from "@/lib/mock/channels";
import { formatDate } from "@/lib/utils";

export type ChannelRow = {
  id: string;
  label: string;
  assignedNumber: string;
  isActive: boolean;
  companyName: string;
  companySlug: string;
  lastActivityAt: string;
  lastHistoryAction: string;
  totalCalls: number;
};

const columns: ColumnDef<ChannelRow>[] = [
  {
    accessorKey: "label",
    header: "Channel",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.label}</p>
        <p className="text-xs text-muted-foreground">{row.original.id}</p>
      </div>
    ),
  },
  {
    accessorKey: "assignedNumber",
    header: "Assigned number",
    cell: ({ row }) =>
      row.original.assignedNumber === "—" ? (
        <span className="text-muted-foreground">Unassigned</span>
      ) : (
        row.original.assignedNumber
      ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "success" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.companyName}</p>
        <p className="text-xs text-muted-foreground">{row.original.companySlug}</p>
      </div>
    ),
  },
  {
    accessorKey: "lastHistoryAction",
    header: "Latest activity",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.lastHistoryAction}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.lastActivityAt}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "totalCalls",
    header: "Total calls",
  },
];

function toChannelRow(channel: MockChannel): ChannelRow {
  const latestHistory = channel.history[0];
  return {
    id: channel.id,
    label: channel.label,
    assignedNumber: channel.assignedNumber ?? "—",
    isActive: channel.isActive,
    companyName: channel.company.name,
    companySlug: channel.company.slug,
    lastActivityAt: channel.lastActivityAt
      ? formatDate(channel.lastActivityAt)
      : "No activity",
    lastHistoryAction: latestHistory?.action ?? "—",
    totalCalls: channel.totalCalls,
  };
}

export function ChannelsTable({ channels }: { channels: MockChannel[] }) {
  const router = useRouter();
  const rows = channels.map(toChannelRow);
  const activeCount = channels.filter((channel) => channel.isActive).length;
  const unassignedCount = channels.filter((channel) => !channel.assignedNumber).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total channels</p>
          <p className="text-2xl font-semibold">{channels.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-semibold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unassigned numbers</p>
          <p className="text-2xl font-semibold">{unassignedCount}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["label", "assignedNumber", "companyName", "companySlug", "id"]}
        searchPlaceholder="Search by channel, number, or company..."
        onRowClick={(row) => router.push(`/channels/${row.id}`)}
      />
    </div>
  );
}
