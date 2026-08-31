import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "APPS_SCRIPT_WEBHOOK_URL is not configured in .env" },
        { status: 500 }
      );
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upload_agent_audio",
        fileData: body.fileData,
        fileName: body.fileName,
        mimeType: body.mimeType,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Apps Script responded with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    if (data.status === "error") {
      throw new Error(data.message || "Unknown error from Apps Script");
    }

    // Apps Script 'ok(m)' puts the payload inside the 'message' property
    const finalUrl = data.message?.url || data.url; 

    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload audio file" },
      { status: 500 }
    );
  }
}
