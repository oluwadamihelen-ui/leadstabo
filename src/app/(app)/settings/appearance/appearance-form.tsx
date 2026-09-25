"use client";
import { useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAction } from "@/components/hooks/use-action";
import { setTheme } from "@/server/actions/account";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "DARK", label: "Dark", icon: Moon, preview: "bg-[#09090b]" },
  { key: "LIGHT", label: "Light", icon: Sun, preview: "bg-[#f5f6f8]" },
  { key: "SYSTEM", label: "System", icon: Monitor, preview: "bg-gradient-to-r from-[#09090b] to-[#f5f6f8]" },
] as const;

export function AppearanceForm({ theme }: { theme: string }) {
  const { exec } = useAction();
  const [t, setT] = useState(theme);
  function choose(k: (typeof OPTIONS)[number]["key"]) {
    setT(k);
    const dark = k === "DARK" || (k === "SYSTEM" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    exec(() => setTheme(k), { success: "Theme updated" });
  }
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Leadstabo is designed dark-first. Your choice is saved to your account.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button key={o.key} onClick={() => choose(o.key)} className={cn("overflow-hidden rounded-xl border text-left transition-all", t === o.key ? "border-primary ring-1 ring-primary/40" : "hover:border-foreground/20")}>
            <div className={cn("flex h-24 items-end gap-1.5 p-3", o.preview)}>
              <span className="h-10 w-8 rounded bg-white/10 ring-1 ring-black/10" />
              <span className="h-6 flex-1 rounded bg-[hsl(22_92%_56%)]" />
            </div>
            <div className="flex items-center justify-between p-3 text-[13px] font-medium">
              <span className="flex items-center gap-2">
                <o.icon className="size-4" /> {o.label}
              </span>
              {t === o.key && <Check className="size-4 text-primary" />}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
