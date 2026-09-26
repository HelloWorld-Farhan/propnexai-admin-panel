import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
import { SystemEventType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();


    const domains = await prisma.whiteLabelDomain.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(domains);
  } catch (error: any) {
    console.error("GET white-label error:", error);
    return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();


    const body = await req.json();
    const {
      domain,
      companyName,
      tabTitle,
      supportEmail,
      supportPhone,
      logoUrl,
      faviconUrl,
      instagramUrl,
      linkedinUrl,
      pagesConfig,
    } = body;

    if (!domain || !companyName || !supportEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (domain.toLowerCase() === "propnexai.com" || domain.toLowerCase() === "www.propnexai.com") {
      return NextResponse.json({ error: "Cannot use the primary platform domain (propnexai.com)" }, { status: 400 });
    }

    // Check if domain exists
    const existing = await prisma.whiteLabelDomain.findUnique({
      where: { domain },
    });
    if (existing) {
      return NextResponse.json({ error: "Domain already exists" }, { status: 400 });
    }

    const newDomain = await prisma.whiteLabelDomain.create({
      data: {
        domain,
        companyName,
        tabTitle: tabTitle || null,
        supportEmail,
        supportPhone: supportPhone || null,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        instagramUrl: instagramUrl || null,
        linkedinUrl: linkedinUrl || null,
        status: "PENDING",
        pagesConfig: pagesConfig || {},
      },
    });

    // Log the event
    await prisma.systemEvent.create({
      data: {
        type: SystemEventType.DOMAIN_ADDED,
        companyId: null,
        title: "Domain Added",
      },
    });

    return NextResponse.json(newDomain);
  } catch (error: any) {
    console.error("POST white-label error:", error);
    return NextResponse.json({ error: "Failed to add domain" }, { status: 500 });
  }
}
