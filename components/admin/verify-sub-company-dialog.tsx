"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PhoneIncoming, PhoneOutgoing, Hash, CheckCircle2, Info } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function VerifySubCompanyDialog({
  subCompanyId,
  subCompanyName,
  parentCompanyId,
  existingInboundNums = [],
  existingOutboundNums = [],
  onSuccess,
}: {
  subCompanyId: string;
  subCompanyName: string;
  parentCompanyId: string;
  existingInboundNums?: { number: string; channels: number | null }[];
  existingOutboundNums?: { number: string; channels: number | null }[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const [inboundNumber, setInboundNumber] = useState("");
  const [inboundChannels, setInboundChannels] = useState<number | "">("");

  const [outboundNumber, setOutboundNumber] = useState("");
  const [outboundChannels, setOutboundChannels] = useState<number | "">("");

  const [loading, setLoading] = useState(false);

  const alreadyHasInbound = existingInboundNums.length > 0;
  const alreadyHasOutbound = existingOutboundNums.length > 0;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    // Only require at least one new number if neither exists already
    const addingInbound = inboundNumber.trim().length > 0;
    const addingOutbound = outboundNumber.trim().length > 0;
    if (!addingInbound && !addingOutbound && !alreadyHasInbound && !alreadyHasOutbound) {
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
          inboundNumber: inboundNumber.trim() || undefined,
          inboundChannels: inboundChannels ? Number(inboundChannels) : 1,
          outboundNumber: outboundNumber.trim() || undefined,
          outboundChannels: outboundChannels ? Number(outboundChannels) : 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify sub-company");
      }

      toast.success(`Sub-company "${subCompanyName}" verified & activated! Email sent to user.`);
      setInboundNumber("");
      setInboundChannels("");
      setOutboundNumber("");
      setOutboundChannels("");
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
      <DialogContent className="max-w-lg">
        <form onSubmit={handleVerify}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Verify Sub-Company
            </DialogTitle>
            <DialogDescription>
              Activate <strong>{subCompanyName}</strong> by assigning phone numbers. After saving, the status will become <strong>ACTIVE</strong> and an email will be sent to the user automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">

            {/* Existing Numbers Info */}
            {(alreadyHasInbound || alreadyHasOutbound) && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="size-3.5" /> Currently Assigned
                </p>
                {alreadyHasInbound && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <PhoneIncoming className="size-3.5 text-emerald-500" />
                    <span className="text-sm font-medium">Inbound:</span>
                    {existingInboundNums.map((n) => (
                      <Badge key={n.number} variant="secondary" className="font-mono text-xs">
                        {n.number} {n.channels ? `| Ch ${n.channels}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
                {alreadyHasOutbound && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <PhoneOutgoing className="size-3.5 text-blue-500" />
                    <span className="text-sm font-medium">Outbound:</span>
                    {existingOutboundNums.map((n) => (
                      <Badge key={n.number} variant="secondary" className="font-mono text-xs">
                        {n.number} {n.channels ? `| Ch ${n.channels}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Inbound Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PhoneIncoming className="size-4 text-emerald-500" />
                <Label className="text-sm font-semibold">Inbound Number (Optional)</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input
                    placeholder="e.g. 07946350796"
                    value={inboundNumber}
                    onChange={(e) => setInboundNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="size-3" /> Channels
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 2"
                    value={inboundChannels}
                    onChange={(e) => setInboundChannels(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
              </div>
            </div>

            {/* Outbound Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PhoneOutgoing className="size-4 text-blue-500" />
                <Label className="text-sm font-semibold">Outbound Number (Optional)</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input
                    placeholder="e.g. 07969007101"
                    value={outboundNumber}
                    onChange={(e) => setOutboundNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="size-3" /> Channels
                  </Label>
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

            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              ⚡ After assigning, call history for these numbers will start fresh (0 calls). Previous calls on these numbers will not be shown.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <span className="animate-spin mr-2">⏳</span>}
              Save &amp; Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
