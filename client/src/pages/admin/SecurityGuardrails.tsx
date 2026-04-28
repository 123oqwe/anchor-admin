/**
 * Admin · Security · Guardrails — input-side violations (PII / jailbreak / prompt-inject).
 */
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

const VERDICT_COLOR: Record<string, string> = {
  block: "text-red-400 bg-red-500/10",
  redact: "text-amber-400 bg-amber-500/10",
  flag: "text-blue-400 bg-blue-500/10",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-muted-foreground",
};

export default function SecurityGuardrails() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ detector: string; verdict: string }>({ detector: "", verdict: "" });
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [r, s] = await Promise.all([api.guardrailList(filter), api.guardrailSummary()]);
    setRows(r); setSummary(s); setLoading(false);
  };
  useEffect(() => { reload(); }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-6xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-400" /> Input guardrails</h1>

      {summary.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Last 24h by detector × verdict</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {summary.map((s, i) => (
              <div key={i} className="border border-white/5 rounded p-2">
                <div className="text-xs flex items-baseline justify-between">
                  <span className="font-mono">{s.detector}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${VERDICT_COLOR[s.verdict] ?? ""}`}>{s.verdict}</span>
                </div>
                <div className="text-2xl font-semibold tabular-nums mt-1 text-amber-400">{s.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <select value={filter.detector} onChange={e => setFilter(f => ({ ...f, detector: e.target.value }))}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="">detector: all</option>
          <option value="pii">pii</option>
          <option value="jailbreak">jailbreak</option>
          <option value="prompt-injection">prompt-injection</option>
        </select>
        <select value={filter.verdict} onChange={e => setFilter(f => ({ ...f, verdict: e.target.value }))}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="">verdict: all</option>
          <option value="block">block</option>
          <option value="redact">redact</option>
          <option value="flag">flag</option>
        </select>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[120px_120px_80px_80px_1fr_120px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
          <span>Time</span><span>Detector</span><span>Sev</span><span>Verdict</span><span>Preview</span><span>Pattern</span>
        </div>
        {rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No violations.</div>}
        {rows.map(v => (
          <div key={v.id} className="grid grid-cols-[120px_120px_80px_80px_1fr_120px] gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-0">
            <span className="text-muted-foreground font-mono text-[10px]">{v.created_at?.slice(5, 16)}</span>
            <span className="font-mono text-[11px]">{v.detector}</span>
            <span className={`font-mono text-[10px] ${SEVERITY_COLOR[v.severity] ?? ""}`}>{v.severity}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded w-fit ${VERDICT_COLOR[v.verdict] ?? ""}`}>{v.verdict}</span>
            <span className="text-muted-foreground truncate" title={v.preview}>{v.preview}</span>
            <span className="text-muted-foreground/80 font-mono text-[10px]">{v.pattern}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
