/**
 * Cron Jobs — monitor all 13 system crons + user-defined crons.
 */
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Crons() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/cron-status").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">System Cron Jobs</h2>
        <p className="text-xs text-muted-foreground mb-4">13 scheduled background tasks</p>
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-3">Job</th>
                <th className="text-left p-3">Schedule</th>
                <th className="text-left p-3">Last Run</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.systemJobs?.map((j: any) => (
                <tr key={j.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    {j.name}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{j.pattern}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">
                    {j.lastRun ? new Date(j.lastRun).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}
                  </td>
                  <td className="p-3 text-center">
                    {j.lastStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" /> :
                     j.lastStatus === "failed" ? <XCircle className="h-4 w-4 text-red-400 mx-auto" /> :
                     <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data?.userCrons?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">User Automations</h2>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Schedule</th>
                  <th className="text-center p-3">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {data.userCrons.map((c: any) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="p-3 text-sm text-foreground">{c.name}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{c.cron_pattern}</td>
                    <td className="p-3 text-center">
                      <span className={`w-2 h-2 rounded-full inline-block ${c.enabled ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
