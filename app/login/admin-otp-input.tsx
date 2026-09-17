"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HARDCODED = ["P", "", "O", "", "N", "", "X", "", "I"];
const INPUT_INDICES = [1, 3, 5, 7];
const MAX_ATTEMPTS = 3;

interface AdminOTPInputProps {
  onVerify: (otp: string) => Promise<boolean>;
  onSuccess: () => void;
  onReset: () => void; // Called when all attempts are exhausted
}

export default function AdminOTPInput({ onVerify, onSuccess, onReset }: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0); // how many wrong attempts so far
  const [isLocked, setIsLocked] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  const handleChange = async (index: number, value: string) => {
    if (isLoading || isSuccess || isLocked) return;
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
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsError(true);
        setIsLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          // Lock and reset after showing the locked state
          setIsLocked(true);
          setTimeout(() => {
            onReset();
          }, 2000);
        } else {
          // Clear inputs and let them try again
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

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 py-8"
      >
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
        >
          Propnex Ai
        </motion.h2>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-muted-foreground"
        >
          Welcome Admin!
        </motion.p>
      </motion.div>
    );
  }

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

  return (
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
              <div
                key={i}
                className={cn(
                  "flex h-12 w-10 items-center justify-center rounded-md border-2 text-xl font-bold transition-colors duration-300",
                  isError
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-muted bg-muted/50 text-muted-foreground"
                )}
              >
                {char}
              </div>
            );
          }

          return (
            <Input
              key={i}
              ref={(el) => { inputRefs.current[digitIndex] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[digitIndex]}
              onChange={(e) => handleChange(digitIndex, e.target.value)}
              onKeyDown={(e) => handleKeyDown(digitIndex, e)}
              disabled={isLoading || isLocked}
              className={cn(
                "h-12 w-10 text-center text-xl font-bold transition-all duration-300",
                isError
                  ? "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                  : "",
                isLoading && "opacity-50"
              )}
            />
          );
        })}
      </motion.div>

      {/* Attempt warning */}
      {isError && attemptsLeft > 0 && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-destructive text-center"
        >
          ⚠️ Wrong code! You have only{" "}
          <span className="font-bold">{attemptsLeft}</span>{" "}
          attempt{attemptsLeft !== 1 ? "s" : ""} remaining.
        </motion.p>
      )}

      {!isError && (
        <p className="text-sm text-muted-foreground text-center">
          Enter the 4-digit verification code sent to your admin email.
        </p>
      )}
    </div>
  );
}
