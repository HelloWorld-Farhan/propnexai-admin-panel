function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function companySlugFromName(name: string): string {
  const base = slugify(name) || "company";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
