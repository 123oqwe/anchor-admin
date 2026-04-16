import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function Data() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getGraph(),
      api.getMemoryStats(),
      api.getProjects(),
      api.getTwinInsights(),
      api.getAgentStatus(),
    ]).then(([graph, memStats, projects, insights, agents]) => {
      setStats({
        graphNodes: graph?.domains?.reduce((sum: number, d: any) => sum + (d.nodeCount ?? 0), 0) ?? 0,
        graphDomains: graph?.domains?.length ?? 0,
        memories: Object.values(memStats ?? {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0),
        memoryBreakdown: memStats,
        projects: projects?.length ?? 0,
        tasks: projects?.reduce((sum: number, p: any) => sum + (p.tasks?.length ?? 0), 0) ?? 0,
        insights: insights?.length ?? 0,
        agentExecutions: agents?.reduce((sum: number, a: any) => sum + a.successes + a.failures, 0) ?? 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;

  const tables = [
    { name: "graph_nodes", count: stats?.graphNodes ?? 0, desc: `${stats?.graphDomains ?? 0} domains` },
    { name: "memories", count: stats?.memories ?? 0, desc: `E:${stats?.memoryBreakdown?.episodic ?? 0} S:${stats?.memoryBreakdown?.semantic ?? 0} W:${stats?.memoryBreakdown?.working ?? 0}` },
    { name: "projects", count: stats?.projects ?? 0, desc: "" },
    { name: "tasks", count: stats?.tasks ?? 0, desc: "" },
    { name: "twin_insights", count: stats?.insights ?? 0, desc: "" },
    { name: "agent_executions", count: stats?.agentExecutions ?? 0, desc: "" },
    { name: "messages", count: "—", desc: "chat history" },
    { name: "users", count: 1, desc: "single user mode" },
    { name: "user_state", count: 1, desc: "energy/focus/stress" },
    { name: "settings", count: 1, desc: "" },
    { name: "twin_evolution", count: 1, desc: "XP/level" },
  ];

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Database</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Data Overview</h1>
          <p className="text-sm text-muted-foreground">SQLite tables and row counts.</p>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <code className="text-sm font-mono text-foreground">{t.name}</code>
                <span className="text-lg font-bold text-foreground">{t.count}</span>
              </div>
              {t.desc && <span className="text-[10px] text-muted-foreground">{t.desc}</span>}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
