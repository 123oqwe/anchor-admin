/**
 * L1 Graph Math — Bayesian Confidence Updating.
 *
 * Replaces LLM-guessed confidence scores with mathematically
 * grounded posterior probabilities.
 *
 * P(H|E) = P(E|H) × P(H) / P(E)
 *
 * Reference: Google Research 2025 — "Teaching LLMs to Reason like Bayesians"
 */

/**
 * Update confidence given new evidence.
 *
 * @param prior Current confidence (0-1)
 * @param evidenceSupports Does the new evidence support the hypothesis?
 * @param sensitivity P(E|H) — probability of seeing this evidence if hypothesis is true (default 0.8)
 * @param falsePositiveRate P(E|¬H) — probability of seeing this evidence if hypothesis is false (default 0.2)
 * @returns Updated posterior confidence (0-1)
 */
export function bayesianUpdate(
  prior: number,
  evidenceSupports: boolean,
  sensitivity = 0.8,
  falsePositiveRate = 0.2
): number {
  // Clamp prior to avoid 0 or 1 (which would never update)
  const p = Math.max(0.01, Math.min(0.99, prior));

  if (evidenceSupports) {
    // P(H|E) = P(E|H) × P(H) / P(E)
    const pE = sensitivity * p + falsePositiveRate * (1 - p);
    return (sensitivity * p) / pE;
  } else {
    // P(H|¬E) = P(¬E|H) × P(H) / P(¬E)
    const pNotE = (1 - sensitivity) * p + (1 - falsePositiveRate) * (1 - p);
    return ((1 - sensitivity) * p) / pNotE;
  }
}

/**
 * Batch update: apply multiple evidence points sequentially.
 */
export function bayesianBatchUpdate(
  prior: number,
  evidences: boolean[],
  sensitivity = 0.8,
  falsePositiveRate = 0.2
): number {
  let current = prior;
  for (const e of evidences) {
    current = bayesianUpdate(current, e, sensitivity, falsePositiveRate);
  }
  return current;
}

/**
 * Compute uncertainty — how sure are we about this confidence?
 * Uses beta distribution variance as a proxy.
 *
 * High uncertainty = few observations, confidence near 0.5
 * Low uncertainty = many observations, confidence near 0 or 1
 */
export function confidenceUncertainty(
  confidence: number,
  observationCount: number
): number {
  // Beta distribution: α = conf × n, β = (1-conf) × n
  const n = Math.max(2, observationCount);
  const alpha = confidence * n;
  const beta = (1 - confidence) * n;
  // Variance of beta distribution
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  // Normalize: max variance is 0.25 (at conf=0.5, n=2)
  return Math.min(1, variance / 0.25);
}
