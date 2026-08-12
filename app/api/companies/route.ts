import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import * as nodemailer from "nodemailer";

import { requireAdminSession } from "@/lib/auth/session";
import { createCompanyForAdmin } from "@/src/server/repositories/company.repository";

const schema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  cli: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "CLI must be 2-5 uppercase letters"),
  pendingUserEmail: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // await requireAdminSession();
    const body = schema.parse(await request.json());
    const company = await createCompanyForAdmin(body);
    revalidatePath("/companies");

    // Send Webhook to Google Apps Script
    if (body.pendingUserEmail) {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "company_created",
              email: body.pendingUserEmail,
              companyName: company.name,
              contractId: company.contractId,
              name: body.pendingUserEmail.split("@")[0]
            }),
          });
        } catch (err) {
          console.error("Failed to send Google Apps Script webhook:", err);
        }
      }

      // Send Email to User
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: `"PropNex AI" <${process.env.SMTP_USER || "noreply@propnex.ai"}>`,
          to: body.pendingUserEmail,
          subject: "Your PropNex AI Account is Approved!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to PropNex AI!</h2>
              <p>Great news! Your account and workspace <strong>${company.name}</strong> have been approved and provisioned by our administrative team.</p>
              <p>You can now access your dashboard in real-time. If you had the waiting window open, it has automatically unlocked for you!</p>
              <br/>
              <p><strong>Company Details:</strong></p>
              <ul>
                <li><strong>Name:</strong> ${company.name}</li>
                <li><strong>CLI:</strong> ${company.cli}</li>
                <li><strong>Company Code:</strong> ${company.companyCode}</li>
              </ul>
              <br/>
              <p>Login to your portal to start configuring your voice agents.</p>
              <a href="http://localhost:3000/auth/sign-in" style="display: inline-block; padding: 10px 20px; color: white; background-color: #d946ef; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
              <br/><br/>
              <p>Best regards,<br/>The PropNex AI Team</p>
            </div>
          `,
        };

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          await transporter.sendMail(mailOptions);
          console.log(`Approval email sent to ${body.pendingUserEmail}`);
        } else {
          console.warn("SMTP credentials not found in environment variables. Email was NOT sent. Please configure SMTP_USER and SMTP_PASS.");
        }
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }
    }

    return NextResponse.json(
      {
        id: company.id,
        name: company.name,
        slug: company.slug,
        contractId: company.contractId,
        cli: company.cli,
        companyCode: company.companyCode,
        createdAt: company.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A company with that identifier already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/companies failed:", error);
    try {
      require('fs').appendFileSync('error.log', new Date().toISOString() + ' ' + (error instanceof Error ? error.message : String(error)) + '\n');
    } catch(e) {}
    return NextResponse.json(
      { error: `Failed to create company: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    );
  }
}
