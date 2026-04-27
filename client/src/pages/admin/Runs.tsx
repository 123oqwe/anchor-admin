/**
 * Admin · Runs — recent agent_runs across all users.
 *
 * Each row links to RunTrace; status colour reflects the agent_runs.status
 * enum (running/completed/failed/cancelled/interrupted/abandoned). Filters
 * stay simple — sqlite handles a thousand-row table fine without server
 * pagination at our scale.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ChevronRight, Filter } from "lucide-react";
import { api } from "@/lib/api";

interface RunRow {
  id: string;
  user_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  turn: number;
  max_turns: number;
  user_message: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed:   "text-emerald-300",
  failed:      "text-red-400",
  running:     "text-blue-400",
  cancelled:   "text-muted-foreground",
  interrupted: "text-amber-300",
  abandoned:   "text-muted-foreground",
};

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso + "Z").getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function Runs() {
  const [, navigate] = useLocation();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    api.adminRuns({ status: statusFilter || undefined, limit: 100 })
      .then(setRuns).catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run traces</h1>
          <p className="text-xs text-muted-foreground mt-1">Recent agent_runs across all users — click for full trace + live tail.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40">
            <option value="">all statuses</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
            <option value="interrupted">interrupted</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">Agent</th>
                <th className="text-left py-2 px-3">User message</th>
                <th className="text-left py-2 px-3 w-24">Status</th>
                <th className="text-right py-2 px-3 w-20">Turn</th>
                <th className="text-right py-2 px-3 w-24">Updated</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">No runs match.</td></tr>
              )}
              {runs.map(r => (
                <tr key={r.id} onClick={() => navigate(`/admin/runs/${r.id}`)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer">
                  <td className="py-3 px-3">
                    <div className="text-foreground">{r.agent_name}</div>
                    <div className="text-[10px] text-muted-foreground/60 font-mono">{r.user_id.slice(0, 14)}</div>
                  </td>
                  <td className="py-3 px-3 max-w-md truncate text-muted-foreground">{r.user_message}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs ${STATUS_COLOR[r.status] ?? ""}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-xs">{r.turn}/{r.max_turns}</td>
                  <td className="py-3 px-3 text-right text-xs text-muted-foreground">{fmtAgo(r.updated_at)}</td>
                  <td className="py-3 px-3"><ChevronRight className="h-3 w-3 text-muted-foreground/30" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
