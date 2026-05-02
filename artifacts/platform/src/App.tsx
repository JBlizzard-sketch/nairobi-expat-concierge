import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Relocations from "@/pages/Relocations";
import RelocationDetail from "@/pages/RelocationDetail";
import Profiles from "@/pages/Profiles";
import NewProfile from "@/pages/NewProfile";
import ProfileDetail from "@/pages/ProfileDetail";
import HousingListings from "@/pages/HousingListings";
import HousingDetail from "@/pages/HousingDetail";
import Schools from "@/pages/Schools";
import SchoolDetail from "@/pages/SchoolDetail";
import Vendors from "@/pages/Vendors";
import VendorDetail from "@/pages/VendorDetail";
import Settings from "@/pages/Settings";
import AlertsPage from "@/pages/Alerts";
import Reports from "@/pages/Reports";
import TaskTemplates from "@/pages/TaskTemplates";
import Billing from "@/pages/Billing";
import ClientStatus from "@/pages/ClientStatus";
import NewCase from "@/pages/NewCase";
import Pipeline from "@/pages/Pipeline";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public route — no sidebar/layout */}
      <Route path="/status/:token">
        {(params) => <ClientStatus token={params.token!} />}
      </Route>

      {/* All internal routes wrapped in Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/relocations" component={Relocations} />
            <Route path="/relocations/:id">
              {(params) => <RelocationDetail id={params.id!} />}
            </Route>
            <Route path="/profiles" component={Profiles} />
            <Route path="/pipeline" component={Pipeline} />
            <Route path="/cases/new" component={NewCase} />
            <Route path="/profiles/new" component={NewProfile} />
            <Route path="/profiles/:id">
              {(params) => <ProfileDetail id={params.id!} />}
            </Route>
            <Route path="/housing" component={HousingListings} />
            <Route path="/housing/:id">
              {(params) => <HousingDetail id={params.id!} />}
            </Route>
            <Route path="/schools" component={Schools} />
            <Route path="/schools/:id">
              {(params) => <SchoolDetail id={params.id!} />}
            </Route>
            <Route path="/vendors" component={Vendors} />
            <Route path="/vendors/:id">
              {(params) => <VendorDetail id={params.id!} />}
            </Route>
            <Route path="/alerts" component={AlertsPage} />
            <Route path="/reports" component={Reports} />
            <Route path="/templates" component={TaskTemplates} />
            <Route path="/billing" component={Billing} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
