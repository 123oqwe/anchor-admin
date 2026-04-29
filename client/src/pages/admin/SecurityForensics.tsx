/**
 * Admin · Security · Forensics — investigate a user_id or fuzzy-search across alerts/messages/runs.
 */
import { useState } from "react";
import { Loader2, Search, User } from "lucide-react";
import { api } from "@/lib/api";

export default function SecurityForensics() {
  const [tab, setTab] = useState<"user" | "search">("user");
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [userData, setUserData] = useState<any | null>(null);
  const [searchData, setSearchData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lookupUser = async () => {
    if (!userId.trim()) return;
    setLoading(true); setErr(null); setUserData(null);
    try { setUserData(await api.secForensicsUser(userId.trim())); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  const search = async () => {
    if (q.trim().length < 3) { setErr("query must be ≥3 chars"); return; }
    setLoading(true); setErr(null); setSearchData(null);
    try { setSearchData(await api.secForensicsSearch(q.trim())); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 p-6 max-w-6xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="h-5 w-5 text-amber-400" /> Forensics</h1>

      <div className="flex gap-1">
        <TabButton active={tab === "user"} onClick={() => setTab("user")} label="By user" />
        <TabButton active={tab === "search"} onClick={() => setTab("search")} label="Free-text search" />
      </div>

      {tab === "user" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupUser()}
              placeholder="user_id (e.g. user_default)"
              className="flex-1 rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <button onClick={lookupUser} className="rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 text-xs">Lookup</button>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-amber-400 mx-auto" />}
          {err && <div className="text-xs text-red-400">{err}</div>}
          {userData && <UserReport d={userData} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
              placeholder="substring (≥3 chars) — searches alerts, messages, agent_runs"
              className="flex-1 rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <button onClick={search} className="rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 text-xs">Search</button>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-amber-400 mx-auto" />}
          {err && <div className="text-xs text-red-400">{err}</div>}
          {searchData && <SearchResults d={searchData} />}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-md text-xs font-medium ${active ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title} <span className="text-foreground/50">({count})</span></h3>
      {count === 0 ? <p className="text-xs text-muted-foreground/60">none</p> : children}
    </div>
  );
}

function UserReport({ d }: { d: any }) {
  const u = d.user;
  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <User className="h-4 w-4 text-amber-400" />
        <div>
          <div className="text-sm font-semibold">{u.email}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {u.id} · {u.status} · {u.is_admin ? "admin" : "user"} · {u.credits} credits · created {u.created_at?.slice(0, 10)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Alerts targeting" count={d.alerts.length}>
          <ul className="text-xs space-y-1">
            {d.alerts.map((a: any) => <li key={a.id} className="flex justify-between gap-2 truncate">
              <span className="text-foreground truncate">{a.title}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{a.severity}</span>
            </li>)}
          </ul>
        </Section>
        <Section title="Sessions (recent)" count={d.sessions.length}>
          <ul className="text-xs font-mono text-muted-foreground space-y-0.5">
            {d.sessions.map((s: any) => <li key={s.id}>{s.id.slice(0, 12)}… · {s.created_at?.slice(5, 16)}</li>)}
          </ul>
        </Section>
        <Section title="Agent runs (recent)" count={d.runs.length}>
          <ul className="text-xs space-y-1">
            {d.runs.map((r: any) => <li key={r.id} className="flex justify-between gap-2">
              <span className="font-mono text-[11px] text-foreground truncate">{r.agent_name}</span>
              <span className="text-[10px] text-muted-foreground">{r.status} · turn {r.turn}/{r.max_turns}</span>
            </li>)}
          </ul>
        </Section>
        <Section title="LLM calls (50)" count={d.calls.length}>
          <ul className="text-xs font-mono text-muted-foreground space-y-0.5">
            {d.calls.slice(0, 12).map((c: any) => <li key={c.id} className="flex justify-between gap-2">
              <span className="truncate">{c.model_id}</span>
              <span>${(c.cost_usd ?? 0).toFixed(5)}</span>
            </li>)}
            {d.calls.length > 12 && <li className="text-[10px]">… {d.calls.length - 12} more</li>}
          </ul>
        </Section>
        <Section title="Credit ledger (recent)" count={d.ledger.length}>
          <ul className="text-xs space-y-0.5">
            {d.ledger.map((l: any, i: number) => <li key={i} className="flex justify-between font-mono text-[10px]">
              <span>{l.reason}</span><span>{l.delta > 0 ? "+" : ""}{l.delta} → {l.balance_after}</span>
            </li>)}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function SearchResults({ d }: { d: any }) {
  return (
    <div className="space-y-4">
      <Section title="Alerts" count={d.alerts.length}>
        <ul className="text-xs space-y-1">{d.alerts.map((a: any) => <li key={a.id} className="truncate">{a.title}</li>)}</ul>
      </Section>
      <Section title="Messages" count={d.messages.length}>
        <ul className="text-xs space-y-1">{d.messages.map((m: any) => <li key={m.id} className="text-muted-foreground truncate">{m.user_id?.slice(0, 8)} · {m.preview}</li>)}</ul>
      </Section>
      <Section title="Agent runs (matching user_message)" count={d.runs.length}>
        <ul className="text-xs space-y-1">{d.runs.map((r: any) => <li key={r.id} className="text-muted-foreground truncate">{r.agent_name} · {r.preview}</li>)}</ul>
      </Section>
    </div>
  );
}
