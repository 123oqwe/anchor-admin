import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function Logs() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExecutions().then(rows => { setExecutions(rows); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Agent Logs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Execution History</h1>
          <p className="text-sm text-muted-foreground">Last 50 agent executions across all agents.</p>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[80px_140px_1fr_80px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
            <span>Time</span>
            <span>Agent</span>
            <span>Action</span>
            <span>Status</span>
          </div>
          {executions.map((e, i) => (
            <div key={e.id} className={`grid grid-cols-[80px_140px_1fr_80px] gap-0 px-4 py-2.5 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
              <span className="text-muted-foreground font-mono text-[10px]">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <Badge className="text-[9px] bg-white/5 text-muted-foreground w-fit">{e.agent}</Badge>
              <span className="text-foreground/80 truncate">{e.action}</span>
              <span className={`text-[10px] font-mono ${e.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{e.status}</span>
            </div>
          ))}
          {executions.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No executions yet</div>}
        </div>
      </div>
    </div>
  );
}
