"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HARDCODED = ["P", "", "O", "", "N", "", "X", "", "I"];
const INPUT_INDICES = [1, 3, 5, 7];
const MAX_ATTEMPTS = 3;

interface AdminOTPInputProps {
  onVerify: (otp: string) => Promise<boolean>;
  onSuccess: () => void;
  onReset: () => void;
  onSuccessStart: () => void; // signals parent to start title morph
}

type Stage = "idle" | "green" | "netflix" | "explode";

export default function AdminOTPInput({ onVerify, onSuccess, onReset, onSuccessStart }: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  const handleChange = async (index: number, value: string) => {
    if (isLoading || stage !== "idle" || isLocked) return;
    if (!/^\d*$/.test(value)) return;

    // Clear error as soon as user starts typing again
    if (isError) setIsError(false);

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      const otpStr = newDigits.join("");
      const valid = await onVerify(otpStr);

      if (valid) {
        // Step 1: green
        setStage("green");
        onSuccessStart(); // tell parent to morph title

        // Step 2: Netflix overlay
        setTimeout(() => setStage("netflix"), 900);

        // Step 3: Explode & navigate
        setTimeout(() => setStage("explode"), 3200);
        setTimeout(() => onSuccess(), 4000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsError(true);
        setIsLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setTimeout(() => onReset(), 2500);
        } else {
          // Clear inputs but KEEP error message visible until user types
          setTimeout(() => {
            setDigits(["", "", "", ""]);
            inputRefs.current[0]?.focus();
          }, 700);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isGreen = stage === "green" || stage === "netflix" || stage === "explode";

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-3 py-6"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-3xl"
        >
          🔒
        </motion.div>
        <p className="text-destructive font-semibold text-center text-base">
          Too many failed attempts
        </p>
        <p className="text-muted-foreground text-sm text-center">
          Redirecting back to login...
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {/* ── Netflix full-screen overlay ── */}
      <AnimatePresence>
        {(stage === "netflix" || stage === "explode") && (
          <motion.div
            key="netflix"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
          >
            {/* PropNex AI brand */}
            <AnimatePresence>
              {stage === "netflix" && (
                <motion.div
                  key="brand"
                  initial={{ opacity: 0, y: 30, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center gap-3 mb-8"
                >
                  <div
                    className="font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500"
                    style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
                  >
                    PropNex AI
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Netflix-style WELCOME explosion */}
            <AnimatePresence>
              {stage === "netflix" && (
                <motion.div
                  key="welcome"
                  initial={{ scale: 0.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                  exit={{ scale: 4, opacity: 0, transition: { duration: 0.6, ease: "easeIn" } }}
                  className="font-black text-white text-center select-none"
                  style={{
                    fontSize: "clamp(4rem, 16vw, 12rem)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    textShadow: "0 0 80px rgba(34,197,94,0.3)",
                  }}
                >
                  WELCOME
                </motion.div>
              )}
            </AnimatePresence>

            {/* Explode stage */}
            {stage === "explode" && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 6, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeIn" }}
                className="font-black text-white text-center select-none"
                style={{
                  fontSize: "clamp(4rem, 16vw, 12rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                WELCOME
              </motion.div>
            )}

            {/* Subtitle & loading bar */}
            <AnimatePresence>
              {stage === "netflix" && (
                <motion.div
                  key="sub"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                  className="flex flex-col items-center gap-4 mt-6"
                >
                  <p className="text-emerald-400 tracking-[0.3em] uppercase text-sm font-medium">
                    Admin Panel
                  </p>
                  <div className="w-48 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.0, delay: 1.1, ease: "easeInOut" }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OTP row ── */}
      <div className="flex flex-col items-center space-y-5">
        <motion.div
          animate={isError ? { x: [-14, 14, -11, 11, -7, 7, -3, 3, 0] } : {}}
          transition={{ duration: 0.55 }}
          className="flex gap-2"
        >
          {HARDCODED.map((char, i) => {
            const isInput = char === "";
            const digitIndex = INPUT_INDICES.indexOf(i);

            if (!isInput) {
              return (
                <motion.div
                  key={i}
                  animate={
                    isGreen
                      ? { scale: [1, 1.15, 1], borderColor: "#22c55e", color: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" }
                      : isError
                      ? { borderColor: "hsl(var(--destructive))", color: "hsl(var(--destructive))", backgroundColor: "rgba(239,68,68,0.08)" }
                      : { borderColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted)/0.5)" }
                  }
                  transition={{ duration: 0.35, delay: isGreen ? i * 0.06 : 0 }}
                  className="flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold"
                >
                  {char}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={i}
                animate={isGreen ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.35, delay: isGreen ? i * 0.06 : 0 }}
              >
                <Input
                  ref={(el) => { inputRefs.current[digitIndex] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[digitIndex]}
                  onChange={(e) => handleChange(digitIndex, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(digitIndex, e)}
                  disabled={isLoading || isLocked || stage !== "idle"}
                  className={cn(
                    "h-12 w-10 text-center text-xl font-bold transition-all duration-300",
                    isGreen && "border-green-500 bg-green-500/10 text-green-400 focus-visible:ring-green-500",
                    isError && !isGreen && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive",
                    isLoading && "opacity-50"
                  )}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Status message ── */}
        <AnimatePresence mode="wait">
          {isGreen ? (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold text-green-400 text-center"
            >
              ✅ Verified! Opening admin panel...
            </motion.p>
          ) : isError ? (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="w-full px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <p className="text-sm font-semibold text-destructive text-center">
                ⚠️ Incorrect code —{" "}
                <span className="font-bold">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </span>
              </p>
              <p className="text-xs text-destructive/70 text-center mt-1">
                Start typing to try again
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground text-center"
            >
              Enter the 4-digit verification code sent to your admin email.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
