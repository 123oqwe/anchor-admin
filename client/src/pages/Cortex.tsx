import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Loader2, Key, Zap, Eye, Image, Video, Mic, Volume2,
  Music, Box, Bot, Search, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

// ── Capability icon/label mapping ───────────────────────────────────────────

const CAPABILITY_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  text:        { icon: Bot,      label: "Text LLM",        color: "text-blue-400" },
  reasoning:   { icon: Zap,      label: "Reasoning",       color: "text-amber-400" },
  vision:      { icon: Eye,      label: "Vision",          color: "text-purple-400" },
  image_gen:   { icon: Image,    label: "Image Gen",       color: "text-pink-400" },
  video_gen:   { icon: Video,    label: "Video Gen",       color: "text-rose-400" },
  stt:         { icon: Mic,      label: "Speech-to-Text",  color: "text-emerald-400" },
  tts:         { icon: Volume2,  label: "Text-to-Speech",  color: "text-teal-400" },
  music:       { icon: Music,    label: "Music",           color: "text-indigo-400" },
  sound_fx:    { icon: Volume2,  label: "Sound FX",        color: "text-cyan-400" },
  voice_clone: { icon: Mic,      label: "Voice Clone",     color: "text-orange-400" },
  embeddings:  { icon: Search,   label: "Embeddings",      color: "text-sky-400" },
  avatar:      { icon: Bot,      label: "Avatar",          color: "text-violet-400" },
  "3d_gen":    { icon: Box,      label: "3D Generation",   color: "text-lime-400" },
};

// ── Task label mapping ──────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  decision: "Decision Agent",
  general_chat: "General Chat",
  react_execution: "Execution Agent (ReAct)",
  twin_edit_learning: "Twin — Edit Learning",
  twin_result_learning: "Twin — Result Learning",
  morning_digest: "Morning Digest",
  weekly_reflection: "Weekly Reflection",
  deep_reasoning: "Deep Reasoning",
  image_generation: "Image Generation",
  video_generation: "Video Generation",
  speech_to_text: "Speech-to-Text",
  text_to_speech: "Text-to-Speech",
  music_generation: "Music Generation",
  sound_effects: "Sound Effects",
  voice_cloning: "Voice Cloning",
  avatar_generation: "Avatar Generation",
  three_d_generation: "3D Generation",
  embed: "Embeddings",
  vision_analysis: "Vision Analysis",
};

