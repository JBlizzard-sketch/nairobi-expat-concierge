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
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/relocations" component={Relocations} />
        <Route path="/relocations/:id">
          {(params) => <RelocationDetail id={params.id} />}
        </Route>
        <Route path="/profiles" component={Profiles} />
        <Route path="/profiles/new" component={NewProfile} />
        <Route path="/profiles/:id">
          {(params) => <ProfileDetail id={params.id} />}
        </Route>
        <Route path="/housing" component={HousingListings} />
        <Route path="/housing/:id">
          {(params) => <HousingDetail id={params.id} />}
        </Route>
        <Route path="/schools" component={Schools} />
        <Route path="/schools/:id">
          {(params) => <SchoolDetail id={params.id} />}
        </Route>
        <Route path="/vendors" component={Vendors} />
        <Route path="/vendors/:id">
          {(params) => <VendorDetail id={params.id} />}
        </Route>
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
