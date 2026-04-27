/**
 * Admin · Invites — issue + revoke + see who used what.
 *
 * Beta is closed; every signup needs a code. This page is where the
 * operator hands them out and audits later who claimed which.
 */
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Copy, Check, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface Invite {
  code: string;
  issued_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: number | null;
  created_at: string;
}

export default function Invites() {
  const { can } = useSession();
  const [rows, setRows] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ttlDays, setTtlDays] = useState(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const reload = () => api.adminInvites().then(setRows).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  async function issue() {
    setBusy(true);
    try { await api.adminIssueInvite(ttlDays); reload(); }
    catch (e: any) { alert(e.message ?? "Issue failed"); }
    finally { setBusy(false); }
  }

  async function revoke(code: string) {
    if (!confirm(`Revoke invite ${code}?`)) return;
    setBusy(true);
    try { await api.adminRevokeInvite(code); reload(); }
    catch (e: any) { alert(e.message ?? "Revoke failed"); }
    finally { setBusy(false); }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const writable = can("invites.write");

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Invites</h1>
        <p className="text-xs text-muted-foreground mt-1">Closed beta — single-use codes.</p>
      </div>

      {writable && (
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            TTL
            <input type="number" min={0} value={ttlDays} onChange={e => setTtlDays(Number(e.target.value))}
              className="w-16 rounded-md bg-background/50 px-2 py-1 text-xs text-center" />
            days
          </label>
          <span className="text-[10px] text-muted-foreground">0 = never expires</span>
          <button disabled={busy} onClick={issue}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs px-3 py-1.5 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Issue code
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-2 px-3">Code</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Used by</th>
              <th className="text-left py-2 px-3">Created</th>
              <th className="text-left py-2 px-3">Expires</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No invites issued.</td></tr>
            )}
            {rows.map(inv => {
              const expired = inv.expires_at && inv.expires_at < Date.now();
              return (
                <tr key={inv.code} className="border-b border-white/5 last:border-0">
                  <td className="py-3 px-3">
                    <button onClick={() => copyCode(inv.code)}
                      className="font-mono text-sm flex items-center gap-1.5 text-foreground hover:text-primary">
                      {inv.code}
                      {copiedCode === inv.code ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3 opacity-40" />}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    {inv.used_by
                      ? <span className="text-muted-foreground">used</span>
                      : expired
                        ? <span className="text-amber-400">expired</span>
                        : <span className="text-emerald-300">available</span>}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{inv.used_by ?? "—"}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{new Date(inv.created_at + "Z").toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />never</span>}
                  </td>
                  <td className="py-3 px-3">
                    {writable && !inv.used_by && !expired && (
                      <button disabled={busy} onClick={() => revoke(inv.code)}
                        className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
