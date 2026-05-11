import { useRoute } from "wouter";
import { Link } from "wouter";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useGetEstimateStats } from "@workspace/api-client-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, Globe2, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function StatsPage() {
  const { data: stats, isLoading } = useGetEstimateStats();

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats || stats.count === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30 max-w-3xl mx-auto mt-12">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-sans mb-2">Insufficient Data</h3>
        <p className="text-muted-foreground mb-6">
          Aggregate statistics require historical valuations. Generate estimates to build market data.
        </p>
        <Link href="/estimate/new">
          <Button>Create First Estimate</Button>
        </Link>
      </div>
    );
  }

  const pieData = stats.byAssetType.map(item => ({
    name: item.assetTypeName,
    value: item.count
  }));

  const barData = stats.topArbitrageRegions.map(item => ({
    name: item.region,
    count: item.count
  }));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <div>
        <h1 className="text-3xl font-sans font-bold text-foreground">Market Aggregates</h1>
        <p className="text-muted-foreground mt-1">Macro trends across the ValYoued appraisal network.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Appraisals</CardDescription>
            <CardTitle className="text-3xl font-mono">{stats.count}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Avg Baseline Value</CardDescription>
            <CardTitle className="text-3xl font-mono">{formatCurrency(stats.averageBaselineUsd, true)}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Avg Adjusted Value</CardDescription>
            <CardTitle className="text-3xl font-mono text-accent">{formatCurrency(stats.averageAdjustedUsd, true)}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Mean Market Uplift</CardDescription>
            <CardTitle className={`text-3xl font-mono ${stats.averageUplift > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.averageUplift > 0 ? '+' : ''}{formatPercent(stats.averageUplift)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans">
              <Shapes className="h-5 w-5 text-muted-foreground" />
              Volume by Asset Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value} estimates`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              Top Arbitrage Destinations
            </CardTitle>
            <CardDescription>Regions most frequently recommended for maximum net return</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Asset Class Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 rounded-l-md">Asset Class</th>
                  <th className="px-6 py-3">Volume</th>
                  <th className="px-6 py-3 text-right rounded-r-md">Avg Adjusted Value</th>
                </tr>
              </thead>
              <tbody>
                {stats.byAssetType.map((item, i) => (
                  <tr key={item.assetTypeName} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium">{item.assetTypeName}</td>
                    <td className="px-6 py-4 font-mono">{item.count}</td>
                    <td className="px-6 py-4 font-mono text-right">{formatCurrency(item.averageAdjustedUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
