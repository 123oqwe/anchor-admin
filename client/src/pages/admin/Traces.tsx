/**
 * Admin · Traces — Portkey-style LLM call inspector.
 *
 * Top: filter chips that always live above the data (no hidden modal).
 * Body: dense scrollable list with model/user/cost/latency/status per row.
 * Click row → side-panel slides out with full request/response/guardrail report.
 * Top-right: live toggle (default on; SSE streams new calls).
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Activity, Search, X, Pause, Play } from "lucide-react";
import { api } from "@/lib/api";

const STATUS_COLOR: Record<string, string> = {
  success: "text-emerald-400",
  fallback: "text-amber-400",
  failed: "text-red-400",
  cache: "text-blue-400",
};

interface Filters {
  model: string;
  status: string;
  task: string;
  user_id: string;
  min_cost: string;
  max_latency: string;
  trace_id: string;
}

const EMPTY_FILTERS: Filters = { model: "", status: "", task: "", user_id: "", min_cost: "", max_latency: "", trace_id: "" };

export default function Traces() {
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<any | null>(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    api.traceList(params).then(setRows).finally(() => setLoading(false));
  }, [filters]);

  // SSE live stream
  useEffect(() => {
    if (!live) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    const es = new EventSource("/api/admin/traces/stream/sse", { withCredentials: true });
    esRef.current = es;
    es.addEventListener("trace", (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data);
        setRows(prev => [row, ...prev].slice(0, 200));
      } catch { /* ignore */ }
    });
    return () => { es.close(); esRef.current = null; };
  }, [live]);

  const setF = (k: keyof Filters, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const clearAll = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="flex flex-col h-screen p-6 max-w-[1400px]">
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-amber-400" /> Traces</h1>
        <button onClick={() => setLive(l => !l)}
          className="flex items-center gap-1.5 rounded-md glass hover:bg-accent/30 px-3 py-1.5 text-xs">
          {live ? <><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE</> : <><Pause className="h-3 w-3" /> paused</>}
        </button>
      </div>

      {/* Filter strip — always visible */}
      <div className="flex flex-wrap gap-2 items-center mb-3 text-xs">
        <div className="flex items-center gap-1 glass rounded-md px-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input value={filters.trace_id} onChange={e => setF("trace_id", e.target.value)}
            placeholder="trace ID..."
            className="bg-transparent px-1 py-1.5 w-44 focus:outline-none" />
        </div>
        <select value={filters.model} onChange={e => setF("model", e.target.value)}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="">model: any</option>
          <option value="anthropic/claude-sonnet-4">claude-sonnet-4</option>
          <option value="anthropic/claude-haiku-4-5">claude-haiku-4-5</option>
          <option value="openai/gpt-5">gpt-5</option>
          <option value="openai/gpt-5-mini">gpt-5-mini</option>
        </select>
        <select value={filters.status} onChange={e => setF("status", e.target.value)}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="">status: any</option>
          <option value="success">success</option>
          <option value="fallback">fallback</option>
          <option value="failed">failed</option>
        </select>
        <input value={filters.task} onChange={e => setF("task", e.target.value)} placeholder="task"
          className="rounded-md bg-background/50 px-2 py-1.5 w-32 focus:outline-none" />
        <input value={filters.user_id} onChange={e => setF("user_id", e.target.value)} placeholder="user_id"
          className="rounded-md bg-background/50 px-2 py-1.5 w-32 focus:outline-none font-mono text-[10px]" />
        <input value={filters.min_cost} onChange={e => setF("min_cost", e.target.value)} placeholder="min $"
          className="rounded-md bg-background/50 px-2 py-1.5 w-20 focus:outline-none" type="number" step="0.001" />
        <input value={filters.max_latency} onChange={e => setF("max_latency", e.target.value)} placeholder="max ms"
          className="rounded-md bg-background/50 px-2 py-1.5 w-20 focus:outline-none" type="number" />
        {Object.values(filters).some(v => v) && (
          <button onClick={clearAll} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> clear
          </button>
        )}
      </div>

      {/* Trace table */}
      <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-[80px_180px_140px_90px_80px_80px_80px] gap-0 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
          <span>Time</span><span>Model</span><span>Task</span><span>Tok</span><span>Lat</span><span>Cost</span><span>Status</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>}
          {!loading && rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No traces match.</div>}
          {rows.map((r, i) => (
            <button key={r.id} onClick={() => api.traceGet(r.id).then(setSelected)}
              className={`w-full text-left grid grid-cols-[80px_180px_140px_90px_80px_80px_80px] gap-0 px-4 py-2 text-xs items-center hover:bg-white/[0.04] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
              <span className="text-muted-foreground font-mono text-[10px]">{r.created_at?.slice(11, 19)}</span>
              <span className="text-foreground font-mono text-[11px] truncate">{r.model_id}</span>
              <span className="text-muted-foreground text-[11px] truncate">{r.task}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{r.input_tokens ?? "?"} → {r.output_tokens ?? "?"}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{r.latency_ms}ms</span>
              <span className="text-amber-400 font-mono text-[10px]">${(r.cost_usd ?? 0).toFixed(5)}</span>
              <span className={`font-mono text-[10px] ${STATUS_COLOR[r.provider_id === "cache" ? "cache" : r.status] ?? "text-muted-foreground"}`}>
                {r.provider_id === "cache" ? "💾 cache" : r.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail side panel */}
      {selected && <TraceDetailPanel trace={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TraceDetailPanel({ trace, onClose }: { trace: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
      <aside className="absolute right-0 top-0 bottom-0 w-[560px] bg-background border-l border-border/30 pointer-events-auto overflow-y-auto custom-scrollbar p-5 space-y-4 text-xs">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Trace detail</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground break-all">{trace.id}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Task" value={trace.task} />
          <Field label="Status" value={trace.status} />
          <Field label="Model" value={trace.model_id} mono />
          <Field label="Provider" value={trace.provider_id} />
          <Field label="Latency" value={`${trace.latency_ms}ms`} mono />
          <Field label="Cost" value={`$${(trace.cost_usd ?? 0).toFixed(6)}`} mono className="text-amber-400" />
          <Field label="Tokens In" value={String(trace.input_tokens ?? "—")} mono />
          <Field label="Tokens Out" value={String(trace.output_tokens ?? "—")} mono />
          {trace.user_id && <Field label="User" value={trace.user_id} mono />}
          {trace.run_id && <Field label="Run" value={trace.run_id} mono />}
        </div>
        {trace.error && <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-300 text-[11px] font-mono">{trace.error}</div>}
        {trace.request_preview && <Section title="Request">{trace.request_preview}</Section>}
        {trace.response_preview && <Section title="Response">{trace.response_preview}</Section>}
        {trace.guardrails?.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Guardrails</h4>
            <ul className="space-y-1">
              {trace.guardrails.map((g: any, i: number) => (
                <li key={i} className="rounded bg-amber-500/5 border border-amber-500/20 px-2 py-1.5 font-mono text-[10px]">
                  {g.detector} / {g.pattern} → <span className="text-amber-400">{g.verdict}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-foreground ${mono ? "font-mono text-[11px]" : "text-xs"} ${className ?? ""}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <pre className="bg-white/5 rounded p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar text-foreground/80">{children}</pre>
    </div>
  );
}
