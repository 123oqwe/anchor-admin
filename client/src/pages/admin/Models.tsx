/**
 * Admin · Models — 200+ OpenRouter catalog with filter / search / mark-preferred.
 *
 * Default filter: preferred only (~20 rows). Toggle "show all" for full catalog.
 * Sync button (top-right) triggers manual catalog refresh.
 */
import { useEffect, useState } from "react";
import { Loader2, Database, Star, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface Model {
  id: string;
  name: string;
  family: string;
  context_length: number | null;
  price_in_per_m: number | null;
  price_out_per_m: number | null;
  supports_tools: number;
  supports_vision: number;
  supports_reasoning: number;
  status: string;
  preferred: number;
  last_synced_at: string;
}

export default function Models() {
  const { can } = useSession();
  const [rows, setRows] = useState<Model[]>([]);
  const [families, setFamilies] = useState<{ family: string; n: number }[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [filter, setFilter] = useState({ preferred: true, family: "", search: "", status: "active" });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const reload = async () => {
    const params: Record<string, string | boolean> = {};
    if (filter.preferred) params.preferred = "1";
    if (filter.family) params.family = filter.family;
    if (filter.search) params.search = filter.search;
    if (filter.status) params.status = filter.status;
    const [r, f, ls] = await Promise.all([api.catalogList(params), api.catalogFamilies(), api.catalogLastSynced()]);
    setRows(r); setFamilies(f); setLastSynced(ls.lastSyncedAt);
    setLoading(false);
  };
  useEffect(() => { reload(); }, [filter]);

  const togglePreferred = async (id: string, current: number) => {
    await api.catalogSetPreferred(id, current === 0);
    reload();
  };

  const sync = async () => {
    setSyncing(true);
    try { await api.catalogSync(); await reload(); } finally { setSyncing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-6xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-5 w-5 text-amber-400" /> Models</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length} models {lastSynced && `· last synced ${lastSynced.slice(0, 16)}`}
          </p>
        </div>
        {can("models.edit") && (
          <button onClick={sync} disabled={syncing}
            className="flex items-center gap-1.5 rounded-md glass hover:bg-accent/30 px-3 py-1.5 text-xs disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => setFilter(f => ({ ...f, preferred: !f.preferred }))}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 ${filter.preferred ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground"}`}>
          <Star className="h-3 w-3" /> Preferred only
        </button>
        <select value={filter.family} onChange={e => setFilter(f => ({ ...f, family: e.target.value }))}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="">family: all</option>
          {families.map(f => <option key={f.family} value={f.family}>{f.family} ({f.n})</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="rounded-md bg-background/50 px-2 py-1.5 focus:outline-none">
          <option value="active">active</option>
          <option value="deprecated">deprecated</option>
          <option value="blocked">blocked</option>
          <option value="">any status</option>
        </select>
        <div className="flex items-center gap-1 glass rounded-md px-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="search id or name..." className="bg-transparent px-1 py-1 w-64 focus:outline-none" />
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_120px_70px_80px_80px_70px_60px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
          <span></span><span>ID / Name</span><span>Family</span><span>Ctx</span><span>$ in/M</span><span>$ out/M</span><span>Caps</span><span>Status</span>
        </div>
        {rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No models match.</div>}
        {rows.map(m => (
          <div key={m.id} className="grid grid-cols-[40px_1fr_120px_70px_80px_80px_70px_60px] gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-0">
            <button onClick={() => can("models.edit") && togglePreferred(m.id, m.preferred)}
              className={m.preferred ? "text-amber-400" : "text-muted-foreground/40 hover:text-muted-foreground"}>
              <Star className="h-3 w-3" fill={m.preferred ? "currentColor" : "none"} />
            </button>
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-foreground truncate">{m.id}</div>
              <div className="text-[10px] text-muted-foreground truncate">{m.name}</div>
            </div>
            <span className="text-muted-foreground text-[10px]">{m.family}</span>
            <span className="text-muted-foreground font-mono text-[10px] tabular-nums">{m.context_length ? `${(m.context_length / 1000).toFixed(0)}k` : "—"}</span>
            <span className="text-amber-400 font-mono text-[10px] tabular-nums">{m.price_in_per_m != null ? `$${m.price_in_per_m.toFixed(3)}` : "—"}</span>
            <span className="text-amber-400 font-mono text-[10px] tabular-nums">{m.price_out_per_m != null ? `$${m.price_out_per_m.toFixed(3)}` : "—"}</span>
            <div className="flex gap-0.5 text-[9px] text-muted-foreground/70">
              {m.supports_tools ? <span title="tools">🔧</span> : null}
              {m.supports_vision ? <span title="vision">👁</span> : null}
              {m.supports_reasoning ? <span title="reasoning">💭</span> : null}
            </div>
            <span className={`text-[10px] font-mono ${m.status === "active" ? "text-emerald-400" : m.status === "deprecated" ? "text-amber-400" : "text-red-400"}`}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
