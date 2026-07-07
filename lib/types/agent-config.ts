export const COMMUNICATION_CHANNEL_TYPES = [
  "WHATSAPP",
  "WEB_CHAT",
  "INSTAGRAM",
  "FACEBOOK_MESSENGER",
  "TELEGRAM",
  "VOICE",
] as const;

export type CommunicationChannelType =
  (typeof COMMUNICATION_CHANNEL_TYPES)[number];

export const COMMUNICATION_CHANNEL_LABELS: Record<
  CommunicationChannelType,
  string
> = {
  WHATSAPP: "WhatsApp",
  WEB_CHAT: "Web Chat",
  INSTAGRAM: "Instagram",
  FACEBOOK_MESSENGER: "Facebook Messenger",
  TELEGRAM: "Telegram",
  VOICE: "Voice",
};

export const AGENT_TYPES = ["INBOUND", "OUTBOUND", "HYBRID"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export type ModelConfig = {
  provider?: string;
  name?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
};

export type CommunicationChannelInput = {
  type: CommunicationChannelType;
  enabled?: boolean;
  settings?: Record<string, unknown>;
};

export type CompanyAgentRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  enabled: boolean;
  systemPrompt: string | null;
  firstMessage: string | null;
  modelConfig: ModelConfig;
  libraryEntry: { name: string; slug: string } | null;
  communicationChannels: Array<{
    id: string;
    type: CommunicationChannelType;
    enabled: boolean;
    settings: Record<string, unknown>;
  }>;
};

export type ChannelConflict = {
  type: CommunicationChannelType;
  currentAgentId: string;
  currentAgentName: string;
};

export type CommunicationChannelSlot = {
  type: CommunicationChannelType;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
};

export class ChannelAssignmentConflictError extends Error {
  readonly conflicts: ChannelConflict[];

  constructor(conflicts: ChannelConflict[]) {
    super("Channel assignment conflict");
    this.name = "ChannelAssignmentConflictError";
    this.conflicts = conflicts;
  }
}

export class AgentLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Agent limit reached (${limit})`);
    this.name = "AgentLimitReachedError";
  }
}

export class AgentInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentInUseError";
  }
}
