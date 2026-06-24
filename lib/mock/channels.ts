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

const mockChannels: MockChannel[] = [
  {
    id: "ch-001",
    label: "Channel 1",
    channelIndex: 1,
    assignedNumber: "+91 98765 43210",
    isActive: true,
    company: { id: "co-001", name: "Sunrise Realty", slug: "sunrise-realty" },
    createdAt: "2025-11-02T10:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
    lastActivityAt: "2026-06-24T09:15:00Z",
    totalCalls: 142,
    provider: "PROPNEX",
    history: [
      {
        id: "h-001-3",
        timestamp: "2026-06-24T09:15:00Z",
        action: "Call completed",
        detail: "Outbound call to +91 99887 76655 (4m 12s)",
      },
      {
        id: "h-001-2",
        timestamp: "2026-06-20T14:30:00Z",
        action: "Number assigned",
        detail: "Assigned +91 98765 43210",
      },
      {
        id: "h-001-1",
        timestamp: "2025-11-02T10:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Sunrise Realty",
      },
    ],
    callLogs: [
      {
        id: "cl-001-1",
        direction: "OUTBOUND",
        customerPhone: "+91 99887 76655",
        customerName: "Rahul Mehta",
        durationSeconds: 252,
        status: "COMPLETED",
        startedAt: "2026-06-24T09:10:48Z",
      },
      {
        id: "cl-001-2",
        direction: "INBOUND",
        customerPhone: "+91 91234 56789",
        customerName: "Priya Sharma",
        durationSeconds: 185,
        status: "COMPLETED",
        startedAt: "2026-06-23T16:42:00Z",
      },
      {
        id: "cl-001-3",
        direction: "OUTBOUND",
        customerPhone: "+91 88776 65544",
        customerName: "Amit Patel",
        durationSeconds: 0,
        status: "MISSED",
        startedAt: "2026-06-22T11:05:00Z",
      },
    ],
  },
  {
    id: "ch-002",
    label: "Channel 2",
    channelIndex: 2,
    assignedNumber: "+91 98765 43211",
    isActive: true,
    company: { id: "co-001", name: "Sunrise Realty", slug: "sunrise-realty" },
    createdAt: "2025-11-02T10:00:00Z",
    updatedAt: "2026-06-18T08:00:00Z",
    lastActivityAt: "2026-06-23T18:30:00Z",
    totalCalls: 89,
    provider: "PROPNEX",
    history: [
      {
        id: "h-002-2",
        timestamp: "2026-06-23T18:30:00Z",
        action: "Call completed",
        detail: "Inbound call from +91 77665 54433 (2m 45s)",
      },
      {
        id: "h-002-1",
        timestamp: "2025-11-02T10:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Sunrise Realty",
      },
    ],
    callLogs: [
      {
        id: "cl-002-1",
        direction: "INBOUND",
        customerPhone: "+91 77665 54433",
        customerName: "Neha Gupta",
        durationSeconds: 165,
        status: "COMPLETED",
        startedAt: "2026-06-23T18:27:15Z",
      },
    ],
  },
  {
    id: "ch-003",
    label: "Channel 1",
    channelIndex: 1,
    assignedNumber: "+91 88001 22334",
    isActive: false,
    company: { id: "co-002", name: "Metro Homes", slug: "metro-homes" },
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
    lastActivityAt: "2026-06-10T12:00:00Z",
    totalCalls: 34,
    provider: "EXOTEL",
    history: [
      {
        id: "h-003-3",
        timestamp: "2026-06-10T12:00:00Z",
        action: "Channel deactivated",
        detail: "Suspended due to billing hold",
      },
      {
        id: "h-003-2",
        timestamp: "2026-01-20T09:00:00Z",
        action: "Number assigned",
        detail: "Assigned +91 88001 22334",
      },
      {
        id: "h-003-1",
        timestamp: "2026-01-15T08:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Metro Homes",
      },
    ],
    callLogs: [
      {
        id: "cl-003-1",
        direction: "OUTBOUND",
        customerPhone: "+91 99001 11223",
        customerName: "Vikram Singh",
        durationSeconds: 320,
        status: "COMPLETED",
        startedAt: "2026-06-10T11:45:00Z",
      },
    ],
  },
  {
    id: "ch-004",
    label: "Channel 1",
    channelIndex: 1,
    assignedNumber: null,
    isActive: true,
    company: { id: "co-003", name: "Greenfield Estates", slug: "greenfield-estates" },
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
    lastActivityAt: null,
    totalCalls: 0,
    provider: "PROPNEX",
    history: [
      {
        id: "h-004-1",
        timestamp: "2026-03-01T10:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Greenfield Estates",
      },
    ],
    callLogs: [],
  },
  {
    id: "ch-005",
    label: "Channel 3",
    channelIndex: 3,
    assignedNumber: "+91 99880 11223",
    isActive: true,
    company: { id: "co-001", name: "Sunrise Realty", slug: "sunrise-realty" },
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-06-21T07:00:00Z",
    lastActivityAt: "2026-06-24T07:45:00Z",
    totalCalls: 56,
    provider: "TWILIO",
    history: [
      {
        id: "h-005-2",
        timestamp: "2026-06-24T07:45:00Z",
        action: "Call failed",
        detail: "Outbound call to +91 66554 43322 failed (no answer)",
      },
      {
        id: "h-005-1",
        timestamp: "2026-02-10T10:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Sunrise Realty",
      },
    ],
    callLogs: [
      {
        id: "cl-005-1",
        direction: "OUTBOUND",
        customerPhone: "+91 66554 43322",
        customerName: "Sanjay Kumar",
        durationSeconds: 0,
        status: "FAILED",
        startedAt: "2026-06-24T07:45:00Z",
      },
      {
        id: "cl-005-2",
        direction: "INBOUND",
        customerPhone: "+91 55443 32211",
        customerName: null,
        durationSeconds: 95,
        status: "COMPLETED",
        startedAt: "2026-06-21T14:20:00Z",
      },
    ],
  },
  {
    id: "ch-006",
    label: "Channel 2",
    channelIndex: 2,
    assignedNumber: "+91 77009 88776",
    isActive: true,
    company: { id: "co-004", name: "Urban Nest", slug: "urban-nest" },
    createdAt: "2026-04-05T10:00:00Z",
    updatedAt: "2026-06-19T16:00:00Z",
    lastActivityAt: "2026-06-24T10:00:00Z",
    totalCalls: 201,
    provider: "PROPNEX",
    history: [
      {
        id: "h-006-2",
        timestamp: "2026-06-24T10:00:00Z",
        action: "Call in progress",
        detail: "Outbound call to +91 44332 21100 started",
      },
      {
        id: "h-006-1",
        timestamp: "2026-04-05T10:00:00Z",
        action: "Channel created",
        detail: "Channel slot provisioned for Urban Nest",
      },
    ],
    callLogs: [
      {
        id: "cl-006-1",
        direction: "OUTBOUND",
        customerPhone: "+91 44332 21100",
        customerName: "Kavita Reddy",
        durationSeconds: 0,
        status: "IN_PROGRESS",
        startedAt: "2026-06-24T10:00:00Z",
      },
      {
        id: "cl-006-2",
        direction: "OUTBOUND",
        customerPhone: "+91 33221 10099",
        customerName: "Arjun Nair",
        durationSeconds: 410,
        status: "COMPLETED",
        startedAt: "2026-06-23T09:30:00Z",
      },
    ],
  },
];

export function listMockChannels(): MockChannel[] {
  return mockChannels;
}

export function getMockChannelById(id: string): MockChannel | undefined {
  return mockChannels.find((channel) => channel.id === id);
}

export function formatCallDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return `${minutes}m ${remaining}s`;
}
