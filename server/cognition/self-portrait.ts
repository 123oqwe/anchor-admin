/**
 * L3 Cognition — Self-Portrait Engine.
 *
 * Reveals what the user CAN'T see about themselves.
 * Not more data — deeper analysis of existing data.
 *
 * 5 Layers:
 *   1. Life Balance — domain entropy (is your life lopsided?)
 *   2. Say vs Do — goals vs actual time allocation
 *   3. Identity Tensions — competing roles/identities
 *   4. Relationship Depth — network sparsity + diversity
 *   5. Time Audit — actual rhythm vs self-perception
 *
 * All pure math. No LLM calls except final synthesis.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { shannonEntropy } from "../graph/math/entropy.js";
import { computePageRank } from "../graph/math/pagerank.js";
import { text } from "../infra/compute/index.js";

// ── Output types ───────────────────────────────────────────────────────────

export interface SelfPortraitLayer {
  name: string;
  score: number;        // 0-100
  status: "healthy" | "warning" | "critical";
  finding: string;      // one-sentence factual finding
  insight: string;      // what it MEANS (the uncomfortable truth)
  evidence: string[];   // data points supporting this
}

export interface SelfPortrait {
  layers: SelfPortraitLayer[];
  overallClarity: number; // 0-100: how well we can see this person
  blindSpots: string[];
  tensions: string[];
  synthesizedNarrative: string; // LLM: 3-paragraph "mirror"
}

// ── Layer 1: Life Balance ──────────────────────────────────────────────────

function analyzeLifeBalance(): SelfPortraitLayer {
  const domains = db.prepare(
    "SELECT domain, COUNT(*) as cnt FROM graph_nodes WHERE user_id=? GROUP BY domain"
  ).all(DEFAULT_USER_ID) as any[];

  const total = domains.reduce((s: number, d: any) => s + d.cnt, 0);
  if (total === 0) {
    return { name: "Life Balance", score: 0, status: "critical", finding: "No data yet.", insight: "Can't assess balance without data.", evidence: [] };
  }

  // Shannon entropy of domain distribution
  const events = domains.map((d: any) => ({ domain: d.domain, durationSeconds: d.cnt }));
  const H = shannonEntropy(events);
  const H_max = Math.log2(5); // 5 standard domains
  const balanceScore = Math.round((H / H_max) * 100);

  // Find dominant and missing domains
  const sorted = domains.sort((a: any, b: any) => b.cnt - a.cnt);
  const dominant = sorted[0];
  const dominantPct = Math.round((dominant.cnt / total) * 100);

  const allDomains = ["work", "relationships", "finance", "health", "growth"];
  const present = new Set(domains.map((d: any) => d.domain));
  const missing = allDomains.filter(d => !present.has(d));

  const evidence = [
    ...sorted.map((d: any) => `${d.domain}: ${d.cnt} nodes (${Math.round((d.cnt / total) * 100)}%)`),
    ...missing.map(d => `${d}: 0 nodes (missing)`),
  ];

  let insight = "";
  if (dominantPct > 70) {
    insight = `Your life is ${dominantPct}% ${dominant.domain}. ${missing.length > 0 ? `You have zero presence in ${missing.join(", ")}. ` : ""}This level of imbalance often leads to burnout — the domains you're ignoring don't disappear, they deteriorate silently.`;
  } else if (missing.length >= 2) {
    insight = `You're missing ${missing.join(" and ")} entirely. These blind spots mean you have no early warning system for problems in those areas.`;
  } else {
    insight = "Your life domains are reasonably balanced. Keep maintaining the areas with fewer nodes.";
  }

  return {
    name: "Life Balance",
    score: balanceScore,
    status: balanceScore > 60 ? "healthy" : balanceScore > 30 ? "warning" : "critical",
    finding: `Domain entropy: ${(H).toFixed(2)} / ${H_max.toFixed(2)}. ${dominant.domain} dominates at ${dominantPct}%.${missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : ""}`,
    insight,
    evidence,
  };
}

// ── Layer 2: Say vs Do ─────────────────────────────────────────────────────

function analyzeSayVsDo(): SelfPortraitLayer {
  // Get stated goals
  const goals = db.prepare(
    "SELECT label, domain FROM graph_nodes WHERE user_id=? AND type IN ('goal','project') AND status='active'"
  ).all(DEFAULT_USER_ID) as any[];

  // Get actual behavior (what domains have the most activity/nodes)
  const activity = db.prepare(
    "SELECT domain, COUNT(*) as cnt FROM graph_nodes WHERE user_id=? AND type NOT IN ('value','preference','constraint') GROUP BY domain ORDER BY cnt DESC"
  ).all(DEFAULT_USER_ID) as any[];

  if (goals.length === 0) {
    return { name: "Say vs Do", score: 50, status: "warning", finding: "No explicit goals defined.", insight: "Without stated goals, there's nothing to compare your behavior against. You might be drifting.", evidence: [] };
  }

  const totalActivity = activity.reduce((s: number, a: any) => s + a.cnt, 0);
  const goalDomains = new Set(goals.map((g: any) => g.domain));
  const activityDomains = new Map(activity.map((a: any) => [a.domain, a.cnt]));

  // Check alignment: are your active domains the same as your goal domains?
  const gaps: string[] = [];
  const evidence: string[] = [];

  for (const goal of goals) {
    const domainActivity = activityDomains.get(goal.domain) ?? 0;
    const pct = totalActivity > 0 ? Math.round((domainActivity / totalActivity) * 100) : 0;
    evidence.push(`Goal "${goal.label}" (${goal.domain}): ${pct}% of activity is in this domain`);

    if (pct < 10) {
      gaps.push(`"${goal.label}" is a stated goal but only ${pct}% of your activity supports it`);
    }
  }

  // Check for high-activity domains with no goals
  for (const a of activity) {
    if (!goalDomains.has(a.domain) && a.cnt > 3) {
      const pct = Math.round((a.cnt / totalActivity) * 100);
      gaps.push(`${a.domain} gets ${pct}% of your attention but has no explicit goal`);
    }
  }

  const alignmentScore = Math.max(0, 100 - gaps.length * 25);

  return {
    name: "Say vs Do",
    score: alignmentScore,
    status: alignmentScore > 60 ? "healthy" : alignmentScore > 30 ? "warning" : "critical",
    finding: `${goals.length} active goals. ${gaps.length} alignment gap(s) detected.`,
    insight: gaps.length > 0
      ? `Your actions don't match your words. ${gaps[0]}. This isn't necessarily bad — but if it's unintentional, you're lying to yourself about your priorities.`
      : "Your time allocation aligns well with your stated goals.",
    evidence: [...evidence, ...gaps.map(g => `GAP: ${g}`)],
  };
}

// ── Layer 3: Identity Tensions ─────────────────────────────────────────────

function analyzeIdentityTensions(): SelfPortraitLayer {
  // Detect competing identity clusters
  const identityNodes = db.prepare(
    "SELECT label, type, domain, detail FROM graph_nodes WHERE user_id=? AND type IN ('identity','project','goal','resource') AND status='active'"
  ).all(DEFAULT_USER_ID) as any[];

  // Cluster by domain/theme
  const clusters: Record<string, string[]> = {};
  for (const n of identityNodes) {
    const label = n.label.toLowerCase();
    if (label.includes("code") || label.includes("dev") || label.includes("ai") || label.includes("engineer") || label.includes("anchor") || label.includes("agent"))
      (clusters["Tech/AI Builder"] ??= []).push(n.label);
    else if (label.includes("finance") || label.includes("valuation") || label.includes("trading") || label.includes("investment"))
      (clusters["Finance Professional"] ??= []).push(n.label);
    else if (label.includes("dj") || label.includes("music") || label.includes("serato") || label.includes("rekordbox") || label.includes("splice"))
      (clusters["DJ/Music Producer"] ??= []).push(n.label);
    else if (label.includes("student") || label.includes("nyu") || label.includes("course") || label.includes("calculus"))
      (clusters["University Student"] ??= []).push(n.label);
  }

  const identityCount = Object.keys(clusters).length;
  const evidence = Object.entries(clusters).map(([id, nodes]) => `${id}: ${nodes.slice(0, 3).join(", ")}${nodes.length > 3 ? ` (+${nodes.length - 3} more)` : ""}`);

  const tensions: string[] = [];
  if (clusters["Tech/AI Builder"] && clusters["Finance Professional"]) {
    tensions.push("Tech builder vs Finance professional — these require different networks, skills, and time investments");
  }
  if (clusters["University Student"] && (clusters["Tech/AI Builder"] || clusters["Finance Professional"])) {
    tensions.push("Student vs Professional — academic obligations compete with professional ambitions for the same hours");
  }
  if (identityCount >= 3) {
    tensions.push(`${identityCount} competing identities — each one needs 100% to excel, but you're splitting across all of them`);
  }

  const tensionScore = Math.max(0, 100 - tensions.length * 30);

  return {
    name: "Identity Tensions",
    score: tensionScore,
    status: identityCount <= 1 ? "healthy" : identityCount <= 2 ? "warning" : "critical",
    finding: `${identityCount} distinct identities detected: ${Object.keys(clusters).join(", ")}.`,
    insight: tensions.length > 0
      ? `You're living ${identityCount} lives at once. ${tensions[0]}. The most successful people aren't the ones who do everything — they're the ones who choose what NOT to do.`
      : "Your activities are focused around a coherent identity.",
    evidence,
  };
}

// ── Layer 4: Relationship Depth ────────────────────────────────────────────

function analyzeRelationships(): SelfPortraitLayer {
  const people = db.prepare(
    "SELECT label, status, detail FROM graph_nodes WHERE user_id=? AND type='person'"
  ).all(DEFAULT_USER_ID) as any[];

  const personCount = people.length;
  const evidence = people.map((p: any) => `${p.label} (${p.status}): ${(p.detail ?? "").slice(0, 50)}`);

  // Check diversity — are all contacts in the same domain?
  const edges = db.prepare(
    "SELECT gn.domain FROM graph_edges e JOIN graph_nodes gn ON e.to_node_id = gn.id WHERE e.user_id=? AND e.from_node_id IN (SELECT id FROM graph_nodes WHERE user_id=? AND type='person')"
  ).all(DEFAULT_USER_ID, DEFAULT_USER_ID) as any[];

  const connectedDomains = new Set(edges.map((e: any) => e.domain));

  let insight = "";
  let score = 0;

  if (personCount === 0) {
    score = 0;
    insight = "Your graph has zero people in it. Either your contacts weren't scanned, or you're operating in isolation. Founders who succeed have at least 10-15 active relationships — investors, mentors, co-founders, customers.";
  } else if (personCount < 5) {
    score = 25;
    insight = `Only ${personCount} people in your network. Successful founders maintain 15-20 active relationships. Your network is dangerously thin — one lost connection could eliminate an entire pathway.`;
  } else if (connectedDomains.size < 3) {
    score = 50;
    insight = `Your ${personCount} contacts are concentrated in ${connectedDomains.size} domain(s). Diverse networks generate better opportunities — you need people outside your immediate field.`;
  } else {
    score = 75;
    insight = `${personCount} contacts across ${connectedDomains.size} domains. Reasonably healthy network.`;
  }

  return {
    name: "Relationship Depth",
    score,
    status: score > 60 ? "healthy" : score > 30 ? "warning" : "critical",
    finding: `${personCount} people mapped. Connected to ${connectedDomains.size} domain(s).`,
    insight,
    evidence: evidence.length > 0 ? evidence : ["No relationships detected — connect your contacts or add people manually"],
  };
}

// ── Layer 5: Time Audit ────────────────────────────────────────────────────

function analyzeTimeAudit(): SelfPortraitLayer {
  // Compare stated preferences vs actual behavior
  const preferences = db.prepare(
    "SELECT label, detail FROM graph_nodes WHERE user_id=? AND type='preference'"
  ).all(DEFAULT_USER_ID) as any[];

  const observations = db.prepare(
    "SELECT label, detail FROM graph_nodes WHERE user_id=? AND type IN ('observation','behavioral_pattern','pattern')"
  ).all(DEFAULT_USER_ID) as any[];

  const evidence: string[] = [];
  const contradictions: string[] = [];

  for (const pref of preferences) {
    const prefLower = (pref.label + " " + (pref.detail ?? "")).toLowerCase();
    evidence.push(`Stated: ${pref.label}`);

    // Check for contradicting observations
    for (const obs of observations) {
      const obsLower = (obs.label + " " + (obs.detail ?? "")).toLowerCase();
      // Morning preference vs night activity
      if (prefLower.includes("morning") && obsLower.includes("night")) {
        contradictions.push(`You say you prefer mornings, but observations show high night activity`);
      }
      // Focus preference vs distraction observation
      if (prefLower.includes("focus") && (obsLower.includes("distraction") || obsLower.includes("douyin"))) {
        contradictions.push(`You value focus, but distraction patterns detected`);
      }
    }
  }

  for (const obs of observations) {
    evidence.push(`Observed: ${obs.label}`);
  }

  const score = Math.max(0, 100 - contradictions.length * 30);

  return {
    name: "Time Audit",
    score,
    status: contradictions.length === 0 ? "healthy" : contradictions.length <= 1 ? "warning" : "critical",
    finding: `${preferences.length} stated preferences, ${observations.length} observed patterns, ${contradictions.length} contradiction(s).`,
    insight: contradictions.length > 0
      ? `Your self-perception doesn't match reality. ${contradictions[0]}. This gap between who you think you are and how you actually behave is the #1 source of wasted time.`
      : preferences.length > 0
        ? "Your stated preferences align with observed behavior. You know yourself well."
        : "Not enough preference data to compare against behavior.",
    evidence,
  };
}

// ── Master: Generate Self-Portrait ─────────────────────────────────────────

export async function generateSelfPortrait(): Promise<SelfPortrait> {
  const layers = [
    analyzeLifeBalance(),
    analyzeSayVsDo(),
    analyzeIdentityTensions(),
    analyzeRelationships(),
    analyzeTimeAudit(),
  ];

  const overallClarity = Math.round(layers.reduce((s, l) => s + l.score, 0) / layers.length);
  const blindSpots = layers.filter(l => l.status === "critical").map(l => l.name);
  const tensions = layers.filter(l => l.status !== "healthy").map(l => l.insight).filter(Boolean);

  // Synthesize into a narrative (1 LLM call, cheap model)
  let synthesizedNarrative = "";
  try {
    const layerSummary = layers.map(l => `${l.name} (${l.score}/100 ${l.status}): ${l.finding} → ${l.insight}`).join("\n\n");

    synthesizedNarrative = await text({
      task: "twin_edit_learning",
      system: `You are a brutally honest executive coach. Write a 3-paragraph self-portrait based on the data analysis below. First paragraph: what the data clearly shows. Second paragraph: the uncomfortable truth the person is probably avoiding. Third paragraph: the ONE thing they should change this week. Be direct, specific, and personal. No fluff. No hedging.`,
      messages: [{ role: "user", content: layerSummary }],
      maxTokens: 400,
    });
  } catch {
    synthesizedNarrative = layers.map(l => l.insight).filter(Boolean).join(" ");
  }

  return { layers, overallClarity, blindSpots, tensions, synthesizedNarrative };
}
