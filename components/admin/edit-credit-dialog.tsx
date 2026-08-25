"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditCreditDialog({
  companyId,
  companyName,
  currentCredits,
  customTrigger,
}: {
  companyId: string;
  companyName: string;
  currentCredits: number;
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("Admin credit override");
  const [saving, setSaving] = useState(false);

  const newAmount = Number.parseFloat(creditAmount);
  const isValidAmount = !isNaN(newAmount) && newAmount >= 0 && creditAmount.trim() !== "";
  const diff = isValidAmount ? newAmount - currentCredits : null;

  async function editCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount) return toast.error("Please enter a valid credit amount");

    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/credits/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: Math.round(diff || 0),
          description: creditDescription,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update credits");
      }

      if (diff !== null && diff < 0) {
        toast.success(`Credits reduced by ${Math.abs(diff).toLocaleString()} → now ${newAmount.toLocaleString()} for ${companyName}`);
      } else if (diff !== null && diff > 0) {
        toast.success(`Credits increased by ${diff.toLocaleString()} → now ${newAmount.toLocaleString()} for ${companyName}`);
      } else {
        toast.success(`Credits unchanged at ${newAmount.toLocaleString()} for ${companyName}`);
      }

      setOpen(false);
      setCreditAmount("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update credits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setCreditAmount("");
        }}
      >
        <DialogTrigger asChild>
          {customTrigger || (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              title="Edit Credit Balance"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Override Credits — {companyName}</DialogTitle>
            <DialogDescription>
              Set the exact credit balance for this company. The difference will be reflected immediately. Sub-companies are <strong>not</strong> affected.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editCredits} className="space-y-4">
            {/* Current balance display */}
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Current balance:</span>{" "}
              <span className="font-semibold tabular-nums">{currentCredits.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-credit-amount">New Exact Credit Balance</Label>
              <Input
                id="edit-credit-amount"
                type="number"
                min={0}
                step="0.5"
                placeholder={`e.g. ${currentCredits}`}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                required
              />
            </div>

            {/* Live diff preview */}
            {isValidAmount && diff !== null && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                  diff < 0
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                    : diff > 0
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {diff < 0 ? (
                  <TrendingDown className="h-4 w-4 shrink-0" />
                ) : diff > 0 ? (
                  <TrendingUp className="h-4 w-4 shrink-0" />
                ) : null}
                {diff < 0
                  ? `Will cut ${Math.abs(diff).toLocaleString()} credits (${currentCredits.toLocaleString()} → ${newAmount.toLocaleString()})`
                  : diff > 0
                  ? `Will add ${diff.toLocaleString()} credits (${currentCredits.toLocaleString()} → ${newAmount.toLocaleString()})`
                  : "No change in balance"}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-credit-desc">Description</Label>
              <Input
                id="edit-credit-desc"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); setCreditAmount(""); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !isValidAmount}>
                {saving ? "Saving…" : diff !== null && diff < 0 ? `Cut to ${newAmount.toLocaleString()}` : `Set to ${isValidAmount ? newAmount.toLocaleString() : "—"}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
