import { SignUp } from "@clerk/react";
import { useSearch } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  // If the user came from /start mid-onboarding, they'll have ?redirect_url=/start
  // appended. Send them back so we can finish the valuation they started.
  const rawRedirect = params.get("redirect_url");
  const redirect =
    rawRedirect && rawRedirect.startsWith("/")
      ? `${basePath}${rawRedirect}`
      : `${basePath}/dashboard`;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[hsl(222,47%,7%)] px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/30 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/20 blur-[100px]" />
      </div>
      <div className="relative w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="text-4xl font-sans font-semibold text-white tracking-tight">
            Your valuation is ready
          </div>
          <div className="text-sm text-white/60 mt-3 max-w-sm">
            Create a free account to unlock your AI-generated valuation, save it to your portfolio,
            and get listing drafts for marketplaces worldwide.
          </div>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          forceRedirectUrl={redirect}
          fallbackRedirectUrl={redirect}
        />
      </div>
    </div>
  );
}
