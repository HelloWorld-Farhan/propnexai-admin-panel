"use client";

import { createJobPosting } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

export default function NewJobPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    experience: "",
    education: "",
    jobType: "Full-time",
    location: "Remote",
    responsibilities: "",
    knowledge: "",
    lastDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (value.trim() !== "") {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "This field is required" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = "This field is required";
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, value);
    });

    try {
      await createJobPosting(submitData);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

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
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Fill out the details for the open role. A 5-digit Job ID will be automatically generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={(e) => handleChange("title", e.target.value)} 
                placeholder="e.g. Senior Frontend Engineer" 
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <TextareaAutosize 
                id="description" 
                minRows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${errors.description ? "border-red-500" : ""}`} 
                placeholder="Brief overview of the role..." 
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Required Experience</Label>
                <Input 
                  id="experience" 
                  value={formData.experience} 
                  onChange={(e) => handleChange("experience", e.target.value)} 
                  placeholder="e.g. 3-5 Years" 
                  className={errors.experience ? "border-red-500" : ""}
                />
                {errors.experience && <p className="text-xs text-red-500">{errors.experience}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input 
                  id="education" 
                  value={formData.education} 
                  onChange={(e) => handleChange("education", e.target.value)} 
                  placeholder="e.g. Bachelor's in CS" 
                  className={errors.education ? "border-red-500" : ""}
                />
                {errors.education && <p className="text-xs text-red-500">{errors.education}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={formData.jobType} onValueChange={(value) => handleChange("jobType", value)}>
                  <SelectTrigger className={errors.jobType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
                {errors.jobType && <p className="text-xs text-red-500">{errors.jobType}</p>}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={formData.location} onValueChange={(value) => handleChange("location", value)}>
                  <SelectTrigger className={errors.location ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <TextareaAutosize 
                id="responsibilities" 
                minRows={3}
                value={formData.responsibilities}
                onChange={(e) => handleChange("responsibilities", e.target.value)}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${errors.responsibilities ? "border-red-500" : ""}`} 
                placeholder="List key responsibilities..." 
              />
              {errors.responsibilities && <p className="text-xs text-red-500">{errors.responsibilities}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge">Knowledge & Skills</Label>
              <TextareaAutosize 
                id="knowledge" 
                minRows={3}
                value={formData.knowledge}
                onChange={(e) => handleChange("knowledge", e.target.value)}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${errors.knowledge ? "border-red-500" : ""}`} 
                placeholder="List required skills and knowledge..." 
              />
              {errors.knowledge && <p className="text-xs text-red-500">{errors.knowledge}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastDate">Auto-Remove Date (Last Date to Apply)</Label>
              <Input 
                id="lastDate" 
                type="date" 
                value={formData.lastDate}
                onChange={(e) => handleChange("lastDate", e.target.value)}
                className={errors.lastDate ? "border-red-500" : ""}
              />
              {errors.lastDate && <p className="text-xs text-red-500">{errors.lastDate}</p>}
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
