import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Advisor from "./pages/Advisor";
import TwinAgent from "./pages/TwinAgent";
import Memory from "./pages/Memory";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import Cortex from "./pages/Cortex";
import Logs from "./pages/admin/Logs";
import Data from "./pages/admin/Data";

function Router() {
  return (
    <Switch>
      {/* Onboarding — full screen, no sidebar */}
      <Route path="/" component={Onboarding} />

      {/* Admin — developer console, separate layout */}
      <Route path="/admin/:rest*">
        <AdminLayout>
          <Switch>
            <Route path="/admin" component={Cortex} />
            <Route path="/admin/logs" component={Logs} />
            <Route path="/admin/data" component={Data} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* User app — main product */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/advisor" component={Advisor} />
            <Route path="/twin" component={TwinAgent} />
            <Route path="/memory" component={Memory} />
            <Route path="/workspace" component={Workspace} />
            <Route path="/workspace/:id" component={Workspace} />
            <Route path="/settings" component={Settings} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
