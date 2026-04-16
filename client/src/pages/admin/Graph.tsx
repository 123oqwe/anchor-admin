import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Network, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-emerald-500/10 text-emerald-400",
  done:        "bg-blue-500/10 text-blue-400",
  delayed:     "bg-amber-500/10 text-amber-400",
  overdue:     "bg-red-500/10 text-red-400",
  decaying:    "bg-orange-500/10 text-orange-400",
  blocked:     "bg-red-500/10 text-red-400",
  todo:        "bg-white/5 text-muted-foreground",
  opportunity: "bg-purple-500/10 text-purple-400",
  worsening:   "bg-red-500/10 text-red-400",
  stable:      "bg-white/5 text-muted-foreground",
  "in-progress": "bg-blue-500/10 text-blue-400",
};

export default function Graph() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  useEffect(() => {
    api.getGraph().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Failed to load</div>;

  const allNodes = data.domains.flatMap((d: any) => (d.items ?? []).map((n: any) => ({ ...n, domain: d.id, domainName: d.name })));
  const filtered = allNodes.filter((n: any) => {
    if (domainFilter && n.domain !== domainFilter) return false;
    if (search && !n.label.toLowerCase().includes(search.toLowerCase()) && !n.detail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Human Graph</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Graph Inspector</h1>
          <p className="text-sm text-muted-foreground">{allNodes.length} nodes across {data.domains.length} domains.</p>

          <div className="flex gap-2 mt-4">
            <div className="flex-1 glass rounded-lg flex items-center gap-2 px-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search label or detail…"
                className="flex-1 bg-transparent py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <button onClick={() => setDomainFilter(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!domainFilter ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>All</button>
            {data.domains.map((d: any) => (
              <button key={d.id} onClick={() => setDomainFilter(d.id === domainFilter ? null : d.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${d.id === domainFilter ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
                {d.name} ({d.nodeCount})
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((n: any, i: number) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
            className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="text-[9px] bg-white/5 text-muted-foreground">{n.domainName}</Badge>
              <Badge className="text-[9px] bg-white/5 text-muted-foreground">{n.type}</Badge>
              <Badge className={`text-[9px] ${STATUS_COLORS[n.status] ?? "bg-white/5 text-muted-foreground"}`}>{n.status}</Badge>
              <code className="text-[9px] text-muted-foreground/40 font-mono ml-auto">{n.id.slice(0, 8)}</code>
            </div>
            <div className="text-sm font-medium text-foreground mb-1">{n.label}</div>
            <div className="text-[11px] text-muted-foreground line-clamp-2">{n.detail}</div>
            <div className="text-[9px] text-muted-foreground/60 mt-1.5 font-mono">{n.captured}</div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">No nodes match</div>}
      </div>
    </div>
  );
}
