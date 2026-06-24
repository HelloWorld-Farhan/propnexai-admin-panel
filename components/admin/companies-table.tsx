"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
  creditsRemaining: number;
  totalChannels: number;
  agentCount: number;
  agentsAllocated: number;
  pocEmail: string;
  lowCredit: boolean;
};

const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "ACTIVE"
            ? "success"
            : row.original.status === "SUSPENDED"
              ? "warning"
              : "secondary"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "creditsRemaining",
    header: "Credits",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.creditsRemaining.toLocaleString()}</span>
        {row.original.lowCredit ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Low
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "totalChannels",
    header: "Channels",
  },
  {
    accessorKey: "agentCount",
    header: "Agents",
    cell: ({ row }) => (
      <span>
        {row.original.agentCount}
        {row.original.agentsAllocated > 0
          ? ` / ${row.original.agentsAllocated}`
          : ""}
      </span>
    ),
  },
  {
    accessorKey: "pocEmail",
    header: "POC",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export function CompaniesTable({
  companies,
  lowCreditCount,
}: {
  companies: CompanyRow[];
  lowCreditCount: number;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {lowCreditCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowCreditCount} {lowCreditCount === 1 ? "company has" : "companies have"} low credits
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={companies}
        searchKeys={["name", "slug", "pocEmail"]}
        searchPlaceholder="Search by name, slug, or POC email..."
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
      />
    </div>
  );
}
