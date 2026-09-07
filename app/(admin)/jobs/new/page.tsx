"use client";

import { createJobPosting } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function NewJobPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Post New Job</h1>
      </div>

      <Card>
        <form action={async (formData) => {
          setLoading(true);
          await createJobPosting(formData);
        }}>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Fill out the details for the open role. A 5-digit Job ID will be automatically generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Senior Frontend Engineer" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea id="description" name="description" required className="min-h-[100px]" placeholder="Brief overview of the role..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Required Experience</Label>
                <Input id="experience" name="experience" required placeholder="e.g. 3-5 Years" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input id="education" name="education" required placeholder="e.g. Bachelor's in CS" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <select 
                  id="jobType" 
                  name="jobType" 
                  required 
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
              <Textarea id="responsibilities" name="responsibilities" required className="min-h-[100px]" placeholder="List key responsibilities..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge">Knowledge & Skills</Label>
              <Textarea id="knowledge" name="knowledge" required className="min-h-[100px]" placeholder="List required skills and knowledge..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastDate">Auto-Remove Date (Last Date to Apply)</Label>
              <Input id="lastDate" name="lastDate" type="date" required />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Link href="/jobs">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Posting..." : "Post Job"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
