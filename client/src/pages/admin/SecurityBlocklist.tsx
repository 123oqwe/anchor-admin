/**
 * Admin · Security · Blocklist — manage anchor.db's ip_blocklist.
 * Backend cache refresh is 30s; UI shows that as a hint.
 */
import { useEffect, useState } from "react";
import { Loader2, Ban, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function SecurityBlocklist() {
  const { can } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ip, setIp] = useState(""); const [reason, setReason] = useState(""); const [hours, setHours] = useState("");

  const reload = async () => {
    try { setRows(await api.secBlocklistList()); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!ip.trim() || !reason.trim()) return;
    await api.secBlocklistAdd({ ip: ip.trim(), reason: reason.trim(), expiresInHours: hours ? Number(hours) : undefined });
    setIp(""); setReason(""); setHours("");
    reload();
  };
  const remove = async (ip: string) => {
    if (!confirm(`Unblock ${ip}?`)) return;
    await api.secBlocklistRemove(ip); reload();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Ban className="h-5 w-5 text-amber-400" /> IP blocklist</h1>
        <p className="text-xs text-muted-foreground mt-1">anchor-backend reads with a 30s cache — adds/removes take up to 30s to take effect.</p>
      </div>

      {can("security.blocklist") && (
        <div className="glass rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2"><Plus className="h-3.5 w-3.5" /> Block an IP</h2>
          <div className="flex gap-2">
            <input value={ip} onChange={e => setIp(e.target.value)} placeholder="ip (v4 or v6)"
              className="flex-1 rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="reason"
              className="flex-[2] rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <input value={hours} onChange={e => setHours(e.target.value)} placeholder="ttl hours (blank = forever)" type="number"
              className="w-40 rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <button onClick={add} className="rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 text-xs">Block</button>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[200px_1fr_180px_120px_60px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border/30">
          <span>IP</span><span>Reason</span><span>Blocked by</span><span>Expires</span><span></span>
        </div>
        {rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No active blocks.</div>}
        {rows.map(r => (
          <div key={r.ip} className="grid grid-cols-[200px_1fr_180px_120px_60px] gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-0">
            <span className="font-mono text-foreground">{r.ip}</span>
            <span className="text-muted-foreground truncate">{r.reason}</span>
            <span className="text-muted-foreground text-[11px] truncate">{r.blocked_by}</span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {r.expires_at ? new Date(r.expires_at).toLocaleString().slice(0, 16) : "permanent"}
            </span>
            <div className="text-right">
              {can("security.blocklist") && (
                <button onClick={() => remove(r.ip)} className="p-1.5 hover:bg-red-500/10 rounded text-red-400" title="Unblock">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
