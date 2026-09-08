"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createJobPosting(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const experience = formData.get("experience") as string;
  const responsibilities = formData.get("responsibilities") as string;
  const knowledge = formData.get("knowledge") as string;
  const education = formData.get("education") as string;
  const jobType = formData.get("jobType") as string;
  const location = formData.get("location") as string;
  const lastDateStr = formData.get("lastDate") as string;
  
  if (!title || !description || !lastDateStr) {
    throw new Error("Missing required fields");
  }

  // Generate 5 random digits for jobId
  const jobId = Math.floor(10000 + Math.random() * 90000).toString();

  await prisma.jobPosting.create({
    data: {
      jobId,
      title,
      description,
      experience: experience || "",
      responsibilities: responsibilities || "",
      knowledge: knowledge || "",
      education: education || "",
      jobType: jobType || "Full-time",
      location: location || "Remote",
      lastDate: new Date(lastDateStr),
    },
  });

  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function deleteJobPosting(id: string) {
  try {
    await prisma.jobPosting.delete({
      where: { id },
    });
    revalidatePath("/jobs");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

export async function deleteJobApplication(id: string) {
  try {
    await prisma.jobApplication.delete({
      where: { id },
    });
    revalidatePath("/jobs");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

export async function updateJobPosting(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const experience = formData.get("experience") as string;
  const responsibilities = formData.get("responsibilities") as string;
  const knowledge = formData.get("knowledge") as string;
  const education = formData.get("education") as string;
  const jobType = formData.get("jobType") as string;
  const location = formData.get("location") as string;
  const lastDateStr = formData.get("lastDate") as string;
  
  if (!title || !description || !lastDateStr) {
    throw new Error("Missing required fields");
  }

  await prisma.jobPosting.update({
    where: { id },
    data: {
      title,
      description,
      experience: experience || "",
      responsibilities: responsibilities || "",
      knowledge: knowledge || "",
      education: education || "",
      jobType: jobType || "Full-time",
      location: location || "Remote",
      lastDate: new Date(lastDateStr),
    },
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
}

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";

export async function acceptJobApplication(id: string) {
  try {
    const app = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true }
    });
    
    if (!app) return { success: false, error: "Application not found" };
    if (app.status === "REJECTED") return { success: false, error: "Cannot accept a rejected application" };
    if (app.status === "ACCEPTED") return { success: false, error: "Application already accepted" };

    // Update status in DB
    await prisma.jobApplication.update({
      where: { id },
      data: { status: "ACCEPTED" }
    });

    // Send email
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "job_accepted",
        applicantName: `${app.firstName} ${app.lastName}`,
        applicantEmail: app.email,
        jobTitle: app.job?.title || "the position"
      })
    });
    
    // We updated status in DB, and sent email
    
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${app.jobId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function declineJobApplication(id: string) {
  try {
    const app = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true }
    });
    
    if (!app) return { success: false, error: "Application not found" };
    if (app.status === "ACCEPTED") return { success: false, error: "Cannot decline an accepted application" };
    if (app.status === "REJECTED") return { success: false, error: "Application already rejected" };

    // Update status in DB
    await prisma.jobApplication.update({
      where: { id },
      data: { status: "REJECTED" }
    });

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "job_rejected",
        applicantName: `${app.firstName} ${app.lastName}`,
        applicantEmail: app.email,
        jobTitle: app.job?.title || "the position"
      })
    });
    
    // Usually, declined applications stay in history.
    
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${app.jobId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
