import { Switch, Route, useLocation, Redirect, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { useListEstimates } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PersonaOnboardingGate } from "@/components/onboarding/PersonaOnboardingGate";
import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import WelcomePersonaPage from "@/pages/welcome";
import StartPage from "@/pages/start";
import AboutPage from "@/pages/about";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import NewEstimatePage from "@/pages/estimates/new";
import EstimateReportPage from "@/pages/estimates/[id]";
import EstimatesPage from "@/pages/estimates/index";
import EstimateWelcomePage from "@/pages/estimates/welcome";
import InheritancePage from "@/pages/inheritance";
import PortfolioPage from "@/pages/portfolio";
import MarketsPage from "@/pages/markets";
import MarketWatchPage from "@/pages/market-watch";
import InventoryPage from "@/pages/inventory";
import AlertsPage from "@/pages/alerts";
import ListingsPage from "@/pages/listings";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin";
import PrivacyPage from "@/pages/privacy";
import NotFound from "@/pages/not-found";
import WelcomeContinuePage from "@/pages/welcome-continue";

function HomeOrLanding() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function LatestEstimateRedirect() {
  const { data: estimates, isLoading } = useListEstimates();
  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }
  if (estimates && estimates.length > 0) {
    return <Redirect to={`/estimates/${estimates[0].id}`} />;
  }
  return <Redirect to="/dashboard" />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function normalizeSearch(search: string): string {
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function LegacyDashboardPathRedirect() {
  const search = useSearch();
  return <Redirect to={normalizeSearch(search) ? `/dashboard${normalizeSearch(search)}` : "/dashboard"} />;
}

function StubFullBleedSwitch() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-in" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-in/*" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-up" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-up/*" component={() => <Redirect to="/dashboard" />} />
      <Route path="/start" component={StartPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/welcome" component={WelcomePersonaPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
    </Switch>
  );
}

function AppShellSwitch() {
  return (
    <Switch>
      <Route path="/recent" component={LatestEstimateRedirect} />
      <Route path="/welcome/continue" component={WelcomeContinuePage} />
      <Route path="/dashboard" component={PortfolioPage} />
      <Route path="/estimate/new" component={NewEstimatePage} />
      <Route path="/estimates" component={EstimatesPage} />
      <Route path="/estimates/:id/welcome" component={EstimateWelcomePage} />
      <Route path="/estimates/:id" component={EstimateReportPage} />
      <Route path="/inheritance" component={InheritancePage} />
      <Route path="/portfolio" component={LegacyDashboardPathRedirect} />
      <Route path="/stats" component={LegacyDashboardPathRedirect} />
      <Route path="/markets" component={MarketsPage} />
      <Route path="/market-watch" component={MarketWatchPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/listings" component={ListingsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminDashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export function AppRoutes({ authStub }: { authStub: boolean }) {
  const [location] = useLocation();

  const fullBleed =
    location === "/" ||
    location.startsWith("/sign-in") ||
    location.startsWith("/sign-up") ||
    location === "/welcome" ||
    location.startsWith("/start") ||
    location.startsWith("/pricing") ||
    location.startsWith("/about") ||
    location.startsWith("/privacy");

  if (fullBleed) {
    if (authStub) {
      return <StubFullBleedSwitch />;
    }
    return (
      <Switch>
        <Route path="/" component={HomeOrLanding} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-in/*" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/sign-up/*" component={SignUpPage} />
        <Route path="/start" component={StartPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/welcome" component={WelcomePersonaPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/privacy" component={PrivacyPage} />
      </Switch>
    );
  }

  const shell = (
    <AppLayout>
      <PersonaOnboardingGate>
        <AppShellSwitch />
      </PersonaOnboardingGate>
    </AppLayout>
  );

  if (authStub) {
    return shell;
  }

  return <AuthGate>{shell}</AuthGate>;
}
