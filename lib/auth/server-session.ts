import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

// IMPORTANT: Cookie name was rotated on 2026-09-18 to force-logout all existing sessions.
// Changing this name again will invalidate ALL active sessions across all devices.
export const sessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET!,
  cookieName: "propnex_admin_session_v2", // <-- rotated to force global logout
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 48, // 48 hours cookie lifetime
  },
};

const SESSION_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

export type AdminSession = {
  isLoggedIn: boolean;
  username?: string;
  pendingOtp?: string;
  otpExpiresAt?: number;
  /** Unix timestamp (ms) of when the session was fully authenticated (OTP verified) */
  loginAt?: number;
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSession>(cookieStore, sessionOptions);
}

export async function requireAdminSession() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }

  // Enforce 48-hour session expiry from login time
  if (session.loginAt && Date.now() - session.loginAt > SESSION_MAX_AGE_MS) {
    // Session is too old — destroy it and reject
    session.isLoggedIn = false;
    session.loginAt = undefined;
    await session.save();
    throw new Error("Session expired. Please login again.");
  }

  return session;
}
