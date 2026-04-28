/**
 * Admin · Routing — per-task routing rules.
 *
 * List view shows all rules + the well-known tasks that have NO rule (and
 * therefore use code-side TASK_ROUTES fallback). Edit drawer lets you set
 * primary, fallback chain, max_cost_per_call_usd, required_capabilities.
 */
import { useEffect, useState } from "react";
import { Loader2, GitBranch, Plus, X, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface Rule {
  task: string;
  primary_model: string;
  fallback_chain_json: string;
  max_cost_per_call_usd: number | null;
  required_capabilities_json: string;
  enabled: number;
  notes: string | null;
  updated_at: string;
}

const KNOWN_TASKS = [
  "decision", "general_chat", "react_execution", "graph_extraction",
  "twin_edit_learning", "twin_result_learning", "morning_digest",
  "weekly_reflection", "summarize", "deep_reasoning", "vision_analysis",
];

export default function Routing() {
  const { can } = useSession();
  const [rules, setRules] = useState<Rule[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<{ task: string; rule: Partial<Rule> } | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [r, m] = await Promise.all([api.routingList(), api.catalogList({ status: "active" })]);
    setRules(r); setModels(m.map((row: any) => ({ id: row.id, name: row.name })));
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const ruleByTask = new Map(rules.map(r => [r.task, r]));
  const allTasks = Array.from(new Set([...KNOWN_TASKS, ...rules.map(r => r.task)])).sort();

  const startEdit = (task: string) => {
    const existing = ruleByTask.get(task);
    setEditing({
      task,
      rule: existing ? {
        primary_model: existing.primary_model,
        fallback_chain_json: existing.fallback_chain_json,
        max_cost_per_call_usd: existing.max_cost_per_call_usd,
        required_capabilities_json: existing.required_capabilities_json,
        notes: existing.notes,
      } : { primary_model: "", fallback_chain_json: "[]", max_cost_per_call_usd: null, required_capabilities_json: "[]", notes: null },
    });
  };

  const save = async () => {
    if (!editing) return;
    const r = editing.rule;
    try {
      await api.routingUpsert(editing.task, {
        primary_model: r.primary_model ?? "",
        fallback_chain: JSON.parse(r.fallback_chain_json ?? "[]"),
        max_cost_per_call_usd: r.max_cost_per_call_usd ?? null,
        required_capabilities: JSON.parse(r.required_capabilities_json ?? "[]"),
        notes: r.notes ?? null,
      });
      setEditing(null);
      reload();
    } catch (e: any) { alert(`Save failed: ${e.message}`); }
  };

  const remove = async (task: string) => {
    if (!confirm(`Delete rule for "${task}"? Falls back to hardcoded TASK_ROUTES.`)) return;
    await api.routingDelete(task);
    reload();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-5 w-5 text-amber-400" /> Routing rules</h1>
        <p className="text-xs text-muted-foreground mt-1">Per-task model selection + fallback chain. Empty rule → falls back to hardcoded TASK_ROUTES. Cache 30s.</p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_120px_70px_60px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
          <span>Task</span><span>Primary</span><span>Cost cap</span><span>Updated</span><span></span>
        </div>
        {allTasks.map(task => {
          const rule = ruleByTask.get(task);
          return (
            <div key={task} className="grid grid-cols-[1fr_1fr_120px_70px_60px] gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-0">
              <span className="font-mono text-[11px] text-foreground">{task}</span>
              <span className="font-mono text-[10px] truncate">
                {rule?.primary_model ?? <span className="text-muted-foreground italic">— hardcoded —</span>}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {rule?.max_cost_per_call_usd != null ? `$${rule.max_cost_per_call_usd.toFixed(4)}/call` : "—"}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">{rule?.updated_at?.slice(5, 16) ?? "—"}</span>
              <div className="flex justify-end gap-1">
                {can("routing.edit") && (
                  <>
                    <button onClick={() => startEdit(task)} className="text-amber-400 hover:text-amber-300 text-[10px]">edit</button>
                    {rule && <button onClick={() => remove(task)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && <EditDrawer task={editing.task} rule={editing.rule} models={models} onSave={save} onClose={() => setEditing(null)} onChange={(r) => setEditing({ task: editing.task, rule: r })} />}
    </div>
  );
}

function EditDrawer({ task, rule, models, onSave, onClose, onChange }: {
  task: string; rule: Partial<Rule>; models: { id: string; name: string }[];
  onSave: () => void; onClose: () => void; onChange: (r: Partial<Rule>) => void;
}) {
  const fallback = rule.fallback_chain_json ? JSON.parse(rule.fallback_chain_json) : [];
  const caps = rule.required_capabilities_json ? JSON.parse(rule.required_capabilities_json) : [];
  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
      <aside className="absolute right-0 top-0 bottom-0 w-[520px] bg-background border-l border-border/30 pointer-events-auto overflow-y-auto custom-scrollbar p-5 space-y-4 text-xs">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Edit rule: <span className="font-mono">{task}</span></h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Primary model</label>
          <select value={rule.primary_model ?? ""} onChange={e => onChange({ ...rule, primary_model: e.target.value })}
            className="w-full rounded-md bg-background/50 px-2 py-1.5 mt-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40">
            <option value="">— choose —</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fallback chain (JSON array of model ids)</label>
          <textarea value={rule.fallback_chain_json ?? "[]"} onChange={e => onChange({ ...rule, fallback_chain_json: e.target.value })}
            rows={3} className="w-full rounded-md bg-background/50 px-2 py-1.5 mt-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Max cost per call (USD; blank = no cap)</label>
          <input type="number" step="0.0001" value={rule.max_cost_per_call_usd ?? ""}
            onChange={e => onChange({ ...rule, max_cost_per_call_usd: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-full rounded-md bg-background/50 px-2 py-1.5 mt-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Required capabilities</label>
          <div className="flex gap-2 mt-1">
            {(["tools", "vision"] as const).map(cap => {
              const on = caps.includes(cap);
              return (
                <button key={cap}
                  onClick={() => {
                    const next = on ? caps.filter((c: string) => c !== cap) : [...caps, cap];
                    onChange({ ...rule, required_capabilities_json: JSON.stringify(next) });
                  }}
                  className={`rounded-md px-2 py-1 text-[11px] ${on ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground"}`}>
                  {cap}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</label>
          <input value={rule.notes ?? ""} onChange={e => onChange({ ...rule, notes: e.target.value })}
            className="w-full rounded-md bg-background/50 px-2 py-1.5 mt-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>

        <button onClick={onSave}
          className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 text-xs">
          <Save className="h-3 w-3" /> Save (takes effect within 30s)
        </button>
      </aside>
    </div>
  );
}
