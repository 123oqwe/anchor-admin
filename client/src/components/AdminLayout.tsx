import { type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import {
  Cpu, Activity, Database, ArrowLeft, Terminal,
} from "lucide-react";

const adminNav = [
  { path: "/admin", label: "Cortex", icon: Cpu, description: "Models & Providers" },
  { path: "/admin/logs", label: "Logs", icon: Activity, description: "Agent Executions" },
  { path: "/admin/data", label: "Data", icon: Database, description: "Database Tables" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Admin Sidebar */}
      <aside className="w-56 flex flex-col border-r border-border/50 bg-sidebar">
        {/* Header */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-border/50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Admin</span>
            <span className="block text-[9px] text-amber-400 font-mono uppercase tracking-widest">Dev Console</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {adminNav.map(item => {
            const isActive = item.path === "/admin"
              ? location === "/admin"
              : location.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? "bg-amber-500/10 text-amber-400" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Back to user app */}
        <div className="px-3 pb-4">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to Anchor
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
