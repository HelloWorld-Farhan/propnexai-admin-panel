import { getMainServerApiUrl } from "@/lib/main-server-url";

const OBD_FETCH_TIMEOUT_MS = 8_000;

export type ObdServiceNumbersResponse = {
  numbers: string[];
  defaultNumber: string | null;
};

export async function fetchObdServiceNumbers(): Promise<ObdServiceNumbersResponse> {
  const response = await fetch(getMainServerApiUrl("/api/obd/service-numbers"), {
    cache: "no-store",
    signal: AbortSignal.timeout(OBD_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OBD service numbers from main server (${response.status})`,
    );
  }

  return (await response.json()) as ObdServiceNumbersResponse;
}

export async function getObdServiceNumbers(): Promise<string[]> {
  const { numbers } = await fetchObdServiceNumbers();
  return numbers;
}

/** Returns an empty list instead of throwing when the main server is unreachable. */
export async function getObdServiceNumbersSafe(): Promise<string[]> {
  try {
    return await getObdServiceNumbers();
  } catch (error) {
    console.error("Failed to load OBD service numbers:", error);
    return [];
  }
}

export async function isValidObdServiceNumber(
  value: string | null | undefined,
): Promise<boolean> {
  if (!value?.trim()) {
    return false;
  }

  const numbers = await getObdServiceNumbers();
  return numbers.includes(value.trim());
}
