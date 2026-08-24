"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/admin/data-table";
import { AddCreditDialog } from "@/components/admin/add-credit-dialog";
import { EditCreditDialog } from "@/components/admin/edit-credit-dialog";
import { CreditBreakdown } from "@/components/admin/credit-breakdown";
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  contractId: string;
  cli: string;
  companyCode: string;
  claimed: boolean;
  createdAt: Date;
  creditsRemaining: number;
  totalChannels: number;
  agentCount: number;
  agentsAllocated: number;
  pocEmail: string;
  lowCredit: boolean;
  assignedNumber: string | null;
  childCompanyCount: number;
  unverifiedChildCompanyCount: number;
};

const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium">{row.original.name}</p>
          <Badge variant="outline" className="flex items-center gap-1 whitespace-nowrap text-[10px] h-5 cursor-pointer hover:bg-muted" onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/companies/${row.original.id}?tab=sub-companies`;
          }}>
            Sub-Comp({row.original.childCompanyCount}) <span>&rarr;</span>
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "cli",
    header: "Public ID",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-mono text-xs">{row.original.cli}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {row.original.companyCode}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "contractId",
    header: "Contract ID",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-mono text-xs">{row.original.contractId}</p>
        <Badge variant={row.original.claimed ? "secondary" : "outline"}>
          {row.original.claimed ? "Claimed" : "Unclaimed"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "assignedNumber",
    header: "Assigned Number",
    cell: ({ row }) => {
      if (row.original.assignedNumber) {
        return <span className="font-mono">{row.original.assignedNumber}</span>;
      }
      return <span className="text-destructive font-medium text-xs">Unassigned</span>;
    },
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
        <span>{formatNumber(row.original.creditsRemaining)}</span>
        <CreditBreakdown companyId={row.original.id} />
        <AddCreditDialog companyId={row.original.id} companyName={row.original.name} />
        <EditCreditDialog companyId={row.original.id} companyName={row.original.name} currentCredits={row.original.creditsRemaining} />
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
    accessorKey: "pocEmail",
    header: "Owner email",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DeleteCompanyDialog companyId={row.original.id} companyName={row.original.name} />
      </div>
    ),
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
        searchKeys={["name", "slug", "pocEmail", "contractId", "cli", "companyCode"]}
        searchPlaceholder="Search by name, slug, contract ID, or owner email (if claimed)..."
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
      />
    </div>
  );
}
