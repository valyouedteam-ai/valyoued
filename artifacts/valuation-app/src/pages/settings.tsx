import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useAuth, useClerk } from "@clerk/react";
import {
  ArrowLeft,
  CreditCard,
  Download,
  ExternalLink,
  Globe2,
  Mail,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { DISPLAY_CURRENCY_OPTIONS, getStoredReferenceCurrency, getSessionGeoCountry, countryCodeToDisplayCurrency } from "@/lib/reference-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetchCredentials, apiUrl } from "@/lib/api-url";
import { useQueryClient } from "@tanstack/react-query";

type BillingInfo = {
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeStub?: boolean;
  planSlug?: string | null;
  valuationsThisMonth?: number;
  valuationsMonthLimit?: number | null;
  valuationsRemainingFree?: number | null;
  hasPaidValuationTier?: boolean;
};

type EmailAlertsInfo = {
  estimateReadyEmail: boolean;
  productUpdatesEmail: boolean;
  monitorValueChangeEmail?: boolean;
  deliveryEnabled: boolean;
};

type BillingActionJson = { url?: string; error?: string; stub?: boolean };

/** Many proxies and Express defaults return an empty body on 500; `res.json()` then throws. */
async function parseBillingJsonBody(res: Response): Promise<{ ok: true; body: BillingActionJson } | { ok: false; error: string }> {
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    return {
      ok: false,
      error:
        `${res.status} ${res.statusText}`.trim() ||
        (!res.ok ? "Could not read error response body" : "Could not read response body"),
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    if (!res.ok) {
      const fallback = `${res.status} ${res.statusText}`.trim();
      return { ok: false, error: fallback || "Empty error response from server" };
    }
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(trimmed) as BillingActionJson };
  } catch {
    const hint = trimmed.length > 220 ? `${trimmed.slice(0, 219)}…` : trimmed;
    return {
      ok: false,
      error:
        `${res.status} ${res.statusText}`.trim() +
        (hint ? `: ${hint}` : ""),
    };
  }
}

async function postBilling(
  path: string,
  getToken: () => Promise<string | null | undefined>,
  jsonBody: Record<string, unknown> = {},
): Promise<{ url?: string; error?: string; stub?: boolean }> {
  const token = await getToken();
  const res = await fetch(apiUrl(`/api/billing/${path}`), {
    method: "POST",
    credentials: apiFetchCredentials(),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(jsonBody),
  });

  const parsed = await parseBillingJsonBody(res);
  if (!parsed.ok) return { error: parsed.error };

  const data = parsed.body;
  if (!res.ok) {
    const code = `${res.status} ${res.statusText}`.trim();
    return { error: data.error ?? code ?? "Billing request failed" };
  }

  return data;
}

