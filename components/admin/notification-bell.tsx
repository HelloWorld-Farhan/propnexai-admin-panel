"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Plus, X, Coins, PhoneCall, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PendingApproval = {
  id: string;
  email: string;
  createdAt: string;
  remindedAt?: string | null;
};

export function ApprovalNotification() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [open, setOpen] = useState(false);
  const [verifyUser, setVerifyUser] = useState<PendingApproval | null>(null);
  const [declineUser, setDeclineUser] = useState<PendingApproval | null>(null);

  const [name, setName] = useState("");
  const [cli, setCli] = useState("");
  const [assignedNumber, setAssignedNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  async function fetchPending() {
    try {
      const res = await fetch("/api/pending-approvals");
      const data = await res.json();
      if (data.success) {
        setPending(data.pending);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleVerifySubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!verifyUser) return;
    if (!name.trim() || !cli.trim()) {
      setError("Name and CLI are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        cli: cli.trim().toUpperCase(),
        pendingUserEmail: verifyUser.email,
      };
      if (assignedNumber.trim()) {
        payload.assignedNumber = assignedNumber.trim();
      }

      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to create and verify.");
        return;
      }

      toast.success("User Verified & Company Created!");
      setVerifyUser(null);
      setName("");
      setCli("");
      setAssignedNumber("");
      fetchPending();
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Approvals">
            <UserCheck className="size-5" />
            {pending.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b p-3">
            <h4 className="font-medium leading-none">Pending Approvals</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Users waiting for platform access
            </p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              <div className="flex flex-col">
                {pending.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b p-3 last:border-0"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <p className="truncate text-sm font-medium flex items-center gap-2">
                        {user.email}
                        {user.remindedAt && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Reminder Sent
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDeclineUser(user);
                          setOpen(false);
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setVerifyUser(user);
                          setOpen(false);
                        }}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!declineUser} onOpenChange={(val) => !val && setDeclineUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline the request for <b>{declineUser?.email}</b>? They will receive an email notification and their request will be marked as rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineUser(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await fetch("/api/pending-approvals/decline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: declineUser?.email }),
                  });
                  toast.success("Request declined.");
                  setDeclineUser(null);
                  fetchPending();
                } catch (err) {
                  toast.error("Failed to decline.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Declining..." : "Decline Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verifyUser} onOpenChange={(val) => !val && setVerifyUser(null)}>
        <DialogContent>
          <form onSubmit={handleVerifySubmit}>
            <DialogHeader>
              <DialogTitle>Verify & Create Company</DialogTitle>
              <DialogDescription>
                Create a company for <b>{verifyUser?.email}</b>. They will be automatically linked as the Owner and instantly receive an email.
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
              <div className="space-y-2">
                <Label htmlFor="company-assigned-number">Assigned Number (Optional)</Label>
                <Input
                  id="company-assigned-number"
                  value={assignedNumber}
                  onChange={(event) => setAssignedNumber(event.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVerifyUser(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Approve & Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CreditNotification() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  
  const [declineCredit, setDeclineCredit] = useState<any | null>(null);
  const [approveCredit, setApproveCredit] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/credit-requests");
      const data = await res.json();
      if (data.success) {
        setPending(data.requests);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDecline() {
    if (!declineCredit) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/credit-requests/${declineCredit.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Credit request declined.");
        setPending((prev) => prev.filter((r) => r.id !== declineCredit.id));
        setDeclineCredit(null);
      } else {
        toast.error("Failed to decline request.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!approveCredit) return;
    setIsSubmitting(true);
    
    const amountMatch = approveCredit.message.match(/\d+/);
    const amount = amountMatch ? parseInt(amountMatch[0], 10) : 0;

    if (!amount || amount <= 0) {
      toast.error("Invalid amount requested.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Add credits
      const resCredits = await fetch(`/api/companies/${approveCredit.companyId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: `Approved credit request` }),
      });

      if (!resCredits.ok) throw new Error("Failed to add credits");

      // Dismiss request
      await fetch(`/api/credit-requests/${approveCredit.id}`, { method: "DELETE" });

      toast.success(`Approved! Added ${amount} credits to ${approveCredit.company?.name || approveCredit.email}`);
      setPending((prev) => prev.filter((r) => r.id !== approveCredit.id));
      setApproveCredit(null);
      router.refresh();
    } catch (err) {
      toast.error("Failed to approve and add credits.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Credit Requests">
            <Coins className="size-5" />
            {pending.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b p-3">
            <h4 className="font-medium leading-none">Credit Requests</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Users requesting additional credits
            </p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              <div className="flex flex-col">
                {pending.map((req) => (
                  <div key={req.id} className="flex flex-col border-b p-3 last:border-0 gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{req.email}</p>
                        <p className="text-xs font-semibold text-fuchsia-500">{req.message}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()} - {new Date(req.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full mt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setDeclineCredit(req);
                          setOpen(false);
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setApproveCredit(req);
                          setOpen(false);
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!declineCredit} onOpenChange={(val) => !val && setDeclineCredit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Credit Request</DialogTitle>
            <DialogDescription>
              Do you really want to decline the credit request from <b>{declineCredit?.email}</b>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineCredit(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={isSubmitting}
              onClick={handleDecline}
            >
              {isSubmitting ? "Declining..." : "Decline Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveCredit} onOpenChange={(val) => !val && setApproveCredit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Credit Request</DialogTitle>
            <DialogDescription>
              Confirm credit approval. This action will immediately add the requested credits to the company balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={approveCredit?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={approveCredit?.company?.name || "Unknown Company"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Requested Amount</Label>
              <Input 
                value={approveCredit?.message?.match(/\d+/)?.[0] || "0"} 
                disabled 
                className="font-bold text-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveCredit(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={handleApprove}>
              {isSubmitting ? "Approving…" : "Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NumberNotification() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/number-requests");
      const data = await res.json();
      if (data.success) {
        setPending(data.requests);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function dismissRequest(id: string) {
    try {
      const res = await fetch(`/api/number-requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Number Requests">
          <PhoneCall className="size-5" />
          {pending.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <h4 className="font-medium leading-none">Number Requests</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Users waiting for a phone number assignment
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {pending.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No pending requests.
            </p>
          ) : (
            <div className="flex flex-col">
              {pending.map((req) => (
                <div key={req.id} className="flex flex-col border-b p-3 last:border-0 gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{req.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()} - {new Date(req.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0" onClick={(e) => { e.stopPropagation(); dismissRequest(req.id); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      router.push("/numbers");
                      toast.info(`Please assign a number to company: ${req.company?.name || req.email}`);
                    }}
                  >
                    Go to Numbers Manager
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AdminNotifications() {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <CreditNotification />
      <NumberNotification />
      <ApprovalNotification />
    </div>
  );
}
