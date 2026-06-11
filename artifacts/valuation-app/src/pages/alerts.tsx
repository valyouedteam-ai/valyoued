import { Link } from "wouter";
import { useListNotifications, usePatchNotifications } from "@workspace/api-client-react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatDistanceToNow } from "date-fns";
import { PageTitle } from "@/components/layout/PageTitle";

export default function AlertsPage() {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const { data: billing } = useBillingSummary();
  const { data: notifications, isLoading, refetch } = useListNotifications();
  const patch = usePatchNotifications({
    mutation: { onSuccess: () => void refetch() },
  });

  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle>Portfolio Alerts</PageTitle>
          <p className="mt-1 text-muted-foreground">
            Value changes, revaluation nudges, and receipt reminders for Everyday holdings.
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={patch.isPending}
            onClick={() => patch.mutate({ data: { markAllRead: true } })}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </header>

      {!billing?.canUsePortfolioAnalytics ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Upgrade to Everyday for portfolio alerts and monitor emails.{" "}
            <Link href="/pricing#plans" className="font-medium text-accent hover:underline">
              Compare plans
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (notifications ?? []).length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-muted-foreground" />
              All quiet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tag items as Monitor or add high-value holdings to receive value and health nudges here.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {(notifications ?? []).map((n) => (
            <li key={n.id}>
              <Card className={n.read ? "opacity-75" : "border-accent/25"}>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {n.href ? (
                    <Button size="sm" variant="secondary" className="rounded-full shrink-0" asChild>
                      <Link href={mergePortfolioHref(n.href, portfolioQuerySuffix)}>Open</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
