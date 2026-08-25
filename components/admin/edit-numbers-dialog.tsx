"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

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

export function EditNumbersDialog({
  companyId,
  companyName,
  direction,
  currentNumbers,
  otherDirectionNumbers,
  totalChannels,
  onSuccess,
  customTrigger,
}: {
  companyId: string;
  companyName: string;
  direction: "INBOUND" | "OUTBOUND";
  currentNumbers: { number: string; channels: number | null }[];
  otherDirectionNumbers: { number: string; channels: number | null }[];
  totalChannels: number;
  onSuccess?: () => void;
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [numbers, setNumbers] = useState<{ number: string; channels: string }[]>(
    currentNumbers.map(n => ({ number: n.number, channels: n.channels ? String(n.channels) : "" }))
  );
  const [loading, setLoading] = useState(false);

  // Sync state when opened
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setNumbers(currentNumbers.map(n => ({ number: n.number, channels: n.channels ? String(n.channels) : "" })));
    }
    setOpen(isOpen);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const mappedNumbers = numbers.map(n => ({
        number: n.number,
        channels: n.channels ? parseInt(n.channels, 10) : null
      }));

      const payload = {
        name: companyName,
        totalChannels,
        inboundNumbers: direction === "INBOUND" ? mappedNumbers : otherDirectionNumbers,
        outboundNumbers: direction === "OUTBOUND" ? mappedNumbers : otherDirectionNumbers,
      };

      const res = await fetch(`/api/companies/${companyId}/full-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update numbers");
      }

      toast.success(`${direction === "INBOUND" ? "Inbound" : "Outbound"} numbers updated`);
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {customTrigger || (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start font-normal text-xs h-7"
            onClick={(e) => e.stopPropagation()}
          >
            Edit Numbers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {direction === "INBOUND" ? "Inbound" : "Outbound"} Numbers</DialogTitle>
          <DialogDescription>
            Update the {direction.toLowerCase()} numbers for <strong>{companyName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Assigned Numbers</Label>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setNumbers([...numbers, { number: "", channels: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {numbers.length === 0 && <p className="text-xs text-muted-foreground">No numbers assigned.</p>}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
            {numbers.map((num, i) => (
              <div key={i} className="flex flex-col gap-1 border border-border p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Phone Number</Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => {
                    setNumbers(numbers.filter((_, idx) => idx !== i));
                  }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={num.number} 
                    onChange={(e) => {
                      const newArr = [...numbers];
                      newArr[i].number = e.target.value;
                      setNumbers(newArr);
                    }}
                    placeholder="e.g. +1234567890" 
                    className="flex-1"
                  />
                  <Input 
                    type="number"
                    min="0"
                    placeholder="Channels"
                    value={num.channels} 
                    onChange={(e) => {
                      const newArr = [...numbers];
                      newArr[i].channels = e.target.value;
                      setNumbers(newArr);
                    }}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
