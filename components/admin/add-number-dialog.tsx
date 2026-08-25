"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

export function AddNumberDialog({
  companyId,
  companyName,
  onSuccess,
  direction,
  customTrigger,
}: {
  companyId: string;
  companyName: string;
  direction?: "INBOUND" | "OUTBOUND" | null;
  onSuccess: () => void;
  customTrigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newNumber, direction }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add phone number");
      }

      toast.success(`Number added to ${companyName}`);
      setOpen(false);
      setNewNumber("");
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
        {customTrigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-3 w-3" />
            Add Number
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleAdd}>
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
            <DialogDescription>
              Assign an <strong>additional</strong> phone number to{" "}
              <strong>{companyName}</strong>. The company will have all assigned numbers active simultaneously.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-number">New Phone Number</Label>
              <Input
                id="add-number"
                placeholder="e.g. 919429390765 or +44 7971 501548"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the full number including country code (no spaces or dashes required).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setNewNumber(""); setOpen(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Number"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
