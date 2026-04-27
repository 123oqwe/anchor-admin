/**
 * Admin · Run trace — single-run inspector with live tail.
 *
 * Renders the messages timeline (Anthropic-style content blocks) on the
 * left, the LLM-call timeline on the right. When the run is still in
 * `running` status, opens an SSE stream to /events and appends new
 * turns / LLM calls as they arrive — this is the "watch the agent
 * think" experience.
 *
 * Replay button creates a fresh run with the same user_message under
 * the current code path. New runId is unknown until task-brain picks
 * up the job; we just confirm and let the operator navigate to it
 * manually from /admin/runs.
 */
import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, Bot, Wrench, Brain, RefreshCw, Play, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface RunDetail {
  run: {
    id: string;
    userId: string;
    agentId: string;
    agentName: string;
    status: string;
    turn: number;
    maxTurns: number;
    userMessage: string;
    finalText: string | null;
    systemPrompt: string;
    error: string | null;
    createdAt: string;
    updatedAt: string;
  };
  messages: any[]; // Anthropic-style content blocks
  toolCalls: any[];
  llmCalls: {
    id: string; task: string; model_id: string; provider_id: string;
    input_tokens: number | null; output_tokens: number | null; cost_usd: number | null;
    latency_ms: number; status: string; error: string | null;
    request_preview: string | null; response_preview: string | null;
    created_at: string;
  }[];
}

const STATUS_COLOR: Record<string, string> = {
  completed:   "text-emerald-300 bg-emerald-500/10",
  failed:      "text-red-400 bg-red-500/10",
  running:     "text-blue-400 bg-blue-500/10 animate-pulse",
  cancelled:   "text-muted-foreground bg-muted/10",
  interrupted: "text-amber-300 bg-amber-500/10",
  abandoned:   "text-muted-foreground bg-muted/10",
};

