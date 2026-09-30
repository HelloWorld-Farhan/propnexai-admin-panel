import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "propnex_secret_jwt_key_2026_key";
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbz2zj_l7vcmiPZKuYqEVdso0apyW3aDJZZWTVTJ1jRrQr8PLGZIH_TzRpTLFskphIwgDQ/exec";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== "Propnexai@123") {
      return NextResponse.json({ message: "Invalid master password" }, { status: 401 });
    }

    // Generate a difficult OTP (Math problem)
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 9) + 2;
    const expectedAnswer = (a * b).toString();
    const problemText = `What is ${a} multiplied by ${b}?`;

    const vaultToken = jwt.sign({ expectedAnswer }, JWT_SECRET, { expiresIn: "5m" });

    // Send email to support@propnexai.com via App Script generic webhook
    // Wait, apps script only supports predefined types. I'll need to update apps script OR use a generic type if one exists.
    // Let's add a "vault_otp" type to apps script.
    
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "vault_otp",
          email: "support@propnexai.com",
          problem: problemText
        }),
      });
    } catch (e) {
      console.error("Failed to trigger vault OTP email", e);
    }

    return NextResponse.json({ requireOtp: true, vaultToken });
  } catch (err: any) {
    console.error("POST /api/admin/vault/init failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
