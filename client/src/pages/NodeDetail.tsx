/**
 * Node Detail Page — every node in Human Graph is clickable and expandable.
 *
 * Shows: source, connections, health, importance, notes, actions.
 * User can: edit, add notes, change status, trigger actions, delete.
 */
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, Mail, Target, Bell,
  Loader2, Users, Briefcase, Heart, DollarSign,
  GraduationCap, Brain, AlertCircle, ChevronRight,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  person: "text-purple-400", goal: "text-blue-400", project: "text-emerald-400",
  commitment: "text-amber-400", task: "text-blue-300", risk: "text-red-400",
  constraint: "text-amber-400", value: "text-emerald-300", preference: "text-cyan-400",
  behavioral_pattern: "text-rose-400", opportunity: "text-emerald-400", decision: "text-blue-400",
};

const DOMAIN_ICONS: Record<string, any> = {
  work: Briefcase, relationships: Users, finance: DollarSign,
  growth: GraduationCap, health: Heart,
};

const STATUSES = ["active", "in-progress", "done", "blocked", "decaying", "stable"];

export default function NodeDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/graph/:id");
  const nodeId = params?.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  useEffect(() => {
    if (!nodeId) return;
    api.getNodeDetail(nodeId)
      .then(d => { setData(d); setNote(d.node?.detail ?? ""); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;
  if (error || !data?.node) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{error ?? "Node not found"}</p>
        <button onClick={() => navigate("/dashboard")} className="mt-3 text-xs text-primary hover:underline">Back to Dashboard</button>
      </div>
    </div>
  );

  const { node, edges, health, importance, relatedMemories } = data;
  const DomainIcon = DOMAIN_ICONS[node.domain] ?? Brain;
  const typeColor = TYPE_COLORS[node.type] ?? "text-muted-foreground";

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await api.updateNode(node.id, { ...node, detail: note });
      toast.success("Saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateNode(node.id, { ...node, status: newStatus });
      setData({ ...data, node: { ...node, status: newStatus } });
      setEditingStatus(false);
      toast.success(`Status → ${newStatus}`);
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${node.label}"? This cannot be undone.`)) return;
    try {
      await api.deleteNode(node.id);
      toast.success("Deleted");
      navigate("/dashboard");
    } catch { toast.error("Failed to delete"); }
  };

  // Extract email if person
  const emailMatch = (node.detail ?? "").match(/[\w.+-]+@[\w.-]+\.\w+/);

  return (
    <div className="min-h-screen dot-grid">
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-20">

        {/* Back button */}
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3 mb-4">
            <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${typeColor}`}>
              <DomainIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{node.label}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-[10px] ${typeColor} bg-white/5`}>{node.type}</Badge>
                <span className="text-[10px] text-muted-foreground">{node.domain}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                {editingStatus ? (
                  <div className="flex gap-1">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${s === node.status ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setEditingStatus(true)} className="text-[10px] text-primary hover:underline">{node.status}</button>
                )}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="glass rounded-xl p-4 space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Source</span>
              <span className="text-foreground">{node.captured}</span>
            </div>
            {health !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Relationship Health</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${health > 70 ? "bg-emerald-400" : health > 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${health}%` }} />
                  </div>
                  <span className={`font-mono ${health > 70 ? "text-emerald-400" : health > 40 ? "text-amber-400" : "text-red-400"}`}>{health}%</span>
                </div>
              </div>
            )}
            {importance !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Importance (PageRank)</span>
                <span className="text-foreground font-mono">{importance}%</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{node.createdAt?.slice(0, 10)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last updated</span>
              <span className="text-foreground">{node.updatedAt?.slice(0, 10)}</span>
            </div>
          </div>
        </motion.div>

        {/* Connections */}
        {(edges.outgoing.length > 0 || edges.incoming.length > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-4">
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-3">Connections</h2>
            <div className="glass rounded-xl p-4 space-y-1.5">
              {edges.outgoing.map((e: any, i: number) => (
                <div key={`out-${i}`} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/[0.03] rounded px-2 py-1 -mx-2"
                  onClick={() => navigate(`/graph/${e.toId}`)}>
                  <span className="text-primary">→</span>
                  <span className="text-muted-foreground">{e.type}</span>
                  <span className="text-foreground flex-1">{e.toLabel}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">{e.weight}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                </div>
              ))}
              {edges.incoming.map((e: any, i: number) => (
                <div key={`in-${i}`} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/[0.03] rounded px-2 py-1 -mx-2"
                  onClick={() => navigate(`/graph/${e.fromId}`)}>
                  <span className="text-emerald-400">←</span>
                  <span className="text-muted-foreground">{e.type}</span>
                  <span className="text-foreground flex-1">{e.fromLabel}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">{e.weight}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Notes */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4">
          <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-3">Notes</h2>
          <div className="glass rounded-xl p-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your notes about this..."
              rows={3}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none"
            />
            <button onClick={handleSaveNote} disabled={saving}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-4">
          <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-3">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {(node.type === "person" && emailMatch) && (
              <button onClick={() => window.location.href = `mailto:${emailMatch[0]}`}
                className="flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-xs text-foreground hover:bg-white/[0.05]">
                <Mail className="h-3 w-3 text-blue-400" /> Send Email
              </button>
            )}
            {node.type === "person" && (
              <button onClick={async () => {
                try {
                  const res = await fetch("/api/notifications/suggest-action", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ personLabel: node.label, context: node.detail, actionType: "send_email" }),
                  }).then(r => r.json());
                  window.location.href = `mailto:${res.to}?subject=${encodeURIComponent(res.subject)}&body=${encodeURIComponent(res.body)}`;
                } catch { toast.error("Could not draft email"); }
              }}
                className="flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-xs text-foreground hover:bg-white/[0.05]">
                <Mail className="h-3 w-3 text-purple-400" /> Draft Follow-up
              </button>
            )}
            <button onClick={async () => {
              await api.createNode({ domain: "work", label: `Follow up: ${node.label}`, type: "task", status: "todo", detail: `Related to ${node.label}` });
              toast.success("Task created");
            }}
              className="flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-xs text-foreground hover:bg-white/[0.05]">
              <Target className="h-3 w-3 text-emerald-400" /> Create Task
            </button>
            <button onClick={() => {
              fetch("/api/integrations/finance/expense", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: "other", amount: 0, note: `Reminder: ${node.label}` }) });
              toast.success("Reminder set");
            }}
              className="flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-xs text-foreground hover:bg-white/[0.05]">
              <Bell className="h-3 w-3 text-amber-400" /> Set Reminder
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/5">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </motion.div>

        {/* Related Memories */}
        {relatedMemories?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-3">Related Memories</h2>
            <div className="space-y-2">
              {relatedMemories.map((m: any) => (
                <div key={m.id} className="glass rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-[9px] bg-white/5 text-muted-foreground">{m.type}</Badge>
                    <span className="text-xs text-foreground">{m.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{m.content?.slice(0, 120)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
