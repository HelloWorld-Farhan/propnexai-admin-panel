import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (password !== "Propnexai@123") {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webhookUrl) {
      console.error("GOOGLE_APPS_SCRIPT_URL is not configured");
      return NextResponse.json({ error: "Email service not configured on server" }, { status: 500 });
    }

    const setupUrl = `https://www.propnexai.com/white-label/setup?email=${encodeURIComponent(email)}&name=${encodeURIComponent(username)}`;
    const pdfUrl = "https://drive.google.com/file/d/1d7T85dRtt-ll0qKtNPoKF8EXWRt5Yzsf/view?usp=sharing";

    // Trigger the Google Apps Script webhook to send the email
    const gasResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "white_label_setup",
        email: email,
        name: username,
        p: {
          setupUrl,
          pdfUrl,
        }
      })
    });

    const gasText = await gasResponse.text();
    console.log("GAS webhook response:", gasResponse.status, gasText);

    if (!gasResponse.ok) {
      console.error("GAS webhook failed:", gasText);
      return NextResponse.json({ error: "Email service returned an error. Please try again." }, { status: 500 });
    }

    // Create a placeholder record so admin can track this invite
    try {
      const dummyDomain = `pending-${Date.now()}-${Math.random().toString(36).substring(7)}.com`;
      await prisma.whiteLabelDomain.create({
        data: {
          domain: dummyDomain,
          companyName: "Pending Setup",
          tabTitle: "Pending Setup",
          supportEmail: email,
          status: "PENDING",
          pagesConfig: JSON.stringify({
            submittedViaForm: true,
            userName: username,
            userEmail: email,
            isInvitePlaceholder: true
          })
        }
      });

      await prisma.systemEvent.create({
        data: {
          type: "FORM_INFO",
          title: "White Label Guide Sent",
          message: `Admin sent white label setup guide to ${username} (${email}).`,
        }
      });
    } catch (e) {
      console.error("Failed to create placeholder record:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

