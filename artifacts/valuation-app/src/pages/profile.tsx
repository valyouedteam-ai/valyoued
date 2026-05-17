import { useAuthStubContext } from "@/context/AuthStubContext";
import { useClerk, useUser } from "@clerk/react";
import { ArrowLeft, ExternalLink, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIsoDateTime } from "@/lib/format";

function ProfilePageClerk() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress;
  const otherEmails =
    user?.emailAddresses
      ?.map((e) => e.emailAddress)
      .filter((e) => e && e !== primaryEmail) ?? [];

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const display = user.fullName || primaryEmail || user.username || "Account";

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Your account details.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/settings">
            <Button variant="outline" className="rounded-full">
              Settings
            </Button>
          </Link>
          <Button
            type="button"
            className="rounded-full gap-2"
            onClick={() => void openUserProfile()}
          >
            <UserRound className="h-4 w-4" />
            Edit account
          </Button>
        </div>
      </div>

      <Card className="border-border/80 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
          <CardDescription>Avatar, name, and sign-in identifiers.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-2xl font-semibold ring-1 ring-border/60">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (display[0] ?? "?").toUpperCase()
            )}
          </div>
          <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-ui-meta text-muted-foreground">Display name</dt>
              <dd className="mt-0.5 font-medium text-foreground">{display}</dd>
            </div>
            {user.username ? (
              <div>
                <dt className="text-ui-meta text-muted-foreground">Username</dt>
                <dd className="mt-0.5 font-medium text-foreground">{user.username}</dd>
              </div>
            ) : null}
            {primaryEmail ? (
              <div className="sm:col-span-2">
                <dt className="text-ui-meta text-muted-foreground">Primary email</dt>
                <dd className="mt-0.5 break-all font-medium text-foreground">{primaryEmail}</dd>
              </div>
            ) : null}
            {otherEmails.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="text-ui-meta text-muted-foreground">Other emails</dt>
                <dd className="mt-0.5 space-y-1">
                  {otherEmails.map((e) => (
                    <div key={e} className="break-all font-medium text-foreground">
                      {e}
                    </div>
                  ))}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-ui-meta text-muted-foreground">User ID</dt>
              <dd className="mt-0.5 break-all font-sans text-sm text-foreground">{user.id}</dd>
            </div>
            <div>
              <dt className="text-ui-meta text-muted-foreground">Member since</dt>
              <dd className="mt-0.5 font-medium text-foreground tabular-nums">
                {user.createdAt ? formatIsoDateTime(user.createdAt) : "N/A"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Password, two-factor authentication, and connected accounts are updated in your account
        settings.{" "}
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium text-accent underline-offset-4 hover:underline"
          onClick={() => void openUserProfile()}
        >
          Open account settings
          <ExternalLink className="h-3 w-3" />
        </button>
      </p>
    </div>
  );
}

function ProfilePageStub() {
  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Dev auth stub: no live session. Use sign-in to manage a profile.
        </p>
      </div>

      <Card className="border-border/80 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Stub user</CardTitle>
          <CardDescription>Matches the header chip while VITE_AUTH_STUB_MODE is enabled.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold ring-1 ring-border/60">
            D
          </div>
          <dl className="min-w-0 flex-1 space-y-3">
            <div>
              <dt className="text-ui-meta text-muted-foreground">Label</dt>
              <dd className="mt-0.5 font-medium text-foreground">Dev stub</dd>
            </div>
            <div>
              <dt className="text-ui-meta text-muted-foreground">Session</dt>
              <dd className="mt-0.5 text-foreground">No session</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Link href="/settings">
        <Button variant="outline" className="rounded-full">
          Settings
        </Button>
      </Link>
    </div>
  );
}

/** Signed-in profile summary; header avatar links here. */
export default function ProfilePage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <ProfilePageStub />;
  }
  return <ProfilePageClerk />;
}
