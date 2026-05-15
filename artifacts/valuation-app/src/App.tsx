import { Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthStubContext } from "@/context/AuthStubContext";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { AppRoutes } from "@/app-routes";

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
    "Missing VITE_CLERK_PUBLISHABLE_KEY (or set VITE_AUTH_STUB_MODE=1 for local dev without Clerk).",
  );
}
const PROXY_URL = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

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

function ClerkProviderWithRouter() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY!}
      proxyUrl={PROXY_URL}
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
      <AppRoutes authStub={false} />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
