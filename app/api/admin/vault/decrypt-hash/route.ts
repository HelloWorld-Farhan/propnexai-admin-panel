import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

    // Fetch the user that has this hash to build a targeted rainbow table
    const userWithHash = await prisma.user.findFirst({
      where: { passwordHash: hash },
      select: { firstName: true, lastName: true, email: true }
    });

    let targetedPasswords = [...COMMON_PASSWORDS];

    if (userWithHash) {
      const { firstName, lastName, email } = userWithHash;
      const fName = firstName?.trim() || "";
      const lName = lastName?.trim() || "";
      const emailPrefix = email ? email.split("@")[0] : "";
      
      const parts = [fName, lName, emailPrefix, "Propnex", "Propnexai", "PropnexAI", fName.toLowerCase(), lName.toLowerCase(), emailPrefix.toLowerCase()];
      const suffixes = ["", "123", "@123", "!123", "1234", "12345", "123456", "2024", "2025", "2026"];
      
      for (const part of parts) {
        if (!part) continue;
        for (const suffix of suffixes) {
          targetedPasswords.push(`${part}${suffix}`);
          // Add capitalized versions
          targetedPasswords.push(`${part.charAt(0).toUpperCase() + part.slice(1)}${suffix}`);
        }
      }
    }

    // Attempt to reverse the hash using targeted and common known passwords
    for (const pwd of targetedPasswords) {
      const isMatch = await bcrypt.compare(pwd, hash);
      if (isMatch) {
        return NextResponse.json({ password: pwd });
      }
    }

    // If not found in our extended targeted rainbow table
    return NextResponse.json({ password: "[UNKNOWN_ENCRYPTED]" });
  } catch (err: any) {
    console.error("POST /api/admin/vault/decrypt-hash failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
