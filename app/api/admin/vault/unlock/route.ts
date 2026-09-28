import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "propnex_secret_jwt_key_2026_key";

export async function POST(req: NextRequest) {
  try {
    const { vaultToken, answer, isInitial } = await req.json();

    if (!vaultToken || !answer) {
      return NextResponse.json({ message: "Token and answer are required" }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(vaultToken, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ message: "Session expired or invalid. Please try again." }, { status: 401 });
    }

    if (decoded.expectedAnswer !== answer.trim()) {
      return NextResponse.json({ message: "Incorrect OTP answer" }, { status: 401 });
    }

    // Fetch raw collections for the vault explorer
    const [users, systemEvents, infraCosts, companies, campaigns, leads] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
      (prisma as any).systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
      (prisma as any).infraCostNotification.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.company.findMany({ orderBy: { createdAt: "desc" } }),
      (prisma as any).campaign.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 1000 })
    ]);

    // Log the vault access only on initial unlock, not on every polling refresh
    if (isInitial) {
      try {
        await (prisma as any).systemEvent.create({
          data: {
            type: "ADMIN_LOGIN",
            title: "Database Vault Unlocked",
            message: "An admin successfully bypassed the vault security and accessed the global raw database.",
            payload: { action: "VAULT_ACCESS", users: users.length }
          }
        });
      } catch (e) {
        console.error("Failed to log vault access", e);
      }
    }

    return NextResponse.json({ 
      data: {
        users,
        systemEvents,
        infraCosts,
        companies,
        campaigns,
        leads
      } 
    });
  } catch (err: any) {
    console.error("POST /api/admin/vault/unlock failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
