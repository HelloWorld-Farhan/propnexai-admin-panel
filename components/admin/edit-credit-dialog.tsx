"use client";

import { useState } from "react";
import { TrendingDown, Minus } from "lucide-react";
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
}: {
  companyId: string;
  companyName: string;
  currentCredits: number;
}) {
  const [open, setOpen] = useState(false);
  const [deductAmount, setDeductAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("Miscellaneous Fees");
  const [saving, setSaving] = useState(false);

  const amountToDeduct = Number.parseFloat(deductAmount);
  const isValidAmount = !isNaN(amountToDeduct) && amountToDeduct > 0 && deductAmount.trim() !== "";

  async function deductCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount) return toast.error("Please enter a valid deduction amount");

    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/credits/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: -Number(amountToDeduct.toFixed(4)),
          description: creditDescription,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update credits");
      }

      toast.success(`Successfully deducted ${amountToDeduct.toLocaleString()} credits from ${companyName}`);

      setOpen(false);
      setDeductAmount("");
      // Use full page reload to bypass Next.js RSC cache entirely
      window.location.reload();
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
          if (!v) setDeductAmount("");
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full bg-background ml-1"
            title="Deduct Credits"
          >
            <Minus className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Deduct Credits — {companyName}</DialogTitle>
            <DialogDescription>
              Enter the amount of credits to deduct. This will first deduct from the main company. If the main company runs out, the remainder will be split across its sub-companies.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={deductCredits} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deduct-credit-amount">Amount to Deduct</Label>
              <Input
                id="deduct-credit-amount"
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 350"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                required
              />
            </div>

            {/* Live diff preview */}
            {isValidAmount && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <TrendingDown className="h-4 w-4 shrink-0" />
                Will deduct {amountToDeduct.toLocaleString()} credits from {companyName} and its sub-companies.
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
                onClick={() => { setOpen(false); setDeductAmount(""); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={saving || !isValidAmount}>
                {saving ? "Deducting…" : isValidAmount ? `Deduct ${amountToDeduct.toLocaleString()}` : "Deduct"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
