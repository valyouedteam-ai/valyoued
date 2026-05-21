import { SignIn } from "@clerk/react";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="mesh-bg relative flex min-h-[100dvh] flex-col overflow-hidden">
      <MarketingTopNav variant="light" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />
      </div>
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="relative flex w-full max-w-md flex-col items-center gap-6">
            <div className="text-center">
              <div className="font-brand text-4xl tracking-tight text-foreground">ValYoued</div>
              <div className="mt-2 text-ui-caps text-muted-foreground">Welcome back</div>
            </div>
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/welcome`}
              forceRedirectUrl={`${basePath}/dashboard`}
              fallbackRedirectUrl={`${basePath}/dashboard`}
            />
          </div>
        </div>
    </div>
  );
}
