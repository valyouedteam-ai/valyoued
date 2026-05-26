import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
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

const CHART_AXIS = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
} as const;

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
} as const;

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

  const assetBarData = useMemo(
    () =>
      (data?.estimatesByAssetType ?? []).map((row) => ({
        label:
          row.assetTypeName.length > 42 ? `${row.assetTypeName.slice(0, 39).trim()}…` : row.assetTypeName,
        fullLabel: row.assetTypeName,
        count: row.count,
      })),
    [data],
  );

  const totalsBarData = useMemo(
    () =>
      data
        ? [
            { label: "Valuations saved", short: "Valuations", count: data.totals.estimates },
            { label: "Users (1+ valuation)", short: "Users", count: data.totals.distinctUsersWithEstimates },
            { label: "Ads", short: "Ads", count: data.totals.listings },
          ]
        : [],
    [data],
  );

  const eventsByType = useMemo(() => {
    if (!data?.recentEvents.length) return [];
    const tally = new Map<string, number>();
    for (const e of data.recentEvents) {
      tally.set(e.eventType, (tally.get(e.eventType) ?? 0) + 1);
    }
    return [...tally.entries()]
      .map(([eventType, count]) => ({
        label: eventType.length > 48 ? `${eventType.slice(0, 45)}…` : eventType,
        fullLabel: eventType,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const assetChartHeight = Math.min(520, Math.max(260, assetBarData.length * 32));
  const eventsChartHeight = Math.min(400, Math.max(220, eventsByType.length * 28));

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
            Admin dashboard
            <ShieldAlert className="h-7 w-7 text-amber-400" />
          </h1>
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
                <CardDescription>Valuations saved</CardDescription>
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
                <CardDescription>Ads saved</CardDescription>
                <CardTitle className="text-3xl font-sans tabular-nums tracking-tight">{data.totals.listings}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-border/80 bg-card/40">
            <CardHeader>
              <CardTitle>Volume overview</CardTitle>
              <CardDescription>Quick comparison of the three headline totals.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={totalsBarData}
                    margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="short" stroke={CHART_AXIS.stroke} tick={CHART_AXIS.tick} />
                    <YAxis stroke={CHART_AXIS.stroke} tick={CHART_AXIS.tick} allowDecimals={false} />
                    <RechartsTooltip
                      formatter={(value: number) => [value, "Count"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload ? (payload[0].payload as { label: string }).label : ""
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={72} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/80 bg-card/40">
              <CardHeader>
                <CardTitle>Valuations by asset class</CardTitle>
                <CardDescription>Where demand clusters in saved valuations.</CardDescription>
              </CardHeader>
              <CardContent>
                {assetBarData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No valuations yet.</p>
                ) : (
                  <div style={{ height: assetChartHeight }} className="w-full min-h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={assetBarData}
                        margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke={CHART_AXIS.stroke} tick={CHART_AXIS.tick} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={132}
                          stroke={CHART_AXIS.stroke}
                          tick={{ ...CHART_AXIS.tick, fontSize: 10 }}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [`${value} valuations`, "Count"]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload
                              ? (payload[0].payload as { fullLabel: string }).fullLabel
                              : ""
                          }
                          contentStyle={tooltipStyle}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/40">
              <CardHeader>
                <CardTitle>Recent events by type</CardTitle>
                <CardDescription>Counts from the latest {data.recentEvents.length} telemetry rows.</CardDescription>
              </CardHeader>
              <CardContent>
                {eventsByType.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No events in the sample.</p>
                ) : (
                  <div style={{ height: eventsChartHeight }} className="w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={eventsByType}
                        margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke={CHART_AXIS.stroke} tick={CHART_AXIS.tick} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={148}
                          stroke={CHART_AXIS.stroke}
                          tick={{ ...CHART_AXIS.tick, fontSize: 10 }}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [`${value} events`, "In sample"]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload ? (payload[0].payload as { fullLabel: string }).fullLabel : ""
                          }
                          contentStyle={tooltipStyle}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 bg-card/40">
            <CardHeader>
              <CardTitle>Valuations by asset class (table)</CardTitle>
              <CardDescription>Exact counts for spreadsheets or audits.</CardDescription>
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
