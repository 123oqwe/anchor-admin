/**
 * Admin · Admins — RBAC management.
 *
 * Lists every admin (anyone with admin_permissions != []), shows their
 * permissions, and lets you edit the set via either a role-preset
 * shortcut or a per-permission checkbox grid. Catalog (permission
 * strings + role presets) comes from the backend so renaming never
 * needs a frontend deploy.
 *
 * Privilege hardening: only super can grant 'super' (backend enforces;
 * UI hides the checkbox unless the current admin is super).
 */
import { useEffect, useState } from "react";
import { Loader2, Trash2, Save, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface AdminRow {
  id: string; email: string; status: string; permissions: string[];
  lastActiveAt: string | null; createdAt: string;
}
interface RolePreset { id: string; label: string; description: string; permissions: string[] }
interface Catalog { permissions: string[]; roles: RolePreset[] }

export default function Admins() {
  const { user, can } = useSession();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = () => api.adminAdmins().then(setRows).catch(() => {});
  useEffect(() => {
    Promise.all([api.adminAdmins().then(setRows), api.adminCatalog().then(setCatalog)])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;
  const writable = can("admins.write");
  const canSuper = can("super");

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Admins</h1>
        <p className="text-xs text-muted-foreground mt-1">Permission strings, not roles. Roles are just shortcuts.</p>
      </div>

      <div className="glass rounded-xl divide-y divide-white/5 overflow-hidden">
        {rows.length === 0 && <p className="p-8 text-center text-xs text-muted-foreground">No admins.</p>}
        {rows.map(a => (
          <div key={a.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{a.email}</div>
                <div className="text-[10px] text-muted-foreground/70 font-mono">{a.id}</div>
              </div>
              <div className="flex flex-wrap gap-1 max-w-md">
                {a.permissions.map(p => (
                  <span key={p} className={`text-[10px] font-mono px-2 py-0.5 rounded ${p === "super" ? "bg-amber-500/10 text-amber-300" : "bg-white/5 text-muted-foreground"}`}>{p}</span>
                ))}
              </div>
              {writable && a.id !== user?.id && (
                <>
                  <button onClick={() => setEditingId(editingId === a.id ? null : a.id)}
                    className="text-xs text-primary hover:text-primary/80 px-2 py-1">
                    {editingId === a.id ? "Close" : "Edit"}
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Revoke ALL admin power from ${a.email}?`)) return;
                    try { await api.adminRevokeAdmin(a.id); reload(); }
                    catch (e: any) { alert(e.message); }
                  }}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {editingId === a.id && catalog && (
              <PermissionEditor
                target={a}
                catalog={catalog}
                canSuper={canSuper}
                onSaved={() => { setEditingId(null); reload(); }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionEditor({ target, catalog, canSuper, onSaved, onCancel }: {
  target: AdminRow; catalog: Catalog; canSuper: boolean;
  onSaved: () => void; onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(target.permissions));
  const [busy, setBusy] = useState(false);

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p); else next.add(p);
    setSelected(next);
  }
  function applyRole(role: RolePreset) {
    setSelected(new Set(role.permissions));
  }

  async function save() {
    setBusy(true);
    try {
      await api.adminSetPermissions(target.id, Array.from(selected));
      onSaved();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
      {/* Role presets */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Apply preset</p>
        <div className="flex flex-wrap gap-1.5">
          {catalog.roles.map(r => (
            <button key={r.id} onClick={() => applyRole(r)} title={r.description}
              className="text-xs px-2.5 py-1 rounded glass hover:bg-accent/30">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-permission checkboxes */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {catalog.permissions.map(p => {
            const isSuper = p === "super";
            const disabled = isSuper && !canSuper;
            return (
              <label key={p} title={disabled ? "Granting 'super' requires 'super'" : undefined}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.02]"}`}>
                <input type="checkbox" checked={selected.has(p)} disabled={disabled}
                  onChange={() => toggle(p)} className="accent-primary" />
                <span className={isSuper ? "text-amber-300" : ""}>{p}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">
          <X className="h-3 w-3 inline mr-1" />Cancel
        </button>
        <button disabled={busy} onClick={save}
          className="rounded-md bg-primary text-primary-foreground text-xs px-3 py-1.5 disabled:opacity-50 inline-flex items-center gap-1">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
      </div>
    </div>
  );
}
