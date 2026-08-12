"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Plus, X } from "lucide-react";
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

export function NotificationBell() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [open, setOpen] = useState(false);
  const [verifyUser, setVerifyUser] = useState<PendingApproval | null>(null);
  const [declineUser, setDeclineUser] = useState<PendingApproval | null>(null);

  // Dialog state
  const [name, setName] = useState("");
  const [cli, setCli] = useState("");
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
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cli: cli.trim().toUpperCase(),
          pendingUserEmail: verifyUser.email,
        }),
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
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
