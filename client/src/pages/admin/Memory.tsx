import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const TYPE_COLORS: Record<string, string> = {
  episodic: "bg-blue-500/10 text-blue-400",
  semantic: "bg-purple-500/10 text-purple-400",
  working:  "bg-amber-500/10 text-amber-400",
};

export default function Memory() {
  const [memories, setMemories] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<"memory" | "twin">("memory");

  useEffect(() => {
    Promise.all([api.getMemories(), api.getTwinInsights()]).then(([m, i]) => {
      setMemories(m); setInsights(i); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;

  const filteredMems = memories.filter(m => {
    if (typeFilter && m.type !== typeFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredInsights = insights.filter(i => {
    if (search && !i.insight.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Memory & Twin</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Memory Inspector</h1>
          <p className="text-sm text-muted-foreground">{memories.length} memories · {insights.length} twin insights · search by content.</p>

          <div className="flex gap-1 mt-4">
            <button onClick={() => setTab("memory")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "memory" ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
              Memories ({memories.length})
            </button>
            <button onClick={() => setTab("twin")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "twin" ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
              Twin Insights ({insights.length})
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <div className="flex-1 glass rounded-lg flex items-center gap-2 px-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search content…"
                className="flex-1 bg-transparent py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            {tab === "memory" && (
              <>
                <button onClick={() => setTypeFilter(null)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!typeFilter ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>All</button>
                {["episodic", "semantic", "working"].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${t === typeFilter ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        {tab === "memory" ? (
          <div className="space-y-2">
            {filteredMems.map((m: any, i: number) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
                className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[9px] ${TYPE_COLORS[m.type] ?? "bg-white/5 text-muted-foreground"}`}>{m.type}</Badge>
                  <span className="text-xs font-medium text-foreground flex-1">{m.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{Math.round((m.confidence ?? 0) * 100)}%</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{m.content}</div>
                {m.source && <div className="text-[9px] text-muted-foreground/60 mt-1">via {m.source}</div>}
              </motion.div>
            ))}
            {filteredMems.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No memories match</div>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredInsights.map((i: any, idx: number) => (
              <motion.div key={i.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.01 }}
                className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-[9px] bg-purple-500/10 text-purple-400">{i.category}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">{Math.round((i.confidence ?? 0) * 100)}% conf</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-foreground">{i.insight}</div>
              </motion.div>
            ))}
            {filteredInsights.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No insights match</div>}
          </div>
        )}
      </div>
    </div>
  );
}
