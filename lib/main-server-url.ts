const LOCAL_DEFAULT = "http://localhost:3004";

export function getMainServerBaseUrl(): string {
  const configured = process.env.MAIN_SERVER_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return LOCAL_DEFAULT;
}

export function getMainServerApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getMainServerBaseUrl()}${normalized}`;
}
