import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Audio Proxy — bypasses CORS for Google Drive audio files.
 * Browser cannot load drive.google.com in <audio> tags directly.
 * This proxy fetches on the server (no CORS) and streams back to client.
 * Usage: /api/audio-proxy?url=<encoded_drive_url>
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let fetchUrl = rawUrl;

  // Convert Google Drive share/view URLs to direct download
  if (rawUrl.includes("drive.google.com")) {
    const match = rawUrl.match(/(?:\/d\/|id=|\/file\/d\/)([a-zA-Z0-9_-]{10,})/);
    if (match) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
    }
  }

  try {
    const rangeHeader = req.headers.get("range");
    const headers: HeadersInit = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "audio/*,video/*,*/*",
    };
    if (rangeHeader) headers["Range"] = rangeHeader;

    const upstream = await fetch(fetchUrl, { headers, redirect: "follow" });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges") ?? "bytes";

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": acceptRanges,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Audio proxy error:", err);
    return new NextResponse("Failed to fetch audio", { status: 502 });
  }
}