export default function Cortex() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    api.getCortexStatus().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Failed to load</div>;

  const { activeProviders, providerSlots, capabilities } = data;
  const totalProviders = providerSlots.length;
  const activeCount = activeProviders.length;
  const totalCapabilities = capabilities.length;
  const activeCapabilities = capabilities.filter((c: any) => c.active).length;

  const toggleProvider = (id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredProviders = providerSlots.filter((p: any) => {
    if (filter === "active") return p.active;
    if (filter === "inactive") return !p.active;
    return true;
  });

  // Group capabilities by type
  const capByType: Record<string, any[]> = {};
  for (const cap of capabilities) {
    const key = cap.capability;
    if (!capByType[key]) capByType[key] = [];
    capByType[key].push(cap);
  }

  return (
    <div className="min-h-screen dot-grid">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wider uppercase">Cortex</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Model Platform</h1>
          <p className="text-sm text-muted-foreground">All providers, all models, all capabilities. Fill an API key to activate.</p>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-foreground">{activeCount}</div>
              <div className="text-[10px] text-muted-foreground">Active Providers</div>
            </div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-foreground">{totalProviders}</div>
              <div className="text-[10px] text-muted-foreground">Total Providers</div>
            </div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-foreground">{activeCapabilities}/{totalCapabilities}</div>
              <div className="text-[10px] text-muted-foreground">Capabilities Online</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {/* ── Capability Overview ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Capabilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Object.entries(capByType).map(([capKey, tasks]) => {
              const meta = CAPABILITY_META[capKey] ?? { icon: Cpu, label: capKey, color: "text-muted-foreground" };
              const Icon = meta.icon;
              const anyActive = tasks.some((t: any) => t.active);
              return (
                <motion.div key={capKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-xl p-3 ${anyActive ? "border-primary/20" : "opacity-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${anyActive ? meta.color : "text-muted-foreground/50"}`} />
                    <span className="text-xs font-medium text-foreground">{meta.label}</span>
                    {anyActive
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />
                      : <XCircle className="h-3 w-3 text-muted-foreground/30 ml-auto" />}
                  </div>
                  <div className="space-y-1">
                    {tasks.map((t: any) => (
                      <div key={t.task} className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${t.active ? "bg-emerald-400" : "bg-muted-foreground/20"}`} />
                        <span className="text-[10px] text-muted-foreground truncate">{TASK_LABELS[t.task] ?? t.task}</span>
                        {t.active && t.availableModels?.[0] && (
                          <span className="text-[9px] text-primary font-mono ml-auto truncate max-w-[80px]">
                            {t.availableModels[0].name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Task Routing Table ───────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Task Routing</h2>
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px_1fr] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
              <span>Task</span>
              <span>Capability</span>
              <span>Tier</span>
              <span>Routed To</span>
            </div>
            {capabilities.map((cap: any, i: number) => {
              const meta = CAPABILITY_META[cap.capability];
              return (
                <div key={cap.task}
                  className={`grid grid-cols-[1fr_100px_100px_1fr] gap-0 px-4 py-2.5 text-sm items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <span className="text-foreground text-xs">{TASK_LABELS[cap.task] ?? cap.task}</span>
                  <Badge className={`text-[9px] w-fit ${meta ? `${meta.color} bg-white/5` : "text-muted-foreground bg-white/5"}`}>
                    {meta?.label ?? cap.capability}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{cap.preferredTier}</span>
                  {cap.active ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-foreground">{cap.availableModels[0]?.name}</span>
                      <span className="text-[9px] text-muted-foreground">({cap.availableModels[0]?.provider})</span>
                      {cap.availableModels.length > 1 && (
                        <span className="text-[9px] text-muted-foreground/50">+{cap.availableModels.length - 1} fallback</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
                      <span className="text-xs text-muted-foreground">No provider — add API key</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Provider List ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Providers ({activeCount}/{totalProviders})</h2>
            <div className="flex gap-1.5">
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? `All (${totalProviders})` : f === "active" ? `Active (${activeCount})` : `Inactive (${totalProviders - activeCount})`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {filteredProviders.map((p: any, i: number) => {
              const isExpanded = expandedProviders.has(p.id);
              const providerModels = capabilities.flatMap((c: any) =>
                c.availableModels?.filter((m: any) => m.provider === p.id) ?? []
              );
              const uniqueModels = Array.from(new Map(providerModels.map((m: any) => [m.id, m])).values());

              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className="glass rounded-xl overflow-hidden">
                  <button onClick={() => toggleProvider(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                    {p.active
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                    <span className={`text-sm font-medium flex-1 text-left ${p.active ? "text-foreground" : "text-muted-foreground"}`}>
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-muted-foreground/40" />
                      <code className="text-[10px] font-mono text-muted-foreground/60">{p.envKey}</code>
                      {p.active
                        ? <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400">Connected</Badge>
                        : <Badge className="text-[9px] bg-white/5 text-muted-foreground/40">Add Key</Badge>}
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-border/20 pt-2">
                      {p.active && uniqueModels.length > 0 ? (
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Available Models</span>
                          {uniqueModels.map((m: any) => (
                            <div key={m.id} className="flex items-center gap-2 py-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-xs text-foreground">{m.name}</span>
                              <code className="text-[9px] text-muted-foreground/60 font-mono">{m.id}</code>
                              <Badge className="text-[8px] bg-white/5 text-muted-foreground ml-auto">{m.tier}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : p.active ? (
                        <p className="text-xs text-muted-foreground">Connected but no models registered for current tasks.</p>
                      ) : (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Add this to your <code className="bg-white/5 px-1 rounded text-[10px]">.env</code> file:</p>
                          <code className="block bg-white/5 rounded px-3 py-2 text-[11px] font-mono text-foreground">
                            {p.envKey}=your-api-key-here
                          </code>
                          <p>Then restart the server. Models will auto-activate.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
