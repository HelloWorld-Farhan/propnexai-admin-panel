import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage open roles and view applications.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
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
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-muted-foreground">
                    No jobs posted yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job: any) => (
                  <tr key={job.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
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
                      {format(job.createdAt, "MMM d, yyyy")}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {format(job.lastDate, "MMM d, yyyy")}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                        {job._count.applications} received
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
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
