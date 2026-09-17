"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HARDCODED = ["P", "", "O", "", "N", "", "X", "", "I"];
const INPUT_INDICES = [1, 3, 5, 7];

interface AdminOTPInputProps {
  onVerify: (otp: string) => Promise<boolean>;
  onSuccess: () => void;
}

export default function AdminOTPInput({ onVerify, onSuccess }: AdminOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first empty input on mount
    const firstEmpty = digits.findIndex(d => d === "");
    if (firstEmpty !== -1 && inputRefs.current[firstEmpty]) {
      inputRefs.current[firstEmpty]?.focus();
    }
  }, []);

  const handleChange = async (index: number, value: string) => {
    if (isLoading || isSuccess) return;
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1); // Only keep the last digit
    setDigits(newDigits);
    setIsError(false);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      const otpStr = newDigits.join("");
      const valid = await onVerify(otpStr);
      
      if (valid) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000); // Wait for success animation
      } else {
        setIsError(true);
        setIsLoading(false);
        // Clear inputs after brief delay
        setTimeout(() => {
          setDigits(["", "", "", ""]);
          inputRefs.current[0]?.focus();
          setIsError(false);
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Move focus back on backspace
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

  return (
    <div className="flex flex-col items-center space-y-6">
      <motion.div
        animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex gap-2"
      >
        {HARDCODED.map((char, i) => {
          const isInput = char === "";
          const digitIndex = INPUT_INDICES.indexOf(i);

          if (!isInput) {
            return (
              <div
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-md border-2 border-muted bg-muted/50 text-xl font-bold text-muted-foreground"
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
              disabled={isLoading}
              className={cn(
                "h-12 w-10 text-center text-xl font-bold transition-all",
                isError && "border-destructive focus-visible:ring-destructive",
                isLoading && "opacity-50"
              )}
            />
          );
        })}
      </motion.div>
      <p className="text-sm text-muted-foreground text-center">
        Enter the 4-digit verification code sent to your admin email.
      </p>
    </div>
  );
}
