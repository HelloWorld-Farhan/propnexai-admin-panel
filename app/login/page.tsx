import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server-session";

import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/companies");
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
