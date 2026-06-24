import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { getCompanyById } from "@/src/server/repositories/company.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(JSON.stringify(company)));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
