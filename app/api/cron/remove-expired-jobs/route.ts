import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This webhook URL handles email triggers for apps scripts.
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";

// You can test this locally by hitting /api/cron/remove-expired-jobs
// Note: To secure this in production with Vercel Cron, you should check the authorization header
// (e.g., check for request.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`)
export async function GET(request: Request) {
  try {
    // 1. Find all expired jobs
    const now = new Date();
    
    // Find jobs where lastDate is strictly less than today
    const expiredJobs = await prisma.jobPosting.findMany({
      where: {
        lastDate: {
          lt: now
        }
      }
    });

    if (expiredJobs.length === 0) {
      return NextResponse.json({ success: true, removed: 0, message: "No expired jobs found." });
    }

    // 2. Format a message for the admin email
    const jobListStr = expiredJobs
      .map(j => `- Job ID: ${j.jobId} | Title: ${j.title} | Expired On: ${j.lastDate.toDateString()}`)
      .join("\n");
      
    const jobIds = expiredJobs.map(j => j.id);

    // 3. Delete the jobs from DB. 
    // Delete applications first to prevent orphaned records if no cascade exists
    await prisma.jobApplication.deleteMany({
      where: {
        jobId: {
          in: jobIds
        }
      }
    });

    // Then delete the job postings
    await prisma.jobPosting.deleteMany({
      where: {
        id: {
          in: jobIds
        }
      }
    });

    // 4. Trigger email to Admin
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "expired_jobs_removed",
        count: expiredJobs.length,
        jobList: jobListStr
      })
    });

    return NextResponse.json({ 
      success: true, 
      removed: expiredJobs.length,
      jobs: expiredJobs.map(j => j.jobId)
    });
    
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
