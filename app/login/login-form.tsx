"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import AdminOTPInput from "./admin-otp-input";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [navigating, setNavigating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let clientIp = "";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      }
    } catch {
      // silent fail
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, clientIp }),
    });

    if (!res.ok) {
      setError("Invalid username or password");
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.step === 2) {
      setStep(2);
      setLoading(false);
    }
  }

  const handleVerify = async (otp: string) => {
    const res = await fetch("/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    });
    return res.ok;
  };

  const handleSuccess = () => {
    // Trigger the blur/fade-out immediately, then navigate once it completes
    setNavigating(true);
    setTimeout(() => {
      const from = searchParams.get("from") || "/companies";
      router.push(from);
      router.refresh();
    }, 650);
  };

  const handleReset = () => {
    setStep(1);
    setUsername("");
    setPassword("");
    setNavigating(false);
  };

  return (
    <motion.div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      animate={
        navigating
          ? { opacity: 0, filter: "blur(14px)", scale: 0.95 }
          : { opacity: 1, filter: "blur(0px)", scale: 1 }
      }
      transition={{ duration: 0.65, ease: "easeInOut" }}
    >
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Jinnicore Admin</CardTitle>
          <CardDescription>Sign in to manage companies and agents</CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:opacity-75 transition-opacity"
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AdminOTPInput
                  onVerify={handleVerify}
                  onSuccess={handleSuccess}
                  onReset={handleReset}
                  onSuccessStart={() => {}}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
