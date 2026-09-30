import { NextResponse } from "next";
import * as nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (password !== "Propnexai@123") {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    // Attempt to send email using nodemailer if SMTP is configured
    // Alternatively, if there's a Google Apps Script, we could use that instead.
    // For now, let's just use nodemailer if possible, or dummy success if not configured.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"PropNex AI Support" <${process.env.SMTP_USER || "support@propnexai.com"}>`,
      to: email,
      subject: "PropNex AI White Label Setup Guide",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .button-container { text-align: center; margin-top: 32px; margin-bottom: 20px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 5px; }
            .button-secondary { background-color: #27272a; color: #fafafa !important; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>PropNex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${username},</p>
              <p>We are excited to help you set up your white-label platform with PropNex AI.</p>
              <p>There are two simple steps to complete your setup:</p>
              <ol style="color: #a1a1aa; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Configure your DNS settings according to our guide.</li>
                <li>Submit your branding assets and details through our secure setup form.</li>
              </ol>
              <div class="button-container">
                <a href="https://drive.google.com/file/d/14bqt_FBH0IcHGjEOrVAwJQdHrA-rfPhb/view?usp=sharing" class="button button-secondary">View DNS Guide (PDF)</a>
                <a href="https://www.propnexai.com/white-label/setup" class="button">Complete Setup Form</a>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} PropNex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `,
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials not configured. Simulating email success.");
    }

    // Also trigger GAS webhook just in case they prefer relying on it
    const webhookUrl = process.env.GAS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "white_label_setup",
            email: email,
            name: username
          })
        });
      } catch (err) {
        console.error("Failed to trigger GAS webhook:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
