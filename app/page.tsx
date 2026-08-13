import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/server-session";

export default async function HomePage() {
  const session = await getSession();
  redirect(session.isLoggedIn ? "/companies" : "/login");
}
