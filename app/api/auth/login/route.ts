import { NextResponse } from "next/server";

import { safeCompare } from "@/lib/auth/credentials";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return NextResponse.json(
      { error: "Admin credentials not configured" },
      { status: 500 },
    );
  }

  if (
    !body.username ||
    !body.password ||
    !safeCompare(body.username, expectedUser) ||
    !safeCompare(body.password, expectedPass)
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.username = body.username;
  await session.save();

  return NextResponse.json({ ok: true });
}
