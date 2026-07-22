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
  cli: string;
  companyCode: string;
  createdAt: string;
};

export function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cli, setCli] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCompany | null>(null);
  const [copiedField, setCopiedField] = useState<"contractId" | "companyCode" | null>(
    null,
  );

  function resetForm() {
    setName("");
    setCli("");
    setError(null);
    setCreated(null);
    setCopiedField(null);
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
    if (!/^[A-Z]{2,5}$/.test(cli.trim().toUpperCase())) {
      setError("CLI must be 2-5 uppercase letters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cli: cli.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to create company.");
        return;
      }

      setCreated(data as CreatedCompany);
      toast.success("Company created");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy(field: "contractId" | "companyCode", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "contractId" ? "Contract ID copied" : "Company code copied");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy value");
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
                Share the Contract ID with the intended company owner. CLI and
                company code are used in public resource IDs and should remain
                unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Company</Label>
                <p className="text-sm font-medium">{created.name}</p>
              </div>
              <div className="space-y-2">
                <Label>CLI</Label>
                <p className="font-mono text-sm">{created.cli}</p>
              </div>
              <div className="space-y-2">
                <Label>Company Code</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={created.companyCode}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy("companyCode", created.companyCode)}
                    aria-label="Copy company code"
                  >
                    {copiedField === "companyCode" ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
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
                    onClick={() => handleCopy("contractId", created.contractId)}
                    aria-label="Copy Contract ID"
                  >
                    {copiedField === "contractId" ? (
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
                Add a new tenant company. CLI is required and used in public
                resource IDs. A unique company code and Contract ID are
                generated automatically.
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
              <div className="space-y-2">
                <Label htmlFor="company-cli">CLI</Label>
                <Input
                  id="company-cli"
                  value={cli}
                  onChange={(event) =>
                    setCli(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
                  }
                  placeholder="PNX"
                  maxLength={5}
                  disabled={isSubmitting}
                  className="font-mono uppercase"
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
