"use client";

import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function CopyFormLinkButton() {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText("https://www.propnexai.com/white-label/setup");
        toast.success("White-label setup form link copied!");
      }}
      className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
    >
      <LinkIcon className="h-3 w-3" /> Copy Form Link
    </button>
  );
}
