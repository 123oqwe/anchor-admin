/**
 * Admin · Security · Alerts — full alert queue with ack/resolve.
 */
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Check, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-300 bg-red-500/10",
  high:     "text-orange-300 bg-orange-500/10",
  medium:   "text-amber-300 bg-amber-500/10",
  low:      "text-muted-foreground bg-muted/10",
};

const STATUS_COLOR: Record<string, string> = {
  open:     "text-amber-400",
  acked:    "text-blue-400",
  resolved: "text-emerald-400",
};

export default function SecurityAlerts() {
  const { can } = useSession();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("open");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try { setAlerts(await api.secAlerts(filter || undefined)); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-6xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-400" /> Alerts</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-md bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="acked">Acked</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_120px_1fr_140px_100px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border/30">
          <span>Severity</span><span>Source</span><span>Title</span><span>When</span><span className="text-right">Action</span>
        </div>
        {alerts.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No alerts.</div>}
        {alerts.map(a => (
          <div key={a.id} className="grid grid-cols-[80px_120px_1fr_140px_100px] gap-2 px-4 py-2.5 text-xs items-center border-b border-white/5 last:border-0">
            <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-mono ${SEV_COLOR[a.severity] ?? ""}`}>{a.severity}</span>
            <span className="text-muted-foreground font-mono text-[10px]">{a.source}</span>
            <div className="min-w-0">
              <div className="text-foreground truncate">{a.title}</div>
              <div className="text-muted-foreground text-[10px] truncate" title={a.body}>{a.body}</div>
            </div>
            <span className={`text-[10px] font-mono ${STATUS_COLOR[a.status] ?? ""}`}>
              {a.created_at?.slice(5, 16)} · {a.status}
            </span>
            <div className="flex justify-end gap-1">
              {can("security.ack") && a.status === "open" && (
                <button onClick={async () => { await api.secAckAlert(a.id); reload(); }}
                  className="p-1.5 hover:bg-blue-500/10 rounded text-blue-400" title="Ack">
                  <Check className="h-3 w-3" />
                </button>
              )}
              {can("security.ack") && a.status !== "resolved" && (
                <button onClick={async () => { await api.secResolveAlert(a.id); reload(); }}
                  className="p-1.5 hover:bg-emerald-500/10 rounded text-emerald-400" title="Resolve">
                  <CheckCheck className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
