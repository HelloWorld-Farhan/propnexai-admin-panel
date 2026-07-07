"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  COMMUNICATION_CHANNEL_LABELS,
  type ChannelConflict,
} from "@/lib/types/agent-config";

type ReplaceChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ChannelConflict[];
  onConfirm: () => void;
  loading?: boolean;
};

export function ReplaceChannelDialog({
  open,
  onOpenChange,
  conflicts,
  onConfirm,
  loading = false,
}: ReplaceChannelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace channel assignment</DialogTitle>
          <DialogDescription>
            The following channels are already assigned to other agents in this
            company. Confirm to reassign them to this agent.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {conflicts.map((conflict) => (
            <li
              key={conflict.type}
              className="rounded-md border px-3 py-2"
            >
              <span className="font-medium">
                {COMMUNICATION_CHANNEL_LABELS[conflict.type]}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — currently assigned to {conflict.currentAgentName}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Replacing..." : "Replace assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
