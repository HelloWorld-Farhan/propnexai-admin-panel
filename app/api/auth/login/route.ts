import { NextResponse } from "next/server";

import { safeCompare } from "@/lib/auth/credentials";
import { getSession } from "@/lib/auth/server-session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const expectedUser = process.env.ADMIN_USERNAME?.trim();
  const expectedPass = process.env.ADMIN_PASSWORD?.trim();
  console.log("LOGIN ATTEMPT:", { providedUser: body.username, expectedUser, providedPass: body.password, expectedPass });

  if (!expectedUser || !expectedPass) {
    return NextResponse.json(
      { error: "Admin credentials not configured" },
      { status: 500 },
    );
  }

  if (
    !body.username ||
    !body.password ||
    !safeCompare(body.username.trim(), expectedUser) ||
    !safeCompare(body.password.trim(), expectedPass)
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Generate 4 random digits
  const d1 = Math.floor(Math.random() * 10);
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const d4 = Math.floor(Math.random() * 10);
  
  // Format: P {d1} O {d2} N {d3} X {d4} I
  const otpStr = `P ${d1} O ${d2} N ${d3} X ${d4} I`;

  const session = await getSession();
  session.isLoggedIn = false;
  session.username = body.username;
  session.pendingOtp = `${d1}${d2}${d3}${d4}`;
  session.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await session.save();

  // Trigger Google Apps Script Webhook
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "admin_2fa_otp", otp: otpStr }),
      });
    } catch (err) {
      console.error("Failed to send 2FA OTP webhook:", err);
    }
  }

  return NextResponse.json({ ok: true, step: 2 });
}
