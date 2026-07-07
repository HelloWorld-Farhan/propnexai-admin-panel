import { z } from "zod";

import {
  AGENT_STATUSES,
  AGENT_TYPES,
  COMMUNICATION_CHANNEL_TYPES,
} from "@/lib/types/agent-config";

export const agentNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required");

const communicationChannelTypeSchema = z.enum(COMMUNICATION_CHANNEL_TYPES);

export const communicationChannelSchema = z.object({
  type: communicationChannelTypeSchema,
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const modelConfigSchema = z
  .object({
    provider: z.string().trim().optional(),
    name: z.string().trim().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyField =
      value.provider !== undefined ||
      value.name !== undefined ||
      value.temperature !== undefined ||
      value.maxTokens !== undefined;

    if (!hasAnyField) return;

    if (!value.provider?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider is required when model configuration is provided",
        path: ["provider"],
      });
    }
    if (!value.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Model name is required when model configuration is provided",
        path: ["name"],
      });
    }
  });

const scratchAgentFieldsSchema = z.object({
  name: agentNameSchema,
  description: z.string().trim().optional(),
  type: z.enum(AGENT_TYPES),
  status: z.enum(AGENT_STATUSES).optional(),
  enabled: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  firstMessage: z.string().optional(),
  modelConfig: modelConfigSchema.optional(),
  channels: z.array(communicationChannelSchema).optional(),
  replaceChannelConflicts: z.boolean().optional(),
});

export const deployAgentSchema = z.object({
  libraryEntryId: z.string().min(1, "Library entry is required"),
});

export const createAgentSchema = z.union([
  deployAgentSchema,
  scratchAgentFieldsSchema,
]);

export const updateAgentSchema = scratchAgentFieldsSchema
  .partial()
  .extend({
    channels: z.array(communicationChannelSchema).optional(),
    replaceChannelConflicts: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const setEnabledSchema = z.object({
  enabled: z.boolean(),
});

export type DeployAgentInput = z.infer<typeof deployAgentSchema>;
export type CreateScratchAgentInput = z.infer<typeof scratchAgentFieldsSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type SetEnabledInput = z.infer<typeof setEnabledSchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function validateScratchAgentForm(
  values: Partial<CreateScratchAgentInput>,
): Record<string, string> {
  const result = scratchAgentFieldsSchema.safeParse(values);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const [root, nested] = issue.path;
    let key: string | undefined;

    if (root === "modelConfig" && typeof nested === "string") {
      key =
        nested === "provider"
          ? "modelProvider"
          : nested === "name"
            ? "modelName"
            : nested;
    } else if (typeof root === "string") {
      key = root;
    }

    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