export default function RunTrace() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ runId: string }>("/admin/runs/:runId");
  const { can } = useSession();
  const [data, setData] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const reload = async () => {
    if (!params?.runId) return;
    try {
      const d = await api.adminRun(params.runId);
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [params?.runId]);

  // Live tail: when the run is `running`, subscribe to SSE so new turns
  // and LLM calls show up without a full reload.
  useEffect(() => {
    if (!data || data.run.status !== "running" || !params?.runId) return;
    const es = new EventSource(`/api/admin/runs/${params.runId}/events`, { withCredentials: true });
    sseRef.current = es;

    es.addEventListener("turn", () => { reload(); });
    es.addEventListener("llm_call", () => { reload(); });
    es.addEventListener("end", () => { reload(); es.close(); });
    es.addEventListener("error", () => { /* SSE auto-reconnects */ });

    return () => { es.close(); sseRef.current = null; };
  }, [data?.run.status, params?.runId]);  // eslint-disable-line

  async function replay() {
    if (!params?.runId) return;
    try {
      const r = await api.adminReplayRun(params.runId);
      alert(`Replay enqueued (job ${r.jobId.slice(0, 8)}). New run will appear in /admin/runs within 5 seconds.`);
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">{error ?? "Run not found"}</div>;

  const r = data.run;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <button onClick={() => navigate("/admin/runs")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to runs
      </button>

      {/* Header */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground">{r.agentName}</h1>
            <div className="text-[11px] font-mono text-muted-foreground">{r.id}</div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">"{r.userMessage}"</p>
          </div>
          <div className="text-right space-y-2">
            <span className={`inline-block text-xs px-2 py-0.5 rounded ${STATUS_COLOR[r.status] ?? ""}`}>{r.status}</span>
            <div className="text-xs text-muted-foreground tabular-nums">turn {r.turn}/{r.maxTurns}</div>
            {can("observability.view") && r.status !== "running" && (
              <button onClick={replay}
                className="flex items-center gap-1 ml-auto rounded-md glass hover:bg-accent/30 px-2 py-1 text-xs">
                <RefreshCw className="h-3 w-3" /> Replay
              </button>
            )}
          </div>
        </div>
        {r.systemPrompt && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button onClick={() => setShowSystem(s => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              {showSystem ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              system prompt ({r.systemPrompt.length} chars)
            </button>
            {showSystem && (
              <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap text-muted-foreground bg-background/40 rounded-md p-3 max-h-64 overflow-y-auto custom-scrollbar">
                {r.systemPrompt}
              </pre>
            )}
          </div>
        )}
        {r.error && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <pre className="font-mono whitespace-pre-wrap break-words">{r.error}</pre>
          </div>
        )}
      </div>

      {/* Two columns: messages on left, LLM calls on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Messages — the agent's thoughts + tools */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Play className="h-3.5 w-3.5" /> Conversation
            {r.status === "running" && <span className="ml-2 text-[10px] text-blue-400 animate-pulse">● live</span>}
          </h2>
          <div className="space-y-3">
            {data.messages.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No messages yet.</p>}
            {data.messages.map((m, i) => <MessageBlock key={i} msg={m} />)}
            {r.finalText && (
              <div className="mt-4 rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Final answer</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.finalText}</p>
              </div>
            )}
          </div>
        </div>

        {/* LLM calls — quick scan of cost/latency */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" /> LLM calls
          </h2>
          <div className="space-y-2">
            {data.llmCalls.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No calls yet.</p>}
            {data.llmCalls.map(c => (
              <div key={c.id} className="rounded-md border border-white/5 p-2 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-foreground truncate">{c.model_id}</span>
                  <span className={c.status === "success" ? "text-emerald-300" : "text-red-400"}>{c.status}</span>
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5 flex gap-3">
                  <span>{c.input_tokens ?? "—"}↓</span>
                  <span>{c.output_tokens ?? "—"}↑</span>
                  <span>{c.latency_ms}ms</span>
                  <span className="ml-auto">${(c.cost_usd ?? 0).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ msg }: { msg: any }) {
  const role = msg.role;
  const content = msg.content;

  // String content (simple user message)
  if (typeof content === "string") {
    return (
      <div className={`rounded-md p-3 ${role === "user" ? "bg-blue-500/5 border border-blue-500/10" : "bg-white/[0.02] border border-white/5"}`}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{role}</div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  // Anthropic-style content blocks
  return (
    <div className={`rounded-md p-3 ${role === "user" ? "bg-blue-500/5 border border-blue-500/10" : "bg-white/[0.02] border border-white/5"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{role}</div>
      <div className="space-y-2">
        {(content as any[]).map((block, i) => {
          if (block.type === "text") {
            return <p key={i} className="text-sm text-foreground whitespace-pre-wrap">{block.text}</p>;
          }
          if (block.type === "tool_use") {
            return (
              <div key={i} className="rounded bg-purple-500/5 border border-purple-500/15 px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Wrench className="h-3 w-3 text-purple-300" />
                  <span className="font-mono text-purple-200">{block.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">{block.id?.slice(0, 12)}</span>
                </div>
                <pre className="mt-1 text-[10px] font-mono text-muted-foreground/80 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar">
                  {JSON.stringify(block.input, null, 2)}
                </pre>
              </div>
            );
          }
          if (block.type === "tool_result") {
            const text = typeof block.content === "string" ? block.content :
              Array.isArray(block.content) ? block.content.map((c: any) => c.text ?? JSON.stringify(c)).join("\n") :
              JSON.stringify(block.content);
            return (
              <div key={i} className={`rounded px-2 py-1.5 ${block.is_error ? "bg-red-500/5 border border-red-500/15" : "bg-emerald-500/5 border border-emerald-500/15"}`}>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={block.is_error ? "text-red-300" : "text-emerald-300"}>
                    {block.is_error ? "tool error" : "tool result"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">{block.tool_use_id?.slice(0, 12)}</span>
                </div>
                <pre className="mt-1 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto custom-scrollbar">
                  {text}
                </pre>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
