import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useAuth } from "@clerk/react";
import { apiFetchCredentials, apiUrl } from "@/lib/api-url";

type Overview = {
  totals: { estimates: number; distinctUsersWithEstimates: number; listings: number };
  estimatesByAssetType: { assetTypeName: string; count: number }[];
  recentEvents: {
    id: string;
    eventType: string;
    userId: string | null;
    createdAt: string;
    payload: Record<string, unknown>;
  }[];
};

function AdminDashboardInner({
  getToken,
}: {
  getToken: () => Promise<string | null | undefined>;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(apiUrl("/api/admin/overview"), {
          credentials: apiFetchCredentials(),
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const msg = res.status === 403 ? "Your account is not an administrator." : await res.text();
          if (!cancelled) setError(msg);
          return;
        }
        const j = (await res.json()) as Overview;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

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
          <h1 className="text-3xl font-brand font-semibold tracking-tight text-foreground flex items-center gap-2">
            Operations dashboard
            <ShieldAlert className="h-7 w-7 text-amber-400" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated usage only, subject to GDPR minimisation and your{" "}
            <code className="font-sans text-[11px]">ADMIN_USER_IDS</code> allow-list.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Access denied or misconfigured</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!data && !error ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
          Loading analytics…
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/80 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>Estimates saved</CardDescription>
                <CardTitle className="text-3xl font-sans tabular-nums tracking-tight">{data.totals.estimates}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>Users with ≥1 estimate</CardDescription>
                <CardTitle className="text-3xl font-sans tabular-nums tracking-tight">
                  {data.totals.distinctUsersWithEstimates}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>Listings generated</CardDescription>
                <CardTitle className="text-3xl font-sans tabular-nums tracking-tight">{data.totals.listings}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-border/80 bg-card/40">
            <CardHeader>
              <CardTitle>Valuations by asset class</CardTitle>
              <CardDescription>Feeds methodology tuning for the proprietary model.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset class</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.estimatesByAssetType.map((row) => (
                    <TableRow key={row.assetTypeName}>
                      <TableCell>{row.assetTypeName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/40">
            <CardHeader>
              <CardTitle>Recent platform events</CardTitle>
              <CardDescription>
                Structured telemetry for arbitrage, listings, and photo-derived form fields, exportable for offline
                analysis pipelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">{e.eventType}</TableCell>
                      <TableCell className="text-[11px] max-w-[120px] truncate">{e.userId ?? "None"}</TableCell>
                      <TableCell className="font-sans text-[10px] max-w-md truncate">
                        {JSON.stringify(e.payload)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function AdminWithClerk() {
  const { getToken } = useAuth();
  return <AdminDashboardInner getToken={getToken} />;
}

export default function AdminDashboardPage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <AdminDashboardInner getToken={async () => null} />;
  }
  return <AdminWithClerk />;
}
