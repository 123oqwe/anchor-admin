/**
 * Admin · Plugin · Install — paste a local path, preview manifest +
 * permissions, then approve.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function PluginInstall() {
  const [, navigate] = useLocation();
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doPreview = async () => {
    setErr(null); setPreview(null); setBusy(true);
    try {
      const r = await api.pluginPreview(source.trim());
      if (r.error) setErr(r.error); else setPreview(r.manifest);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const doInstall = async () => {
    setBusy(true); setErr(null);
    try {
      await api.pluginInstall(source.trim());
      navigate("/admin/plugins");
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 p-6 max-w-3xl">
      <button onClick={() => navigate("/admin/plugins")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <h1 className="text-xl font-bold">Install plugin</h1>
      <div className="glass rounded-xl p-4 space-y-3">
        <label className="text-xs text-muted-foreground">Source — local directory path</label>
        <div className="flex gap-2">
          <input value={source} onChange={e => setSource(e.target.value)}
            placeholder="/absolute/path/to/plugin"
            className="flex-1 rounded-md bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <button onClick={doPreview} disabled={busy || !source.trim()}
            className="rounded-md bg-amber-500/10 text-amber-400 px-3 py-1.5 text-xs disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Preview"}
          </button>
        </div>
        {err && <div className="text-xs text-red-400">{err}</div>}
      </div>

      {preview && (
        <div className="glass rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">{preview.name} <span className="text-muted-foreground font-mono text-xs">v{preview.version}</span></h2>
          <p className="text-xs text-muted-foreground">{preview.description}</p>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> This plugin requests:</h3>
            <ul className="text-xs space-y-1 font-mono">
              {preview.permissions.map((p: string) => <li key={p}>· {p}</li>)}
            </ul>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={doInstall} disabled={busy}
              className="rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 text-xs disabled:opacity-50">
              {busy ? "Installing…" : "Approve + install"}
            </button>
            <button onClick={() => setPreview(null)}
              className="rounded-md glass px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
