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
  
  const [inboundNumber, setInboundNumber] = useState("");
  const [inboundChannels, setInboundChannels] = useState<number | "">("");
  
  const [outboundNumber, setOutboundNumber] = useState("");
  const [outboundChannels, setOutboundChannels] = useState<number | "">("");
  
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!inboundNumber.trim() && !outboundNumber.trim()) {
      toast.error("Please assign at least one Inbound or Outbound number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${subCompanyId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          parentCompanyId,
          inboundNumber: inboundNumber.trim(),
          inboundChannels: inboundChannels ? Number(inboundChannels) : 1,
          outboundNumber: outboundNumber.trim(),
          outboundChannels: outboundChannels ? Number(outboundChannels) : 1
        }),
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
              Assign phone numbers to <strong>{subCompanyName}</strong> to activate it. You can assign an Inbound number, an Outbound number, or both.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inbound Number (Optional)</Label>
                <Input
                  placeholder="e.g. 919429390765"
                  value={inboundNumber}
                  onChange={(e) => setInboundNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Inbound Channels</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={inboundChannels}
                  onChange={(e) => setInboundChannels(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outbound Number (Optional)</Label>
                <Input
                  placeholder="e.g. 919429390765"
                  value={outboundNumber}
                  onChange={(e) => setOutboundNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Outbound Channels</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={outboundChannels}
                  onChange={(e) => setOutboundChannels(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
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
