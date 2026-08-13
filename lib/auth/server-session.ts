import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
export const sessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET!,
  cookieName: "propnex_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

export type AdminSession = {
  isLoggedIn: boolean;
  username?: string;
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
  return session;
}
