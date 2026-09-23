import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ url: process.env.APPS_SCRIPT_WEBHOOK_URL || "" });
}
