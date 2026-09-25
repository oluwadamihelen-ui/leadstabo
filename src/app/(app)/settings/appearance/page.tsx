import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/auth/guard";
import { AppearanceForm } from "./appearance-form";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const ctx = await requireWorkspace();
  return <AppearanceForm theme={ctx.user.theme} />;
}
