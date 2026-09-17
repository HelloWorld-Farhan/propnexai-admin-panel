"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HARDCODED = ["P", "", "O", "", "N", "", "X", "", "I"];
const INPUT_INDICES = [1, 3, 5, 7];
// These fill in the gaps: P-[R]-O-[P]-N-[E]-X-[A]-I = PROPNEXAI
const FINAL_LETTERS = ["R", "P", "E", "A"];
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#@!%$";
const MAX_ATTEMPTS = 3;

interface AdminOTPInputProps {
  onVerify: (otp: string) => Promise<boolean>;
  onSuccess: () => void;
  onReset: () => void;
  onSuccessStart: () => void;
}

export default function AdminOTPInput({
  onVerify,
  onSuccess,
  onReset,
  onSuccessStart,
}: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Success animation stages
  const [isGreen, setIsGreen] = useState(false);
  const [scrambled, setScrambled] = useState<string[]>(["", "", "", ""]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWelcome2, setShowWelcome2] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Scramble effect triggered when isGreen becomes true
  useEffect(() => {
    if (!isGreen) return;

    let frame = 0;
    const totalFrames = 18;

    const interval = setInterval(() => {
      if (frame < totalFrames) {
        setScrambled(
          FINAL_LETTERS.map(
            () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          )
        );
        frame++;
      } else {
        clearInterval(interval);
        // Land on final letters R,P,E,A → full row = PROPNEXAI
        setScrambled(FINAL_LETTERS);
        // Stage 1: "Valid User" fades in
        setTimeout(() => setShowWelcome(true), 600);
        // Stage 2: "Welcome" slides up below
        setTimeout(() => setShowWelcome2(true), 1400);
        // Hold so user can enjoy the full sequence, then navigate
        setTimeout(() => onSuccess(), 4500);
      }
    }, 55);

    return () => clearInterval(interval);
  }, [isGreen, onSuccess]);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  const handleChange = async (index: number, value: string) => {
    if (isLoading || isGreen || isLocked) return;
    if (!/^\d*$/.test(value)) return;
    if (isError) setIsError(false);

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 3) inputRefs.current[index + 1]?.focus();

    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      const valid = await onVerify(newDigits.join(""));

      if (valid) {
        setIsGreen(true);
        onSuccessStart();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsError(true);
        setIsLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setTimeout(() => onReset(), 2500);
        } else {
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

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-2 py-6"
      >
        <p className="text-destructive font-semibold text-center">Too many failed attempts</p>
        <p className="text-muted-foreground text-sm text-center">Redirecting back to login...</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-5">
      {/* ── OTP row — always stays visible ── */}
      <motion.div
        animate={isError ? { x: [-14, 14, -11, 11, -7, 7, -3, 3, 0] } : {}}
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
                    ? {
                        scale: [1, 1.18, 1],
                        borderColor: "#22c55e",
                        color: "#22c55e",
                        backgroundColor: "rgba(34,197,94,0.12)",
                      }
                    : isError
                    ? {
                        borderColor: "hsl(var(--destructive))",
                        color: "hsl(var(--destructive))",
                        backgroundColor: "rgba(239,68,68,0.08)",
                      }
                    : {
                        borderColor: "hsl(var(--muted))",
                        color: "hsl(var(--muted-foreground))",
                        backgroundColor: "hsl(var(--muted)/0.5)",
                      }
                }
                transition={{ duration: 0.3, delay: isGreen ? i * 0.05 : 0 }}
                className="flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold"
              >
                {char}
              </motion.div>
            );
          }

          // Input cell — shows scrambled letter when isGreen, normal input otherwise
          return (
            <motion.div
              key={i}
              animate={isGreen ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 0.3, delay: isGreen ? i * 0.05 : 0 }}
              className={cn(
                "flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold transition-all duration-200",
                isGreen
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : isError
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : ""
              )}
            >
              {isGreen ? (
                <motion.span
                  key={scrambled[digitIndex]}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.05 }}
                  className="font-mono"
                >
                  {scrambled[digitIndex] || digits[digitIndex]}
                </motion.span>
              ) : (
                <Input
                  ref={(el) => {
                    inputRefs.current[digitIndex] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[digitIndex]}
                  onChange={(e) => handleChange(digitIndex, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(digitIndex, e)}
                  disabled={isLoading || isLocked}
                  className={cn(
                    "h-full w-full border-0 bg-transparent text-center text-xl font-bold focus-visible:ring-0 p-0",
                    isError && "text-destructive"
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Bottom message area ── */}
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center gap-1.5"
          >
            {/* Stage 1 — "Valid User" in normal UI muted text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground"
            >
              Valid User
            </motion.p>

            {/* Stage 2 — "Welcome" slides up in bold foreground */}
            <AnimatePresence>
              {showWelcome2 && (
                <motion.p
                  key="welcome2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xl font-bold tracking-tight text-foreground"
                >
                  Welcome
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : isError && !isGreen ? (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="w-full px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/25"
          >
            <p className="text-sm font-semibold text-destructive text-center">
              Invalid User —{" "}
              <span className="font-bold">
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left
              </span>
            </p>
          </motion.div>
        ) : !isGreen ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground text-center"
          >
            Enter the 4-digit verification code sent to your admin email.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
