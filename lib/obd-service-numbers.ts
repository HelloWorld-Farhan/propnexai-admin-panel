export const DEFAULT_OBD_SERVICE_NUMBERS = [
  "7971502709",
  "7971501524",
  "7971502635",
] as const;

function parseServiceNumbers(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function getObdServiceNumbers(): string[] {
  const configured = parseServiceNumbers(process.env.OBD_SERVICE_NUMBERS);
  if (configured.length > 0) {
    return configured;
  }

  return [...DEFAULT_OBD_SERVICE_NUMBERS];
}

export function isValidObdServiceNumber(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }

  return getObdServiceNumbers().includes(value.trim());
}
