import { type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users as UsersIcon, Key, FileText, Terminal,
  Activity, BarChart3, Route as RouteIcon, LogOut,
  ShieldCheck, FlaskConical, TrendingUp, Send,
  ShieldAlert, Bug, Search, Ban, Package,
} from "lucide-react";
import { useSession } from "@/lib/auth";

// Items the operator opens daily. Each requires its backend permission;
// pages render their own empty state when the admin lacks a permission
// rather than 403'ing them out — better UX for "I have part-access".
//
// Trimmed in 5.E.4: dropped Costs, Performance, System Health from the
// nav. Costs+Health are subsumed by the Overview page; Performance was
// a single SQL view that admin-backend doesn't expose. The page files
// stay so /admin/costs etc still resolve if someone bookmarks them.
const adminNav = [
  { path: "/admin",            label: "Overview",     icon: LayoutDashboard, group: "Operator" },
  { path: "/admin/users",      label: "Users",        icon: UsersIcon,       group: "Operator" },
  { path: "/admin/invites",    label: "Invites",      icon: Key,             group: "Operator" },
  { path: "/admin/audit",      label: "Audit log",    icon: FileText,        group: "Operator" },

  { path: "/admin/runs",       label: "Run traces",   icon: RouteIcon,       group: "AI Ops" },
  { path: "/admin/logs",       label: "LLM calls",    icon: Activity,        group: "AI Ops" },
  { path: "/admin/stats",      label: "Stats",        icon: BarChart3,       group: "AI Ops" },

  { path: "/admin/admins",     label: "Admins",       icon: ShieldCheck,     group: "Trust" },
  { path: "/admin/experiments",label: "A/B tests",    icon: FlaskConical,    group: "Trust" },

  { path: "/admin/growth",     label: "Growth",       icon: TrendingUp,      group: "Growth" },
  { path: "/admin/notify",     label: "Notify",       icon: Send,            group: "Growth" },

  { path: "/admin/security",           label: "Overview",  icon: ShieldAlert, group: "Security" },
  { path: "/admin/security/alerts",    label: "Alerts",    icon: Activity,    group: "Security" },
  { path: "/admin/security/findings",  label: "Findings",  icon: Search,      group: "Security" },
  { path: "/admin/security/forensics", label: "Forensics", icon: FileText,    group: "Security" },
  { path: "/admin/security/blocklist", label: "Blocklist", icon: Ban,         group: "Security" },
  { path: "/admin/security/pentest",   label: "Pentest",   icon: Bug,         group: "Security" },

  { path: "/admin/plugins", label: "Catalog", icon: Package, group: "Plugins" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useSession();

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

        <div className="px-3 pb-4 border-t border-border/30 pt-3 space-y-2">
          {user && (
            <div className="px-3 text-[10px] text-muted-foreground truncate" title={user.email}>
              {user.email}
            </div>
          )}
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
