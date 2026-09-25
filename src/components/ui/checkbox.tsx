"use client";
import * as React from "react";
import * as C from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, checked, ...props }: React.ComponentPropsWithoutRef<typeof C.Root>) {
  return (
    <C.Root
      checked={checked}
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator className="flex items-center justify-center">
        {checked === "indeterminate" ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </C.Indicator>
    </C.Root>
  );
}
