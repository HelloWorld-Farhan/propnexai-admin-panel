export const OUTGOING_SERVICE_NUMBERS = [
  "7971502709",
  "7971501524",
  "7971502635",
] as const;

export const INCOMING_ONLY_NUMBERS = ["07971501546"] as const;

const outgoingSet = new Set<string>(OUTGOING_SERVICE_NUMBERS);

export function isOutgoingServiceNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  return outgoingSet.has(value.trim());
}

export function getOutgoingServiceNumbers(): string[] {
  return [...OUTGOING_SERVICE_NUMBERS];
}
