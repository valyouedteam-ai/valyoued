import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

const NAV_LINKS = [
  { href: "/pricing#plans", label: "Pricing" },
  { href: "/welcome", label: "Tracks" },
] as const;

export function LandingScrollNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-[background,box-shadow,border] duration-300",
          scrolled ? "border-transparent bg-transparent" : "border-b border-black/5 bg-white/95 backdrop-blur-md",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6",
            scrolled && "pointer-events-none opacity-0",
          )}
          aria-hidden={scrolled}
        >
          <Link href="/" className="pointer-events-auto flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-brand text-xl font-semibold tracking-tight text-foreground sm:text-2xl">ValYoued</span>
          </Link>

          <nav className="pointer-events-auto hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" className="rounded-full text-sm font-medium text-foreground/70 hover:text-foreground">
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="pointer-events-auto flex items-center gap-2">
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost" className="rounded-full text-sm font-medium" data-testid="nav-sign-in">
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                className="hidden rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 sm:inline-flex"
                data-testid="nav-sign-up"
              >
                Try for free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {scrolled ? (
          <motion.div
            key="floating-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none fixed right-4 top-4 z-[60] flex items-center gap-2 sm:right-6"
          >
            <Link href="/sign-up" className="pointer-events-auto">
              <Button className="rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg hover:bg-foreground/90">
                Try for free
              </Button>
            </Link>
            <Button
              type="button"
              size="icon"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="pointer-events-auto h-11 w-11 rounded-full bg-white text-foreground shadow-lg ring-1 ring-black/5 hover:bg-white/90"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && scrolled ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="fixed right-4 top-[4.5rem] z-[59] w-[min(100vw-2rem,16rem)] rounded-3xl border border-black/5 bg-white p-3 shadow-2xl sm:right-6"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile menu">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start rounded-2xl font-medium">
                    {link.label}
                  </Button>
                </Link>
              ))}
              <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-2xl font-medium">
                  Log in
                </Button>
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
