import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ url: process.env.APPS_SCRIPT_WEBHOOK_URL || "" });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL not configured" }, { status: 500 });
    }
    
    const targetUrl = new URL(webhookUrl);
    const file = formData.get("file") as File;
    if (file && file.name) {
      targetUrl.searchParams.append("type", "upload_agent_audio_multipart");
      targetUrl.searchParams.append("fileName", file.name);
    }
    
    const res = await fetch(targetUrl.toString(), {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error("Apps Script Error Response:", text);
      return NextResponse.json({ error: "Failed to upload to Google Drive" }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Upload proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
