import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[hsl(222,47%,7%)] px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/30 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/20 blur-[100px]" />
      </div>
      <div className="relative w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="text-4xl font-brand font-semibold text-white tracking-tight">ValYoued</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mt-2">
            Welcome back
          </div>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      </div>
    </div>
  );
}
