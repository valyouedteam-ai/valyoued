import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { isSellerPersonaConfirmed } from "@/hooks/use-persona-sync";

const ONBOARDING_EXEMPT = ["/welcome/continue", "/profile", "/settings"];

/**
 * Redirects signed-in users who have not confirmed Everyday vs Professional to onboarding.
 */
export function PersonaOnboardingGate({ children }: { children: ReactNode }) {
  const authStub = useAuthStubContext();
  const [location] = useLocation();
  const { user, isLoaded } = useUser();

  if (authStub) return <>{children}</>;

  if (!isLoaded) return <>{children}</>;

  if (!user) return <>{children}</>;

  const path = location.split("?")[0]?.split("#")[0] ?? location;
  if (ONBOARDING_EXEMPT.some((p) => path === p || path.startsWith(`${p}/`))) {
    return <>{children}</>;
  }

  if (!isSellerPersonaConfirmed(user)) {
    return <Redirect to="/welcome/continue" />;
  }

  return <>{children}</>;
}
