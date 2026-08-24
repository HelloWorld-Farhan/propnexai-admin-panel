"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { AddCreditDialog } from "@/components/admin/add-credit-dialog";
import { EditCreditDialog } from "@/components/admin/edit-credit-dialog";
import { CreditBreakdown } from "@/components/admin/credit-breakdown";
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog";
import { AddNumberDialog } from "@/components/admin/add-number-dialog";
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
  assignedNumbers: string[]; // ALL assigned numbers
  childCompanyCount: number;
  unverifiedChildCompanyCount: number;
};

// Masked number display: shows •••last3, hover reveals full
function MaskedNumber({ num }: { num: string }) {
  const last3 = num.replace(/\s/g, "").slice(-3);
  return (
    <span
      title={num}
      className="inline-flex items-center gap-1 font-mono text-xs cursor-default group"
    >
      <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
      <span className="group-hover:hidden font-medium">•••{last3}</span>
      <span className="hidden group-hover:inline font-medium text-primary">{num}</span>
    </span>
  );
}

// Inline refresh-aware number cell
function AssignedNumberCell({ row, onRefresh }: { row: CompanyRow; onRefresh: () => void }) {
  const allNums = row.assignedNumbers?.length ? row.assignedNumbers : row.assignedNumber ? [row.assignedNumber] : [];

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      {allNums.length === 0 ? (
        <span className="text-destructive font-medium text-xs">Unassigned</span>
      ) : (
        allNums.map((num, i) => <MaskedNumber key={i} num={num} />)
      )}
      <div onClick={(e) => e.stopPropagation()}>
        <AddNumberDialog
          companyId={row.id}
          companyName={row.name}
          onSuccess={onRefresh}
          triggerLabel={allNums.length === 0 ? "Assign" : "+ Number"}
          triggerVariant="ghost"
        />
      </div>
    </div>
  );
}

export function CompaniesTable({
  companies,
  lowCreditCount,
}: {
  companies: CompanyRow[];
  lowCreditCount: number;
}) {
  const router = useRouter();
  // Local state to trigger re-fetch after number assignment
  const [rows, setRows] = useState<CompanyRow[]>(companies);

  function refreshRow(companyId: string, newNumber: string) {
    setRows((prev) =>
      prev.map((c) =>
        c.id === companyId
          ? {
              ...c,
              assignedNumber: c.assignedNumber || newNumber,
              assignedNumbers: [...(c.assignedNumbers || []), newNumber],
            }
          : c
      )
    );
  }

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
      cell: ({ row }) => (
        <AssignedNumberCell
          row={row.original}
          onRefresh={() => router.refresh()}
        />
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
        data={rows}
        searchKeys={["name", "slug", "pocEmail", "contractId", "cli", "companyCode"]}
        searchPlaceholder="Search by name, slug, contract ID, or owner email (if claimed)..."
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
      />
    </div>
  );
}
