/**
 * Admin · Security — overview tile + active alert summary + last pentest run.
 *
 * Numbers come from anchor-security via the admin-backend proxy. This page
 * is read-only — ack/resolve actions live on /admin/security/alerts.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, ShieldAlert, Bug, Activity, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function Security() {
  const { can } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const reload = async () => {
    try { setData(await api.secOverview()); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); const i = setInterval(reload, 10_000); return () => clearInterval(i); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;
  const sev = data?.alertsBySeverity ?? {};
  const last = data?.lastPentest;

  const runDetectors = async () => {
    setRunning(true);
    try { await api.secRunDetect(); await reload(); } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-400" /> Security</h1>
          <p className="text-xs text-muted-foreground mt-1">Out-of-band detectors + pentest runner. anchor-security :3004 (proxied).</p>
        </div>
        {can("security.pentest") && (
          <button onClick={runDetectors} disabled={running}
            className="flex items-center gap-1.5 rounded-md glass hover:bg-accent/30 px-3 py-1.5 text-xs disabled:opacity-50">
            <Activity className="h-3 w-3" /> {running ? "Running…" : "Run detectors now"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Open alerts" value={data?.alertsOpen ?? 0} tone={data?.alertsOpen > 0 ? "warn" : "neutral"} />
        <Tile label="Critical" value={sev.critical ?? 0} tone={sev.critical > 0 ? "danger" : "neutral"} />
        <Tile label="High" value={sev.high ?? 0} tone={sev.high > 0 ? "warn" : "neutral"} />
        <Tile label="Findings (24h)" value={data?.findings24h ?? 0} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5" /> Alerts</h2>
          <p className="text-xs text-muted-foreground mb-3">{data?.alertsOpen ?? 0} open. Ack to silence dedupe; resolve when fixed.</p>
          <Link href="/admin/security/alerts">
            <div className="text-xs text-amber-400 hover:underline flex items-center gap-1">Open alerts queue <ChevronRight className="h-3 w-3" /></div>
          </Link>
        </div>
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"><Bug className="h-3.5 w-3.5" /> Pentest</h2>
          {last ? (
            <div className="text-xs space-y-1">
              <div>Last run <span className="font-mono text-muted-foreground">{last.id?.slice(0, 10)}</span></div>
              <div>{last.passed}/{last.total} passed{last.failed > 0 && <span className="text-red-400"> · {last.failed} FAILED</span>}</div>
              <div className="text-muted-foreground">{last.started_at}</div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No pentests run yet.</p>
          )}
          <Link href="/admin/security/pentest">
            <div className="mt-3 text-xs text-amber-400 hover:underline flex items-center gap-1">Open pentest console <ChevronRight className="h-3 w-3" /></div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "neutral" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-red-400 border-red-500/20"
            : tone === "warn"   ? "text-amber-400 border-amber-500/20"
            : "text-foreground border-white/5";
  return (
    <div className={`glass rounded-xl p-4 border ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
