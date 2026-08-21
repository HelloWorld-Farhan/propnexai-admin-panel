"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

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

export function VerifySubCompanyDialog({
  subCompanyId,
  subCompanyName,
  parentCompanyId,
  onSuccess,
}: {
  subCompanyId: string;
  subCompanyName: string;
  parentCompanyId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [assignedNumber, setAssignedNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedNumber.trim()) {
      toast.error("Assigned number is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${subCompanyId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedNumber, parentCompanyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify sub-company");
      }

      toast.success("Sub-company verified successfully");
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          Verify
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleVerify}>
          <DialogHeader>
            <DialogTitle>Verify Sub-Company</DialogTitle>
            <DialogDescription>
              Assign a phone number to <strong>{subCompanyName}</strong>. This number will be linked to both the main company and this sub-company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assigned Number</Label>
              <Input
                placeholder="e.g. 919429390765"
                value={assignedNumber}
                onChange={(e) => setAssignedNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <span className="animate-spin mr-2">⏳</span>}
              Save & Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
