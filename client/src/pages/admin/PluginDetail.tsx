/**
 * Admin · Plugin · Detail — full manifest + permissions + artifact summary.
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function PluginDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ name: string }>("/admin/plugins/:name");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.name) return;
    api.pluginGet(params.name).then(setData).catch(e => setErr(e.message));
  }, [params?.name]);

  if (err) return <div className="p-8 text-center text-red-400">{err}</div>;
  if (!data) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  const m = data.manifest;
  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <button onClick={() => navigate("/admin/plugins")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <div className="glass rounded-xl p-5">
        <h1 className="text-xl font-bold">{m.name} <span className="text-muted-foreground text-sm font-mono">v{m.version}</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
        <div className="mt-2 text-[11px] text-muted-foreground">scope: {m.scope} · author: {m.author} · installed by {data.installed_by} on {data.installed_at?.slice(0, 16)}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Permissions</h2>
          <ul className="text-xs space-y-1 font-mono">
            {data.permissions.map((p: string) => <li key={p}>· {p}</li>)}
          </ul>
        </div>
        <div className="glass rounded-xl p-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Artifacts</h2>
          <ul className="text-xs space-y-1">
            <li>{m.artifacts.agents?.length ?? 0} agents</li>
            <li>{m.artifacts.skills?.length ?? 0} skills</li>
            <li>{m.artifacts.mcp_servers?.length ?? 0} MCP servers</li>
            <li>{m.artifacts.crons?.length ?? 0} cron triggers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
