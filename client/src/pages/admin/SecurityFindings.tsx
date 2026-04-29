/**
 * Admin · Security · Findings — every detector observation, filterable.
 *
 * Alerts are the "operator-visible incidents"; findings are the raw rows
 * that fed those alerts. Useful when an alert says "5 floods detected"
 * and you want to see which 5 emails / when / which detector tick.
 */
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";

const DETECTORS = ["", "auth-abuse", "cost-anomaly", "output-exfil", "env-canary", "pentest"];

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-300", high: "text-orange-300", medium: "text-amber-300", low: "text-muted-foreground",
};

export default function SecurityFindings() {
  const [findings, setFindings] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try { setFindings(await api.secFindings(filter || undefined)); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-6xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="h-5 w-5 text-amber-400" /> Findings</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-md bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40">
          {DETECTORS.map(d => <option key={d} value={d}>{d || "All detectors"}</option>)}
        </select>
      </div>
      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[120px_70px_1fr_140px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border/30">
          <span>Detector</span><span>Sev</span><span>Payload</span><span>When</span>
        </div>
        {findings.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No findings.</div>}
        {findings.map(f => (
          <div key={f.id} className="grid grid-cols-[120px_70px_1fr_140px] gap-2 px-4 py-2 text-xs items-start border-b border-white/5 last:border-0">
            <span className="font-mono text-[11px] text-foreground">{f.detector}</span>
            <span className={`font-mono text-[10px] ${SEV_COLOR[f.severity] ?? ""}`}>{f.severity}</span>
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">{f.payload_json}</pre>
            <span className="text-muted-foreground font-mono text-[10px]">{f.created_at?.slice(5, 16)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
