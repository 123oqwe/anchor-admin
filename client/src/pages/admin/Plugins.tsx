/**
 * Admin · Plugins — installed plugin catalog with quick uninstall.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function Plugins() {
  const { can } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => { try { setRows(await api.pluginList()); } finally { setLoading(false); } };
  useEffect(() => { reload(); }, []);

  const remove = async (name: string) => {
    if (!confirm(`Uninstall ${name}? This sweeps every artifact it added.`)) return;
    await api.pluginUninstall(name);
    reload();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-amber-400" /> Plugins</h1>
        {can("plugins.install") && (
          <Link href="/admin/plugins/install">
            <button className="flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 text-xs">
              <Plus className="h-3 w-3" /> Install
            </button>
          </Link>
        )}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_140px_60px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border/30">
          <span>Name</span><span>Version</span><span>Scope</span><span>Installed</span><span></span>
        </div>
        {rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No plugins installed.</div>}
        {rows.map(p => (
          <div key={p.name} className="grid grid-cols-[1fr_80px_80px_140px_60px] gap-2 px-4 py-2.5 text-xs items-center border-b border-white/5 last:border-0">
            <Link href={`/admin/plugins/${p.name}`}>
              <span className="text-foreground hover:text-amber-400 cursor-pointer">{p.name}</span>
            </Link>
            <span className="text-muted-foreground font-mono text-[10px]">{p.version}</span>
            <span className="text-muted-foreground text-[10px]">{p.scope}</span>
            <span className="text-muted-foreground font-mono text-[10px]">{p.installed_at?.slice(5, 16)}</span>
            <div className="text-right">
              {can("plugins.uninstall") && (
                <button onClick={() => remove(p.name)} className="p-1.5 hover:bg-red-500/10 rounded text-red-400" title="Uninstall">
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
