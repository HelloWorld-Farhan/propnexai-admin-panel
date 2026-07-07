"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus } from "lucide-react";
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

type CreatedCompany = {
  id: string;
  name: string;
  slug: string;
  contractId: string;
  createdAt: string;
};

export function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCompany | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setName("");
    setError(null);
    setCreated(null);
    setCopied(false);
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to create company.");
        return;
      }

      setCreated(data as CreatedCompany);
      toast.success("Company created");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyContractId() {
    if (!created?.contractId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(created.contractId);
      setCopied(true);
      toast.success("Contract ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy Contract ID");
    }
  }

  function handleViewCompany() {
    if (!created) {
      return;
    }
    setOpen(false);
    router.push(`/companies/${created.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Create Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Company Created</DialogTitle>
              <DialogDescription>
                Share this Contract ID with the intended company owner. The first
                account to link it from Settings becomes the owner. It can only
                be used once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Company</Label>
                <p className="text-sm font-medium">{created.name}</p>
              </div>
              <div className="space-y-2">
                <Label>Contract ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={created.contractId}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyContractId}
                    aria-label="Copy Contract ID"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleViewCompany}>
                View Company
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
              <DialogDescription>
                Add a new tenant company. A unique Contract ID will be generated
                automatically. The first account to link the Contract ID becomes
                the company owner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Acme Realty"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Company"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
