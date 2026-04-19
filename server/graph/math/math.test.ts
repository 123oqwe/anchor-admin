/**
 * Unit tests for math models — PageRank, Entropy, Decay, Bayesian.
 * Run: npx tsx server/graph/math/math.test.ts
 */

// ── PageRank ──────────────────────────────────────────────────────────────

import { computePageRank } from "./pagerank.js";

function testPageRank() {
  // Simple 3-node graph: A → B → C
  const scores = computePageRank({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
      { fromNodeId: "a", toNodeId: "b", type: "depends_on", weight: 1 },
      { fromNodeId: "b", toNodeId: "c", type: "supports", weight: 1 },
    ],
  });

  const a = scores.get("a")!;
  const b = scores.get("b")!;
  const c = scores.get("c")!;

  // C should have highest rank (most "pointed to" transitively)
  assert(c > b, `PageRank: C (${c.toFixed(3)}) should > B (${b.toFixed(3)})`);
  assert(b > a, `PageRank: B (${b.toFixed(3)}) should > A (${a.toFixed(3)})`);

  // Sum should ≈ 1
  const sum = a + b + c;
  assert(Math.abs(sum - 1) < 0.01, `PageRank: sum should ≈ 1, got ${sum.toFixed(3)}`);

  // Empty graph
  const empty = computePageRank({ nodes: [], edges: [] });
  assert(empty.size === 0, "PageRank: empty graph should return empty map");

  console.log("✅ PageRank: all tests passed");
}

// ── Shannon Entropy ───────────────────────────────────────────────────────

import { shannonEntropy, entropyToFocusScore } from "./entropy.js";

function testEntropy() {
  // Single domain = 0 entropy = 100% focus
  const single = shannonEntropy([{ domain: "github.com", durationSeconds: 100 }]);
  assert(single === 0, `Entropy: single domain should be 0, got ${single}`);

  const singleFocus = entropyToFocusScore([{ domain: "github.com", durationSeconds: 100 }]);
  assert(singleFocus === 100, `Focus: single domain should be 100, got ${singleFocus}`);

  // Uniform across 2 domains = max entropy for 2
  const uniform = shannonEntropy([
    { domain: "a.com", durationSeconds: 50 },
    { domain: "b.com", durationSeconds: 50 },
  ]);
  assert(Math.abs(uniform - 1.0) < 0.01, `Entropy: uniform 2 should ≈ 1.0, got ${uniform.toFixed(3)}`);

  // More domains = lower focus
  const scattered = entropyToFocusScore([
    { domain: "a.com", durationSeconds: 20 },
    { domain: "b.com", durationSeconds: 20 },
    { domain: "c.com", durationSeconds: 20 },
    { domain: "d.com", durationSeconds: 20 },
    { domain: "e.com", durationSeconds: 20 },
  ]);
  assert(scattered < 10, `Focus: 5 uniform domains should be very low, got ${scattered}`);

  // Empty = neutral
  const emptyFocus = entropyToFocusScore([]);
  assert(emptyFocus === 50, `Focus: empty should be 50, got ${emptyFocus}`);

  console.log("✅ Entropy: all tests passed");
}

// ── Exponential Decay ─────────────────────────────────────────────────────

import { relationshipHealth, healthToStatus } from "./decay.js";

function testDecay() {
  // Just contacted = 1.0
  const fresh = relationshipHealth(0, 0);
  assert(Math.abs(fresh - 1.0) < 0.01, `Decay: 0 days should ≈ 1.0, got ${fresh.toFixed(3)}`);

  // 14 days (default half-life) = ~0.5
  const halfLife = relationshipHealth(14, 0);
  assert(Math.abs(halfLife - 0.5) < 0.05, `Decay: 14 days should ≈ 0.5, got ${halfLife.toFixed(3)}`);

  // Very old = near 0
  const old = relationshipHealth(100, 0);
  assert(old < 0.01, `Decay: 100 days should be near 0, got ${old.toFixed(3)}`);

  // Status classification
  assert(healthToStatus(0.8) === "healthy", `Status: 0.8 should be healthy`);
  assert(healthToStatus(0.5) === "cooling", `Status: 0.5 should be cooling`);
  assert(healthToStatus(0.2) === "decaying", `Status: 0.2 should be decaying`);
  assert(healthToStatus(0.1) === "dormant", `Status: 0.1 should be dormant`);

  console.log("✅ Decay: all tests passed");
}

// ── Bayesian Updating ─────────────────────────────────────────────────────

import { bayesianUpdate, bayesianBatchUpdate } from "./bayesian.js";

function testBayesian() {
  // Supporting evidence increases confidence
  const updated = bayesianUpdate(0.5, true);
  assert(updated > 0.5, `Bayesian: supporting evidence should increase, got ${updated.toFixed(3)}`);

  // Contradicting evidence decreases confidence
  const decreased = bayesianUpdate(0.5, false);
  assert(decreased < 0.5, `Bayesian: contradicting evidence should decrease, got ${decreased.toFixed(3)}`);

  // Multiple supporting evidence → high confidence
  const batch = bayesianBatchUpdate(0.5, [true, true, true, true]);
  assert(batch > 0.9, `Bayesian: 4x support should > 0.9, got ${batch.toFixed(3)}`);

  // Mixed evidence → stays moderate
  const mixed = bayesianBatchUpdate(0.5, [true, false, true, false]);
  assert(mixed > 0.4 && mixed < 0.6, `Bayesian: mixed should stay near 0.5, got ${mixed.toFixed(3)}`);

  // Confidence never reaches exactly 0 or 1 (clamped)
  const nearOne = bayesianBatchUpdate(0.5, [true, true, true, true, true, true, true, true]);
  assert(nearOne < 1.0, `Bayesian: should never reach exactly 1.0, got ${nearOne.toFixed(3)}`);

  console.log("✅ Bayesian: all tests passed");
}

// ── Runner ────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

try {
  testPageRank();
  testEntropy();
  testDecay();
  testBayesian();
  console.log("\n🎯 All math tests passed!");
} catch (err: any) {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
}
