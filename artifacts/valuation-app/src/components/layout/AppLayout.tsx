import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  LayoutDashboard,
  Briefcase,
  Globe2,
  LibrarySquare,
  Megaphone,
  Settings,
  ShieldHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProTier } from "@/hooks/use-pro-tier";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

type NavItem = { href: string; label: string; icon: typeof LibrarySquare };

const navWorkspace: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LibrarySquare },
  { href: "/estimate/new", label: "Valuate", icon: Calculator },
  { href: "/estimates", label: "History", icon: LayoutDashboard },
];

const navInsights: NavItem[] = [
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/markets", label: "Markets", icon: Globe2 },
  { href: "/listings", label: "Listings", icon: Megaphone },
];

function NavLink({
  item,
  active,
  onNavigate,
  className,
  block,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
  block?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} className={cn(block && "block w-full")}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
          block && "w-full flex",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-80")} />
        {item.label}
      </span>
    </Link>
  );
}

function UserMenuStub({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/profile"
      aria-label="View profile"
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/80 bg-card px-2 py-1 pr-3 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact && "pr-2",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        D
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">Dev stub</div>
          <div className="text-ui-meta text-muted-foreground">No session</div>
        </div>
      ) : null}
    </Link>
  );
}

function UserMenuClerk({ compact }: { compact?: boolean }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded || !user) return null;
  const display =
    user.fullName || user.primaryEmailAddress?.emailAddress || user.username || "Account";
  const initial = (display[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border/80 bg-card py-1 pl-1 shadow-sm",
        compact ? "pr-1" : "pr-2",
      )}
    >
      <Link
        href="/profile"
        aria-label="View profile"
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-full py-0.5 pl-0.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "pr-0.5" : "pr-1",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {!compact ? (
          <div className="hidden min-w-0 max-w-[140px] sm:block">
            <div className="truncate text-xs font-medium">{display}</div>
          </div>
        ) : null}
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={() => signOut()}
        title="Sign out"
        data-testid="sign-out-btn"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

function UserMenu({ compact }: { compact?: boolean }) {
  const authStub = useAuthStubContext();
  if (authStub) return <UserMenuStub compact={compact} />;
  return <UserMenuClerk compact={compact} />;
}

function ProToggle({ className }: { className?: string }) {
  const { isPro, setIsPro } = useProTier();
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-3 py-1.5 shadow-sm transition-colors",
        isPro ? "border-accent/30 bg-accent/10" : "border-border/80 bg-card",
        className,
      )}
    >
      <Sparkles className={cn("h-4 w-4", isPro ? "text-accent" : "text-muted-foreground")} />
      <Label htmlFor="pro-mode-header" className="cursor-pointer text-xs font-medium text-foreground">
        Pro
      </Label>
      <Switch id="pro-mode-header" checked={isPro} onCheckedChange={setIsPro} className="scale-90" />
    </div>
  );
}

function MobileNavSheet() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 rounded-full md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(100vw-2rem,320px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="font-brand text-xl">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          <div>
            <div className="text-ui-caps text-muted-foreground mb-2 px-2">Workspace</div>
            <div className="flex flex-col gap-1">
              {navWorkspace.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  block
                  active={location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href))}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-ui-caps text-muted-foreground mb-2 px-2">Insights</div>
            <div className="flex flex-col gap-1">
              {navInsights.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  block
                  active={location === item.href || location.startsWith(item.href)}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            <p className="w-full text-ui-caps text-muted-foreground px-2">Shortcuts</p>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Settings">
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Button>
            </Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Team dashboard">
                <ShieldHalf className="h-4 w-4 shrink-0" />
                Team
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-auto space-y-4 border-t border-border px-4 py-5">
          <ProToggle className="w-full justify-between" />
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const isMobile = useIsMobile();

  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <div className="no-print flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border/60">
              <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-brand text-xl text-foreground hidden min-[400px]:inline">
              ValYoued
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-full border border-border/60 bg-muted/40 p-1">
              {navWorkspace.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
              <Separator orientation="vertical" className="mx-1 h-7 bg-border/80" />
              {navInsights.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className={cn(
                "hidden h-2 w-2 shrink-0 rounded-full sm:block",
                health?.status === "ok"
                  ? "bg-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.22)]"
                  : "bg-destructive",
              )}
              title={health?.status === "ok" ? "API online" : "API unreachable"}
              role="status"
              aria-label={health?.status === "ok" ? "API online" : "API error"}
            />
            {!isMobile ? <ProToggle className="hidden lg:flex" /> : null}
            <Link href="/settings" title="Settings" aria-label="Settings" className="hidden md:block">
              <Button
                variant={isActive("/settings") ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-9 w-9 shrink-0 rounded-full", isActive("/settings") && "ring-1 ring-border")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin" title="Team dashboard" aria-label="Team dashboard" className="hidden md:block">
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-9 w-9 shrink-0 rounded-full", isActive("/admin") && "ring-1 ring-border")}
              >
                <ShieldHalf className="h-4 w-4" />
              </Button>
            </Link>
            <UserMenu compact />
            <MobileNavSheet />
          </div>
        </div>
        {isMobile ? (
          <div className="flex items-center justify-center border-t border-border/40 bg-muted/20 px-4 py-2 md:hidden">
            <ProToggle />
          </div>
        ) : null}
      </header>

      <main className="mesh-bg flex-1">
        <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]">
          <div className="grid-bg absolute inset-0" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
