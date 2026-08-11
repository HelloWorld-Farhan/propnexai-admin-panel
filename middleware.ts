import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";

import {
  sessionOptions,
  type AdminSession,
} from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/pending-approvals");

  const response = NextResponse.next();
  const session = await getIronSession<AdminSession>(
    request,
    response,
    sessionOptions,
  );

  if (!session.isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/companies", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
