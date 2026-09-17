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
  onSuccessStart: () => void;
}

export default function AdminOTPInput({ onVerify, onSuccess, onReset, onSuccessStart }: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [isGreen, setIsGreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  const handleChange = async (index: number, value: string) => {
    if (isLoading || isGreen || isLocked) return;
    if (!/^\d*$/.test(value)) return;

    if (isError) setIsError(false);

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      const valid = await onVerify(newDigits.join(""));

      if (valid) {
        setIsGreen(true);
        onSuccessStart();
        // Navigate after the card success animation plays
        setTimeout(() => onSuccess(), 2200);
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
        className="flex flex-col items-center justify-center space-y-2 py-6"
      >
        <p className="text-destructive font-semibold text-center">🔒 Too many failed attempts</p>
        <p className="text-muted-foreground text-sm text-center">Redirecting back to login...</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-5">
      {/* OTP boxes */}
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
                    ? { scale: [1, 1.18, 1], borderColor: "#22c55e", color: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" }
                    : isError
                    ? { borderColor: "hsl(var(--destructive))", color: "hsl(var(--destructive))", backgroundColor: "rgba(239,68,68,0.08)" }
                    : { borderColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted)/0.5)" }
                }
                transition={{ duration: 0.35, delay: isGreen ? i * 0.055 : 0 }}
                className="flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold"
              >
                {char}
              </motion.div>
            );
          }

          return (
            <motion.div
              key={i}
              animate={isGreen ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 0.35, delay: isGreen ? i * 0.055 : 0 }}
            >
              <Input
                ref={(el) => { inputRefs.current[digitIndex] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[digitIndex]}
                onChange={(e) => handleChange(digitIndex, e.target.value)}
                onKeyDown={(e) => handleKeyDown(digitIndex, e)}
                disabled={isLoading || isLocked || isGreen}
                className={cn(
                  "h-12 w-10 text-center text-xl font-bold transition-all duration-300",
                  isGreen && "border-green-500 bg-green-500/10 text-green-400",
                  isError && !isGreen && "border-destructive bg-destructive/10 text-destructive",
                  isLoading && "opacity-50"
                )}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        {isError ? (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="w-full px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/25"
          >
            <p className="text-sm font-semibold text-destructive text-center">
              Invalid User —{" "}
              <span className="font-bold">{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left</span>
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
  );
}
