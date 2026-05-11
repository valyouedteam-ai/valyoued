import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useAuth } from "@clerk/react";
import {
  ArrowLeft,
  CreditCard,
  Download,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiFetchCredentials, apiUrl } from "@/lib/api-url";

type BillingInfo = {
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeStub?: boolean;
};

async function postBilling(
  path: string,
  getToken: () => Promise<string | null | undefined>,
): Promise<{ url?: string; error?: string; stub?: boolean }> {
  const token = await getToken();
  const res = await fetch(apiUrl(`/api/billing/${path}`), {
    method: "POST",
    credentials: apiFetchCredentials(),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: "{}",
  });
  const data = (await res.json()) as { url?: string; error?: string; stub?: boolean };
  if (!res.ok) return { error: data.error ?? res.statusText };
  return data;
}

function SettingsPageInner({
  getToken,
}: {
  getToken: () => Promise<string | null | undefined>;
}) {
  const { toast } = useToast();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshBilling = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/me/billing"), {
        credentials: apiFetchCredentials(),
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const j = (await res.json()) as BillingInfo;
        setBilling(j);
      }
    } catch {
      /* ignore */
    }
  }, [getToken]);

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
      const { url, error, stub } = await postBilling("checkout-session", getToken);
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
      const { url, error, stub } = await postBilling("customer-portal", getToken);
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
            Account data controls, exports, and subscription billing.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-accent" />
              Data & privacy
            </CardTitle>
            <CardDescription>
              Download everything ValYoued stores about your valuations and listing drafts. Account
              deletion is handled via your Clerk profile / authentication provider.
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
              ValYoued Pro
            </CardTitle>
            <CardDescription>
              Your current tier is{" "}
              <span className="font-medium text-foreground tabular-nums">{billing?.tier ?? "…"}</span>
              {billing?.status ? (
                <>
                  {" "}
                  · status <span className="tabular-nums font-medium">{billing.status}</span>
                </>
              ) : null}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => void checkout()}
              disabled={busy !== null}
            >
              <CreditCard className="h-4 w-4" />
              {busy === "checkout" ? "Redirecting…" : "Subscribe"}
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
            <p className="text-xs text-muted-foreground leading-relaxed">
              For EU VAT or merchant-of-record setups,{" "}
              <strong className="text-foreground">Paddle</strong> or{" "}
              <strong className="text-foreground">Lemon Squeezy</strong> can use comparable economics with fewer
              tax filings. Wire their webhooks into{" "}
              <code className="font-mono text-[11px]">billing_subscriptions</code> using the same contract as the default
              integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsWithClerk() {
  const { getToken } = useAuth();
  return <SettingsPageInner getToken={getToken} />;
}

export default function SettingsPage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <SettingsPageInner getToken={async () => null} />;
  }
  return <SettingsWithClerk />;
}
