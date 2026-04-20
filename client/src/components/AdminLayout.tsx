import { type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Brain, DollarSign, Activity, FileText,
  Bot, Clock, Shield, Lock, Network, Database, HardDrive,
  HeartPulse, ArrowLeft, Terminal,
} from "lucide-react";

const adminNav = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },

  { path: "/admin/models", label: "Models", icon: Brain, group: "AI Operations" },
  { path: "/admin/costs", label: "Costs", icon: DollarSign, group: "AI Operations" },
  { path: "/admin/performance", label: "Performance", icon: Activity, group: "AI Operations" },
  { path: "/admin/logs", label: "LLM Logs", icon: FileText, group: "AI Operations" },

  { path: "/admin/agents", label: "System Agents", icon: Bot, group: "Agent Monitor" },
  { path: "/admin/crons", label: "Cron Jobs", icon: Clock, group: "Agent Monitor" },

  { path: "/admin/permissions", label: "Permissions", icon: Shield, group: "Trust & Safety" },
  { path: "/admin/privacy", label: "Privacy", icon: Lock, group: "Trust & Safety" },

  { path: "/admin/graph", label: "Graph", icon: Network, group: "Data" },
  { path: "/admin/memory", label: "Memory", icon: Database, group: "Data" },
  { path: "/admin/data", label: "Import/Export", icon: HardDrive, group: "Data" },
  { path: "/admin/health", label: "System Health", icon: HeartPulse, group: "Data" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Group nav items
  const grouped = adminNav.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof adminNav>);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-60 flex flex-col border-r border-border/50 bg-sidebar">
        <div className="flex items-center gap-3 h-16 px-4 border-b border-border/50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Admin</span>
            <span className="block text-[9px] text-amber-400 font-mono uppercase tracking-widest">Dev Console</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="text-[9px] font-semibold text-muted-foreground/60 tracking-widest uppercase px-3 mb-1.5">{group}</div>
              <div className="space-y-0.5">
                {items.map(item => {
                  const isActive = item.path === "/admin"
                    ? location === "/admin"
                    : location === item.path;
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors
                        ${isActive ? "bg-amber-500/10 text-amber-400" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-border/30 pt-3">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to Anchor
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
