import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
import { SystemEventType } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const domain = await prisma.whiteLabelDomain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(domain);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch domain" }, { status: 500 });
  }
}

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

    const isStatusActiveNow = status === "ACTIVE" && existing.status !== "ACTIVE";
    const isFormSubmission = existing.pagesConfig && typeof existing.pagesConfig === 'string' && existing.pagesConfig.includes('"submittedViaForm":true');

    await prisma.systemEvent.create({
      data: {
        type: isStatusActiveNow ? SystemEventType.DOMAIN_EDITED : SystemEventType.DOMAIN_EDITED,
        companyId: null,
        title: isStatusActiveNow ? "White Label Setup Completed" : "White Label Details Edited",
        message: isStatusActiveNow 
          ? `Admin marked the white label setup as DONE and sent the completion email for ${domain || existing.domain}.` 
          : `Admin updated white-label details for ${domain || existing.domain}.`,
      },
    });

    if (status === "ACTIVE" && existing.status !== "ACTIVE") {
      const webhookUrl = process.env.GAS_WEBHOOK_URL || process.env.APPS_SCRIPT_WEBHOOK_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
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

    const isFormSubmission = existing.pagesConfig && typeof existing.pagesConfig === 'string' && existing.pagesConfig.includes('"submittedViaForm":true');

    await prisma.systemEvent.create({
      data: {
        type: SystemEventType.DOMAIN_DELETED,
        companyId: null,
        title: isFormSubmission ? "White Label Form Deleted" : "White Label Domain Deleted",
        message: `Admin deleted the ${isFormSubmission ? 'white-label user submission' : 'white-label domain'} for ${existing.domain}.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE white-label error:", error);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  }
}
