import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useSession } from "./lib/auth";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import Settings from "./pages/Settings";
import Cortex from "./pages/Cortex";
import Overview from "./pages/admin/Overview";
import Logs from "./pages/admin/Logs";
import Data from "./pages/admin/Data";
import Costs from "./pages/admin/Costs";
import Performance from "./pages/admin/Performance";
import GraphAdmin from "./pages/admin/Graph";
import MemoryAdmin from "./pages/admin/Memory";
import Health from "./pages/admin/Health";
import Agents from "./pages/admin/Agents";
import AdminCrons from "./pages/admin/Crons";
import AdminPermissions from "./pages/admin/Permissions";
import AdminPrivacy from "./pages/admin/Privacy";
// Imported from ui branch (richer ops surface)
import BridgesAdvanced from "./pages/admin/BridgesAdvanced";
import Hooks from "./pages/admin/Hooks";
import Jobs from "./pages/admin/Jobs";
import Missions from "./pages/admin/Missions";
import MissionDetail from "./pages/admin/MissionDetail";
import Runs from "./pages/admin/Runs";
import RunTrace from "./pages/admin/RunTrace";
import Users from "./pages/admin/Users";
import UserDetail from "./pages/admin/UserDetail";
import Invites from "./pages/admin/Invites";
import Audit from "./pages/admin/Audit";
import Admins from "./pages/admin/Admins";
import Experiments from "./pages/admin/Experiments";
import Notify from "./pages/admin/Notify";
import Growth from "./pages/admin/Growth";
import Stats from "./pages/admin/Stats";
import Security from "./pages/admin/Security";
import SecurityAlerts from "./pages/admin/SecurityAlerts";
import SecurityPentest from "./pages/admin/SecurityPentest";
import SecurityFindings from "./pages/admin/SecurityFindings";
import SecurityForensics from "./pages/admin/SecurityForensics";
import SecurityBlocklist from "./pages/admin/SecurityBlocklist";
import Plugins from "./pages/admin/Plugins";
import PluginDetail from "./pages/admin/PluginDetail";
import PluginInstall from "./pages/admin/PluginInstall";
import Traces from "./pages/admin/Traces";
import Cache from "./pages/admin/Cache";
import SecurityGuardrails from "./pages/admin/SecurityGuardrails";
import Models from "./pages/admin/Models";
import ModelHealth from "./pages/admin/ModelHealth";
import Routing from "./pages/admin/Routing";
import ExecMetrics from "./pages/admin/ExecMetrics";

/**
 * Renders children when an admin session is present; otherwise shows the
 * loader during the initial /me probe and redirects to /login on failure.
 * Backend's requireAdmin still enforces — this is the UX layer that keeps
 * non-admins from staring at empty pages.
 */
function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!user || !user.isAdmin) return <Redirect to="/login" />;
  return <>{children}</>;
}

