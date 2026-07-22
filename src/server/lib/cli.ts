const CLI_PATTERN = /^[A-Z]{2,5}$/;

export function normalizeCli(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  return CLI_PATTERN.test(normalized) ? normalized : null;
}
