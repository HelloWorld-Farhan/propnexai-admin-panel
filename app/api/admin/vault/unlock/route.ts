import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "propnex_secret_jwt_key_2026_key";

export async function POST(req: NextRequest) {
  try {
    const { vaultToken, answer } = await req.json();

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

    // Fetch all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        passwordHash: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    // Log the vault access
    try {
      await (prisma as any).systemEvent.create({
        data: {
          type: "ADMIN_LOGIN",
          title: "Database Vault Unlocked",
          message: "An admin successfully bypassed the vault security and accessed the global users database.",
          payload: { action: "VAULT_ACCESS", usersFetched: users.length }
        }
      });
    } catch (e) {
      console.error("Failed to log vault access", e);
    }

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("POST /api/admin/vault/unlock failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
