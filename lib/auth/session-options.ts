import { SessionOptions } from "iron-session";

export type AdminSession = {
  isLoggedIn: boolean;
  username?: string;
};

export const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET!,
  cookieName: "propnex_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};
