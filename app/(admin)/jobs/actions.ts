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
  await prisma.jobPosting.delete({
    where: { id },
  });
  revalidatePath("/jobs");
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
