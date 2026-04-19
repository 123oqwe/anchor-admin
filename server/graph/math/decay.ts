/**
 * L1 Graph Math — Relationship Decay.
 *
 * Computes health of each relationship based on time since last contact.
 * Uses exponential decay with DYNAMIC half-life based on historical
 * communication frequency (not fixed per-type).
 *
 * Research: "Stable relationships require constant rhythm.
 * If communication halts for >8× the previous frequency,
 * the tie will most likely decay." — arXiv 1706.06188
 *
 * Our formula: half_life = avg_contact_interval × 4
 * (more conservative than the 8× paper suggests — we want early warning)
 */

/**
 * Compute relationship health as exponential decay.
 * @param daysSinceContact Days since last interaction
 * @param avgContactIntervalDays Average days between past contacts (0 = no history)
 * @param fallbackHalfLife Used when no contact history exists
 * @returns 0.0 (dead) to 1.0 (healthy)
 */
export function relationshipHealth(
  daysSinceContact: number,
  avgContactIntervalDays: number,
  fallbackHalfLife = 14
): number {
  // Dynamic half-life = 4× the average contact interval
  const halfLife = avgContactIntervalDays > 0
    ? avgContactIntervalDays * 4
    : fallbackHalfLife;

  const lambda = Math.LN2 / halfLife;
  return Math.exp(-lambda * daysSinceContact);
}

/**
 * Classify relationship health into status categories.
 */
export function healthToStatus(health: number): "healthy" | "cooling" | "decaying" | "dormant" {
  if (health > 0.7) return "healthy";
  if (health > 0.4) return "cooling";
  if (health > 0.15) return "decaying";
  return "dormant";
}

/**
 * For a list of contact timestamps, compute average interval.
 */
export function avgContactInterval(contactDates: Date[]): number {
  if (contactDates.length < 2) return 0;
  const sorted = contactDates.sort((a, b) => a.getTime() - b.getTime());
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += (sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000;
  }
  return totalGap / (sorted.length - 1);
}
