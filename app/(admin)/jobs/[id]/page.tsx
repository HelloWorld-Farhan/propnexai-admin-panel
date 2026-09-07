import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobDetailsPage({ params }: { params: { id: string } }) {
  const job = await prisma.jobPosting.findUnique({
    where: { id: params.id },
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
            <p className="text-muted-foreground">Job ID: {job.jobId} • Posted {format(job.createdAt, "PPP")}</p>
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
              <span className="font-medium text-muted-foreground">Last Date:</span> {format(job.lastDate, "PPP")}
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
              <p className="mt-1 whitespace-pre-wrap">{job.responsibilities}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Knowledge & Skills:</span>
              <p className="mt-1 whitespace-pre-wrap">{job.knowledge}</p>
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
                      {format(app.appliedAt, "MMM d, yyyy")}
                    </td>
                    <td className="p-4 align-middle text-right">
                      {app.resumeUrl ? (
                        <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            View <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">No resume</span>
                      )}
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
