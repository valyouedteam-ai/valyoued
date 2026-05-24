import { SignUp } from "@clerk/react";
import { useSearch } from "wouter";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  // If the user came from /start mid-onboarding, they'll have ?redirect_url=/start
  // appended. Send them back so we can finish the valuation they started.
  const rawRedirect = params.get("redirect_url");
  const postSignupLanding = `${basePath}/welcome/continue`;
  const redirect =
    rawRedirect && rawRedirect.startsWith("/")
      ? `${basePath}${rawRedirect}`
      : postSignupLanding;
  const resumedGuestFlow = Boolean(rawRedirect && rawRedirect.startsWith("/"));
  const heading = resumedGuestFlow ? "Your valuation is ready" : "Create your free account";
  const blurb = resumedGuestFlow
    ? "Create a free account to unlock your full valuation report, save it to your portfolio, and get listing drafts for marketplaces worldwide."
    : "Use email or a social login to secure your valuations. After this screen you land on a short guided tour inside the product.";

  return (
    <div className="mesh-bg relative flex min-h-[100dvh] flex-col overflow-hidden">
      <MarketingTopNav variant="light" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-[hsl(258_45%_55%/0.08)] blur-[90px]" />
      </div>
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="relative flex w-full max-w-md flex-col items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {heading}
              </div>
              <div className="mt-3 max-w-sm text-sm text-muted-foreground">{blurb}</div>
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
    </div>
  );
}
