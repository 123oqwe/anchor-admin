/**
 * Home — The Mirror.
 *
 * Not a dashboard. Not information overload. A mirror.
 *
 * What the user sees:
 *   "What matters now" — one sentence
 *   Current State — energy, focus, stress, momentum
 *   Priority — the ONE thing to do, with why
 *   Tension — the conflict holding you back
 *   Action — one button that does the thing
 *
 * Design: Jobs-level minimal. Every pixel earns its place.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Zap, Target, Activity, ArrowRight, AlertCircle,
  Users, Loader2, TrendingUp, Brain,
  Briefcase, Heart, DollarSign, GraduationCap, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

const DOMAIN_ICONS: Record<string, any> = {
  work: Briefcase, relationships: Users, finance: DollarSign,
  growth: GraduationCap, health: Heart,
};
const DOMAIN_COLORS: Record<string, string> = {
  work: "text-blue-400", relationships: "text-purple-400", finance: "text-emerald-400",
  growth: "text-amber-400", health: "text-rose-400",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400", "in-progress": "bg-blue-400", stable: "bg-emerald-400/60",
  decaying: "bg-amber-400", overdue: "bg-red-400", delayed: "bg-red-400",
  blocked: "bg-red-400/60", done: "bg-emerald-400/30", worsening: "bg-red-400",
};

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [portrait, setPortrait] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getDecisionToday().catch(() => null),
      api.getState().catch(() => null),
      fetch("/api/agents/self-portrait").then(r => r.ok ? r.json() : null).catch(() => null),
      api.getGraph().catch(() => null),
    ]).then(([dec, st, port, graph]) => {
      setDecision(dec);
      setState(st);
      setPortrait(port);
      // Extract people and domains from graph
      const personNodes = graph?.domains?.flatMap((d: any) => d.items?.filter((i: any) => i.type === "person") ?? []) ?? [];
      setPeople(personNodes.slice(0, 3));
      setDomains(graph?.domains ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
      </div>
    );
  }

  // Extract key data
  const energy = state?.energy ?? 70;
  const focus = state?.focus ?? 70;
  const stress = state?.stress ?? 30;
  const momentum = Math.round((energy + focus - stress) / 2);

  const priority = decision?.title ?? "Start building your graph";
  const priorityReason = decision?.reason ?? "Tell Anchor about your goals and it will guide you.";
  const priorityAction = decision?.action;

  // Find the most critical tension from self-portrait
  const tensions = portrait?.layers?.filter((l: any) => l.status === "critical" || l.status === "warning") ?? [];
  const topTension = tensions[0];

  // Open loops: overdue/blocked items
  const openLoops = portrait?.blindSpots ?? [];

  return (
    <div className="min-h-screen dot-grid">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-20">

        {/* ── The Sentence ────────────────────────────────────── */}
        <motion.div {...fade} transition={{ duration: 0.6 }}>
          <p className="text-xs font-medium text-primary/60 tracking-widest uppercase mb-3">What matters now</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight mb-3">
            {priority}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            {priorityReason}
          </p>

          {/* Action button — the ONE thing to do */}
          {priorityAction && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                if (priorityAction.type === "navigate") navigate(priorityAction.payload.path);
                else if (priorityAction.type === "send_email") {
                  fetch("/api/notifications/suggest-action", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ personLabel: priorityAction.payload.personLabel, context: priorityAction.payload.context, actionType: "send_email" }),
                  }).then(r => r.json()).then(draft => {
                    window.location.href = `mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
                  }).catch(() => navigate("/advisor"));
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {priorityAction.label} <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </motion.div>

        {/* ── Current State ───────────────────────────────────── */}
        <motion.div {...fade} transition={{ delay: 0.15, duration: 0.5 }} className="mt-14">
          <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Current State</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Energy", value: energy, icon: Zap, color: "text-amber-400", bg: "bg-amber-400" },
              { label: "Focus", value: focus, icon: Target, color: "text-blue-400", bg: "bg-blue-400" },
              { label: "Stress", value: stress, icon: Activity, color: "text-rose-400", bg: "bg-rose-400" },
              { label: "Momentum", value: momentum, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400" },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="glass rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={`h-3 w-3 ${metric.color}`} />
                    <span className="text-[10px] text-muted-foreground">{metric.label}</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${metric.color}`}>{metric.value}</div>
                  <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${metric.bg}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Key Tension ─────────────────────────────────────── */}
        {topTension && (
          <motion.div {...fade} transition={{ delay: 0.3, duration: 0.5 }} className="mt-10">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Key Tension</h2>
            <div className="glass rounded-xl p-5 border-l-2 border-amber-400/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">{topTension.name} — {topTension.score}/100</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{topTension.insight}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Important People ────────────────────────────────── */}
        {people.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.45, duration: 0.5 }} className="mt-10">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Key People</h2>
            <div className="flex gap-3">
              {people.map((p: any) => (
                <div key={p.id ?? p.label} onClick={() => p.id && navigate(`/graph/${p.id}`)}
                  className="glass rounded-xl px-4 py-3 flex-1 cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-purple-400" />
                    <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto" />
                  </div>
                  <span className={`text-[10px] ${p.status === "decaying" ? "text-amber-400" : "text-muted-foreground"}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Blind Spots ─────────────────────────────────────── */}
        {openLoops.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.55, duration: 0.5 }} className="mt-10">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Blind Spots</h2>
            <div className="flex flex-wrap gap-2">
              {openLoops.map((loop: string, i: number) => (
                <span key={i} className="glass rounded-lg px-3 py-1.5 text-xs text-amber-400/80">
                  {loop}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Human Graph — life areas ─────────────────────────── */}
        {domains.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.55, duration: 0.5 }} className="mt-10">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Human Graph</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {domains.filter((d: any) => d.nodeCount > 0 || ["work","relationships","finance","health","growth"].includes(d.id)).map((domain: any) => {
                const Icon = DOMAIN_ICONS[domain.id] ?? Brain;
                const color = DOMAIN_COLORS[domain.id] ?? "text-muted-foreground";
                const isExpanded = expandedDomain === domain.id;
                return (
                  <div key={domain.id}
                    className={`glass rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.03] ${isExpanded ? "col-span-2 md:col-span-3" : ""}`}
                    onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="text-sm font-medium text-foreground">{domain.name ?? domain.id}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{domain.nodeCount}</span>
                      <ChevronRight className={`h-3 w-3 text-muted-foreground/30 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                    {/* Health bar */}
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${domain.health > 70 ? "bg-emerald-400" : domain.health > 40 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${domain.health}%` }} />
                    </div>
                    {domain.nodeCount === 0 && (
                      <p className="text-[10px] text-muted-foreground/40 mt-2">No data — blind spot</p>
                    )}
                    {/* Expanded: show items */}
                    {isExpanded && domain.items && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-1.5">
                        {domain.items.map((item: any) => (
                          <div key={item.id ?? item.label}
                            onClick={(e) => { e.stopPropagation(); if (item.id) navigate(`/graph/${item.id}`); }}
                            className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/[0.03] rounded px-1 py-0.5 -mx-1 transition-colors">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? "bg-muted-foreground/30"}`} />
                            <span className="text-muted-foreground truncate flex-1 hover:text-foreground">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground/50">{item.type}</span>
                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/20" />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Self-Portrait — 5 layer deep analysis ────────────── */}
        {portrait?.layers && (
          <motion.div {...fade} transition={{ delay: 0.65, duration: 0.5 }} className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase">Self-Portrait</h2>
              <span className="text-[10px] font-mono text-muted-foreground/40">Clarity {portrait.overallClarity}/100</span>
            </div>

            {/* 5-layer score bars */}
            <div className="glass rounded-xl p-5 space-y-3 mb-4">
              {portrait.layers.map((layer: any) => {
                const color = layer.status === "healthy" ? "bg-emerald-400" : layer.status === "warning" ? "bg-amber-400" : "bg-red-400";
                const textColor = layer.status === "healthy" ? "text-emerald-400" : layer.status === "warning" ? "text-amber-400" : "text-red-400";
                return (
                  <div key={layer.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{layer.name}</span>
                      <span className={`text-xs font-mono ${textColor}`}>{layer.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${color}`}
                        initial={{ width: 0 }} animate={{ width: `${layer.score}%` }}
                        transition={{ duration: 1, delay: 0.5 }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 leading-snug">{layer.finding}</p>
                  </div>
                );
              })}
            </div>

            {/* Narrative */}
            {portrait.synthesizedNarrative && (
              <div className="glass rounded-xl p-5 border border-primary/10">
                <Brain className="h-3.5 w-3.5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {portrait.synthesizedNarrative}
                </p>
                <button onClick={() => navigate("/advisor")} className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
                  Talk to Anchor about this →
                </button>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
