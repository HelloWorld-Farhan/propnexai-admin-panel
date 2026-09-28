import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "propnex_secret_jwt_key_2026_key";

// Shared Prisma client that points to the SAME MongoDB as voice-web
// (same connection string) so OtpLog is accessible
export async function POST(req: NextRequest) {
  try {
    const { vaultToken, answer } = await req.json();

    if (!vaultToken || !answer) {
      return NextResponse.json({ message: "Token and answer are required" }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(vaultToken, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ message: "Session expired or invalid." }, { status: 401 });
    }

    if (decoded.expectedAnswer !== answer.trim()) {
      return NextResponse.json({ message: "Incorrect answer" }, { status: 401 });
    }

    // Fetch all OTP logs from the database, most recent first
    let otpLogs: any[] = [];
    try {
      otpLogs = await (prisma as any).otpLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    } catch (e) {
      // Collection may not exist yet if no OTPs have been sent since deploy
      console.warn("OtpLog collection not yet populated:", e);
      otpLogs = [];
    }

    // Also fetch admin 2FA OTP events from systemEvents
    let adminOtpEvents: any[] = [];
    try {
      const events = await (prisma as any).systemEvent.findMany({
        where: { title: "Admin 2FA OTP Sent" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      adminOtpEvents = events.map((e: any) => ({
        id: e.id,
        type: "admin_2fa_otp",
        email: e.payload?.email || "support@propnexai.com",
        otp: e.payload?.otp || "N/A",
        userName: "Admin",
        domain: e.payload?.domain || "admin.propnexai.com",
        companyName: e.payload?.companyName || "PropNex AI Admin",
        status: "SENT",
        location: e.payload?.location,
        device: e.payload?.device,
        createdAt: e.createdAt,
        expiresAt: null,
      }));
    } catch (e) {
      console.warn("Failed to fetch admin OTP events:", e);
    }

    const combined = [...otpLogs, ...adminOtpEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ otpLogs: combined });
  } catch (err: any) {
    console.error("POST /api/admin/vault/otp-logs failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
