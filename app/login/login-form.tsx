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
  const [successStarted, setSuccessStarted] = useState(false); // title morph trigger

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
    } catch (e) {
      console.error("Failed to fetch client IP", e);
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
    const from = searchParams.get("from") || "/companies";
    router.push(from);
    router.refresh();
  };

  const handleReset = () => {
    setStep(1);
    setUsername("");
    setPassword("");
    setSuccessStarted(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="pb-2">
          {/* Title morphs: "PropNex Admin" → "PropNex AI" on success */}
          <div className="relative h-8 overflow-hidden">
            <AnimatePresence mode="wait">
              {!successStarted ? (
                <motion.h2
                  key="admin-title"
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-xl font-semibold tracking-tight absolute inset-0"
                >
                  PropNex Admin
                </motion.h2>
              ) : (
                <motion.h2
                  key="ai-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-xl font-bold tracking-tight absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600"
                >
                  PropNex AI ✦
                </motion.h2>
              )}
            </AnimatePresence>
          </div>

          {/* Subtitle morphs too */}
          <AnimatePresence mode="wait">
            {!successStarted ? (
              <motion.p
                key="sub-normal"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground"
              >
                Sign in to manage companies and agents
              </motion.p>
            ) : (
              <motion.p
                key="sub-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-sm text-emerald-500 font-medium"
              >
                Identity verified — welcome back!
              </motion.p>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          ) : (
            <AdminOTPInput
              onVerify={handleVerify}
              onSuccess={handleSuccess}
              onReset={handleReset}
              onSuccessStart={() => setSuccessStarted(true)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
