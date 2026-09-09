"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Briefcase, Info, Pencil, Trash, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteJobPosting, deleteJobApplication, acceptJobApplication, declineJobApplication } from "./actions";
import { toast } from "sonner";

export function JobPostingsTable({ jobs }: { jobs: any[] }) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const s = search.toLowerCase();
    return (
      job.jobId.toLowerCase().includes(s) ||
      job.title.toLowerCase().includes(s) ||
      (job.jobType && job.jobType.toLowerCase().includes(s)) ||
      (job.location && job.location.toLowerCase().includes(s))
    );
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await deleteJobPosting(deleteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Job posting deleted.");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by Job ID, Title, Type, or Location..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-md" 
        />
      </div>
      
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Job ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Posted Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Last Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applications</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-muted-foreground">
                    {jobs.length === 0 ? "No jobs posted yet." : "No jobs found matching your search."}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job: any) => (
                  <tr key={job.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{job.jobId}</td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 font-medium">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {job.title}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 ml-6">{job.location}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {job.jobType}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {format(new Date(job.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {job.lastDate ? format(new Date(job.lastDate), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                        {job._count?.applications || 0} received
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="ghost" size="icon" title="View Info">
                            <Info className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/jobs/${job.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Delete" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-100/10"
                          onClick={() => setDeleteId(job.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Posting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job posting? This will also permanently remove all applications associated with it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Job Posting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApplicationsTable({ applications }: { applications: any[] }) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [infoApp, setInfoApp] = useState<any>(null);

  const filteredApps = applications.filter((app) => {
    const s = search.toLowerCase();
    const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
    return (
      fullName.includes(s) ||
      app.email.toLowerCase().includes(s) ||
      app.phone.toLowerCase().includes(s) ||
      (app.job?.title && app.job.title.toLowerCase().includes(s)) ||
      (app.job?.jobId && app.job.jobId.toLowerCase().includes(s))
    );
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await deleteJobApplication(deleteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Application deleted.");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by Name, Email, Phone, Job Title or Job ID..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-md" 
        />
      </div>

      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applicant</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Job Role</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Experience</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applied Date</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    {applications.length === 0 ? "No applications received yet." : "No applications found matching your search."}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app: any) => (
                  <tr key={app.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="p-4 align-middle font-medium text-primary">
                      {app.job?.title || "Unknown Role"}
                      {app.job?.jobId && <div className="text-xs text-muted-foreground font-normal">ID: {app.job.jobId}</div>}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span>{app.email}</span>
                        <span className="text-xs text-muted-foreground">{app.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{app.experience}</td>
                    <td className="p-4 align-middle">
                      {app.status === "ACCEPTED" && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">Accepted</span>}
                      {app.status === "REJECTED" && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Rejected</span>}
                      {(!app.status || app.status === "PENDING") && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">Pending</span>}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {format(new Date(app.appliedAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.resumeUrl ? (
                          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              Resume
                            </Button>
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-xs mr-2">No resume</span>
                        )}
                        
                        <ApplicationActionsInline app={app} />

                        <ApplicationDetailsModal app={app} />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Delete" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-100/10 h-8 w-8"
                          onClick={() => setDeleteId(app.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this applicant's record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApplicationActionsInline({ app }: { app: any }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean, type: 'accept' | 'decline' | null }>({ open: false, type: null });

  const confirmAction = async () => {
    if (confirmState.type === 'accept') {
      setIsAccepting(true);
      const res = await acceptJobApplication(app.id);
      if (res?.error) toast.error(res.error);
      else toast.success("Acceptance email sent!");
      setIsAccepting(false);
    } else if (confirmState.type === 'decline') {
      setIsDeclining(true);
      const res = await declineJobApplication(app.id);
      if (res?.error) toast.error(res.error);
      else toast.success("Rejection email sent!");
      setIsDeclining(false);
    }
    setConfirmState({ open: false, type: null });
  };

  const isAccepted = app.status === "ACCEPTED";
  const isRejected = app.status === "REJECTED";

  return (
    <>
      <div className="flex gap-1 mr-2 min-h-[32px]">
        {!(isAccepted || isRejected) && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
              onClick={() => setConfirmState({ open: true, type: 'accept' })}
              disabled={isAccepting || isDeclining}
              title="Accept Applicant"
            >
              {isAccepting ? "..." : "Accept"}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
              onClick={() => setConfirmState({ open: true, type: 'decline' })}
              disabled={isAccepting || isDeclining}
              title="Decline Applicant"
            >
              {isDeclining ? "..." : "Decline"}
            </Button>
          </>
        )}
      </div>

      <Dialog open={confirmState.open} onOpenChange={(val) => !val && setConfirmState({ open: false, type: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmState.type === 'accept' 
                ? "Are you sure you want to ACCEPT this applicant? This will send them an automated email invite." 
                : "Are you sure you want to REJECT this applicant? This will send them an automated rejection email."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmState({ open: false, type: null })} disabled={isAccepting || isDeclining}>Cancel</Button>
            <Button 
              variant={confirmState.type === 'accept' ? 'default' : 'destructive'} 
              onClick={confirmAction} 
              disabled={isAccepting || isDeclining}
            >
              {confirmState.type === 'accept' 
                ? (isAccepting ? "Accepting..." : "OK") 
                : (isDeclining ? "Rejecting..." : "OK")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApplicationDetailsModal({ app }: { app: any }) {
  const [open, setOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean, type: 'accept' | 'decline' | null }>({ open: false, type: null });

  if (!app) return null;

  const confirmAction = async () => {
    if (confirmState.type === 'accept') {
      setIsAccepting(true);
      const res = await acceptJobApplication(app.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Acceptance email sent to applicant!");
        setConfirmState({ open: false, type: null });
        setOpen(false);
      }
      setIsAccepting(false);
    } else if (confirmState.type === 'decline') {
      setIsDeclining(true);
      const res = await declineJobApplication(app.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Rejection email sent to applicant.");
        setConfirmState({ open: false, type: null });
        setOpen(false);
      }
      setIsDeclining(false);
    }
  };

  const isAccepted = app.status === "ACCEPTED";
  const isRejected = app.status === "REJECTED";

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        title="View Info" 
        className="h-8 w-8"
        onClick={() => setOpen(true)}
      >
        <Info className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicant Details: {app.firstName} {app.lastName}</DialogTitle>
          </DialogHeader>

          {app.job && (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4 mb-2 mt-2">
              <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Applied For: {app.job.title}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Job ID:</span> {app.job.jobId}</div>
                <div><span className="text-muted-foreground">Type:</span> {app.job.jobType}</div>
                <div><span className="text-muted-foreground">Location:</span> {app.job.location}</div>
                <div><span className="text-muted-foreground">Date Posted:</span> {app.job.createdAt ? format(new Date(app.job.createdAt), "PPP") : "N/A"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Last Date to Apply:</span> {app.job.lastDate ? format(new Date(app.job.lastDate), "PPP") : "N/A"}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mt-4 text-sm">
            <div><span className="font-semibold text-muted-foreground block mb-1">Email:</span> {app.email}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Phone:</span> {app.countryCode ? app.countryCode + " " : ""}{app.phone}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Citizenship:</span> {app.citizenship || "N/A"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Gender:</span> {app.gender || "N/A"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Experience:</span> {app.experience}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Sponsorship Required:</span> {app.sponsor || "N/A"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Legal Status:</span> {app.legalStatus || "N/A"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Expected Payout:</span> {app.expectedPayout}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Current Payout:</span> {app.currentPayout || "N/A"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Agreed to Terms:</span> {app.agreedToTerms ? "Yes" : "No"}</div>
            <div><span className="font-semibold text-muted-foreground block mb-1">Applied At:</span> {app.appliedAt ? format(new Date(app.appliedAt), "PPP") : "N/A"}</div>
            
            <div className="md:col-span-2 flex items-center justify-between mt-4 p-4 border rounded-md bg-muted/50">
              <span className="font-semibold">Resume Document</span>
              {app.resumeUrl ? (
                <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm">View Resume</Button>
                </a>
              ) : (
                <span className="text-muted-foreground italic text-xs">Not Provided</span>
              )}
            </div>
            
            {!(isAccepted || isRejected) && (
              <div className="md:col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  onClick={() => setConfirmState({ open: true, type: 'accept' })}
                  disabled={isAccepting || isDeclining}
                >
                  Accept Applicant
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  onClick={() => setConfirmState({ open: true, type: 'decline' })}
                  disabled={isAccepting || isDeclining}
                >
                  Decline Applicant
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={confirmState.open} onOpenChange={(val) => !val && setConfirmState({ open: false, type: null })}>
        <DialogContent className="sm:max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmState.type === 'accept' 
                ? "Are you sure you want to ACCEPT this applicant? This will send them an automated email invite." 
                : "Are you sure you want to REJECT this applicant? This will send them an automated rejection email."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmState({ open: false, type: null })} disabled={isAccepting || isDeclining}>Cancel</Button>
            <Button 
              variant={confirmState.type === 'accept' ? 'default' : 'destructive'} 
              onClick={confirmAction} 
              disabled={isAccepting || isDeclining}
            >
              {confirmState.type === 'accept' 
                ? (isAccepting ? "Accepting..." : "OK") 
                : (isDeclining ? "Rejecting..." : "OK")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
