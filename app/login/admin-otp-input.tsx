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
}

export default function AdminOTPInput({ onVerify, onSuccess, onReset }: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [successStage, setSuccessStage] = useState<"idle" | "green" | "done">("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  const handleChange = async (index: number, value: string) => {
    if (isLoading || successStage !== "idle" || isLocked) return;
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setIsError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      const otpStr = newDigits.join("");
      const valid = await onVerify(otpStr);

      if (valid) {
        // Stage 1: turn green
        setSuccessStage("green");
        // Stage 2: after green animation, signal done to parent
        setTimeout(() => {
          setSuccessStage("done");
          setTimeout(() => {
            onSuccess();
          }, 3200); // time for Netflix animation to play
        }, 900);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsError(true);
        setIsLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setTimeout(() => {
            onReset();
          }, 2000);
        } else {
          setTimeout(() => {
            setDigits(["", "", "", ""]);
            inputRefs.current[0]?.focus();
            setIsError(false);
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

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-3 py-6"
      >
        <p className="text-destructive font-semibold text-center text-base">
          ❌ Too many failed attempts.
        </p>
        <p className="text-muted-foreground text-sm text-center">
          Redirecting back to login...
        </p>
      </motion.div>
    );
  }

  const isGreen = successStage === "green" || successStage === "done";

  return (
    <>
      {/* Netflix-style full-screen overlay on success */}
      <AnimatePresence>
        {successStage === "done" && (
          <motion.div
            key="netflix-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            {/* PropNex AI Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.1, 1, 1] }}
              transition={{ duration: 1.2, times: [0, 0.4, 0.6, 1], delay: 0.2 }}
              className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600 mb-4"
            >
              PropNex AI
            </motion.div>

            {/* Netflix-style WELCOME text */}
            <motion.div
              initial={{ opacity: 0, scale: 1.8 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [1.8, 1, 1, 0.85] }}
              transition={{ duration: 2.4, times: [0, 0.2, 0.7, 1], delay: 0.8 }}
              className="text-white font-black text-center"
              style={{ fontSize: "clamp(3rem, 12vw, 9rem)", letterSpacing: "-0.04em", lineHeight: 1 }}
            >
              WELCOME
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
              transition={{ duration: 2.2, times: [0, 0.2, 0.7, 1], delay: 1.2 }}
              className="text-emerald-400 font-medium tracking-widest uppercase text-base mt-4"
            >
              Admin
            </motion.p>

            {/* Loading bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              transition={{ duration: 2.8, delay: 0.5, ease: "easeInOut" }}
              className="h-0.5 bg-emerald-500 mt-8 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP input row */}
      <div className="flex flex-col items-center space-y-5">
        <motion.div
          animate={isError ? { x: [-12, 12, -10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.5 }}
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
                      ? { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", scale: [1, 1.12, 1] }
                      : isError
                      ? { borderColor: "hsl(var(--destructive))", backgroundColor: "rgba(239,68,68,0.1)", color: "hsl(var(--destructive))" }
                      : {}
                  }
                  transition={{ duration: 0.4, delay: isGreen ? i * 0.05 : 0 }}
                  className="flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold transition-colors"
                  style={{ borderColor: "hsl(var(--muted))", backgroundColor: "hsl(var(--muted)/0.5)", color: "hsl(var(--muted-foreground))" }}
                >
                  {char}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={i}
                animate={
                  isGreen
                    ? { scale: [1, 1.12, 1] }
                    : {}
                }
                transition={{ duration: 0.4, delay: isGreen ? i * 0.05 : 0 }}
              >
                <Input
                  ref={(el) => { inputRefs.current[digitIndex] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[digitIndex]}
                  onChange={(e) => handleChange(digitIndex, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(digitIndex, e)}
                  disabled={isLoading || isLocked || successStage !== "idle"}
                  className={cn(
                    "h-12 w-10 text-center text-xl font-bold transition-all duration-300",
                    isGreen && "border-green-500 bg-green-500/15 text-green-400 focus-visible:ring-green-500",
                    isError && !isGreen && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive",
                    isLoading && "opacity-50"
                  )}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {isGreen ? (
            <motion.p
              key="success-msg"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-green-400 text-center"
            >
              ✅ Verified! Loading admin panel...
            </motion.p>
          ) : isError && attemptsLeft > 0 ? (
            <motion.p
              key="error-msg"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-destructive text-center"
            >
              ⚠️ Wrong code! You have only{" "}
              <span className="font-bold">{attemptsLeft}</span>{" "}
              attempt{attemptsLeft !== 1 ? "s" : ""} remaining.
            </motion.p>
          ) : (
            <motion.p
              key="hint-msg"
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
