function getMediaServerBaseUrl(): string {
  const configuredUrl = process.env.MEDIA_SERVER_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const port = process.env.MEDIA_SERVER_PORT?.trim() || "3002";
  return `http://localhost:${port}`;
}

type DialerStatusResponse = {
  success?: boolean;
  enabled: boolean;
  companyId?: string | null;
};

type DialerActionResponse = {
  success?: boolean;
  enabled?: boolean;
  companyId?: string | null;
  assignedCount?: number;
  skipped?: boolean;
  stoppedReason?: string | null;
  error?: string;
};

async function mediaServerRequest<T>(
  path: string,
  options: RequestInit & { companyId: string },
): Promise<T> {
  const url = `${getMediaServerBaseUrl()}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Company-Id", options.companyId);

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string } | null)?.error ||
      (data as { error?: string; message?: string } | null)?.message ||
      `Media server request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function getDialerStatus(companyId: string): Promise<DialerStatusResponse> {
  return mediaServerRequest<DialerStatusResponse>(
    `/dialer/status?companyId=${encodeURIComponent(companyId)}`,
    { method: "GET", companyId },
  );
}

export async function startCalling(companyId: string): Promise<DialerActionResponse> {
  return mediaServerRequest<DialerActionResponse>("/dialer/start", {
    method: "POST",
    companyId,
    body: JSON.stringify({ companyId }),
  });
}

export async function stopCalling(companyId: string): Promise<DialerActionResponse> {
  return mediaServerRequest<DialerActionResponse>("/dialer/stop", {
    method: "POST",
    companyId,
    body: JSON.stringify({ companyId }),
  });
}
