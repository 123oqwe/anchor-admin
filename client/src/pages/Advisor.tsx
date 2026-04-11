import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Brain,
  MessageSquare,
  Bot,
  Play,
  Pause,
  Plus,
  Minus,
  Zap,
  Target,
  ChevronDown,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MessageRole = "user" | "advisor" | "draft" | "agent-action";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  draftType?: "email" | "plan" | "analysis" | "agent";
  draftStatus?: "pending" | "approved" | "rejected" | "executing" | "done";
  agentName?: string;
}

// Module 1: Personal Advisor messages
const personalMessages: Message[] = [
  {
    id: "p1",
    role: "advisor",
    content: "Based on your Human Graph, I see 3 areas needing attention. Your YC application has been delayed 3 times — this is your highest priority. You're also avoiding investor follow-ups. Would you like me to create a focused plan?",
    timestamp: "9:00 AM",
  },
  {
    id: "p2",
    role: "user",
    content: "Yes, help me plan the YC application session. Also, am I avoiding something I shouldn't be?",
    timestamp: "9:02 AM",
  },
  {
    id: "p3",
    role: "advisor",
    content: "You are. Your avoidance detection shows: investor follow-up emails (4 days), team performance review (1 week), and personal budget review. The investor emails have the highest downstream impact. Here's a plan:",
    timestamp: "9:02 AM",
  },
  {
    id: "p4",
    role: "draft",
    content: "**Focused Work Block — YC Application**\n\n1. Review current draft (15 min)\n2. Refine 'Why Now' section with market timing data\n3. Rewrite founder story — behavioral insight angle\n4. Final review & send to co-founder\n\n*Estimated: 2 hours | Calendar: 10:00-12:00*",
    timestamp: "9:03 AM",
    draftType: "plan",
    draftStatus: "pending",
  },
];

// Module 2: General AI messages
const generalMessages: Message[] = [
  {
    id: "g1",
    role: "advisor",
    content: "General mode connected. I can help with any question — research, analysis, writing, brainstorming. Unlike Personal mode, I don't reference your Human Graph here. What would you like to explore?",
    timestamp: "Now",
  },
];

// Module 3: Agent Mode messages
const agentMessages: Message[] = [
  {
    id: "a1",
    role: "advisor",
    content: "Agent Mode active. Describe what you need done, and I'll create a specialized agent to execute it. The agent will generate a plan, show you each step, and only execute with your approval.",
    timestamp: "Now",
  },
  {
    id: "a2",
    role: "user",
    content: "Create an agent to handle all my investor follow-up emails. Check my email history and draft personalized responses.",
    timestamp: "9:05 AM",
  },
  {
    id: "a3",
    role: "agent-action",
    content: "**Agent Created: Investor Follow-up Agent**\n\nObjective: Draft personalized follow-up emails to 3 pending investors\n\nPlan:\n→ Step 1: Scan email threads with Sarah Chen, David Park, Lisa Wang\n→ Step 2: Extract last conversation context for each\n→ Step 3: Generate personalized drafts\n→ Step 4: Queue for your approval\n\nEstimated: 5 minutes",
    timestamp: "9:05 AM",
    draftType: "agent",
    draftStatus: "pending",
    agentName: "Investor Follow-up Agent",
  },
];

// Execution log
interface ExecutionEntry {
  id: string;
  agent: string;
  action: string;
  status: "success" | "failed" | "running" | "queued";
  timestamp: string;
}

const executionLog: ExecutionEntry[] = [
  { id: "e1", agent: "Decision Agent", action: "Priority inference — surfaced YC application", status: "success", timestamp: "8:55 AM" },
  { id: "e2", agent: "Observation Agent", action: "Scanned 14 new emails, 3 calendar events", status: "success", timestamp: "8:50 AM" },
  { id: "e3", agent: "Investor Follow-up Agent", action: "Drafting email to Sarah Chen", status: "running", timestamp: "9:06 AM" },
  { id: "e4", agent: "Investor Follow-up Agent", action: "Drafting email to David Park", status: "queued", timestamp: "—" },
  { id: "e5", agent: "Investor Follow-up Agent", action: "Drafting email to Lisa Wang", status: "queued", timestamp: "—" },
];

