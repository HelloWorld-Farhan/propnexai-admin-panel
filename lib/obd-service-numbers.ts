import { getMainServerApiUrl } from "@/lib/main-server-url";

export type ObdServiceNumbersResponse = {
  numbers: string[];
  defaultNumber: string | null;
};

export async function fetchObdServiceNumbers(): Promise<ObdServiceNumbersResponse> {
  const response = await fetch(getMainServerApiUrl("/api/obd/service-numbers"), {
    cache: "no-store",
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

export async function isValidObdServiceNumber(
  value: string | null | undefined,
): Promise<boolean> {
  if (!value?.trim()) {
    return false;
  }

  const numbers = await getObdServiceNumbers();
  return numbers.includes(value.trim());
}
