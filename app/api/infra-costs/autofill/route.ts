import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const companyName = searchParams.get("companyName");

    if (email) {
      // 1. Search for user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Find if they are an owner of a parent company
        let mainCompany = await prisma.company.findFirst({
          where: { ownerUserId: user.id, tenantType: "PARENT" },
        });

        // If not a direct owner, check memberships
        if (!mainCompany) {
          const membership = await prisma.companyMember.findFirst({
            where: { userId: user.id },
            include: { company: true },
          });
          if (membership && membership.company) {
            if (membership.company.tenantType === "PARENT") {
              mainCompany = membership.company;
            } else if (membership.company.parentCompanyId) {
              mainCompany = await prisma.company.findUnique({
                where: { id: membership.company.parentCompanyId },
              });
            }
          }
        }

        if (mainCompany) {
          return NextResponse.json({
            companyId: mainCompany.id,
            companyName: mainCompany.name,
            email: user.email,
          });
        }
      }
    }

    if (companyName) {
      const company = await prisma.company.findFirst({
        where: { name: { contains: companyName, mode: "insensitive" } },
      });

      if (company) {
        let mainCompany = company;
        let subCompany = null;
        
        if (company.tenantType === "CHILD" && company.parentCompanyId) {
          subCompany = company;
          const parent = await prisma.company.findUnique({ where: { id: company.parentCompanyId } });
          if (parent) mainCompany = parent;
        }

        return NextResponse.json({
          companyId: mainCompany.id,
          companyName: mainCompany.name,
          subCompanyId: subCompany?.id || null,
          subCompanyName: subCompany?.name || null,
        });
      }
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/infra-costs/autofill Error:", error);
    return NextResponse.json({ error: "Failed to autofill" }, { status: 500 });
  }
}
