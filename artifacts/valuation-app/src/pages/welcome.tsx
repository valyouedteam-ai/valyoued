import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERSONA_SESSION_KEY, type SellerPersonaChoice } from "@/hooks/use-persona-sync";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

function persistPersona(choice: SellerPersonaChoice) {
  try {
    sessionStorage.setItem(PERSONA_SESSION_KEY, choice);
  } catch {
    /* ignore */
  }
}

export default function WelcomePersonaPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[12%] top-[-10%] h-[min(60vh,420px)] w-[min(56vw,480px)] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_42%_55%/0.12),transparent_68%)] blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border/80">
            <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
          </div>
          <span className="font-brand text-2xl text-foreground">ValYoued</span>
        </Link>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Button>
        </Link>
      </nav>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col gap-10 px-4 pb-24 pt-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-ui-caps text-accent">Tailor ValYoued</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Choose how you use your portfolio. You can mix both anytime.
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            We remember this lightly to tune copy on your dashboard. It stays on-device until you finish sign-up or first
            sign-in, then maps to your account profile.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Shirt className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Everyday steward</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Personal collections, wardrobes, resale side-hustles, and single big-ticket buys you want monitored.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="w-full rounded-2xl"
                  onClick={() => persistPersona("everyday")}
                >
                  Create account · Everyday track
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Button>
              </Link>
              <Link href="/start">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => persistPersona("everyday")}
                >
                  Start free valuation first
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-3xl border border-accent/35 bg-accent/10 p-6 shadow-lg ring-1 ring-accent/20"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-accent">
              <BriefcaseBusiness className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Professional desks</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Brokers, heirs, boutiques, desks that need sharper arbitrage wording, workspace separation, and listing-heavy
              flows.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="w-full rounded-2xl shadow-md"
                  onClick={() => persistPersona("professional")}
                >
                  Create account · Professional track
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Button>
              </Link>
              <Link href="/start">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full rounded-2xl"
                  onClick={() => persistPersona("professional")}
                >
                  Start free valuation first
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Tip: Everyday free includes five valuations per calendar month. Upgrade anytime for unlimited runs and richer
          market rows. See Settings after you sign up.
        </p>
      </main>
    </div>
  );
}
