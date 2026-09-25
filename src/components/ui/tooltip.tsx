"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tooltip";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg animate-fade-in">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
