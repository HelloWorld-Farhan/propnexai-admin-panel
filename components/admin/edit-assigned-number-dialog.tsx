"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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

export function EditAssignedNumberDialog({
  subCompanyId,
  subCompanyName,
  currentNumber,
  onSuccess,
}: {
  subCompanyId: string;
  subCompanyName: string;
  currentNumber: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newNumber, setNewNumber] = useState(currentNumber);
  const [loading, setLoading] = useState(false);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!newNumber.trim()) {
      toast.error("Assigned number is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${subCompanyId}/number`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update assigned number");
      }

      toast.success("Assigned number updated successfully");
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleEdit}>
          <DialogHeader>
            <DialogTitle>Edit Assigned Number</DialogTitle>
            <DialogDescription>
              Update the phone number assigned to <strong>{subCompanyName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="number">New Phone Number</Label>
              <Input
                id="number"
                placeholder="e.g. 07971501548"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