const personalSuggestions = [
  "Am I avoiding something important?",
  "What should I prioritize this week?",
  "Analyze my decision patterns",
];

const generalSuggestions = [
  "Explain transformer architecture",
  "Help me write a pitch deck outline",
  "Compare React vs Vue for our use case",
];

const agentSuggestions = [
  "Create an agent to organize my inbox",
  "Build an agent to research competitors",
  "Create a scheduling agent for next week",
];

// Agent status badge
function AgentStatusBadge({ name, successes, failures }: { name: string; successes: number; failures: number }) {
  return (
    <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
      <Bot className="h-3 w-3 text-primary" />
      <span className="text-[10px] font-medium text-foreground">{name}</span>
      <div className="flex items-center gap-1 text-[10px] font-mono">
        <Plus className="h-2 w-2 text-emerald-400" />
        <span className="text-emerald-400">{successes}</span>
        <Minus className="h-2 w-2 text-red-400 ml-0.5" />
        <span className="text-red-400">{failures}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">exec</span>
    </div>
  );
}

function ChatView({ messages: initialMsgs, suggestions, mode }: {
  messages: Message[];
  suggestions: string[];
  mode: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMsgs);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response: Message = mode === "agent"
        ? {
            id: (Date.now() + 1).toString(),
            role: "agent-action",
            content: `**Agent Created: Custom Task Agent**\n\nObjective: ${input}\n\nPlan:\n→ Step 1: Analyze requirements\n→ Step 2: Gather context from your Human Graph\n→ Step 3: Execute task\n→ Step 4: Present results for approval\n\nEstimated: 3 minutes`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            draftType: "agent",
            draftStatus: "pending",
            agentName: "Custom Task Agent",
          }
        : {
            id: (Date.now() + 1).toString(),
            role: "advisor",
            content: mode === "personal"
              ? "Based on your Human Graph context and recent behavioral patterns, here's my analysis..."
              : "Here's what I found. Let me break this down for you...",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const handleDraftAction = (id: string, action: "approved" | "rejected") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, draftStatus: action } : m))
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role !== "user" && (
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                  msg.role === "draft" ? "bg-amber-500/10" :
                  msg.role === "agent-action" ? "bg-purple-500/10" :
                  "bg-primary/10"
                }`}>
                  {msg.role === "draft" ? (
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                  ) : msg.role === "agent-action" ? (
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
              )}

              <div className={`max-w-[600px] ${msg.role === "user" ? "text-right" : ""}`}>
                {(msg.role === "draft" || msg.role === "agent-action") && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-[10px] ${
                      msg.role === "agent-action" ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {msg.role === "agent-action" ? `Agent — ${msg.agentName}` : `Draft — ${msg.draftType}`}
                    </Badge>
                    {msg.draftStatus === "approved" && (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                      </Badge>
                    )}
                    {msg.draftStatus === "rejected" && (
                      <Badge className="text-[10px] bg-red-500/10 text-red-400">
                        <XCircle className="h-3 w-3 mr-1" /> Rejected
                      </Badge>
                    )}
                    {msg.draftStatus === "executing" && (
                      <Badge className="text-[10px] bg-blue-500/10 text-blue-400">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Executing
                      </Badge>
                    )}
                  </div>
                )}

                <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : msg.role === "draft"
                    ? "glass-strong border-amber-500/20"
                    : msg.role === "agent-action"
                    ? "glass-strong border-purple-500/20"
                    : "glass"
                }`}>
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className={`${i > 0 ? "mt-1" : ""} ${line.startsWith("**") ? "font-semibold" : ""} ${line.startsWith("→") ? "text-muted-foreground pl-2" : ""}`}>
                      {line.replace(/\*\*/g, "")}
                    </p>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{msg.timestamp}</span>
                  {(msg.role === "draft" || msg.role === "agent-action") && msg.draftStatus === "pending" && (
                    <div className="flex gap-1.5 ml-2">
                      <button
                        onClick={() => handleDraftAction(msg.id, "approved")}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleDraftAction(msg.id, "rejected")}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestions */}
      <div className="shrink-0 px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="shrink-0 flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.07] transition-all"
            >
              <Lightbulb className="h-3 w-3 text-primary" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 pb-4 pt-1">
        <form onSubmit={handleSend} className="glass rounded-xl overflow-hidden flex items-center focus-within:border-primary/30 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "personal" ? "Ask about your priorities, patterns, or decisions..." :
              mode === "general" ? "Ask anything — research, analysis, brainstorming..." :
              "Describe the task for your agent to execute..."
            }
            className="flex-1 bg-transparent px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <button type="submit" disabled={!input.trim()} className="px-5 py-3.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Advisor() {
  const [showExecLog, setShowExecLog] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Advisor</h1>
              <p className="text-xs text-muted-foreground">Three modes of intelligence at your service</p>
            </div>
          </div>

          {/* Agent status badges */}
          <div className="hidden md:flex items-center gap-2">
            <AgentStatusBadge name="Decision" successes={14} failures={0} />
            <AgentStatusBadge name="Execution" successes={8} failures={1} />
            <button
              onClick={() => setShowExecLog(!showExecLog)}
              className="glass rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Execution Log
              <ChevronDown className={`h-3 w-3 transition-transform ${showExecLog ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Execution Log Dropdown */}
        <AnimatePresence>
          {showExecLog && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 glass rounded-xl p-4">
                <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-3">Recent Executions</h4>
                <div className="space-y-2">
                  {executionLog.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        entry.status === "success" ? "bg-emerald-400" :
                        entry.status === "running" ? "bg-blue-400 animate-pulse" :
                        entry.status === "failed" ? "bg-red-400" :
                        "bg-muted-foreground/30"
                      }`} />
                      <span className="text-muted-foreground font-mono w-16 shrink-0">{entry.timestamp}</span>
                      <Badge className="text-[9px] bg-white/5 text-muted-foreground shrink-0">{entry.agent}</Badge>
                      <span className="text-foreground/80 flex-1">{entry.action}</span>
                      <span className={`text-[10px] font-mono ${
                        entry.status === "success" ? "text-emerald-400" :
                        entry.status === "running" ? "text-blue-400" :
                        entry.status === "failed" ? "text-red-400" :
                        "text-muted-foreground"
                      }`}>{entry.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Three-tab advisor */}
      <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 pt-3">
          <TabsList className="glass border-0 p-1 w-full justify-start">
            <TabsTrigger value="personal" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <Brain className="h-3 w-3" />
              Personal Advisor
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              General AI
            </TabsTrigger>
            <TabsTrigger value="agent" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <Bot className="h-3 w-3" />
              Agent Mode
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="personal" className="flex-1 overflow-hidden mt-0">
          <div className="px-6 py-2">
            <p className="text-[10px] text-muted-foreground">
              Advises you from <strong className="text-foreground">your perspective</strong> — uses your Human Graph, memory, and behavioral patterns to surface what matters.
            </p>
          </div>
          <ChatView messages={personalMessages} suggestions={personalSuggestions} mode="personal" />
        </TabsContent>

        <TabsContent value="general" className="flex-1 overflow-hidden mt-0">
          <div className="px-6 py-2">
            <p className="text-[10px] text-muted-foreground">
              General-purpose AI — like ChatGPT. Research, brainstorm, analyze. <strong className="text-foreground">No personal context.</strong>
            </p>
          </div>
          <ChatView messages={generalMessages} suggestions={generalSuggestions} mode="general" />
        </TabsContent>

        <TabsContent value="agent" className="flex-1 overflow-hidden mt-0">
          <div className="px-6 py-2">
            <p className="text-[10px] text-muted-foreground">
              Describe a task → Anchor creates a <strong className="text-foreground">specialized agent</strong> to execute it. All actions require your approval.
            </p>
          </div>
          <ChatView messages={agentMessages} suggestions={agentSuggestions} mode="agent" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
