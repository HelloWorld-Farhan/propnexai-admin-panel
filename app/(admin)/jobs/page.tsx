import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobPostingsTable, ApplicationsTable } from "./client-components";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: { tab?: string } }) {
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

  const defaultTab = searchParams.tab === "applications" ? "applications" : "postings";

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

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications History</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="pt-4">
          <JobPostingsTable jobs={jobs} />
        </TabsContent>

        <TabsContent value="applications" className="pt-4">
          <ApplicationsTable applications={applications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
