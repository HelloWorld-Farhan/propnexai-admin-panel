import { AdminShell } from "@/components/admin/admin-shell";
import { getSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
