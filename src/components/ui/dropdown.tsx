"use client";
import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;

export function DropdownMenuContent({ className, align = "end", ...props }: React.ComponentPropsWithoutRef<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-[190px] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl animate-fade-in", className)}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentPropsWithoutRef<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Label>) {
  return <M.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Separator>) {
  return <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
