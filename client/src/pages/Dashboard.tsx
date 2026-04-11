import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Target,
  Activity,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Send,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Users,
  Heart,
  TrendingUp,
  DollarSign,
  GraduationCap,
  UserCircle,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  Plus,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663309741543/XAV3v9QesjBrkPBXbAU6Pq/anchor-hero-DjRHG9Uoj6QKRBdMyZK5DP.webp";

const stateMetrics = [
  { label: "Energy", value: 72, icon: Zap, color: "var(--energy-color)" },
  { label: "Focus", value: 85, icon: Target, color: "var(--focus-color)" },
  { label: "Stress", value: 34, icon: Activity, color: "var(--stress-color)" },
];

const todayDecision = {
  title: "Finish YC application draft",
  reason: "You've delayed this 3 times. Completing it today unlocks 2 downstream tasks and aligns with your Q2 commitment.",
  urgency: "high",
  source: "Decision Agent — priority inference + avoidance detection",
};

// Domain-based Human Graph data
interface GraphItem {
  id: string;
  label: string;
  type: "goal" | "person" | "task" | "opportunity" | "pattern";
  status: string;
  captured: string;
  detail: string;
}

interface Domain {
  id: string;
  name: string;
  icon: typeof Briefcase;
  color: string;
  bgColor: string;
  borderColor: string;
  nodeCount: number;
  health: number; // 0-100
  items: GraphItem[];
}

