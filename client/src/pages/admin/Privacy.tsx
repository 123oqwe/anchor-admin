/**
 * Privacy & Compliance — LLM data transparency, delete all data.
 */
import { useState, useEffect } from "react";
import { Loader2, Eye, Trash2, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Privacy() {
  const [, navigate] = useLocation();
  const [disclosures, setDisclosures] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/privacy/llm-disclosures").then(r => r.json()).catch(() => null),
      fetch("/api/privacy/policy").then(r => r.json()).catch(() => null),
    ]).then(([d, p]) => { setDisclosures(d); setPolicy(p); }).finally(() => setLoading(false));
  }, []);

  const handleDeleteAll = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch("/api/privacy/delete-all", { method: "DELETE" });
      toast.success("All data deleted. Redirecting to onboarding...");
      localStorage.removeItem("anchor_onboarded");
      setTimeout(() => navigate("/"), 2000);
    } catch { toast.error("Failed to delete data"); }
    setDeleting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  return (
    <div className="space-y-6">
      {/* LLM Data Disclosure */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">LLM Data Disclosure</h2>
        </div>

        {disclosures?.providers ? (
          <div className="space-y-3">
            {disclosures.providers.map((p: any) => (
              <div key={p.provider} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-sm font-medium text-foreground w-32">{p.provider}</span>
                <span className="text-xs font-mono text-muted-foreground">{p.callCount} calls</span>
                <span className="text-xs text-muted-foreground flex-1">{p.tokensUsed?.toLocaleString() ?? 0} tokens</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No LLM calls recorded yet.</p>
        )}

        <div className="mt-4 p-3 bg-blue-500/5 rounded-lg">
          <p className="text-xs text-blue-400 font-medium mb-1">Data sent to LLM providers includes:</p>
          <p className="text-[10px] text-muted-foreground">Graph node labels, memory content, conversation history, twin insights</p>
          <p className="text-xs text-emerald-400 font-medium mt-2 mb-1">Data NOT sent:</p>
          <p className="text-[10px] text-muted-foreground">Raw browser URLs, contact phone numbers, calendar event details, file contents</p>
        </div>
      </div>

      {/* Privacy Policy */}
      {policy && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-emerald-400" />
            <h2 className="text-lg font-semibold">Privacy Policy</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
            {policy.sections?.map((s: any, i: number) => (
              <div key={i}>
                <p className="text-foreground font-medium">{s.title}</p>
                <p>{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete All Data */}
      <div className="glass rounded-xl p-5 border border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Delete All Data</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete your entire graph, all memories, insights, skills, messages, and personal data.
          This action cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="glass rounded-lg px-3 py-2 text-sm text-foreground w-48 focus:outline-none"
          />
          <button
            onClick={handleDeleteAll}
            disabled={confirmText !== "DELETE" || deleting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete Everything"}
          </button>
        </div>
      </div>
    </div>
  );
}
