"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/hooks/use-action";
import { acceptInvitation } from "@/server/actions/auth";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  return (
    <Button
      className="w-full"
      loading={pending}
      onClick={async () => {
        if (await exec(() => acceptInvitation(token), { refresh: false })) router.push("/dashboard");
      }}
    >
      Accept invitation
    </Button>
  );
}
