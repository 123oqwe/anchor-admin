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
} from "lucide-react";
import { api } from "@/lib/api";

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [portrait, setPortrait] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);

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
      // Extract people from graph
      const personNodes = graph?.domains?.flatMap((d: any) => d.items?.filter((i: any) => i.type === "person") ?? []) ?? [];
      setPeople(personNodes.slice(0, 3));
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
                <div key={p.id ?? p.label} className="glass rounded-xl px-4 py-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-purple-400" />
                    <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
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

        {/* ── Self-Portrait Narrative ─────────────────────────── */}
        {portrait?.synthesizedNarrative && (
          <motion.div {...fade} transition={{ delay: 0.65, duration: 0.5 }} className="mt-10">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-4">Your Mirror</h2>
            <div className="glass rounded-xl p-6 border border-primary/10">
              <Brain className="h-4 w-4 text-primary mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {portrait.synthesizedNarrative}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <span className="text-[10px] text-muted-foreground/50 font-mono">
                  Clarity: {portrait.overallClarity}/100
                </span>
                <button onClick={() => navigate("/advisor")} className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Talk to Anchor about this →
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
