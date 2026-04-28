/**
 * Admin · Cache — semantic cache stats + entries + nuke button.
 */
import { useEffect, useState } from "react";
import { Loader2, Database, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function Cache() {
  const { can } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [s, e] = await Promise.all([api.cacheStats(), api.cacheEntries()]);
    setStats(s); setEntries(e); setLoading(false);
  };
  useEffect(() => { reload(); const i = setInterval(reload, 10_000); return () => clearInterval(i); }, []);

  const clear = async () => {
    if (!confirm("Clear ALL cache entries? This forces fresh LLM calls until rebuilt.")) return;
    await api.cacheClear();
    reload();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-5 w-5 text-amber-400" /> Semantic cache</h1>
        {can("super") && (
          <button onClick={clear} className="flex items-center gap-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 text-xs">
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Tile label="Cached entries" value={stats.entries.toLocaleString()} />
        <Tile label="Total cache hits" value={stats.totalHits.toLocaleString()} />
        <Tile label="$ saved" value={`$${stats.costSavedUsd.toFixed(4)}`} tone="emerald" />
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top tasks by hits</h2>
        <table className="w-full text-xs">
          <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pb-1">Task</th>
            <th className="text-right pb-1">Entries</th>
            <th className="text-right pb-1">Hits</th>
            <th className="text-right pb-1">Saved</th>
          </tr></thead>
          <tbody>
            {stats.byTask.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No data yet.</td></tr>}
            {stats.byTask.map((t: any) => (
              <tr key={t.task} className="border-t border-white/5">
                <td className="py-1.5 font-mono">{t.task}</td>
                <td className="py-1.5 text-right tabular-nums">{t.entries}</td>
                <td className="py-1.5 text-right tabular-nums text-amber-400">{t.hits}</td>
                <td className="py-1.5 text-right tabular-nums text-emerald-400">${t.saved.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent entries</h2>
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
          {entries.length === 0 && <div className="text-center py-4 text-muted-foreground text-xs">Cache is empty.</div>}
          {entries.map(e => (
            <div key={e.id} className="border border-white/5 rounded p-2 text-[11px]">
              <div className="flex items-baseline justify-between font-mono text-[10px] text-muted-foreground">
                <span>{e.task} · {e.model_id}</span>
                <span>hits={e.hits} saved=${e.cost_saved_usd.toFixed(4)}</span>
              </div>
              <div className="mt-1 text-foreground/80 truncate">→ {e.prompt_preview}</div>
              <div className="mt-0.5 text-muted-foreground/80 truncate">← {e.response_preview}</div>
            </div>
          ))}
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
