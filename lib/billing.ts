/**
 * Derived display metric: effective INR per minute based on pulse billing.
 * costPerMinute = (60 / pulseTimeSeconds) * costPerCredit
 */
export function deriveCostPerMinute(
  costPerCredit: number,
  pulseTimeSeconds: number,
): number {
  if (costPerCredit <= 0 || pulseTimeSeconds <= 0) return 0;
  return (60 / pulseTimeSeconds) * costPerCredit;
}

export function formatCostPerMinute(
  costPerCredit: number,
  pulseTimeSeconds: number,
): string {
  return deriveCostPerMinute(costPerCredit, pulseTimeSeconds).toFixed(2);
}