function SettingsPageInner({
  getToken,
  onOpenProfile,
}: {
  getToken: () => Promise<string | null | undefined>;
  onOpenProfile?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { code: displayCurrencyCode, setCode: setDisplayCurrency } = useDisplayCurrency();
  const geoCountry = (() => {
    try {
      return getSessionGeoCountry();
    } catch {
      return null;
    }
  })();
  const geoLedToCurrency =
    Boolean(geoCountry) && countryCodeToDisplayCurrency(geoCountry) === displayCurrencyCode;
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [emailAlerts, setEmailAlerts] = useState<EmailAlertsInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<"everyday_plus" | "professional">("everyday_plus");

  const refreshEmailAlerts = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/email-alerts"), {
        credentials: apiFetchCredentials(),
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const raw = await res.text();
      const trimmed = raw.trim();
      if (!trimmed) return;
      try {
        const j = JSON.parse(trimmed) as EmailAlertsInfo;
        setEmailAlerts(j);
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  }, [getToken]);

  useEffect(() => {
    void refreshEmailAlerts();
  }, [refreshEmailAlerts]);

  const patchEmailAlert = async (
    patch: Partial<
      Pick<EmailAlertsInfo, "estimateReadyEmail" | "productUpdatesEmail" | "monitorValueChangeEmail">
    >,
  ) => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/email-alerts"), {
        method: "PATCH",
        credentials: apiFetchCredentials(),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      });
      const raw = await res.text();
      if (!res.ok) {
        toast({
          title: "Could not save email preferences",
          description: raw.trim() || `${res.status}`,
          variant: "destructive",
        });
        return;
      }
      try {
        const j = JSON.parse(raw) as EmailAlertsInfo;
        setEmailAlerts(j);
        queryClient.invalidateQueries({ queryKey: ["me-billing"] });
      } catch {
        void refreshEmailAlerts();
      }
    } catch {
      toast({
        title: "Could not save email preferences",
        description: "Network error.",
        variant: "destructive",
      });
    }
  };

  const sendTestEmail = async () => {
    setBusy("email-test");
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/email-alerts/test"), {
        method: "POST",
        credentials: apiFetchCredentials(),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: "{}",
      });
      const text = (await res.text()).trim();
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* use raw */
        }
        toast({ title: "Test email failed", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Test email sent", description: "Check your inbox (and spam) in a few seconds." });
    } finally {
      setBusy(null);
    }
  };

  const refreshBilling = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/billing"), {
        credentials: apiFetchCredentials(),
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const raw = await res.text();
      const trimmed = raw.trim();
      if (!trimmed) return;
      try {
        const j = JSON.parse(trimmed) as BillingInfo;
        setBilling(j);
        queryClient.invalidateQueries({ queryKey: ["me-billing"] });
      } catch {
        /* ignore malformed body */
      }
    } catch {
      /* ignore */
    }
  }, [getToken, queryClient]);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  const exportData = async () => {
    setBusy("export");
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/data-export"), {
        credentials: apiFetchCredentials(),
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        toast({ title: "Export failed", description: await res.text(), variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `valyoued-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: "Your JSON download should begin shortly." });
    } finally {
      setBusy(null);
    }
  };

  const checkout = async () => {
    setBusy("checkout");
    try {
      const { url, error, stub } = await postBilling(
        "checkout-session",
        getToken,
        {
          plan: checkoutPlan,
        },
      );
      if (error) {
        toast({ title: "Checkout unavailable", description: error, variant: "destructive" });
        return;
      }
      if (stub) {
        toast({ title: "Stripe stub", description: "Billing is mocked locally; no real checkout." });
      }
      if (url) window.location.href = url;
    } finally {
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy("portal");
    try {
      const { url, error, stub } = await postBilling("customer-portal", getToken, {});
      if (error) {
        toast({ title: "Billing portal", description: error, variant: "destructive" });
        return;
      }
      if (stub) {
        toast({ title: "Stripe stub", description: "Customer portal is mocked locally." });
      }
      if (url) window.location.href = url;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-brand font-semibold tracking-tight text-foreground">
            Settings & privacy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account data controls, exports, subscription billing, and email alerts.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:[&>*]:min-w-0">
        <Card className="border-border/80 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-accent" />
              Data & privacy
            </CardTitle>
            <CardDescription>
              Download everything ValYoued stores about your valuations and listing drafts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => void exportData()}
              disabled={busy !== null}
              data-testid="btn-export-data"
            >
              <Download className="h-4 w-4" />
              {busy === "export" ? "Preparing…" : "Download data export (JSON)"}
            </Button>
            <Link href="/privacy" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                Privacy & lawful basis
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-accent" />
              Subscription &amp; valuations
            </CardTitle>
            <CardDescription className="leading-relaxed text-pretty">
              {billing ? (
                <>
                  API tier{" "}
                  <span className="font-medium text-foreground tabular-nums">{billing.tier}</span>
                  {billing.status ? (
                    <>
                      {" "}
                      · <span className="tabular-nums font-medium">{billing.status}</span>
                    </>
                  ) : null}
                  {billing.planSlug ? (
                    <>
                      {" "}
                      · plan <span className="tabular-nums font-medium">{billing.planSlug}</span>
                    </>
                  ) : null}
                  {!billing.hasPaidValuationTier && billing.valuationsRemainingFree != null ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-medium text-foreground">{billing.valuationsRemainingFree}</span> free
                      valuations left this month (Everyday tier cap is{" "}
                      {billing.valuationsMonthLimit ?? 5}
                      ).
                    </>
                  ) : null}
                </>
              ) : (
                <>Fetching billing snapshot from the API…</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!billing?.hasPaidValuationTier ? (
              <>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={checkoutPlan} onValueChange={(v) => setCheckoutPlan(v as typeof checkoutPlan)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyday_plus">Everyday+: unlimited valuations (£7.99/mo suggested)</SelectItem>
                      <SelectItem value="professional">
                        Professional: full seller voice (£14.99/mo suggested, trial from Stripe config)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You already have paid valuation tier access. Manage billing to change seats, cards, or add-ons via the
                customer portal.
              </p>
            )}
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => void checkout()}
              disabled={busy !== null || billing?.hasPaidValuationTier}
            >
              <CreditCard className="h-4 w-4" />
              {busy === "checkout" ? "Redirecting…" : "Checkout with Stripe"}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => void portal()}
              disabled={
                busy !== null ||
                (!billing?.stripeCustomerId && !billing?.stripeStub)
              }
            >
              Manage subscription / invoices
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-accent" />
              Email alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 max-w-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="alert-estimate-ready">New estimate ready</Label>
                <p className="text-xs text-muted-foreground">
                  One email per completed valuation with a link to the report.
                </p>
              </div>
              <Switch
                id="alert-estimate-ready"
                checked={emailAlerts?.estimateReadyEmail ?? false}
                disabled={emailAlerts == null || busy !== null}
                onCheckedChange={(v) => void patchEmailAlert({ estimateReadyEmail: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="alert-product">Product updates</Label>
                <p className="text-xs text-muted-foreground">
                  Occasional news about features and improvements (preference stored; broadcasts not wired yet).
                </p>
              </div>
              <Switch
                id="alert-product"
                checked={emailAlerts?.productUpdatesEmail ?? false}
                disabled={emailAlerts == null || busy !== null}
                onCheckedChange={(v) => void patchEmailAlert({ productUpdatesEmail: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="alert-monitor-value">Portfolio value‑change monitors</Label>
                <p className="text-xs text-muted-foreground">
                  When an item intent is “monitor”, we&apos;ll ping you after material re-pricing (runs when the
                  background job fires). Everyday+ / Professional only.
                </p>
              </div>
              <Switch
                id="alert-monitor-value"
                checked={emailAlerts?.monitorValueChangeEmail ?? false}
                disabled={
                  emailAlerts == null ||
                  busy !== null ||
                  (billing != null && !billing.hasPaidValuationTier)
                }
                onCheckedChange={(v) => void patchEmailAlert({ monitorValueChangeEmail: v })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2"
              disabled={busy !== null || !emailAlerts?.deliveryEnabled}
              onClick={() => void sendTestEmail()}
            >
              <Mail className="h-4 w-4" />
              {busy === "email-test" ? "Sending…" : "Send test email"}
            </Button>
            {!emailAlerts?.deliveryEnabled ? (
              <p className="text-xs text-muted-foreground">
                To enable sending, set RESEND_API_KEY and EMAIL_FROM on the API server, then restart it.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe2 className="h-5 w-5 text-accent" />
              Portfolio &amp; analytics currency
            </CardTitle>
            <CardDescription>
              Combined totals on the home snapshot, portfolio, stats, and markets use one display currency so
              mixed-currency valuations can be compared. Individual reports stay in each item&apos;s own
              currency.{" "}
              <span className="text-foreground font-medium tabular-nums">
                Now showing {displayCurrencyCode}
                {getStoredReferenceCurrency()
                  ? " (pinned)"
                  : geoLedToCurrency
                    ? " (from network location hint)"
                    : " (from browser locale)"}
                .
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Select
              value={getStoredReferenceCurrency() ?? "auto"}
              onValueChange={(v) => setDisplayCurrency(v === "auto" ? null : v)}
            >
              <SelectTrigger aria-label="Display currency for combined totals">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic (from browser locale)</SelectItem>
                {DISPLAY_CURRENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-accent" />
              Account &amp; profile
            </CardTitle>
            <CardDescription>
              Name, avatar, email, passwords, two-factor authentication, and social sign-in (for
              example Google) are managed by your account provider. ValYoued stores valuation and
              listing drafts only. It never stores your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2"
              disabled={!onOpenProfile}
              onClick={() => onOpenProfile?.()}
            >
              <UserRound className="h-4 w-4" />
              Manage account &amp; security
            </Button>
            {!onOpenProfile ? (
              <p className="text-xs text-muted-foreground mt-3">
                Profile management is available with a live sign-in session (disabled in dev auth
                stub).
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsWithClerk() {
  const { getToken } = useAuth();
  const { openUserProfile } = useClerk();
  return (
    <SettingsPageInner
      getToken={getToken}
      onOpenProfile={() => {
        void openUserProfile();
      }}
    />
  );
}

export default function SettingsPage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <SettingsPageInner getToken={async () => null} />;
  }
  return <SettingsWithClerk />;
}
