import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { LogOut } from "lucide-react";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  LayoutDashboard,
  Briefcase,
  Globe2,
  LibrarySquare,
  Sparkles,
  Megaphone,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProTier } from "@/hooks/use-pro-tier";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

const navItems = [
  { href: "/dashboard", label: "Home", icon: LibrarySquare },
  { href: "/estimate/new", label: "New Valuation", icon: Calculator },
  { href: "/estimates", label: "History", icon: LayoutDashboard },
  { href: "/portfolio", label: "My Portfolio", icon: Briefcase },
  { href: "/markets", label: "Cross-market", icon: Globe2 },
  { href: "/listings", label: "Ad Drafts", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield },
];

function UserMenuStub() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-sidebar-accent/40 border border-sidebar-border">
      <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-sm font-semibold ring-1 ring-sidebar-primary/40 shrink-0">
        D
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-sidebar-foreground truncate">Dev (auth stub)</div>
        <div className="text-ui-meta text-sidebar-foreground/50">No Clerk session</div>
      </div>
    </div>
  );
}

function UserMenuClerk() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded || !user) return null;
  const display =
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.username ||
    "Account";
  const initial = (display[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-sidebar-accent/40 border border-sidebar-border">
      <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-sm font-semibold ring-1 ring-sidebar-primary/40 shrink-0 overflow-hidden">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt={display} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-sidebar-foreground truncate">{display}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={() => signOut()}
        title="Sign out"
        data-testid="sign-out-btn"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function UserMenu() {
  const authStub = useAuthStubContext();
  if (authStub) return <UserMenuStub />;
  return <UserMenuClerk />;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const { isPro, setIsPro } = useProTier();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background selection:bg-accent/30 selection:text-accent-foreground">
      <aside className="no-print w-full md:w-64 border-b md:border-b-0 md:border-r border-sidebar-border bg-sidebar shrink-0 flex flex-col relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-sidebar-primary/20 blur-3xl" />

        <div className="p-6 relative">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-lg bg-white/95 flex items-center justify-center shadow-md ring-1 ring-sidebar-primary/40 group-hover:ring-sidebar-primary transition-all">
              <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-brand font-semibold text-sidebar-foreground tracking-tight">
                ValYoued
              </span>
            </div>
          </Link>
        </div>

        <div className="px-6 mb-6 relative">
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-all",
            isPro
              ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 border-sidebar-primary/40 shadow-[0_0_24px_-8px_hsl(217_91%_60%/0.6)]"
              : "bg-sidebar-accent/40 border-sidebar-border"
          )}>
            <Label htmlFor="pro-mode" className="text-sm font-medium text-sidebar-foreground cursor-pointer flex items-center gap-2">
              <Sparkles className={cn(
                "h-4 w-4 transition-colors",
                isPro ? "text-sidebar-primary" : "text-sidebar-foreground/40"
              )} />
              <span className="flex flex-col gap-0.5">
                <span>Pro Mode</span>
                <span className="text-ui-meta text-sidebar-foreground/65">
                  {isPro ? "Full report" : "Essentials"}
                </span>
              </span>
            </Label>
            <Switch
              id="pro-mode"
              checked={isPro}
              onCheckedChange={setIsPro}
              className="data-[state=checked]:bg-sidebar-primary"
            />
          </div>
        </div>

        <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto relative">
          <div className="text-ui-caps text-sidebar-foreground/45 mb-4 px-2">Navigation</div>
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.4)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-sidebar-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border relative space-y-3">
          <UserMenu />
          <div className="flex items-center gap-2 px-2 text-ui-caps text-sidebar-foreground/55">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              health?.status === "ok" ? "bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary))]" : "bg-destructive"
            )} />
            {health?.status === "ok" ? "System · Online" : "System · Error"}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto overflow-x-hidden relative">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.012] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        <div className="flex-1 p-4 md:p-8 lg:p-12 relative">
          <div className="max-w-7xl mx-auto h-full w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
