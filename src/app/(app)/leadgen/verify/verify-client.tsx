"use client";
import { useRef, useState } from "react";
import { FileUp, MailCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Confirm } from "@/components/ui/confirm";
import { useAction } from "@/components/hooks/use-action";
import { importLeadsCsv, verifyLeads } from "@/server/actions/leads";

export function VerifyAllButton({ unverified }: { unverified: number }) {
  const { exec } = useAction();
  return (
    <Confirm
      title={`Verify ${unverified} emails?`}
      description={`This uses ${unverified} credits and updates every unverified lead’s status.`}
      confirmLabel="Verify all"
      destructive={false}
      onConfirm={async () => {
        await exec(() => verifyLeads({ onlyUnverified: true }));
      }}
      trigger={
        <Button disabled={!unverified}>
          <MailCheck /> Verify all ({unverified})
        </Button>
      }
    />
  );
}

export function ImportCard() {
  const { exec, pending } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [verify, setVerify] = useState(true);
  return (
    <Card id="import">
      <CardHeader>
        <div>
          <CardTitle>Upload a lead list</CardTitle>
          <CardDescription>CSV with an email column. Optional: first_name, last_name, title, company, location.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) {
              setFile(f);
              if (!name) setName(f.name.replace(/\.csv$/i, ""));
            }
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/50"
        >
          <FileUp className="size-6 text-muted-foreground" />
          <span className="text-[13px] font-medium">{file ? file.name : "Drop a CSV or click to browse"}</span>
          <span className="text-[11px] text-muted-foreground">Up to 5,000 rows · 2MB</span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !name) setName(f.name.replace(/\.csv$/i, ""));
          }}
        />
        <Field label="List name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Imported leads" />
        </Field>
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span>
            Verify after import
            <span className="block text-xs text-muted-foreground">1 credit per email</span>
          </span>
          <Switch checked={verify} onCheckedChange={setVerify} />
        </label>
        <Button
          className="w-full"
          disabled={!file || !name.trim()}
          loading={pending}
          onClick={async () => {
            if (!file) return;
            if (file.size > 2_000_000) return toast.error("File too large (2MB max)");
            const csv = await file.text();
            const ok = await exec(() => importLeadsCsv({ csv, listName: name, verify }));
            if (ok) {
              setFile(null);
              setName("");
            }
          }}
        >
          <Upload /> Import{verify ? " & verify" : ""}
        </Button>
      </CardContent>
    </Card>
  );
}
