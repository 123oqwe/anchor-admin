import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminLayout from "./components/AdminLayout";
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

function Router() {
  return (
    <Switch>
      {/* / → /admin (admin app has no user surface) */}
      <Route path="/"><Redirect to="/admin" /></Route>

      <Route path="/admin"><AdminLayout><Overview /></AdminLayout></Route>

      {/* AI Ops */}
      <Route path="/admin/models"><AdminLayout><Cortex /></AdminLayout></Route>
      <Route path="/admin/costs"><AdminLayout><Costs /></AdminLayout></Route>
      <Route path="/admin/performance"><AdminLayout><Performance /></AdminLayout></Route>
      <Route path="/admin/logs"><AdminLayout><Logs /></AdminLayout></Route>

      {/* Agent Monitor */}
      <Route path="/admin/agents"><AdminLayout><Agents /></AdminLayout></Route>
      <Route path="/admin/crons"><AdminLayout><AdminCrons /></AdminLayout></Route>
      <Route path="/admin/jobs"><AdminLayout><Jobs /></AdminLayout></Route>
      <Route path="/admin/runs"><AdminLayout><Runs /></AdminLayout></Route>
      <Route path="/admin/runs/:runId"><AdminLayout><RunTrace /></AdminLayout></Route>
      <Route path="/admin/missions"><AdminLayout><Missions /></AdminLayout></Route>
      <Route path="/admin/missions/:id"><AdminLayout><MissionDetail /></AdminLayout></Route>
      <Route path="/admin/hooks"><AdminLayout><Hooks /></AdminLayout></Route>

      {/* Trust */}
      <Route path="/admin/permissions"><AdminLayout><AdminPermissions /></AdminLayout></Route>
      <Route path="/admin/privacy"><AdminLayout><AdminPrivacy /></AdminLayout></Route>

      {/* Data */}
      <Route path="/admin/graph"><AdminLayout><GraphAdmin /></AdminLayout></Route>
      <Route path="/admin/memory"><AdminLayout><MemoryAdmin /></AdminLayout></Route>
      <Route path="/admin/data"><AdminLayout><Data /></AdminLayout></Route>
      <Route path="/admin/health"><AdminLayout><Health /></AdminLayout></Route>
      <Route path="/admin/bridges-advanced"><AdminLayout><BridgesAdvanced /></AdminLayout></Route>

      {/* Settings (preferences for the operator) */}
      <Route path="/admin/settings"><AdminLayout><Settings /></AdminLayout></Route>

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
          <AppInner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
