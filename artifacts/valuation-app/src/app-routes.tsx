import { Switch, Route, useLocation, Redirect } from "wouter";
import { Show } from "@clerk/react";
import { useListEstimates } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import HomePage from "@/pages/home";
import LandingPage from "@/pages/landing";
import StartPage from "@/pages/start";
import AboutPage from "@/pages/about";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import NewEstimatePage from "@/pages/estimates/new";
import EstimatesPage from "@/pages/estimates/index";
import EstimateReportPage from "@/pages/estimates/[id]";
import PortfolioPage from "@/pages/portfolio";
import MarketsPage from "@/pages/markets";
import ListingsPage from "@/pages/listings";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin";
import PrivacyPage from "@/pages/privacy";
import NotFound from "@/pages/not-found";

function HomeOrLanding() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/recent" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
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
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function StubFullBleedSwitch() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/recent" />} />
      <Route path="/sign-in" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-in/*" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-up" component={() => <Redirect to="/dashboard" />} />
      <Route path="/sign-up/*" component={() => <Redirect to="/dashboard" />} />
      <Route path="/start" component={StartPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
    </Switch>
  );
}

function AppShellSwitch() {
  return (
    <Switch>
      <Route path="/recent" component={LatestEstimateRedirect} />
      <Route path="/dashboard" component={HomePage} />
      <Route path="/estimate/new" component={NewEstimatePage} />
      <Route path="/estimates" component={EstimatesPage} />
      <Route path="/estimates/:id" component={EstimateReportPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/stats" component={PortfolioPage} />
      <Route path="/markets" component={MarketsPage} />
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
    location.startsWith("/start") ||
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
        <Route path="/about" component={AboutPage} />
        <Route path="/privacy" component={PrivacyPage} />
      </Switch>
    );
  }

  const shell = (
    <AppLayout>
      <AppShellSwitch />
    </AppLayout>
  );

  if (authStub) {
    return shell;
  }

  return <AuthGate>{shell}</AuthGate>;
}
