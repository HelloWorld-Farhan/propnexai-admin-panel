"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [successStarted, setSuccessStarted] = useState(false);
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
    setNavigating(true);
    setTimeout(() => {
      const from = searchParams.get("from") || "/companies";
      router.push(from);
      router.refresh();
    }, 600);
  };

  const handleReset = () => {
    setStep(1);
    setUsername("");
    setPassword("");
    setSuccessStarted(false);
    setNavigating(false);
  };

  return (
    // Outer wrapper — blurs and fades when navigating
    <motion.div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      animate={navigating ? { opacity: 0, filter: "blur(12px)", scale: 0.96 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <Card className="w-full max-w-md border-border overflow-hidden">
        {/* ── Card Header: morphs on success ── */}
        <CardHeader className="pb-3">
          <div className="relative h-9 overflow-hidden">
            <AnimatePresence mode="wait">
              {!successStarted ? (
                <motion.h2
                  key="title-admin"
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.35 }}
                  className="text-xl font-semibold tracking-tight absolute inset-0 flex items-center"
                >
                  PropNex Admin
                </motion.h2>
              ) : (
                <motion.h2
                  key="title-ai"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="text-xl font-bold tracking-tight absolute inset-0 flex items-center gap-2"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-500">
                    PropNex AI
                  </span>
                </motion.h2>
              )}
            </AnimatePresence>
          </div>

          <div className="relative h-5 overflow-hidden mt-1">
            <AnimatePresence mode="wait">
              {!successStarted ? (
                <motion.p
                  key="sub-normal"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-muted-foreground absolute inset-0"
                >
                  Sign in to manage companies and agents
                </motion.p>
              ) : (
                <motion.p
                  key="sub-success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="text-sm font-semibold text-emerald-500 absolute inset-0 flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Valid User — Welcome</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
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
                transition={{ duration: 0.35 }}
              >
                <AdminOTPInput
                  onVerify={handleVerify}
                  onSuccess={handleSuccess}
                  onReset={handleReset}
                  onSuccessStart={() => setSuccessStarted(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
