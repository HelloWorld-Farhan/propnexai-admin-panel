import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server-session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    otp?: string;
  };

  if (!body.otp) {
    return NextResponse.json({ error: "OTP is required" }, { status: 400 });
  }

  const session = await getSession();

  if (!session.pendingOtp || !session.otpExpiresAt || !session.username) {
    return NextResponse.json(
      { error: "No pending login session" },
      { status: 401 },
    );
  }

  if (Date.now() > session.otpExpiresAt) {
    return NextResponse.json(
      { error: "OTP expired. Please login again." },
      { status: 401 },
    );
  }

  if (body.otp !== session.pendingOtp) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  // OTP is valid. Mark session as fully logged in.
  session.isLoggedIn = true;
  session.pendingOtp = undefined;
  session.otpExpiresAt = undefined;
  session.loginAt = Date.now(); // Track login time for 48h server-side expiry
  await session.save();

  return NextResponse.json({ ok: true });
}
