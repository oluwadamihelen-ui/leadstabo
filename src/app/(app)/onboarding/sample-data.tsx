"use client";
import { useRouter } from "next/navigation";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/hooks/use-action";
import { loadSampleData } from "@/server/actions/workspace";

export function SampleDataCard() {
  const router = useRouter();
  const { exec, pending } = useAction();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Explore with sample data</p>
        <p className="text-[13px] text-muted-foreground">Fill your workspace with demo leads, campaigns, replies and analytics. Only works on an empty workspace.</p>
      </div>
      <Button
        variant="secondary"
        loading={pending}
        onClick={async () => {
          if (await exec(() => loadSampleData(), { success: "Sample data loaded", refresh: false })) router.push("/dashboard");
        }}
      >
        <Database /> Load sample data
      </Button>
    </div>
  );
}
