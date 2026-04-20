/**
 * Permissions — trust gate control, lockdown, audit trail.
 */
import { useState, useEffect } from "react";
import { Loader2, Shield, Lock, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Permissions() {
  const [perms, setPerms] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/permissions").then(r => r.json()),
      fetch("/api/admin/permissions/audit?limit=30").then(r => r.json()),
    ]).then(([p, a]) => { setPerms(p); setAudit(a); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const handleLockdown = async (activate: boolean) => {
    if (activate && !window.confirm("This will DENY ALL actions. Continue?")) return;
    await fetch(`/api/admin/permissions/lockdown`, { method: activate ? "POST" : "DELETE" });
    toast.success(activate ? "System locked down" : "Lockdown released");
    const p = await fetch("/api/admin/permissions").then(r => r.json());
    setPerms(p);
  };

  const RISK_COLORS: Record<string, string> = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400", critical: "text-red-500" };
  const LEVEL_COLORS: Record<string, string> = { L0_read_only: "text-red-400", L1_draft: "text-amber-400", L2_confirm_execute: "text-blue-400", L3_bounded_auto: "text-emerald-400" };

  return (
    <div className="space-y-6">
      {/* Lockdown control */}
      <div className="flex items-center gap-3 glass rounded-xl p-4">
        <Shield className="h-5 w-5 text-red-400" />
        <span className="text-sm font-medium text-foreground">Emergency Lockdown</span>
        <span className="text-xs text-muted-foreground flex-1">Stops ALL agent actions immediately</span>
        <button onClick={() => handleLockdown(true)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20">
          <Lock className="h-3 w-3 inline mr-1" />Lockdown
        </button>
        <button onClick={() => handleLockdown(false)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20">
          <Unlock className="h-3 w-3 inline mr-1" />Release
        </button>
      </div>

      {/* Permission table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3">Action Class</th>
              <th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Trust Level</th>
              <th className="text-right p-3">Success</th>
              <th className="text-right p-3">Failed</th>
            </tr>
          </thead>
          <tbody>
            {perms?.policies?.map((p: any) => (
              <tr key={p.actionClass} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-sm font-medium text-foreground font-mono">{p.actionClass}</td>
                <td className={`p-3 text-xs font-medium ${RISK_COLORS[p.riskTier] ?? "text-muted-foreground"}`}>{p.riskTier}</td>
                <td className={`p-3 text-xs font-mono ${LEVEL_COLORS[p.effectiveLevel] ?? "text-muted-foreground"}`}>{p.effectiveLevel?.replace(/_/g, " ")}</td>
                <td className="p-3 text-xs text-right font-mono text-emerald-400">{p.trustScore?.successes ?? 0}</td>
                <td className="p-3 text-xs text-right font-mono text-red-400">{p.trustScore?.failures ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit log */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Permission Audit Trail (last 30)</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {audit.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 text-[10px] py-0.5">
              <span className="text-muted-foreground/50 font-mono w-14">{a.created_at?.slice(11, 16)}</span>
              <span className={`w-12 ${a.decision === "allow" ? "text-emerald-400" : a.decision === "deny" ? "text-red-400" : "text-amber-400"}`}>{a.decision}</span>
              <span className="text-foreground font-mono w-28">{a.action_class}</span>
              <span className="text-muted-foreground/50 w-16">{a.source}</span>
              <span className="text-muted-foreground truncate">{a.description}</span>
            </div>
          ))}
          {audit.length === 0 && <p className="text-xs text-muted-foreground/40">No audit entries yet</p>}
        </div>
      </div>
    </div>
  );
}
