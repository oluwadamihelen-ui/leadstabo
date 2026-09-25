"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { useAction } from "@/components/hooks/use-action";
import { updateProfile } from "@/server/actions/account";
import { renameWorkspace } from "@/server/actions/settings";

const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "Europe/London", "Europe/Dublin", "Europe/Berlin", "Europe/Amsterdam", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Asia/Dubai", "Asia/Singapore", "Asia/Manila", "Australia/Sydney"];

export function ProfileForm({ user }: { user: { name: string; email: string; company: string; timezone: string; avatarUrl: string } }) {
  const { exec, pending } = useAction();
  const [f, setF] = useState(user);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to your team and in email signatures.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={f.name || "?"} src={f.avatarUrl || null} className="size-14 text-base" />
          <Field label="Avatar URL" hint="HTTPS image URL. Leave blank to use initials." className="flex-1">
            <Input value={f.avatarUrl} onChange={(e) => setF({ ...f, avatarUrl: e.target.value })} placeholder="https://…" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email" hint="Contact support to change your login email.">
            <Input value={f.email} disabled />
          </Field>
          <Field label="Company">
            <Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <NativeSelect value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
              {(TIMEZONES.includes(f.timezone) ? TIMEZONES : [f.timezone, ...TIMEZONES]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button loading={pending} onClick={() => exec(() => updateProfile({ name: f.name, company: f.company, timezone: f.timezone, avatarUrl: f.avatarUrl }))}>
          Save profile
        </Button>
      </CardFooter>
    </Card>
  );
}

export function WorkspaceForm({ name, canEdit }: { name: string; canEdit: boolean }) {
  const { exec, pending } = useAction();
  const [n, setN] = useState(name);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Shared by everyone on your team.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Field label="Workspace name">
          <Input value={n} onChange={(e) => setN(e.target.value)} disabled={!canEdit} />
        </Field>
      </CardContent>
      {canEdit && (
        <CardFooter className="justify-end">
          <Button loading={pending} onClick={() => exec(() => renameWorkspace(n))}>
            Save
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
