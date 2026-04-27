/**
 * Admin · Notify — small email blast tool.
 *
 * Pick segment, write subject + HTML body, send. Backend uses Resend
 * (same key as magic-link). Past sends sourced from the audit log so
 * there's no separate notifications table to drift out of sync.
 *
 * Sequential delivery on the backend — fine for the 100-user beta.
 * If the segment count gets large we'll need to either disable the
 * button at high counts or move backend to Resend's batch endpoint.
 */
import { useEffect, useState } from "react";
import { Loader2, Send, Mail } from "lucide-react";
import { api } from "@/lib/api";

export default function Notify() {
  const [segments, setSegments] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [segment, setSegment] = useState("active7d");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hey,</p><p></p><p>– Anchor</p>");
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const reloadHistory = () => api.adminNotifications().then(setHistory).catch(() => {});

  useEffect(() => {
    Promise.all([api.adminNotifySegments().then(setSegments), reloadHistory()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function send() {
    if (!subject || !html) return;
    if (!confirm(`Send to ${segments[segment] ?? 0} recipients?`)) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await api.adminNotify({ segment, subject, html });
      setResult(r);
      reloadHistory();
    } catch (e: any) {
      alert(e.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const recipientCount = segments[segment] ?? 0;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Notify</h1>
        <p className="text-xs text-muted-foreground mt-1">Email blast via Resend. One subject, one HTML body, one segment.</p>
      </div>

      <div className="glass rounded-xl p-5 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Segment</span>
          <select value={segment} onChange={e => setSegment(e.target.value)}
            className="mt-1 w-full rounded-md bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40">
            {Object.entries(segments).map(([id, count]) => (
              <option key={id} value={id}>{id} — {count} recipients</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Subject</span>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Anchor — small update"
            className="mt-1 w-full rounded-md bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">HTML body</span>
          <textarea value={html} onChange={e => setHtml(e.target.value)} rows={8}
            className="mt-1 w-full rounded-md bg-background/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Will send to <span className="text-foreground tabular-nums">{recipientCount}</span> recipients.
          </span>
          <button disabled={busy || !subject || !html || recipientCount === 0} onClick={send}
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs px-4 py-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>

        {result && (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            Sent {result.sent} / {result.total}{result.failed > 0 && <span className="text-amber-300"> · {result.failed} failed</span>}.
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" /> History
        </h2>
        <div className="glass rounded-xl divide-y divide-white/5 overflow-hidden">
          {history.length === 0
            ? <p className="p-6 text-center text-xs text-muted-foreground">No sends yet.</p>
            : history.map(h => (
              <div key={h.id} className="p-3 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-foreground">{h.params?.subject ?? "(no subject)"}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(h.sentAt + "Z").toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  segment={h.params?.segment} · sent {h.params?.sent}/{h.params?.recipients}
                  {h.params?.failed > 0 && <span className="text-amber-300"> · {h.params.failed} failed</span>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
