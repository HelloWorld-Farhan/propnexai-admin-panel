export type ChannelHistoryEvent = {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
};

export type ChannelCallLog = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  customerPhone: string;
  customerName: string | null;
  durationSeconds: number;
  status: "COMPLETED" | "MISSED" | "FAILED" | "IN_PROGRESS";
  startedAt: string;
};

export type MockChannel = {
  id: string;
  label: string;
  channelIndex: number;
  assignedNumber: string | null;
  isActive: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  totalCalls: number;
  provider: string;
  history: ChannelHistoryEvent[];
  callLogs: ChannelCallLog[];
};

/** Channels list is empty until wired to live CompanyChannel data. */
const mockChannels: MockChannel[] = [];

export function listMockChannels(): MockChannel[] {
  return mockChannels;
}

export function getMockChannelById(id: string): MockChannel | undefined {
  return mockChannels.find((channel) => channel.id === id);
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
