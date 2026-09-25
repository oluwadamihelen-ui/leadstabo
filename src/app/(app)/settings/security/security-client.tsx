"use client";
import { TimeAgo } from "@/components/time";
import { useState } from "react";
import { Laptop, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/components/hooks/use-action";
import { beginTwoFactor, changePassword, confirmTwoFactor, disableTwoFactor, revokeOtherSessions, revokeSession } from "@/server/actions/account";

export function PasswordForm() {
  const { exec, pending } = useAction();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const mismatch = f.confirm && f.next !== f.confirm;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Password</CardTitle>
          <CardDescription>Changing your password signs you out everywhere else.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        </Field>
        <Field label="New password" hint="8+ characters, letters and numbers">
          <Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        </Field>
        <Field label="Confirm new password" error={mismatch ? "Passwords don’t match" : undefined}>
          <Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          loading={pending}
          disabled={!f.current || !f.next || !!mismatch}
          onClick={async () => {
            if (await exec(() => changePassword({ current: f.current, next: f.next }))) setF({ current: "", next: "", confirm: "" });
          }}
        >
          Update password
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const { exec, pending } = useAction();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            Two-factor authentication {enabled ? <Badge tone="success">Enabled</Badge> : <Badge>Off</Badge>}
          </CardTitle>
          <CardDescription>Require a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) at sign-in.</CardDescription>
        </div>
        {enabled ? <ShieldCheck className="size-5 text-success" /> : <ShieldOff className="size-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {enabled ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Confirm password to disable" className="flex-1">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Button variant="destructive" loading={pending} disabled={!pw} onClick={() => exec(() => disableTwoFactor(pw))}>
              Disable 2FA
            </Button>
          </div>
        ) : setup ? (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-[13px] text-muted-foreground">
              <li>Open your authenticator app and add an account manually (or paste the setup URI).</li>
              <li>Enter the 6-digit code it shows to confirm.</li>
            </ol>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="label-caps">Secret key</p>
              <p className="mt-1 break-all font-mono text-sm tracking-wider">{setup.secret.match(/.{1,4}/g)?.join(" ")}</p>
              <p className="label-caps mt-3">Setup URI</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{setup.uri}</p>
            </div>
            <div className="flex gap-2">
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="max-w-[160px] font-mono tracking-[0.3em]" />
              <Button loading={pending} disabled={code.length !== 6} onClick={() => exec(() => confirmTwoFactor(code))}>
                Verify & enable
              </Button>
            </div>
          </div>
        ) : (
          <Button
            loading={pending}
            onClick={async () => {
              const r = await exec(() => beginTwoFactor(), { refresh: false });
              if (r && typeof r === "object" && "secret" in r) setSetup(r as { secret: string; uri: string });
            }}
          >
            Set up 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionsList({ current, sessions }: { current: string; sessions: { id: string; userAgent: string | null; ip: string | null; lastSeenAt: string; createdAt: string }[] }) {
  const { exec, pending } = useAction();
  const describe = (ua: string | null) => {
    if (!ua) return "Unknown device";
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
    return `${browser} on ${os}`;
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        {sessions.length > 1 && (
          <Button size="sm" variant="secondary" loading={pending} onClick={() => exec(() => revokeOtherSessions())}>
            Sign out other sessions
          </Button>
        )}
      </CardHeader>
      <div className="divide-y border-t">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-5 py-3">
            {/Mobile|Android|iPhone/.test(s.userAgent ?? "") ? <Smartphone className="size-5 text-muted-foreground" /> : <Laptop className="size-5 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">
                {describe(s.userAgent)} {s.id === current && <Badge tone="success">This device</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.ip ?? "Unknown IP"} · active <TimeAgo date={s.lastSeenAt} /> · signed in <TimeAgo date={s.createdAt} />
              </p>
            </div>
            {s.id !== current && (
              <Button size="sm" variant="ghost" onClick={() => exec(() => revokeSession(s.id))}>
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
