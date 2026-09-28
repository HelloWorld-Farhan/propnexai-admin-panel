import { NextResponse } from "next/server";

import { safeCompare } from "@/lib/auth/credentials";
import { getSession } from "@/lib/auth/server-session";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    clientIp?: string;
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

  // Get Location
  const ip = body.clientIp || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
  let location = "Unknown Location";

  if (ip && ip !== "Unknown") {
    try {
      const clientIp = ip.split(",")[0].trim();
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.status === "success") {
          location = `${geoData.city}, ${geoData.regionName}, ${geoData.country} (IP: ${clientIp})`;
        } else {
          location = `IP: ${clientIp}`;
        }
      }
    } catch (e) {
      console.error("Failed to fetch location", e);
    }
  }

  // Get Device Info
  const userAgentStr = request.headers.get("user-agent") || "";
  const parser = new UAParser(userAgentStr);
  const result = parser.getResult();
  
  const deviceModel = result.device.model || "Unknown Model";
  const deviceVendor = result.device.vendor || "Unknown Vendor";
  const deviceType = result.device.type || "Desktop/Laptop";
  const osName = result.os.name || "Unknown OS";
  const browserName = result.browser.name || "Unknown Browser";
  
  const deviceStr = `${deviceVendor} ${deviceModel} (${deviceType}) - ${osName} - ${browserName}`;

  // Trigger Google Apps Script Webhook
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "admin_2fa_otp", otp: otpStr, location, device: deviceStr }),
      });
    } catch (err) {
      console.error("Failed to send 2FA OTP webhook:", err);
    }
  }

  // Log OTP to database for vault inspection (fire and forget)
  try {
    await (prisma as any).systemEvent.create({
      data: {
        type: "ADMIN_LOGIN",
        title: "Admin 2FA OTP Sent",
        message: `An admin 2FA OTP was dispatched. Location: ${location}. Device: ${deviceStr}`,
        payload: { otpType: "admin_2fa_otp", otp: otpStr, location, device: deviceStr, email: "support@propnexai.com", domain: "admin.propnexai.com", companyName: "PropNex AI Admin" }
      }
    });
  } catch (e) {
    console.warn("Failed to log admin OTP event:", e);
  }

  return NextResponse.json({ ok: true, step: 2 });
}
