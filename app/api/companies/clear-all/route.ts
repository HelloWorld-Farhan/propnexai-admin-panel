import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { deleteAllCompanies } from "@/src/server/repositories/company.repository";

export async function DELETE() {
  try {
    await requireAdminSession();
    const success = await deleteAllCompanies();
    
    if (!success) {
      return NextResponse.json({ error: "Cannot clear companies" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing companies", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
