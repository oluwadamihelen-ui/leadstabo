"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof T.List>) {
  return <T.List className={cn("inline-flex h-9 items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5 text-muted-foreground", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors hover:text-foreground focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof T.Content>) {
  return <T.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}
