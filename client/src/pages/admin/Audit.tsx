/**
 * Admin · Audit — every admin write action lands here.
 *
 * Read-only. This is the answer to "who did X to whom and when" for any
 * compliance / operational forensic question. No filters at this scale —
 * 50 entries fit on screen and SQL handles the rest.
 */
import { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { api } from "@/lib/api";

interface AuditRow {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  params: Record<string, unknown> | null;
  createdAt: string;
}

const COLOR: Record<string, string> = {
  suspend:         "text-amber-400",
  restore:         "text-emerald-300",
  grant:           "text-emerald-300",
  abort_runs:      "text-amber-400",
  issue_invite:    "text-blue-300",
  revoke_invite:   "text-muted-foreground",
  set_permissions: "text-blue-300",
  revoke_admin:    "text-amber-400",
  stop_experiment: "text-amber-400",
  replay_run:      "text-blue-300",
  notify_send:     "text-blue-300",
};

export default function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminAudit(100).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-xs text-muted-foreground mt-1">Every write action by every admin. Append-only.</p>
      </div>

      <div className="glass rounded-xl divide-y divide-white/5 overflow-hidden">
        {rows.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No audited actions yet.
          </div>
        )}
        {rows.map(r => (
          <div key={r.id} className="p-4 flex items-baseline gap-3">
            <span className={`text-xs font-mono font-medium ${COLOR[r.action] ?? "text-foreground"}`}>{r.action}</span>
            {r.targetUserId && (
              <span className="text-xs text-muted-foreground">→ <span className="font-mono">{r.targetUserId.slice(0, 12)}</span></span>
            )}
            {r.params && Object.keys(r.params).length > 0 && (
              <span className="text-[11px] text-muted-foreground/80 font-mono truncate min-w-0 flex-1">
                {Object.entries(r.params).map(([k, v]) =>
                  `${k}=${typeof v === "string" ? `"${v.slice(0, 40)}"` : JSON.stringify(v).slice(0, 40)}`
                ).join("  ")}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
              by {r.adminUserId.slice(0, 12)} · {new Date(r.createdAt + "Z").toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
