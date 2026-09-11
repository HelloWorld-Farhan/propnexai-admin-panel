import { z } from "zod";

export const phoneNumberProviders = ["BONVOICE", "PROPNEX"] as const;
export const phoneNumberStatuses = ["ACTIVE", "INACTIVE", "DISABLED"] as const;

/** Accepts string | null | "" and normalizes empty to null. Required presence for create. */
const nullableId = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableLabel = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const createPhoneNumberSchema = z.object({
  number: z.string().trim().min(3, "Phone number is required").max(32),
  companyId: z.string().min(1, "Company is required"),
  campaignId: nullableId,
  label: nullableLabel,
  direction: z.enum(["INBOUND", "OUTBOUND", "BOTH"]).nullable().optional(),
  provider: z.enum(phoneNumberProviders).default("PROPNEX"),
  status: z.enum(phoneNumberStatuses).default("ACTIVE"),
  inboundAgentId: nullableId,
  outboundAgentId: nullableId,
  channels: z.number().int().min(1).optional().nullable(),
  agentUrl: z.string().url().or(z.literal("")).optional().nullable().transform(v => v === "" ? null : v),
});

export const updatePhoneNumberSchema = z.object({
  companyId: z.string().min(1).optional(),
  campaignId: nullableId,
  label: nullableLabel,
  direction: z.enum(["INBOUND", "OUTBOUND", "BOTH"]).nullable().optional(),
  provider: z.enum(phoneNumberProviders).optional(),
  status: z.enum(phoneNumberStatuses).optional(),
  inboundAgentId: nullableId,
  outboundAgentId: nullableId,
  channels: z.number().int().min(1).optional().nullable(),
  agentUrl: z.string().url().or(z.literal("")).optional().nullable().transform(v => v === "" ? null : v),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
