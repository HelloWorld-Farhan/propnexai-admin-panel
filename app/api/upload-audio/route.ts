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
    
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const payload = {
      type: "upload_agent_audio",
      fileName: file.name,
      mimeType: file.type || "audio/mpeg",
      fileData: base64Data
    };
    
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Apps Script non-JSON response:", text);
      return NextResponse.json({ error: "Invalid response from Apps Script" }, { status: 500 });
    }
    
    if (data.status !== "success") {
      return NextResponse.json({ error: data.message || "Failed to upload" }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Upload proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

