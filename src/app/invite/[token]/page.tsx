import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sha256 } from "@/lib/crypto";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AcceptInvite } from "./accept";

export const metadata = { title: "Join workspace" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.teamInvitation.findUnique({ where: { tokenHash: sha256(token) }, include: { workspace: true, invitedBy: true } });
  const session = await getSession();
  const valid = inv && inv.status === "PENDING" && inv.expiresAt > new Date();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md p-6 text-center">
        {!valid ? (
          <>
            <p className="text-lg font-semibold">Invitation unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">This invitation is invalid, revoked or expired. Ask your teammate to send a new one.</p>
            <Button asChild className="mt-6">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">Join {inv.workspace.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {inv.invitedBy.name} invited <span className="text-foreground">{inv.email}</span> to join as {inv.role.toLowerCase()}.
            </p>
            <div className="mt-6">
              {session ? (
                session.user.email === inv.email ? (
                  <AcceptInvite token={token} />
                ) : (
                  <p className="text-sm text-warning">You’re signed in as {session.user.email}. Sign in as {inv.email} to accept.</p>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href={`/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inv.email)}`}>Create account & join</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>I already have an account</Link>
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
