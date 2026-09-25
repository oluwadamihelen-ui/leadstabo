"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { AssistantButton } from "./assistant";
import type { ShellData } from "./types";

export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  return (
    <div className="flex min-h-screen overflow-x-clip">
      <Sidebar data={data} open={menu} onClose={() => setMenu(false)} onSearch={() => setSearch(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar data={data} onMenu={() => setMenu(true)} onSearch={() => setSearch(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>
      <CommandPalette open={search} onOpenChange={setSearch} />
      <AssistantButton />
    </div>
  );
}
