"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Plus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { AddCreditDialog } from "@/components/admin/add-credit-dialog";
import { EditCreditDialog } from "@/components/admin/edit-credit-dialog";
import { CreditBreakdown } from "@/components/admin/credit-breakdown";
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog";
import { AddNumberDialog } from "@/components/admin/add-number-dialog";
import { EditNumbersDialog } from "@/components/admin/edit-numbers-dialog";
import { EditChannelDialog } from "@/components/admin/edit-channel-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  inboundNumbers?: string[];
  outboundNumbers?: string[];
  childCompanyCount: number;
  unverifiedChildCompanyCount: number;
};

// Masked number display: shows •••last3, hover reveals full
export function MaskedNumber({ num }: { num: string }) {
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

export function DirectionalNumberCell({ row, direction, nums, onRefresh }: { row: CompanyRow; direction: "INBOUND" | "OUTBOUND"; nums: string[]; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      {nums.length === 0 ? (
        <span className="text-destructive font-medium text-xs mt-1">Unassigned</span>
      ) : (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {nums.map((num, i) => (
            <span key={i} className="flex items-center">
              <MaskedNumber num={num} />
              {i < nums.length - 1 && <span className="text-muted-foreground ml-0.5">,</span>}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
        <AddNumberDialog
          companyId={row.id}
          companyName={row.name}
          direction={direction}
          onSuccess={onRefresh}
          customTrigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:bg-zinc-800 shrink-0"
              title="Add Number"
            >
              <Plus className="h-3 w-3" />
            </Button>
          }
        />
        {nums.length > 0 && (
          <EditNumbersDialog
            companyId={row.id}
            companyName={row.name}
            direction={direction}
            currentNumbers={nums}
            otherDirectionNumbers={direction === "INBOUND" ? row.outboundNumbers || [] : row.inboundNumbers || []}
            totalChannels={row.totalChannels}
            onSuccess={onRefresh}
            customTrigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:bg-zinc-800 shrink-0"
                title="Edit Numbers"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            }
          />
        )}
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
      // Actually we just refresh from server
      router.refresh();
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
              {row.original.childCompanyCount} Sub-Companies <span>&rarr;</span>
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
      accessorKey: "inboundNumber",
      header: "Inbound Number",
      cell: ({ row }) => (
        <DirectionalNumberCell
          row={row.original}
          direction="INBOUND"
          nums={row.original.inboundNumbers || []}
          onRefresh={() => router.refresh()}
        />
      ),
    },
    {
      accessorKey: "outboundNumber",
      header: "Outbound Number",
      cell: ({ row }) => (
        <DirectionalNumberCell
          row={row.original}
          direction="OUTBOUND"
          nums={row.original.outboundNumbers || []}
          onRefresh={() => router.refresh()}
        />
      ),
    },
    {
      accessorKey: "channels",
      header: "Channels",
      cell: ({ row }) => (
        <div className="flex items-center justify-between min-w-[80px]">
          <span className="font-medium text-sm">{formatNumber(row.original.totalChannels)}</span>
          <div onClick={(e) => e.stopPropagation()}>
             <EditChannelDialog
               companyId={row.original.id}
               companyName={row.original.name}
               currentChannels={row.original.totalChannels}
               customTrigger={
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0" title="Edit Channels">
                   <Pencil className="h-3 w-3" />
                 </Button>
               }
             />
          </div>
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
