"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  size = "md",
  ...props
}: React.ComponentPropsWithoutRef<typeof D.Content> & {
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const w = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <D.Portal>
      {/* The overlay is the centring + scroll container, so no transforms are needed on the panel. */}
      <D.Overlay className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-[2px] data-[state=open]:animate-fade-in sm:items-center sm:p-4">
        <D.Content
          className={cn(
            "relative my-auto flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-2xl border bg-popover p-5 shadow-2xl data-[state=open]:animate-fade-in sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl",
            "mb-0 sm:mb-auto",
            w,
            className,
          )}
          {...props}
        >
        <div className="mb-4 pr-8">
          <D.Title className="text-base font-semibold tracking-tight">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-[13px] text-muted-foreground">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
        </div>
        {children}
          <D.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </D.Close>
        </D.Content>
      </D.Overlay>
    </D.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sticky -bottom-5 -mx-5 mt-5 flex flex-col-reverse gap-2 border-t bg-popover px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:flex-row sm:justify-end", className)} {...props} />;
}