const domains: Domain[] = [
  {
    id: "work",
    name: "Work & Career",
    icon: Briefcase,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    nodeCount: 12,
    health: 78,
    items: [
      { id: "w1", label: "YC Application", type: "goal", status: "delayed", captured: "Command input, 3 days ago", detail: "Delayed 3 times. Highest priority — completing unlocks 2 downstream tasks." },
      { id: "w2", label: "Product Roadmap v2", type: "goal", status: "active", captured: "Workspace project creation", detail: "On track. 60% complete, next milestone: user testing framework." },
      { id: "w3", label: "Technical Architecture", type: "task", status: "in-progress", captured: "Advisor conversation, 2 days ago", detail: "Backend integration plan drafted. Needs CTO review." },
      { id: "w4", label: "Hire CTO", type: "opportunity", status: "active", captured: "Email thread analysis", detail: "3 candidates in pipeline. Alex Rivera strongest — schedule intro call." },
      { id: "w5", label: "Team Standup", type: "task", status: "overdue", captured: "Calendar sync", detail: "Missed last 2 standups. Team morale risk detected." },
    ],
  },
  {
    id: "relationships",
    name: "Relationships",
    icon: Users,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    nodeCount: 8,
    health: 52,
    items: [
      { id: "r1", label: "Matt Zhang", type: "person", status: "decaying", captured: "Calendar sync, last meeting 5 days ago", detail: "3 days silent. Previously discussed Series B prep — should follow up." },
      { id: "r2", label: "Sarah Chen (Sequoia)", type: "person", status: "decaying", captured: "Email thread analysis", detail: "Investor contact. Follow-up overdue by 4 days." },
      { id: "r3", label: "Alex Rivera (CTO candidate)", type: "person", status: "opportunity", captured: "LinkedIn + email", detail: "Strong technical background. Intro call not yet scheduled." },
      { id: "r4", label: "Co-founder Alignment", type: "pattern", status: "stable", captured: "Meeting analysis", detail: "Communication frequency healthy. Last sync: yesterday." },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    nodeCount: 5,
    health: 45,
    items: [
      { id: "f1", label: "Pre-Seed Fundraising", type: "goal", status: "active", captured: "Workspace project", detail: "$500K target. 2 warm intros pending. Pitch deck needs metrics update." },
      { id: "f2", label: "Investor Follow-up", type: "task", status: "overdue", captured: "Draft center, auto-detected", detail: "3 investor emails pending response. Average delay: 4 days." },
      { id: "f3", label: "Runway Calculation", type: "task", status: "todo", captured: "Advisor suggestion", detail: "Current burn rate unknown. Should calculate before next investor meeting." },
    ],
  },
  {
    id: "growth",
    name: "Personal Growth",
    icon: GraduationCap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    nodeCount: 5,
    health: 65,
    items: [
      { id: "g1", label: "Decision Pattern: Avoidance", type: "pattern", status: "worsening", captured: "Twin Agent analysis, 3 months", detail: "You delay high-stakes decisions by 2-3 days. Writing tasks are most avoided." },
      { id: "g2", label: "Productivity Cycle", type: "pattern", status: "stable", captured: "Behavioral analysis", detail: "Peak: 10am-1pm. Significant drop after 3pm. Optimize scheduling accordingly." },
      { id: "g3", label: "Communication Style", type: "pattern", status: "evolving", captured: "Email + message analysis", detail: "Becoming more concise over time. Prefer async over sync communication." },
    ],
  },
  {
    id: "health",
    name: "Health & Wellbeing",
    icon: Heart,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    nodeCount: 3,
    health: 58,
    items: [
      { id: "h1", label: "Sleep Pattern", type: "pattern", status: "declining", captured: "Behavioral inference", detail: "Average 5.5h last week. Below your 7h baseline. Affects afternoon energy." },
      { id: "h2", label: "Exercise Routine", type: "task", status: "inactive", captured: "Calendar gap analysis", detail: "No exercise events detected in 2 weeks. Previously 3x/week." },
    ],
  },
];

const typeColors: Record<string, string> = {
  goal: "bg-blue-500/20 text-blue-400",
  person: "bg-purple-500/20 text-purple-400",
  task: "bg-emerald-500/20 text-emerald-400",
  opportunity: "bg-amber-500/20 text-amber-400",
  pattern: "bg-rose-500/20 text-rose-400",
};

const statusColors: Record<string, string> = {
  active: "text-emerald-400",
  "in-progress": "text-blue-400",
  delayed: "text-red-400",
  decaying: "text-amber-400",
  overdue: "text-red-400",
  opportunity: "text-blue-400",
  stable: "text-emerald-400",
  worsening: "text-red-400",
  evolving: "text-blue-400",
  declining: "text-amber-400",
  inactive: "text-muted-foreground",
  todo: "text-muted-foreground",
};

// Agent status component
function AgentStatus({ name, status, executions }: { name: string; status: "running" | "idle" | "success" | "error"; executions: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className={`w-1.5 h-1.5 rounded-full ${
        status === "running" ? "bg-blue-400 animate-pulse" :
        status === "success" ? "bg-emerald-400" :
        status === "error" ? "bg-red-400" :
        "bg-muted-foreground/30"
      }`} />
      <span className="text-muted-foreground">{name}</span>
      <div className="flex items-center gap-1 font-mono">
        <Plus className="h-2 w-2 text-emerald-400" />
        <span className="text-emerald-400">{executions}</span>
        <Minus className="h-2 w-2 text-red-400 ml-1" />
        <span className="text-red-400">{status === "error" ? 1 : 0}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [quickInput, setQuickInput] = useState("");
  const [stateValues, setStateValues] = useState(stateMetrics.map((m) => m.value));
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const selectedDomain = domains.find((d) => d.id === activeDomain);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setQuickInput("");
  };

  return (
    <div className="min-h-screen dot-grid">
      {/* Hero: Today's Decision */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative px-8 pt-8 pb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary tracking-wider uppercase">Decision Surface</span>
                  <span className="text-xs text-muted-foreground">— Today's Most Important Thing</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 max-w-2xl">
                  {todayDecision.title}
                </h1>
                <p className="text-base text-muted-foreground max-w-xl leading-relaxed mb-4">
                  {todayDecision.reason}
                </p>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    High Priority
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{todayDecision.source}</span>
                </div>
              </div>

              {/* Agent status panel */}
              <div className="hidden lg:block glass rounded-xl p-4 shrink-0 ml-8">
                <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-3">Active Agents</h4>
                <div className="space-y-2">
                  <AgentStatus name="Decision Agent" status="running" executions={14} />
                  <AgentStatus name="Observation Agent" status="success" executions={47} />
                  <AgentStatus name="Execution Agent" status="idle" executions={8} />
                  <AgentStatus name="Twin Agent" status="running" executions={23} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {/* State Projection */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">State Projection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stateMetrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="glass rounded-xl p-5 group hover:bg-white/[0.07] transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: metric.color }} />
                      <span className="text-sm font-medium text-foreground">{metric.label}</span>
                    </div>
                    <span className="text-2xl font-bold font-mono" style={{ color: metric.color }}>
                      {stateValues[i]}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: metric.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${stateValues[i]}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stateValues[i]}
                    onChange={(e) => {
                      const newValues = [...stateValues];
                      newValues[i] = parseInt(e.target.value);
                      setStateValues(newValues);
                    }}
                    className="w-full mt-3 h-1 appearance-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Quick Input */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <form onSubmit={handleQuickSubmit} className="relative">
            <div className="glass rounded-xl overflow-hidden flex items-center group focus-within:border-primary/30 transition-colors">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="What's on your mind? Quick command to resolve something..."
                className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button type="submit" className="px-5 py-4 text-muted-foreground hover:text-primary transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </motion.section>

        {/* Human Graph — Domain Visualization */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Human Graph</h2>
            <span className="text-xs text-muted-foreground font-mono">
              {domains.reduce((a, d) => a + d.nodeCount, 0)} nodes across {domains.length} domains
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!activeDomain ? (
              /* Domain overview — interactive clusters */
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {domains.map((domain, i) => {
                  const Icon = domain.icon;
                  return (
                    <motion.div
                      key={domain.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      onClick={() => setActiveDomain(domain.id)}
                      className={`glass rounded-xl p-5 cursor-pointer hover:bg-white/[0.07] transition-all group relative overflow-hidden`}
                      style={{ borderWidth: "1px", borderColor: "transparent" }}
                      whileHover={{ borderColor: "rgba(255,255,255,0.1)" }}
                    >
                      {/* Background glow */}
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${domain.bgColor} opacity-30 blur-2xl group-hover:opacity-50 transition-opacity`} />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${domain.bgColor} flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${domain.color}`} />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-foreground">{domain.name}</h3>
                              <span className="text-[10px] text-muted-foreground">{domain.nodeCount} nodes</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Health bar */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] text-muted-foreground">Health</span>
                          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full`}
                              style={{ backgroundColor: domain.health > 70 ? "#34d399" : domain.health > 40 ? "#fbbf24" : "#f87171" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${domain.health}%` }}
                              transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{domain.health}%</span>
                        </div>

                        {/* Preview items */}
                        <div className="space-y-1">
                          {domain.items.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <div className={`w-1 h-1 rounded-full ${statusColors[item.status]?.replace("text-", "bg-") || "bg-muted-foreground"}`} />
                              <span className="truncate">{item.label}</span>
                              <span className={`${statusColors[item.status] || ""} ml-auto shrink-0`}>{item.status}</span>
                            </div>
                          ))}
                          {domain.items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground/50">+{domain.items.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              /* Domain detail view */
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => { setActiveDomain(null); setExpandedItem(null); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to all domains
                </button>

                {selectedDomain && (
                  <div className="glass rounded-xl overflow-hidden">
                    {/* Domain header */}
                    <div className="p-5 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${selectedDomain.bgColor} flex items-center justify-center`}>
                          <selectedDomain.icon className={`h-5 w-5 ${selectedDomain.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{selectedDomain.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{selectedDomain.nodeCount} nodes</span>
                            <span>Health: {selectedDomain.health}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="p-3 space-y-1">
                      {selectedDomain.items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                        >
                          <div
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group"
                          >
                            <Badge className={`text-[9px] font-mono shrink-0 ${typeColors[item.type] || ""}`}>
                              {item.type}
                            </Badge>
                            <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                            <span className={`text-[10px] font-mono ${statusColors[item.status] || "text-muted-foreground"}`}>
                              {item.status}
                            </span>
                            <motion.div animate={{ rotate: expandedItem === item.id ? 90 : 0 }} transition={{ duration: 0.15 }}>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </motion.div>
                          </div>

                          <AnimatePresence>
                            {expandedItem === item.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 ml-16">
                                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{item.detail}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                                    <Clock className="h-3 w-3" />
                                    <span>Captured: {item.captured}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
