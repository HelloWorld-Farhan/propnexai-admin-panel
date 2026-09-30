import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "propnex_secret_jwt_key_2026_key";
const MONGO_URI = process.env.DATABASE_URL || "mongodb://propnex_admin:Propnexai%40123@YOUR_SERVER_IP:27017/propnex?authSource=admin&replicaSet=rs0";

// Use raw MongoDB driver to guarantee collection name "OtpLog" is used correctly
let cachedClient: MongoClient | null = null;
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }
  return cachedClient.db("propnex");
}

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
      return NextResponse.json({ message: "Session expired or invalid." }, { status: 401 });
    }

    if (decoded.expectedAnswer !== answer.trim()) {
      return NextResponse.json({ message: "Incorrect answer" }, { status: 401 });
    }

    const db = await getDb();

    // Fetch OtpLog — using raw MongoDB so collection name "OtpLog" is exact
    let otpLogs: any[] = [];
    try {
      otpLogs = await db
        .collection("OtpLog")
        .find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      // Normalize _id to id string
      otpLogs = otpLogs.map((doc) => ({
        id: doc._id?.toString(),
        type: doc.type,
        email: doc.email,
        otp: doc.otp,
        userName: doc.userName || "—",
        domain: doc.domain || "propnexai.com",
        companyName: doc.companyName || "PropNex AI",
        status: doc.status || "SENT",
        location: doc.location || null,
        device: doc.device || null,
        createdAt: doc.createdAt,
        expiresAt: doc.expiresAt || null,
      }));
    } catch (e) {
      console.warn("OtpLog fetch failed:", e);
      otpLogs = [];
    }

    // Also fetch admin 2FA OTP events from SystemEvent collection
    let adminOtpEvents: any[] = [];
    try {
      const events = await db
        .collection("SystemEvent")
        .find({ title: "Admin 2FA OTP Sent" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      adminOtpEvents = events.map((e: any) => ({
        id: e._id?.toString(),
        type: "admin_2fa_otp",
        email: e.payload?.email || "support@propnexai.com",
        otp: e.payload?.otp || "N/A",
        userName: "Admin",
        domain: e.payload?.domain || "admin.propnexai.com",
        companyName: e.payload?.companyName || "PropNex AI Admin",
        status: "SENT",
        location: e.payload?.location || null,
        device: e.payload?.device || null,
        createdAt: e.createdAt,
        expiresAt: null,
      }));
    } catch (e) {
      console.warn("Failed to fetch admin OTP events:", e);
    }

    const combined = [...otpLogs, ...adminOtpEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ otpLogs: combined });
  } catch (err: any) {
    console.error("POST /api/admin/vault/otp-logs failed:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
