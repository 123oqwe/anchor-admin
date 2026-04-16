import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Loader2, X, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

function CallDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [call, setCall] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.getCallDetail(id).then(setCall).catch(() => {});
  }, [id]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-strong rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border/30 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">LLM Call Detail</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        {!call ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-[10px] text-muted-foreground uppercase">Task</div><div className="text-foreground">{call.task}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Status</div>
                <Badge className={`${call.status === "success" ? "bg-emerald-500/10 text-emerald-400" : call.status === "fallback" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"} text-[10px]`}>{call.status}</Badge>
              </div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Model</div><div className="text-foreground font-mono text-[11px]">{call.model_id}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Provider</div><div className="text-foreground">{call.provider_id}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Latency</div><div className="text-foreground font-mono">{call.latency_ms}ms</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Cost</div><div className="text-amber-400 font-mono">${(call.cost_usd ?? 0).toFixed(6)}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Tokens In</div><div className="text-foreground font-mono">{call.input_tokens ?? "—"}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Tokens Out</div><div className="text-foreground font-mono">{call.output_tokens ?? "—"}</div></div>
            </div>

            {call.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-[10px] text-red-400 uppercase mb-1">Error</div>
                <div className="text-red-300 text-xs font-mono break-all">{call.error}</div>
              </div>
            )}

            {call.request_preview && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Input Preview</div>
                  <button onClick={() => copy(call.request_preview, "in")} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {copied === "in" ? <><Check className="h-3 w-3" />copied</> : <><Copy className="h-3 w-3" />copy</>}
                  </button>
                </div>
                <pre className="bg-white/5 rounded-lg p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar text-foreground/80">{call.request_preview}</pre>
              </div>
            )}

            {call.response_preview && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Output Preview</div>
                  <button onClick={() => copy(call.response_preview, "out")} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {copied === "out" ? <><Check className="h-3 w-3" />copied</> : <><Copy className="h-3 w-3" />copy</>}
                  </button>
                </div>
                <pre className="bg-white/5 rounded-lg p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar text-foreground/80">{call.response_preview}</pre>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Logs() {
  const [calls, setCalls] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [tab, setTab] = useState<"llm" | "agent">("llm");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    const [c, e] = await Promise.all([api.getCalls(100), api.getExecutions()]);
    setCalls(c); setExecutions(e); setLoading(false);
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Logs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Execution History</h1>
          <p className="text-sm text-muted-foreground">Live log · auto-refresh 5s · click any row for full detail.</p>

          <div className="flex gap-1 mt-4">
            <button onClick={() => setTab("llm")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "llm" ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
              LLM Calls ({calls.length})
            </button>
            <button onClick={() => setTab("agent")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "agent" ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
              Agent Events ({executions.length})
            </button>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        {tab === "llm" ? (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[80px_140px_1fr_140px_60px_70px_70px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
              <span>Time</span><span>Task</span><span>Model</span><span>Tokens</span><span>Latency</span><span>Cost</span><span>Status</span>
            </div>
            {calls.map((c, i) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className={`w-full grid grid-cols-[80px_140px_1fr_140px_60px_70px_70px] gap-0 px-4 py-2 text-xs items-center hover:bg-white/[0.04] transition-colors text-left ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <span className="text-muted-foreground font-mono text-[10px]">{new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <Badge className="text-[9px] bg-white/5 text-muted-foreground w-fit">{c.task}</Badge>
                <span className="text-foreground font-mono text-[11px] truncate">{c.model_id}</span>
                <span className="text-muted-foreground font-mono text-[10px]">{c.input_tokens ?? "?"} → {c.output_tokens ?? "?"}</span>
                <span className="text-muted-foreground font-mono text-[10px]">{c.latency_ms}ms</span>
                <span className="text-amber-400 font-mono text-[10px]">${(c.cost_usd ?? 0).toFixed(5)}</span>
                <span className={`text-[10px] font-mono ${c.status === "success" ? "text-emerald-400" : c.status === "fallback" ? "text-amber-400" : "text-red-400"}`}>{c.status}</span>
              </button>
            ))}
            {calls.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">No LLM calls yet</div>}
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[80px_140px_1fr_80px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
              <span>Time</span><span>Agent</span><span>Action</span><span>Status</span>
            </div>
            {executions.map((e, i) => (
              <div key={e.id} className={`grid grid-cols-[80px_140px_1fr_80px] gap-0 px-4 py-2.5 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <span className="text-muted-foreground font-mono text-[10px]">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <Badge className="text-[9px] bg-white/5 text-muted-foreground w-fit">{e.agent}</Badge>
                <span className="text-foreground/80 truncate">{e.action}</span>
                <span className={`text-[10px] font-mono ${e.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{e.status}</span>
              </div>
            ))}
            {executions.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">No agent events yet</div>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedId && <CallDetail id={selectedId} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
