/**
 * Admin · Exec Metrics — Anthropic prompt-cache observability.
 *
 * Surfaces hit rate, tokens, $ saved over the last 24h with a per-task
 * breakdown so we can tell which tasks benefit most (and which have
 * dynamic prompts that defeat the cache).
 *
 * If hit-rate is consistently 0 ⇒ OpenRouter isn't forwarding
 * cacheControl, or the system prompts are non-deterministic. Either
 * way, the page is the fastest signal we'd have.
 */
import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

interface Stats {
  windowHours: number;
  callCount: number;
  hitRate: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estSavedUsd: number;
  byTask: Array<{
    task: string;
    callCount: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    hitRate: number;
    estSavedUsd: number;
  }>;
}

interface Bucket {
  hour: string;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  inputTokens: number;
  hitRate: number;
  estSavedUsd: number;
}

interface RuntimeNamespace {
  namespace: string;
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

interface RuntimeCache {
  namespaces: RuntimeNamespace[];
  capturedAt: string;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ExecMetrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [series, setSeries] = useState<Bucket[]>([]);
  const [runtime, setRuntime] = useState<RuntimeCache | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [s, t, r] = await Promise.all([
        api.execCacheMetrics(),
        api.execCacheTimeseries(),
        api.execRuntimeCache().catch(() => null),
      ]);
      setStats(s); setSeries(t); setRuntime(r);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); const i = setInterval(reload, 30_000); return () => clearInterval(i); }, []);

  if (loading || !stats) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;
  }

  const noData = stats.callCount === 0;
  const hitRatePct = (stats.hitRate * 100).toFixed(1);

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" /> Exec Metrics
        </h1>
        <div className="text-[10px] text-muted-foreground">last {stats.windowHours}h · auto-refresh 30s</div>
      </div>

      {noData && (
        <div className="glass rounded-xl p-4 text-xs text-muted-foreground">
          No prompt-cache activity in the last {stats.windowHours}h yet. Once
          Cortex is invoked with an Anthropic-routed task, rows will appear.
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Tile label="Cache hit rate" value={`${hitRatePct}%`} tone={stats.hitRate > 0.3 ? "emerald" : undefined} />
        <Tile label="Tokens read (cached)" value={fmtTokens(stats.totalCacheReadTokens)} />
        <Tile label="Tokens written" value={fmtTokens(stats.totalCacheCreationTokens)} />
        <Tile label="$ saved" value={`$${stats.estSavedUsd.toFixed(4)}`} tone="emerald" />
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Hourly hit rate · {series.length} buckets
        </h2>
        {series.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No buckets yet.</div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.map(s => ({
                hour: s.hour.slice(11, 16),
                hitRate: Math.round(s.hitRate * 1000) / 10,
                tokensRead: s.cacheReadTokens,
              }))}>
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", fontSize: 11 }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Line type="monotone" dataKey="hitRate" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">By task · top 30</h2>
        <table className="w-full text-xs">
          <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pb-1">Task</th>
            <th className="text-right pb-1">Calls</th>
            <th className="text-right pb-1">Hit rate</th>
            <th className="text-right pb-1">Cached tokens</th>
            <th className="text-right pb-1">Saved</th>
          </tr></thead>
          <tbody>
            {stats.byTask.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No tasks yet.</td></tr>
            )}
            {stats.byTask.map(t => (
              <tr key={t.task} className="border-t border-white/5">
                <td className="py-1.5 font-mono">{t.task}</td>
                <td className="py-1.5 text-right tabular-nums">{t.callCount}</td>
                <td className={`py-1.5 text-right tabular-nums ${t.hitRate > 0.3 ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {(t.hitRate * 100).toFixed(1)}%
                </td>
                <td className="py-1.5 text-right tabular-nums text-amber-400">{fmtTokens(t.cacheReadTokens)}</td>
                <td className="py-1.5 text-right tabular-nums text-emerald-400">${t.estSavedUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground/70 leading-relaxed">
        $-saved estimate uses Sonnet input rate ($3/M) × 0.9 (cache discount).
        Actual savings depend on the routed model. Cache TTL is Anthropic's
        ephemeral 5-minute window — low-frequency tasks will show 0% hit rate.
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            Runtime caches (in-process)
          </h2>
          <span className="text-[10px] text-muted-foreground/60">
            {runtime ? `captured ${new Date(runtime.capturedAt).toLocaleTimeString()}` : "—"}
          </span>
        </div>
        {!runtime ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            anchor-backend unreachable.
          </div>
        ) : runtime.namespaces.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No cache activity yet (LRU is per-process, resets on restart).
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left pb-1">Namespace</th>
              <th className="text-right pb-1">Entries</th>
              <th className="text-right pb-1">Hits</th>
              <th className="text-right pb-1">Misses</th>
              <th className="text-right pb-1">Evicted</th>
              <th className="text-right pb-1">Hit rate</th>
            </tr></thead>
            <tbody>
              {runtime.namespaces.map(n => (
                <tr key={n.namespace} className="border-t border-white/5">
                  <td className="py-1.5 font-mono">{n.namespace}</td>
                  <td className="py-1.5 text-right tabular-nums">{n.size}</td>
                  <td className="py-1.5 text-right tabular-nums text-amber-400">{n.hits}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{n.misses}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{n.evictions}</td>
                  <td className={`py-1.5 text-right tabular-nums ${n.hitRate > 0.3 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {(n.hitRate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="text-[10px] text-muted-foreground/70 mt-2">
          tool-result = EXEC-2 (web_search / read_url etc.); guardrail = EXEC-5
          (Haiku verdict cache). Stats reset on anchor-backend restart.
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "emerald" }) {
  return (
    <div className={`glass rounded-xl p-4 ${tone === "emerald" ? "border border-emerald-500/20" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${tone === "emerald" ? "text-emerald-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
