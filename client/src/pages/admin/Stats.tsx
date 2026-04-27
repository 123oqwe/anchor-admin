/**
 * Admin · Stats — three rankings the operator wants daily.
 *
 *   Agents — which custom agents run most often + how often they fail
 *   Tools  — which tools the agents reach for most + their pass rate
 *   Crons  — system loops, success/skip/fail counts, last fire
 *
 * One window control (days) drives all three queries. 7d default.
 */
import { useEffect, useState } from "react";
import { Loader2, Bot, Wrench, Clock } from "lucide-react";
import { api } from "@/lib/api";

export default function Stats() {
  const [days, setDays] = useState(7);
  const [agents, setAgents] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [crons, setCrons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.adminStatsAgents(days).catch(() => []),
      api.adminStatsTools(days).catch(() => []),
      api.adminStatsCrons(days).catch(() => []),
    ]).then(([a, t, c]) => { setAgents(a); setTools(t); setCrons(c); }).finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-xs text-muted-foreground mt-1">Agents / tools / cron rankings, past {days} days.</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="rounded-md bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40">
          {[1, 7, 30, 90].map(d => <option key={d} value={d}>{d}d</option>)}
        </select>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>
        : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Custom agents" icon={<Bot className="h-3.5 w-3.5" />}>
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left pb-1">Agent</th>
                  <th className="text-right pb-1">Runs</th>
                  <th className="text-right pb-1">Fail</th>
                  <th className="text-right pb-1">Avg $</th>
                </tr></thead>
                <tbody>
                  {agents.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No data.</td></tr>}
                  {agents.map(a => (
                    <tr key={a.agent_id} className="border-t border-white/5">
                      <td className="py-1.5 truncate max-w-[12rem]">{a.agent_name}</td>
                      <td className="py-1.5 text-right tabular-nums">{a.runs}</td>
                      <td className={`py-1.5 text-right tabular-nums ${a.failed > 0 ? "text-red-400" : "text-muted-foreground"}`}>{a.failed}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{a.avg_cost_usd ? `$${a.avg_cost_usd.toFixed(4)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Tools" icon={<Wrench className="h-3.5 w-3.5" />}>
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left pb-1">Tool</th>
                  <th className="text-right pb-1">Calls</th>
                  <th className="text-right pb-1">✓</th>
                  <th className="text-right pb-1">✗</th>
                </tr></thead>
                <tbody>
                  {tools.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No data.</td></tr>}
                  {tools.map((t, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-1.5 truncate font-mono">{t.tool}</td>
                      <td className="py-1.5 text-right tabular-nums">{t.calls}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-300">{t.successes}</td>
                      <td className={`py-1.5 text-right tabular-nums ${t.failures > 0 ? "text-red-400" : "text-muted-foreground"}`}>{t.failures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Crons" icon={<Clock className="h-3.5 w-3.5" />}>
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left pb-1">Source</th>
                  <th className="text-right pb-1">Fires</th>
                  <th className="text-right pb-1">Last</th>
                </tr></thead>
                <tbody>
                  {crons.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No data.</td></tr>}
                  {crons.map(c => (
                    <tr key={c.agent} className="border-t border-white/5">
                      <td className="py-1.5 truncate max-w-[10rem]">{c.agent}</td>
                      <td className="py-1.5 text-right tabular-nums">{c.fires}</td>
                      <td className="py-1.5 text-right text-[10px] text-muted-foreground">
                        {c.last_fire ? c.last_fire.slice(5, 16) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <h2 className="text-sm font-medium mb-2 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </div>
  );
}
