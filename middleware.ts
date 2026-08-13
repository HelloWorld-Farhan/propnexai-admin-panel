import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/pending-approvals");

  const response = NextResponse.next();
  
  // Bypass iron-session in Edge middleware to prevent Vercel __dirname crashes.
  // Instead of decoding the session cryptographically in the Edge runtime, 
  // we just check if the cookie exists. If it's invalid, the actual Node.js 
  // API routes will reject the request later.
  const hasSessionCookie = request.cookies.has("propnex_admin_session");
  const isLoggedIn = hasSessionCookie;

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/companies", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
