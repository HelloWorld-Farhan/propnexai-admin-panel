"use client";

import { updateJobPosting } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export default function EditJobPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    // Fetch the current job to populate the form
    fetch(`/api/jobs/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJob(data.job);
        }
      });
  }, [params.id]);

  if (!job) {
    return <div className="p-10 text-center text-muted-foreground">Loading job details...</div>;
  }

  const lastDateFormatted = job.lastDate ? new Date(job.lastDate).toISOString().split('T')[0] : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/jobs`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Job: {job.title}</h1>
      </div>

      <Card>
        <form action={async (formData) => {
          setLoading(true);
          await updateJobPosting(params.id, formData);
        }}>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Update the details for the open role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" name="title" required defaultValue={job.title} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea id="description" name="description" required className="min-h-[100px]" defaultValue={job.description} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Required Experience</Label>
                <Input id="experience" name="experience" required defaultValue={job.experience} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input id="education" name="education" required defaultValue={job.education} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <select 
                  id="jobType" 
                  name="jobType" 
                  required 
                  defaultValue={job.jobType || "Full-time"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select 
                  id="location" 
                  name="location" 
                  required 
                  defaultValue={job.location || "Remote"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea id="responsibilities" name="responsibilities" required className="min-h-[100px]" defaultValue={job.responsibilities} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge">Knowledge & Skills</Label>
              <Textarea id="knowledge" name="knowledge" required className="min-h-[100px]" defaultValue={job.knowledge} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastDate">Auto-Remove Date (Last Date to Apply)</Label>
              <Input id="lastDate" name="lastDate" type="date" required defaultValue={lastDateFormatted} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Link href={`/jobs`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
