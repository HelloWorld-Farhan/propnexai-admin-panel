import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash } from "lucide-react";
import { notFound } from "next/navigation";
import { deleteJobPosting } from "../actions";
import { ApplicationDetailsModal } from "../client-components";

export const dynamic = "force-dynamic";

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const job = await prisma.jobPosting.findUnique({
    where: { id: resolvedParams.id },
    include: {
      applications: {
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground">Job ID: {job.jobId} • Posted {job.createdAt ? format(new Date(job.createdAt), "PPP") : "N/A"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${job.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <form action={async (formData: FormData) => {
              "use server";
              await deleteJobPosting(job.id);
            }}>
              <Button variant="destructive" type="submit">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Job Details</h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Job Type:</span> {job.jobType}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Location:</span> {job.location}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Experience:</span> {job.experience}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Education:</span> {job.education}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Last Date:</span> {job.lastDate ? format(new Date(job.lastDate), "PPP") : "N/A"}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Description:</span>
              <p className="mt-1 whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Requirements</h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Responsibilities:</span>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {(job.responsibilities || "").split('\n').filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^-\s*/, '')}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Knowledge & Skills:</span>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {(job.knowledge || "").split('\n').filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^-\s*/, '')}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight mt-10 mb-4">Applications ({job.applications.length})</h2>
      
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applicant</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Experience</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Expected Payout</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applied Date</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Resume</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {job.applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No applications received yet.
                  </td>
                </tr>
              ) : (
                job.applications.map((app: any) => (
                  <tr key={app.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle font-medium">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span>{app.email}</span>
                        <span className="text-xs text-muted-foreground">{app.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{app.experience}</td>
                    <td className="p-4 align-middle">{app.expectedPayout}</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.resumeUrl ? (
                          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              View Resume
                            </Button>
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">No resume</span>
                        )}
                        <ApplicationDetailsModal app={app} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
