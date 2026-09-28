import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json(); // e.g. "CLOSED_VIA_X", "CLOSED_VIA_REFRESH"

    // Log the vault lock event with correct type
    try {
      await (prisma as any).systemEvent.create({
        data: {
          type: "VAULT_CLOSE",
          title: "Database Vault Locked",
          message: `Admin closed the global raw database vault (${action}).`,
          payload: { action: "VAULT_LOCKED", reason: action }
        }
      });
    } catch (e) {
      console.error("Failed to log vault lock", e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/admin/vault/lock failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
