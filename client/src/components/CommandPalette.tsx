/**
 * L7 — Command Palette (Cmd+K).
 * Global quick-access: navigate + quick-add node/task/memory + search.
 * Principle: minimum friction for every action.
 */
import { useState, useEffect } from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useLocation } from "wouter";
import {
  LayoutDashboard, MessageCircle, Users, Brain,
  FolderKanban, Settings, Cpu, Search, Zap,
  Plus, Target, User, BookOpen, Lightbulb,
} from "lucide-react";
import { api } from "@/lib/api";

const PAGES = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Navigate" },
  { name: "Advisor", path: "/advisor", icon: MessageCircle, group: "Navigate" },
  { name: "Twin Agent", path: "/twin", icon: Users, group: "Navigate" },
  { name: "Memory", path: "/memory", icon: Brain, group: "Navigate" },
  { name: "Workspace", path: "/workspace", icon: FolderKanban, group: "Navigate" },
  { name: "Settings", path: "/settings", icon: Settings, group: "Navigate" },
  { name: "Admin — Cortex", path: "/admin", icon: Cpu, group: "Admin" },
  { name: "Admin — Costs", path: "/admin/costs", icon: Zap, group: "Admin" },
  { name: "Admin — Logs", path: "/admin/logs", icon: Search, group: "Admin" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"search" | "add-node" | "add-task" | "add-memory">("search");
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setMode("search");
        setFeedback("");
      }
      if (e.key === "Escape") { setOpen(false); setMode("search"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const quickAddNode = async () => {
    if (!inputValue.trim()) return;
    setFeedback("Adding to graph...");
    try {
      await fetch("/api/graph/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputValue }),
      });
      setFeedback("✓ Added to graph");
      setInputValue("");
      setTimeout(() => { setOpen(false); setFeedback(""); setMode("search"); }, 1000);
    } catch { setFeedback("Failed"); }
  };

  const quickAddTask = async () => {
    if (!inputValue.trim()) return;
    setFeedback("Creating task...");
    try {
      const projects = await api.getProjects();
      const projectId = projects[0]?.id;
      if (projectId) {
        await api.createTask(projectId, { title: inputValue, status: "todo", priority: "medium", tags: [] });
        setFeedback("✓ Task created");
      } else {
        setFeedback("No project found");
      }
      setInputValue("");
      setTimeout(() => { setOpen(false); setFeedback(""); setMode("search"); }, 1000);
    } catch { setFeedback("Failed"); }
  };

  const quickAddMemory = async () => {
    if (!inputValue.trim()) return;
    setFeedback("Saving memory...");
    try {
      await api.createMemory({ type: "episodic", title: inputValue.slice(0, 50), content: inputValue, tags: ["manual"], source: "Quick Add" });
      setFeedback("✓ Memory saved");
      setInputValue("");
      setTimeout(() => { setOpen(false); setFeedback(""); setMode("search"); }, 1000);
    } catch { setFeedback("Failed"); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setMode("search"); }} />
      <div className="relative w-full max-w-lg">
        {mode === "search" ? (
          <Command className="glass-strong rounded-xl border border-border/50 shadow-2xl overflow-hidden">
            <CommandInput placeholder="Search or type a command..." className="border-b border-border/30" />
            <CommandList className="max-h-[350px]">
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => setMode("add-node")} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <Plus className="h-4 w-4 text-emerald-400" /><span>Add to Graph</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">natural language → node</span>
                </CommandItem>
                <CommandItem onSelect={() => setMode("add-task")} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <Target className="h-4 w-4 text-blue-400" /><span>Quick Task</span>
                </CommandItem>
                <CommandItem onSelect={() => setMode("add-memory")} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <BookOpen className="h-4 w-4 text-purple-400" /><span>Quick Memory</span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigate">
                {PAGES.filter(p => p.group === "Navigate").map(page => {
                  const Icon = page.icon;
                  return (
                    <CommandItem key={page.path} onSelect={() => { navigate(page.path); setOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Icon className="h-4 w-4 text-muted-foreground" /><span>{page.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup heading="Admin">
                {PAGES.filter(p => p.group === "Admin").map(page => {
                  const Icon = page.icon;
                  return (
                    <CommandItem key={page.path} onSelect={() => { navigate(page.path); setOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Icon className="h-4 w-4 text-amber-400" /><span>{page.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          /* Quick Add Mode */
          <div className="glass-strong rounded-xl border border-border/50 shadow-2xl overflow-hidden p-4">
            <div className="flex items-center gap-2 mb-3">
              {mode === "add-node" && <><Plus className="h-4 w-4 text-emerald-400" /><span className="text-sm font-medium">Add to Graph</span></>}
              {mode === "add-task" && <><Target className="h-4 w-4 text-blue-400" /><span className="text-sm font-medium">Quick Task</span></>}
              {mode === "add-memory" && <><BookOpen className="h-4 w-4 text-purple-400" /><span className="text-sm font-medium">Quick Memory</span></>}
              <button onClick={() => setMode("search")} className="ml-auto text-xs text-muted-foreground hover:text-foreground">← back</button>
            </div>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (mode === "add-node") quickAddNode();
                  if (mode === "add-task") quickAddTask();
                  if (mode === "add-memory") quickAddMemory();
                }
              }}
              autoFocus
              placeholder={
                mode === "add-node" ? "Type naturally: I met John from Google, he can help with AI..." :
                mode === "add-task" ? "Task title..." :
                "What do you want to remember?"
              }
              className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none border border-border/50"
            />
            {feedback && <p className="text-xs text-primary mt-2">{feedback}</p>}
            <p className="text-[10px] text-muted-foreground mt-2">Press Enter to save</p>
          </div>
        )}
      </div>
    </div>
  );
}
