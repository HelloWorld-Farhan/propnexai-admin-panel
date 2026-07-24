import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fixed zone so SSR (UTC on Vercel) and the browser produce identical text. */
const DISPLAY_TIME_ZONE = "Asia/Kolkata";
const DISPLAY_LOCALE = "en-IN";

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(date));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE).format(value);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
