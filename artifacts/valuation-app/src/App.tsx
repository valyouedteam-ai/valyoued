import { Router as WouterRouter, useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthStubContext } from "@/context/AuthStubContext";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { AppRoutes } from "@/app-routes";
import { ProTierProvider } from "@/hooks/use-pro-tier";
import { GeoCurrencyBootstrap } from "@/components/GeoCurrencyBootstrap";
import { useSellerPersonaClerkSync } from "@/hooks/use-persona-sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) as string | undefined;
if (!AUTH_STUB_MODE && !PUBLISHABLE_KEY) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY (or set VITE_AUTH_STUB_MODE=1 for local dev without real sign-in).",
  );
}
/** Must stay in sync with `CLERK_PROXY_PATH` in `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`. */
const CLERK_PROXY_PUBLIC_PATH = "/api/__clerk";

/**
 * Clerk proxy is optional (Replit / Railway same-origin setups). Omit `VITE_CLERK_PROXY_URL` for normal
 * setups (scripts load from your *.clerk.accounts.dev Frontend API). Wrong values break clerk.browser.js.
 *
 * Clerk builds `scriptUrl` as `https://{scriptHost}/npm/@clerk/...` where `{scriptHost}` is your proxy URL
 * with the scheme removed. Origin-only proxies (`https://…railway`) therefore request `/npm/...` at the root
 * of your app (404 + HTML MIME errors). The path suffix must match Express: `/api/__clerk`.
 */

function clerkProxyEnvNormalized(): string {
  let s = (import.meta.env.VITE_CLERK_PROXY_URL as string | undefined)?.trim() ?? "";
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function clerkProxyUrl(): string | undefined {
  const raw = clerkProxyEnvNormalized();
  if (!raw) return undefined;

  if (raw.startsWith("/")) {
    const pathOnly = raw.replace(/\/$/, "") || "/";
    if (pathOnly === CLERK_PROXY_PUBLIC_PATH) return CLERK_PROXY_PUBLIC_PATH;
    clerkProxyUrlWarnOnce(
      `[Clerk] Ignoring VITE_CLERK_PROXY_URL="${raw}": use "${CLERK_PROXY_PUBLIC_PATH}" or a full URL with that path.`,
    );
    return undefined;
  }

  let toParse = raw;
  if (!/^https?:\/\//i.test(toParse)) {
    toParse = `https://${toParse}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(toParse);
  } catch {
    clerkProxyUrlWarnOnce("[Clerk] VITE_CLERK_PROXY_URL is not a valid URL (after normalizing quotes or https).");
    return undefined;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
  if (!parsed.hostname) return undefined;

  const path = parsed.pathname.replace(/\/$/, "") || "/";
  const base = `${parsed.origin}${CLERK_PROXY_PUBLIC_PATH}`;

  if (path === "/") {
    if (import.meta.env.PROD) {
      clerkProxyUrlWarnOnce(
        `[Clerk] VITE_CLERK_PROXY_URL was origin-only (${parsed.origin}); Clerk now uses ${base}. Rebuild is required after env changes.`,
      );
    }
    return base;
  }

  if (path === CLERK_PROXY_PUBLIC_PATH) return base;

  clerkProxyUrlWarnOnce(
    `[Clerk] Ignoring VITE_CLERK_PROXY_URL pathname "${parsed.pathname}": expected "" or "${CLERK_PROXY_PUBLIC_PATH}". `,
  );
  return undefined;
}

let clerkProxyWarned = false;

function clerkProxyUrlWarnOnce(message: string): void {
  if (clerkProxyWarned) return;
  clerkProxyWarned = true;
  console.warn(message);
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function StubApiBridge() {
  useEffect(() => {
    setAuthTokenGetter(() => null);
    return () => setAuthTokenGetter(null);
  }, []);
  return null;
}

function ClerkApiAuthBridge() {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);
  return null;
}

/** Applies session persona to Clerk everywhere the user is logged in (not only Home). */
function ClerkPersonaSync() {
  useSellerPersonaClerkSync();
  return null;
}

/** Avoid mounting any route until Clerk has finished loading, to prevent blank shells in production. */
function ClerkBootstrapGate({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-[hsl(175,55%,38%)]/30 border-t-[hsl(175,55%,38%)] animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}

function ClerkProviderWithRouter() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY!}
      proxyUrl={clerkProxyUrl()}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        variables: {
          colorPrimary: "hsl(175, 55%, 38%)",
          colorBackground: "hsl(40, 20%, 98%)",
          colorForeground: "hsl(224, 30%, 14%)",
          colorMutedForeground: "hsl(220, 10%, 44%)",
          colorInput: "hsl(220, 16%, 94%)",
          colorInputForeground: "hsl(224, 30%, 14%)",
          colorNeutral: "hsl(220, 14%, 88%)",
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          borderRadius: "0.5rem",
        },
        elements: {
          rootBox: "w-full flex justify-center",
          cardBox:
            "bg-[hsl(40,20%,98%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl border border-black/[0.06]",
          card: "!shadow-none !border-0 !bg-transparent !rounded-none",
          footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
          headerTitle: "text-[hsl(224,30%,14%)]",
          headerSubtitle: "text-[hsl(220,10%,44%)]",
          formFieldLabel: "text-[hsl(224,30%,14%)]",
          footerActionLink: "text-teal-600 hover:text-teal-700",
          footerActionText: "text-[hsl(220,10%,44%)]",
          dividerText: "text-[hsl(220,10%,50%)]",
          formButtonPrimary:
            "bg-[hsl(175,55%,38%)] hover:bg-[hsl(175,55%,34%)] text-white shadow-md",
          socialButtonsBlockButtonText: "text-[hsl(224,30%,14%)]",
        },
      }}
    >
      <ClerkApiAuthBridge />
      <ClerkPersonaSync />
      <ClerkBootstrapGate>
        <AppRoutes authStub={false} />
      </ClerkBootstrapGate>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ProTierProvider>
            <GeoCurrencyBootstrap />
            {AUTH_STUB_MODE ? (
              <AuthStubContext.Provider value={true}>
                <StubApiBridge />
                <AppRoutes authStub />
              </AuthStubContext.Provider>
            ) : (
              <AuthStubContext.Provider value={false}>
                <ClerkProviderWithRouter />
              </AuthStubContext.Provider>
            )}
          </ProTierProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
