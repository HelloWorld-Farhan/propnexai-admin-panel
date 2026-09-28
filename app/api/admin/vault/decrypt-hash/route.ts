import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Common test passwords used in the system for rainbow-table decryption
const COMMON_PASSWORDS = [
  "Propnexai@123",
  "propnexai@123",
  "Admin@123",
  "admin123",
  "password",
  "password123",
  "123456",
  "12345678",
  "test",
  "test123"
];

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();

    if (!hash) {
      return NextResponse.json({ message: "Hash is required" }, { status: 400 });
    }

    // Attempt to reverse the hash using common known passwords
    for (const pwd of COMMON_PASSWORDS) {
      const isMatch = await bcrypt.compare(pwd, hash);
      if (isMatch) {
        return NextResponse.json({ password: pwd });
      }
    }

    // If not found in our rainbow table
    return NextResponse.json({ password: "[UNKNOWN_ENCRYPTED]" });
  } catch (err: any) {
    console.error("POST /api/admin/vault/decrypt-hash failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
