import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Info, Pencil, Trash } from "lucide-react";
import { deleteJobPosting } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const applications = await prisma.jobApplication.findMany({
    orderBy: { appliedAt: "desc" },
    include: {
      job: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs & Applications</h1>
          <p className="text-muted-foreground">Manage open roles and view application history separately.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="postings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications History</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="pt-4">
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
                          {job.lastDate ? format(job.lastDate, "MMM d, yyyy") : "N/A"}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                            {job._count.applications} received
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
                            <form action={deleteJobPosting.bind(null, job.id)}>
                              <Button type="submit" variant="ghost" size="icon" title="Delete" className="text-red-500 hover:text-red-600 hover:bg-red-100/10">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="pt-4">
          <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-muted/50">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applicant</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Job Role</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Experience</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Applied Date</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Resume</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-24 text-center text-muted-foreground">
                        No applications received yet.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app: any) => (
                      <tr key={app.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle font-medium">
                          {app.firstName} {app.lastName}
                        </td>
                        <td className="p-4 align-middle font-medium text-primary">
                          {app.job?.title || "Unknown Role"}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span>{app.email}</span>
                            <span className="text-xs text-muted-foreground">{app.phone}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{app.experience}</td>
                        <td className="p-4 align-middle text-muted-foreground">
                          {format(app.appliedAt, "MMM d, yyyy")}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {app.resumeUrl ? (
                            <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                View Resume
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
