const LOCAL_DEFAULT =
  "mongodb://localhost:27017/propnex-admin?replicaSet=rs0";

function resolveDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return process.env.DATABASE_URL ?? process.env.DATABASE_URL_ATLAS ?? "";
  }

  return (
    process.env.DATABASE_URL_LOCAL ??
    process.env.DATABASE_URL ??
    LOCAL_DEFAULT
  );
}

/**
 * Resolves MongoDB URL: local when NODE_ENV !== production, Atlas otherwise.
 * In development, falls back to DATABASE_URL when DATABASE_URL_LOCAL is unset
 * (e.g. Atlas-only .env.local). Local Docker MongoDB must run as a replica set
 * for Prisma transactions (see docker-compose.yml).
 *
 * Ensures MongoDB driver timeouts are set so connection failures fail fast
 * instead of blocking requests for the default ~30s.
 */
export function getDatabaseUrl(): string {
  const url = resolveDatabaseUrl();
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("serverSelectionTimeoutMS")) {
      parsed.searchParams.set("serverSelectionTimeoutMS", "10000");
    }
    if (!parsed.searchParams.has("connectTimeoutMS")) {
      parsed.searchParams.set("connectTimeoutMS", "10000");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
