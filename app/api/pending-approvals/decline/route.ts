import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pending = await prisma.pendingApproval.update({
      where: { email },
      data: { status: "REJECTED" },
    });

    // Trigger webhook for rejection
    try {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user_rejected",
          name: "User",
          email: email
        }),
      }).catch(err => console.error("Failed to trigger rejection webhook:", err));
    } catch (e) {}

    return NextResponse.json({ success: true, pending });
  } catch (error: any) {
    console.error("Error declining pending approval:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
