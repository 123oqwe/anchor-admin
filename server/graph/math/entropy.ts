/**
 * L1 Graph Math — Attention Entropy.
 *
 * Measures how focused or scattered the user's attention is,
 * based on browsing domain distribution.
 *
 * Shannon Entropy H = -Σ p(x) × log₂(p(x))
 *   H = 0 → perfectly focused (only 1 domain)
 *   H = max → completely scattered (uniform across all domains)
 *
 * We normalize to 0-100 focus score:
 *   focus = (1 - H/H_max) × 100
 *
 * Reference: ACM ETRA 2025 — "Gaze Entropy as a Measure of Performance"
 */

export interface BrowsingEvent {
  domain: string;
  durationSeconds: number;
}

/**
 * Compute Shannon entropy of domain distribution.
 * @returns Raw entropy in bits
 */
export function shannonEntropy(events: BrowsingEvent[]): number {
  const totalTime = events.reduce((s, e) => s + e.durationSeconds, 0);
  if (totalTime === 0) return 0;

  const domainTime = new Map<string, number>();
  for (const e of events) {
    domainTime.set(e.domain, (domainTime.get(e.domain) ?? 0) + e.durationSeconds);
  }

  let entropy = 0;
  domainTime.forEach((time) => {
    const p = time / totalTime;
    if (p > 0) entropy -= p * Math.log2(p);
  });

  return entropy;
}

/**
 * Convert entropy to a 0-100 focus score.
 * Higher = more focused.
 */
export function entropyToFocusScore(events: BrowsingEvent[]): number {
  if (events.length === 0) return 50; // no data → neutral

  const uniqueDomains = new Set(events.map(e => e.domain)).size;
  if (uniqueDomains <= 1) return 100; // only 1 domain → perfect focus

  const H = shannonEntropy(events);
  const H_max = Math.log2(uniqueDomains);

  return Math.round((1 - H / H_max) * 100);
}

/**
 * Detect the dominant domain and distraction domains.
 */
export function analyzeAttention(events: BrowsingEvent[]): {
  focusScore: number;
  entropy: number;
  dominantDomain: string | null;
  topDomains: { domain: string; percentage: number }[];
} {
  if (events.length === 0) {
    return { focusScore: 50, entropy: 0, dominantDomain: null, topDomains: [] };
  }

  const totalTime = events.reduce((s, e) => s + e.durationSeconds, 0);
  const domainTime = new Map<string, number>();
  for (const e of events) {
    domainTime.set(e.domain, (domainTime.get(e.domain) ?? 0) + e.durationSeconds);
  }

  const sorted = Array.from(domainTime.entries())
    .map(([domain, time]) => ({ domain, percentage: Math.round((time / totalTime) * 100) }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    focusScore: entropyToFocusScore(events),
    entropy: shannonEntropy(events),
    dominantDomain: sorted[0]?.domain ?? null,
    topDomains: sorted.slice(0, 5),
  };
}
