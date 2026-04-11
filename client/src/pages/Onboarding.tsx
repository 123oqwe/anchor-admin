import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Anchor,
  Brain,
  Eye,
  Shield,
  Zap,
  ArrowRight,
  Scan,
  CheckCircle2,
  Sparkles,
  Activity,
  Users,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const capabilities = [
  {
    icon: Eye,
    title: "Observes You",
    desc: "Reads your calendar, emails, tasks, and behavior to build a living model of who you are.",
  },
  {
    icon: Brain,
    title: "Thinks For You",
    desc: "Surfaces what matters, detects avoidance, and makes decisions you didn't know you needed.",
  },
  {
    icon: Zap,
    title: "Acts With You",
    desc: "Drafts emails, creates plans, and executes — but only with your explicit permission.",
  },
  {
    icon: Shield,
    title: "Evolves Into You",
    desc: "Over time, it becomes a digital twin that thinks, decides, and acts like a second version of you.",
  },
];

const scanPhases = [
  { label: "Scanning calendar events...", duration: 1200 },
  { label: "Analyzing email patterns...", duration: 1400 },
  { label: "Mapping relationships...", duration: 1000 },
  { label: "Detecting decision patterns...", duration: 1600 },
  { label: "Building your Human Graph...", duration: 1800 },
  { label: "Generating state projection...", duration: 1000 },
];

const graphSummary = {
  domains: [
    { name: "Work", nodes: 12, color: "bg-blue-500" },
    { name: "Relationships", nodes: 8, color: "bg-purple-500" },
    { name: "Growth", nodes: 5, color: "bg-emerald-500" },
    { name: "Health", nodes: 3, color: "bg-amber-500" },
  ],
  totalNodes: 28,
  insights: [
    "3 relationships showing decay — Matt Zhang, Sarah Chen, Alex Rivera",
    "YC Application delayed 3 times — avoidance pattern detected",
    "Peak productivity: 10am–1pm, energy drops after 3pm",
    "You tend to delay high-stakes decisions by 2–3 days",
  ],
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"intro" | "scanning" | "result">("intro");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhaseIdx, setScanPhaseIdx] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    if (phase !== "scanning") return;
    let idx = 0;
    let progress = 0;
    const totalDuration = scanPhases.reduce((a, b) => a + b.duration, 0);

    const runPhase = () => {
      if (idx >= scanPhases.length) {
        setScanProgress(100);
        setScanComplete(true);
        setTimeout(() => setPhase("result"), 600);
        return;
      }
      setScanPhaseIdx(idx);
      const phaseDuration = scanPhases[idx].duration;
      const increment = (phaseDuration / totalDuration) * 100;
      const steps = 20;
      const stepTime = phaseDuration / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        progress += increment / steps;
        setScanProgress(Math.min(progress, 99));
        if (step >= steps) {
          clearInterval(interval);
          idx++;
          runPhase();
        }
      }, stepTime);
    };

    runPhase();
  }, [phase]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center dot-grid overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto px-8 text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex justify-center mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Anchor className="h-10 w-10 text-primary" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4"
            >
              Anchor
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="text-lg text-muted-foreground mb-2 font-medium"
            >
              The First System That Understands You
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="text-sm text-muted-foreground/70 max-w-lg mx-auto mb-12 leading-relaxed"
            >
              Anchor is not an app. It's a mirror. When you open it, you don't see tools — you see yourself: 
              your state, your priorities, your blind spots, and the single most important thing you should do right now.
            </motion.p>

            {/* Capabilities */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
            >
              {capabilities.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <motion.div
                    key={cap.title}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                    className="glass rounded-xl p-5 text-left group hover:bg-white/[0.07] transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{cap.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => setPhase("scanning")}
                className="flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group"
              >
                <Scan className="h-5 w-5 group-hover:animate-pulse" />
                Scan My Last 14 Days
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-2 px-6 py-4 rounded-xl glass text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.07] transition-all"
              >
                Skip to Dashboard
              </button>
            </motion.div>

            {/* Trust note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="mt-8 text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1.5"
            >
              <Shield className="h-3 w-3" />
              All data stays local. Anchor never acts without your permission.
            </motion.p>
          </motion.div>
        )}

        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto px-8 text-center"
          >
            {/* Animated scan visual */}
            <div className="relative w-40 h-40 mx-auto mb-8">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.div
                className="absolute inset-8 rounded-full border-2 border-primary/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.2, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Activity className="h-10 w-10 text-primary" />
                </motion.div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">Building Your Human Graph</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Analyzing 14 days of behavior to understand how you think, decide, and act.
            </p>

            {/* Progress */}
            <div className="glass rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-mono">
                  {scanPhases[scanPhaseIdx]?.label || "Finalizing..."}
                </span>
                <span className="text-xs font-mono text-primary">{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>

            {/* Scan items appearing */}
            <div className="space-y-2">
              {scanPhases.slice(0, scanPhaseIdx + 1).map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {i < scanPhaseIdx ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : (
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    </motion.div>
                  )}
                  <span>{p.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto px-8"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Human Graph is Ready</h2>
              <p className="text-sm text-muted-foreground">
                We analyzed 14 days of your digital behavior. Here's what we found.
              </p>
            </div>

            {/* Domain summary */}
            <div className="glass rounded-xl p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Domains Detected</h3>
                <span className="text-xs font-mono text-muted-foreground">{graphSummary.totalNodes} nodes total</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {graphSummary.domains.map((d) => (
                  <div key={d.name} className="glass rounded-lg p-3 text-center">
                    <div className={`w-3 h-3 rounded-full ${d.color} mx-auto mb-2`} />
                    <span className="text-xs font-medium text-foreground block">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground">{d.nodes} nodes</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key insights */}
            <div className="glass rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-foreground mb-3">Key Insights</h3>
              <div className="space-y-2.5">
                {graphSummary.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.15 }}
                    className="flex items-start gap-2.5 text-xs text-muted-foreground"
                  >
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Enter Dashboard */}
            <div className="text-center">
              <button
                onClick={() => setLocation("/dashboard")}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group"
              >
                <Target className="h-5 w-5" />
                Enter Your Decision OS
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