/** Combine gate + layout — every protected admin route wraps in this. */
function AdminPage({ children }: { children: React.ReactNode }) {
  return <AdminGate><AdminLayout>{children}</AdminLayout></AdminGate>;
}

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no session required. */}
      <Route path="/login" component={Login} />
      <Route path="/verify" component={Verify} />

      {/* / → /admin (admin app has no user surface) */}
      <Route path="/"><Redirect to="/admin" /></Route>

      <Route path="/admin"><AdminPage><Overview /></AdminPage></Route>

      {/* Operator essentials (Sprint 5) */}
      <Route path="/admin/users/:id"><AdminPage><UserDetail /></AdminPage></Route>
      <Route path="/admin/users"><AdminPage><Users /></AdminPage></Route>
      <Route path="/admin/invites"><AdminPage><Invites /></AdminPage></Route>
      <Route path="/admin/audit"><AdminPage><Audit /></AdminPage></Route>
      <Route path="/admin/admins"><AdminPage><Admins /></AdminPage></Route>
      <Route path="/admin/experiments"><AdminPage><Experiments /></AdminPage></Route>
      <Route path="/admin/notify"><AdminPage><Notify /></AdminPage></Route>
      <Route path="/admin/growth"><AdminPage><Growth /></AdminPage></Route>
      <Route path="/admin/stats"><AdminPage><Stats /></AdminPage></Route>

      {/* AI Ops */}
      <Route path="/admin/models"><AdminPage><Cortex /></AdminPage></Route>
      <Route path="/admin/costs"><AdminPage><Costs /></AdminPage></Route>
      <Route path="/admin/performance"><AdminPage><Performance /></AdminPage></Route>
      <Route path="/admin/logs"><AdminPage><Logs /></AdminPage></Route>

      {/* Agent Monitor */}
      <Route path="/admin/agents"><AdminPage><Agents /></AdminPage></Route>
      <Route path="/admin/crons"><AdminPage><AdminCrons /></AdminPage></Route>
      <Route path="/admin/jobs"><AdminPage><Jobs /></AdminPage></Route>
      <Route path="/admin/runs"><AdminPage><Runs /></AdminPage></Route>
      <Route path="/admin/runs/:runId"><AdminPage><RunTrace /></AdminPage></Route>
      <Route path="/admin/missions"><AdminPage><Missions /></AdminPage></Route>
      <Route path="/admin/missions/:id"><AdminPage><MissionDetail /></AdminPage></Route>
      <Route path="/admin/hooks"><AdminPage><Hooks /></AdminPage></Route>

      {/* Trust */}
      <Route path="/admin/permissions"><AdminPage><AdminPermissions /></AdminPage></Route>
      <Route path="/admin/privacy"><AdminPage><AdminPrivacy /></AdminPage></Route>

      {/* Security */}
      <Route path="/admin/security"><AdminPage><Security /></AdminPage></Route>
      <Route path="/admin/security/alerts"><AdminPage><SecurityAlerts /></AdminPage></Route>
      <Route path="/admin/security/pentest"><AdminPage><SecurityPentest /></AdminPage></Route>
      <Route path="/admin/security/findings"><AdminPage><SecurityFindings /></AdminPage></Route>
      <Route path="/admin/security/forensics"><AdminPage><SecurityForensics /></AdminPage></Route>
      <Route path="/admin/security/blocklist"><AdminPage><SecurityBlocklist /></AdminPage></Route>

      {/* Plugins */}
      <Route path="/admin/plugins"><AdminPage><Plugins /></AdminPage></Route>
      <Route path="/admin/plugins/install"><AdminPage><PluginInstall /></AdminPage></Route>
      <Route path="/admin/plugins/:name"><AdminPage><PluginDetail /></AdminPage></Route>

      {/* Portkey-style observability */}
      <Route path="/admin/traces"><AdminPage><Traces /></AdminPage></Route>
      <Route path="/admin/cache"><AdminPage><Cache /></AdminPage></Route>
      <Route path="/admin/security/guardrails"><AdminPage><SecurityGuardrails /></AdminPage></Route>

      {/* Integrated Model Platform */}
      <Route path="/admin/models"><AdminPage><Models /></AdminPage></Route>
      <Route path="/admin/models/health"><AdminPage><ModelHealth /></AdminPage></Route>
      <Route path="/admin/routing"><AdminPage><Routing /></AdminPage></Route>
      <Route path="/admin/exec-metrics"><AdminPage><ExecMetrics /></AdminPage></Route>

      {/* Data */}
      <Route path="/admin/graph"><AdminPage><GraphAdmin /></AdminPage></Route>
      <Route path="/admin/memory"><AdminPage><MemoryAdmin /></AdminPage></Route>
      <Route path="/admin/data"><AdminPage><Data /></AdminPage></Route>
      <Route path="/admin/health"><AdminPage><Health /></AdminPage></Route>
      <Route path="/admin/bridges-advanced"><AdminPage><BridgesAdvanced /></AdminPage></Route>

      {/* Settings (preferences for the operator) */}
      <Route path="/admin/settings"><AdminPage><Settings /></AdminPage></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  return (
    <>
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
