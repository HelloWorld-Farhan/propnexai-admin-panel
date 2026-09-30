import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
import { SystemEventType } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();

    const resolvedParams = await params;
    const id = resolvedParams.id;
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
      status,
    } = body;

    const existing = await prisma.whiteLabelDomain.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (domain && (domain.toLowerCase() === "propnexai.com" || domain.toLowerCase() === "www.propnexai.com")) {
      return NextResponse.json({ error: "Cannot use the primary platform domain (propnexai.com)" }, { status: 400 });
    }

    const updatedDomain = await prisma.whiteLabelDomain.update({
      where: { id },
      data: {
        domain,
        companyName,
        tabTitle: tabTitle !== undefined ? tabTitle : existing.tabTitle,
        supportEmail,
        supportPhone: supportPhone || null,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        instagramUrl: instagramUrl || null,
        linkedinUrl: linkedinUrl || null,
        status: status || existing.status,
        pagesConfig: pagesConfig || existing.pagesConfig || {},
      },
    });

    await prisma.systemEvent.create({
      data: {
        type: SystemEventType.DOMAIN_EDITED,
        companyId: null,
        title: "Domain Edited",
        message: `Admin updated white-label details for ${domain || existing.domain}.`,
      },
    });

    if (status === "ACTIVE" && existing.status !== "ACTIVE") {
      const webhookUrl = process.env.GAS_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "white_label_completed",
              email: supportEmail || existing.supportEmail,
              name: companyName || existing.companyName,
              domain: domain || existing.domain,
              companyName: companyName || existing.companyName
            })
          });
        } catch (err) {
          console.error("Failed to trigger GAS webhook for completion:", err);
        }
      }
    }

    return NextResponse.json(updatedDomain);
  } catch (error: any) {
    console.error("PUT white-label error:", error);
    return NextResponse.json({ error: "Failed to update domain" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const existing = await prisma.whiteLabelDomain.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.whiteLabelDomain.delete({ where: { id } });

    await prisma.systemEvent.create({
      data: {
        type: SystemEventType.DOMAIN_DELETED,
        companyId: null,
        title: "Domain Deleted",
        message: `Admin deleted the white-label form/domain for ${existing.domain}.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE white-label error:", error);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  }
}
