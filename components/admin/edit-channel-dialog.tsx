"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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

export function EditChannelDialog({
  companyId,
  companyName,
  currentChannels,
  customTrigger,
}: {
  companyId: string;
  companyName: string;
  currentChannels: number;
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channelAmount, setChannelAmount] = useState(currentChannels.toString());
  const [saving, setSaving] = useState(false);

  const newAmount = Number.parseInt(channelAmount, 10);
  const isValidAmount = !isNaN(newAmount) && newAmount >= 0 && channelAmount.trim() !== "";

  async function editChannels(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount) return toast.error("Please enter a valid channel amount");

    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/setup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalChannels: newAmount,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update channels");
      }

      toast.success(`Channels updated to ${newAmount} for ${companyName}`);

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update channels");
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
          if (!v) setChannelAmount(currentChannels.toString());
        }}
      >
        <DialogTrigger asChild>
          {customTrigger || (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              title="Allocate Channels"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Allocate Channels — {companyName}</DialogTitle>
            <DialogDescription>
              Set the total number of telecommunications channels allocated to this company.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editChannels} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Total Channels</Label>
              <Input
                type="number"
                min={0}
                step={1}
                required
                value={channelAmount}
                onChange={(e) => setChannelAmount(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !isValidAmount}>
                {saving ? "Saving..." : "Save Channels"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
