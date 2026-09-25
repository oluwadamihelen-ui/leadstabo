"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10">
      <Printer className="size-3.5" /> Print / save PDF
    </button>
  );
}
