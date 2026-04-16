import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Advisor from "./pages/Advisor";
import TwinAgent from "./pages/TwinAgent";
import Memory from "./pages/Memory";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import Cortex from "./pages/Cortex";

function Router() {
  return (
    <Switch>
      {/* Onboarding has no sidebar — full screen */}
      <Route path="/" component={Onboarding} />

      {/* All app pages wrapped in AppLayout with sidebar */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/advisor" component={Advisor} />
            <Route path="/twin" component={TwinAgent} />
            <Route path="/memory" component={Memory} />
            <Route path="/workspace" component={Workspace} />
            <Route path="/workspace/:id" component={Workspace} />
            <Route path="/cortex" component={Cortex} />
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
