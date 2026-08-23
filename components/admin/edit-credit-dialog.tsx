"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(currentCredits.toString());
  const [creditDescription, setCreditDescription] = useState("Admin credit override");
  const [saving, setSaving] = useState(false);

  async function editCredits(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number.parseInt(creditAmount, 10);
    
    if (!Number.isFinite(amount) || amount < 0) {
      return toast.error("Credit amount cannot be negative");
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/credits/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: creditDescription }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update credits");
      }
      
      toast.success(`Set credits for ${companyName} to ${amount}`);
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update credits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-6 w-6 shrink-0 rounded-full bg-background ml-1" title="Edit Credits">
            <Pencil className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Credits - {companyName}</DialogTitle>
            <DialogDescription>
              This will forcefully override the company&apos;s current credit balance to the exact amount you specify.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editCredits} className="space-y-4">
            <div className="space-y-2">
              <Label>New Exact Credit Balance</Label>
              <Input
                type="number"
                min={0}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save credits"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
