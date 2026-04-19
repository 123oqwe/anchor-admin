/**
 * L3 Cognition — Sparse Data Analysis Engine.
 *
 * 5 micro-analysts that extract maximum signal from minimum data.
 * Most are pure math/rules — no LLM needed.
 * Only the final synthesis calls LLM to compose natural language.
 *
 * Always produces output. Never says "not enough data."
 * Instead: tags everything as fact / inference / hypothesis with confidence.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { computePageRank } from "../L1-graph/math/pagerank.js";
import { shannonEntropy, entropyToFocusScore } from "../L1-graph/math/entropy.js";
import { relationshipHealth } from "../L1-graph/math/decay.js";
import { text } from "../infra/compute/index.js";

// ── Output types ───────────────────────────────────────────────────────────

export interface MicroInsight {
  agent: string;
  layer: "fact" | "inference" | "hypothesis";
  content: string;
  confidence: number;
  source: string;
}

export interface SparseAnalysisResult {
  facts: MicroInsight[];
  inferences: MicroInsight[];
  hypotheses: MicroInsight[];
  dataCompleteness: number; // 0-100: how much data we have vs ideal
  blindSpots: string[];
  synthesizedInsight: string; // natural language summary
}

// ── Agent 1: Identity Analyst (pure rules) ─────────────────────────────────

function analyzeIdentity(): MicroInsight[] {
  const insights: MicroInsight[] = [];
  const profile = db.prepare("SELECT name, email, role FROM users WHERE id=?").get(DEFAULT_USER_ID) as any;

  if (profile?.name) {
    insights.push({ agent: "Identity", layer: "fact", content: `Name: ${profile.name}`, confidence: 1.0, source: "user_input" });
  }
  if (profile?.role) {
    insights.push({ agent: "Identity", layer: "fact", content: `Role: ${profile.role}`, confidence: 1.0, source: "user_input" });

    // Infer from role
    const role = profile.role.toLowerCase();
    if (role.includes("founder") || role.includes("ceo")) {
      insights.push({ agent: "Identity", layer: "inference", content: "High decision volume — likely making 50+ decisions/week across multiple domains", confidence: 0.75, source: "role_pattern" });
      insights.push({ agent: "Identity", layer: "inference", content: "Time-constrained — needs efficient, actionable advice over long analysis", confidence: 0.7, source: "role_pattern" });
    }
    if (role.includes("student")) {
      insights.push({ agent: "Identity", layer: "inference", content: "Balancing academic commitments with other goals", confidence: 0.7, source: "role_pattern" });
    }
    if (role.includes("engineer") || role.includes("developer") || role.includes("cto")) {
      insights.push({ agent: "Identity", layer: "inference", content: "Technical background — prefers data-driven recommendations", confidence: 0.7, source: "role_pattern" });
    }
  }

  return insights;
}

// ── Agent 2: Behavior Analyst (math: entropy + temporal) ───────────────────

function analyzeBehavior(): MicroInsight[] {
  const insights: MicroInsight[] = [];

  // Check browsing data from ingestion
  const recentScan = db.prepare(
    "SELECT events_fetched, nodes_created FROM ingestion_log WHERE user_id=? AND status='done' ORDER BY finished_at DESC LIMIT 1"
  ).get(DEFAULT_USER_ID) as any;

  if (recentScan && recentScan.events_fetched > 0) {
    insights.push({ agent: "Behavior", layer: "fact", content: `Scanned ${recentScan.events_fetched} data points → created ${recentScan.nodes_created} graph nodes`, confidence: 1.0, source: "local_scan" });
  }

  // Analyze graph nodes for behavior patterns
  const patterns = db.prepare(
    "SELECT label, detail FROM graph_nodes WHERE user_id=? AND type IN ('behavioral_pattern','observation','pattern') ORDER BY created_at DESC LIMIT 5"
  ).all(DEFAULT_USER_ID) as any[];

  for (const p of patterns) {
    insights.push({ agent: "Behavior", layer: "inference", content: p.detail || p.label, confidence: 0.65, source: "graph_extraction" });
  }

  // Time-based analysis: when was user most active?
  const messages = db.prepare(
    "SELECT created_at FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 50"
  ).all(DEFAULT_USER_ID) as any[];

  if (messages.length >= 5) {
    const hours: Record<number, number> = {};
    for (const m of messages) {
      try {
        const h = new Date(m.created_at).getHours();
        hours[h] = (hours[h] ?? 0) + 1;
      } catch {}
    }
    const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      insights.push({ agent: "Behavior", layer: "inference", content: `Most active around ${peakHour[0]}:00 — this appears to be a productivity window`, confidence: 0.6, source: "temporal_analysis" });
    }
  }

  return insights;
}

// ── Agent 3: Priority Analyst (math: PageRank) ─────────────────────────────

function analyzePriority(): MicroInsight[] {
  const insights: MicroInsight[] = [];

  const nodes = db.prepare("SELECT id, label, type, status, domain FROM graph_nodes WHERE user_id=?").all(DEFAULT_USER_ID) as any[];
  const edges = db.prepare("SELECT from_node_id as fromNodeId, to_node_id as toNodeId, type, weight FROM graph_edges WHERE user_id=?").all(DEFAULT_USER_ID) as any[];

  if (nodes.length === 0) return insights;

  insights.push({ agent: "Priority", layer: "fact", content: `Graph has ${nodes.length} nodes and ${edges.length} connections`, confidence: 1.0, source: "graph_topology" });

  // PageRank
  if (nodes.length >= 2 && edges.length >= 1) {
    const scores = computePageRank({ nodes: nodes.map(n => ({ id: n.id })), edges });
    const ranked = nodes.map(n => ({ ...n, score: scores.get(n.id) ?? 0 })).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (top) {
      insights.push({ agent: "Priority", layer: "inference", content: `"${top.label}" is your most structurally important node (PageRank: ${(top.score * 100).toFixed(0)}%)`, confidence: 0.7, source: "pagerank" });
    }

    // Find isolated nodes (no edges)
    const connectedIds = new Set([...edges.map((e: any) => e.fromNodeId), ...edges.map((e: any) => e.toNodeId)]);
    const isolated = nodes.filter(n => !connectedIds.has(n.id) && n.type === "goal");
    if (isolated.length > 0) {
      insights.push({ agent: "Priority", layer: "inference", content: `${isolated.length} goal(s) are isolated with no connections: ${isolated.map(n => `"${n.label}"`).join(", ")}. Consider linking them to other nodes.`, confidence: 0.65, source: "graph_topology" });
    }
  }

  // Domain distribution
  const domainCounts: Record<string, number> = {};
  for (const n of nodes) { domainCounts[n.domain] = (domainCounts[n.domain] ?? 0) + 1; }
  const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDomains.length > 0) {
    insights.push({ agent: "Priority", layer: "fact", content: `Focus areas: ${sortedDomains.map(([d, c]) => `${d}(${c})`).join(", ")}`, confidence: 0.9, source: "domain_distribution" });
  }

  return insights;
}

// ── Agent 4: Blind Spot Analyst (rules: what's missing) ────────────────────

function analyzeBlindSpots(): { insights: MicroInsight[]; blindSpots: string[] } {
  const insights: MicroInsight[] = [];
  const blindSpots: string[] = [];

  const domainNodes = db.prepare(
    "SELECT domain, COUNT(*) as cnt FROM graph_nodes WHERE user_id=? GROUP BY domain"
  ).all(DEFAULT_USER_ID) as any[];
  const domains = new Set(domainNodes.map((d: any) => d.domain));

  const requiredDomains = ["work", "relationships", "finance", "health", "growth"];
  const missing = requiredDomains.filter(d => !domains.has(d));

  if (missing.length > 0) {
    blindSpots.push(...missing.map(d => `No ${d} data`));
    insights.push({ agent: "BlindSpot", layer: "inference", content: `Missing domains: ${missing.join(", ")}. These are potential blind spots in your decision-making.`, confidence: 0.6, source: "domain_completeness" });
  }

  // Check specific data types
  const personCount = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='person'").get(DEFAULT_USER_ID) as any)?.c ?? 0;
  if (personCount === 0) {
    blindSpots.push("No people in graph");
    insights.push({ agent: "BlindSpot", layer: "hypothesis", content: "No relationships mapped. Key relationships (investors, co-founders, mentors) should be in your graph for relationship health tracking.", confidence: 0.5, source: "type_completeness" });
  }

  const constraintCount = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='constraint'").get(DEFAULT_USER_ID) as any)?.c ?? 0;
  if (constraintCount === 0) {
    blindSpots.push("No constraints defined");
    insights.push({ agent: "BlindSpot", layer: "hypothesis", content: "No constraints (deadlines, budget, runway) defined. Decisions without constraints tend to drift.", confidence: 0.5, source: "type_completeness" });
  }

  return { insights, blindSpots };
}

// ── Agent 5: Risk Analyst (rules + patterns) ───────────────────────────────

function analyzeRisks(): MicroInsight[] {
  const insights: MicroInsight[] = [];

  // Check for decaying relationships
  const decaying = db.prepare(
    "SELECT label FROM graph_nodes WHERE user_id=? AND type='person' AND status='decaying'"
  ).all(DEFAULT_USER_ID) as any[];
  if (decaying.length > 0) {
    insights.push({ agent: "Risk", layer: "fact", content: `${decaying.length} relationship(s) decaying: ${decaying.map(d => d.label).join(", ")}`, confidence: 0.9, source: "decay_model" });
  }

  // Check for overdue/blocked items
  const blocked = db.prepare(
    "SELECT label, type FROM graph_nodes WHERE user_id=? AND status IN ('overdue','blocked','worsening') LIMIT 5"
  ).all(DEFAULT_USER_ID) as any[];
  if (blocked.length > 0) {
    insights.push({ agent: "Risk", layer: "fact", content: `${blocked.length} item(s) need attention: ${blocked.map(b => `${b.label}(${b.type})`).join(", ")}`, confidence: 0.9, source: "status_check" });
  }

  // Check for distraction risk nodes
  const distractions = db.prepare(
    "SELECT label, detail FROM graph_nodes WHERE user_id=? AND (label LIKE '%distraction%' OR label LIKE '%risk%' OR type='risk') LIMIT 3"
  ).all(DEFAULT_USER_ID) as any[];
  for (const d of distractions) {
    insights.push({ agent: "Risk", layer: "inference", content: d.detail || d.label, confidence: 0.6, source: "risk_detection" });
  }

  return insights;
}

// ── Data Completeness Score ─────────────────────────────────────────────────

function computeDataCompleteness(): number {
  const checks = [
    { weight: 20, query: "SELECT COUNT(*) as c FROM users WHERE id=? AND name != ''", threshold: 1 },
    { weight: 15, query: "SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='goal'", threshold: 1 },
    { weight: 15, query: "SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='person'", threshold: 1 },
    { weight: 10, query: "SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='value'", threshold: 1 },
    { weight: 10, query: "SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=? AND type='constraint'", threshold: 1 },
    { weight: 10, query: "SELECT COUNT(*) as c FROM memories WHERE user_id=?", threshold: 3 },
    { weight: 10, query: "SELECT COUNT(*) as c FROM graph_edges WHERE user_id=?", threshold: 3 },
    { weight: 10, query: "SELECT COUNT(*) as c FROM messages WHERE user_id=?", threshold: 5 },
  ];

  let score = 0;
  for (const check of checks) {
    const result = (db.prepare(check.query).get(DEFAULT_USER_ID) as any)?.c ?? 0;
    score += result >= check.threshold ? check.weight : (result / check.threshold) * check.weight;
  }
  return Math.round(Math.min(100, score));
}

// ── Master: Run All Agents + Synthesize ────────────────────────────────────

export async function runSparseAnalysis(): Promise<SparseAnalysisResult> {
  // Run all 5 agents (all pure math/rules, no LLM)
  const identity = analyzeIdentity();
  const behavior = analyzeBehavior();
  const priority = analyzePriority();
  const { insights: blindSpotInsights, blindSpots } = analyzeBlindSpots();
  const risks = analyzeRisks();

  const allInsights = [...identity, ...behavior, ...priority, ...blindSpotInsights, ...risks];

  const facts = allInsights.filter(i => i.layer === "fact");
  const inferences = allInsights.filter(i => i.layer === "inference");
  const hypotheses = allInsights.filter(i => i.layer === "hypothesis");

  const dataCompleteness = computeDataCompleteness();

  // Synthesize into natural language using LLM (1 call, cheap model)
  let synthesizedInsight = "";
  try {
    const factsText = facts.map(f => `• ${f.content}`).join("\n") || "No confirmed facts yet.";
    const infText = inferences.map(i => `• ${i.content} (${Math.round(i.confidence * 100)}%)`).join("\n") || "No inferences yet.";
    const hypText = hypotheses.map(h => `• ${h.content}`).join("\n") || "";
    const spotsText = blindSpots.length > 0 ? `Blind spots: ${blindSpots.join(", ")}` : "";

    synthesizedInsight = await text({
      task: "twin_edit_learning",
      system: `You synthesize data analysis into a brief, personal insight. Write 2-3 sentences. Be direct, warm, and specific. Start with what you KNOW, then what you THINK, then what you're CURIOUS about. Never say "I don't have enough data."`,
      messages: [{
        role: "user",
        content: `FACTS:\n${factsText}\n\nINFERENCES:\n${infText}\n\nHYPOTHESES:\n${hypText}\n\n${spotsText}\n\nData completeness: ${dataCompleteness}%`,
      }],
      maxTokens: 200,
    });
  } catch {
    // If LLM fails, build a rule-based summary
    const topFact = facts[0]?.content ?? "I'm just getting to know you.";
    const topInf = inferences[0]?.content ?? "";
    synthesizedInsight = `${topFact}${topInf ? ` ${topInf}` : ""} Tell me more and I'll get sharper.`;
  }

  return { facts, inferences, hypotheses, dataCompleteness, blindSpots, synthesizedInsight };
}
