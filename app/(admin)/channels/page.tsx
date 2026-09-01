"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FormSubmission = {
  id: string;
  formType: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  industry?: string | null;
  clients?: string | null;
  volume?: string | null;
  createdAt: string;
};

export default function FormsPage() {
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FormSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/form-submissions");
      const data = await res.json();
      if (data.success) {
        setForms(data.forms);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/form-submissions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast.success("Form submission deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Failed to delete form submission.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Form Info</h1>
            <p className="text-muted-foreground mt-2">
              View all website form submissions across Demo Calls and Partner Applications.
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Additional Info</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No form submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      {f.formType === "DEMO_CALL" ? (
                        <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20">
                          Demo Call
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 hover:bg-violet-500/20">
                          Partner App
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(f.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.email}</TableCell>
                    <TableCell>{f.phone}</TableCell>
                    <TableCell>{f.company || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.formType === "DEMO_CALL" ? (
                        <span>Industry: {f.industry || "—"}</span>
                      ) : (
                        <div className="flex flex-col">
                          <span>Clients: {f.clients || "—"}</span>
                          <span>Volume: {f.volume || "—"}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        onClick={() => setDeleteTarget(f)}
                        title="Delete submission"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the{" "}
              <strong>
                {deleteTarget?.formType === "DEMO_CALL" ? "Demo Call" : "Partner App"}
              </strong>{" "}
              submission from <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              <br />
              <span className="text-red-500 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
