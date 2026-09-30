import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Common test passwords used in the system for rainbow-table decryption
const COMMON_PASSWORDS = [
  "Propnexai@123",
  "Propnexai@123",
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
      select: { firstName: true, lastName: true, email: true, phone: true }
    });

    let targetedPasswords = [...COMMON_PASSWORDS];

    if (userWithHash) {
      const { firstName, lastName, email, phone } = userWithHash;
      const fName = firstName?.trim() || "";
      const lName = lastName?.trim() || "";
      const emailPrefix = email ? email.split("@")[0] : "";
      const phoneStr = phone?.trim() || "";
      
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

      // Add number-only passwords and phone variations
      if (phoneStr) {
        targetedPasswords.push(phoneStr);
        targetedPasswords.push(phoneStr.replace(/\D/g, "")); // just digits
        targetedPasswords.push(phoneStr.replace(/\D/g, "").slice(-8)); // last 8 digits
        targetedPasswords.push(phoneStr.replace(/\D/g, "").slice(-10)); // last 10 digits
      }
    }

    // Add common number-only sequences up to 9 digits (as people often use exactly 8-digit numbers)
    const extraNumPasswords = [
      "12345678", "123456789", "1234567890", "0123456789", 
      "87654321", "987654321", "11111111", "22222222", "88888888", "00000000",
      "99999999", "123123123", "12341234", "qwertyuiop"
    ];
    targetedPasswords.push(...extraNumPasswords);

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
