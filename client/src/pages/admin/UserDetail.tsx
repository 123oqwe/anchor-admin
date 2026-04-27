/**
 * Admin · UserDetail — single user view + the operator action surface.
 *
 * Shows everything an operator needs about one user in one screen:
 * profile + balance + recent ledger + recent runs + the four trust-
 * gated actions (suspend / restore / grant credits / abort runs).
 *
 * Buttons that the current admin's permissions don't allow are hidden,
 * not just disabled — the backend will 403 anyway, but the UI shouldn't
 * advertise actions a Support admin can never click.
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, Coins, Pause, Play, Plus, X, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface Detail {
  user: {
    id: string; email: string; isAdmin: boolean; status: string;
    credits: number; lastActiveAt: string | null; createdAt: string;
  };
  ledger: { id: string; delta: number; balance_after: number; reason: string; ref: string | null; created_at: string }[];
  runs: { id: string; agent_name: string; status: string; turn: number; max_turns: number; user_message: string; error: string | null; created_at: string; updated_at: string }[];
}

function fmtNum(n: number) { return n.toLocaleString(); }

export default function UserDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>("/admin/users/:id");
  const { can } = useSession();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantCredits, setGrantCredits] = useState(100_000);
  const [grantReason, setGrantReason] = useState("");

  const reload = async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const d = await api.adminUser(params.id);
      setDetail(d);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load user");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [params?.id]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await reload(); }
    catch (e: any) { alert(e.message ?? "Action failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;
  if (error || !detail) return <div className="p-8 text-center text-muted-foreground">{error ?? "User not found"}</div>;

  const u = detail.user;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <button onClick={() => navigate("/admin/users")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to users
      </button>

      {/* Header card */}
      <div className="glass rounded-xl p-5 flex items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">{u.email || "(no email)"}</h1>
          <p className="text-[11px] font-mono text-muted-foreground">{u.id}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>created {new Date(u.createdAt + "Z").toLocaleDateString()}</span>
            <span>·</span>
            <span className={u.status === "active" ? "text-emerald-300" : "text-amber-400"}>{u.status}</span>
            {u.isAdmin && <span className="inline-flex items-center gap-1 text-amber-300"><Shield className="h-3 w-3" />admin</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</div>
          <div className="text-2xl font-semibold text-foreground tabular-nums">{fmtNum(u.credits)}</div>
        </div>
      </div>

      {/* Action buttons — hidden when the admin lacks the permission */}
      <div className="flex flex-wrap gap-2">
        {can("users.suspend") && (u.status === "active"
          ? <ActionBtn icon={<Pause className="h-3.5 w-3.5" />} label="Suspend" busy={busy}
              onClick={() => {
                const reason = prompt("Suspension reason?") ?? "";
                if (reason) act(() => api.adminSuspend(u.id, reason));
              }} />
          : <ActionBtn icon={<Play className="h-3.5 w-3.5" />} label="Restore" busy={busy}
              onClick={() => act(() => api.adminRestore(u.id))} />
        )}
        {can("users.grant_credits") && (
          <ActionBtn icon={<Plus className="h-3.5 w-3.5" />} label="Grant credits" busy={busy}
            onClick={() => setGrantOpen(true)} />
        )}
        {can("users.abort_runs") && (
          <ActionBtn icon={<X className="h-3.5 w-3.5" />} label="Abort running runs" busy={busy}
            onClick={() => {
              if (confirm("Force-cancel ALL running / interrupted runs for this user?")) {
                act(() => api.adminAbortRuns(u.id));
              }
            }} />
        )}
      </div>

      {/* Inline grant form */}
      {grantOpen && (
        <div className="glass rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium">Grant credits</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted-foreground">
              Credits
              <input type="number" min={1} value={grantCredits} onChange={e => setGrantCredits(Number(e.target.value))}
                className="mt-1 w-full rounded-md bg-background/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </label>
            <label className="block text-xs text-muted-foreground">
              Reason (free text)
              <input value={grantReason} onChange={e => setGrantReason(e.target.value)}
                placeholder="goodwill / refund / promo"
                className="mt-1 w-full rounded-md bg-background/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setGrantOpen(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
            <button disabled={busy || grantCredits <= 0 || !grantReason}
              onClick={() => act(async () => {
                await api.adminGrant(u.id, grantCredits, grantReason);
                setGrantOpen(false);
                setGrantReason("");
              })}
              className="rounded-md bg-primary text-primary-foreground text-xs px-3 py-1.5 disabled:opacity-50">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : `Grant ${fmtNum(grantCredits)}`}
            </button>
          </div>
        </div>
      )}

      {/* Ledger + Runs side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Recent ledger" hint="Last 30 entries">
          {detail.ledger.length === 0
            ? <Empty msg="No ledger entries." />
            : detail.ledger.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm">{l.reason}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(l.created_at + "Z").toLocaleString()}</div>
                  </div>
                  <div className={`text-sm tabular-nums ${l.delta < 0 ? "text-amber-300" : "text-emerald-300"}`}>
                    {l.delta > 0 ? "+" : ""}{fmtNum(l.delta)}
                  </div>
                </div>
              ))}
        </Section>

        <Section title="Recent runs" hint="Last 20 — click for trace">
          {detail.runs.length === 0
            ? <Empty msg="No agent runs." />
            : detail.runs.map(r => (
                <div key={r.id}
                  onClick={() => navigate(`/admin/runs/${r.id}`)}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.agent_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{r.user_message}</div>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <div className={`text-xs ${r.status === "completed" ? "text-emerald-300" : r.status === "failed" ? "text-red-400" : "text-muted-foreground"}`}>{r.status}</div>
                    <div className="text-[10px] text-muted-foreground">turn {r.turn}/{r.max_turns}</div>
                  </div>
                </div>
              ))}
        </Section>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, busy, onClick }: { icon: React.ReactNode; label: string; busy: boolean; onClick: () => void }) {
  return (
    <button disabled={busy} onClick={onClick}
      className="flex items-center gap-1.5 rounded-md glass hover:bg-accent/30 px-3 py-1.5 text-xs disabled:opacity-50 transition-colors">
      {icon}{label}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <p className="text-xs text-muted-foreground py-4 text-center">{msg}</p>; }
