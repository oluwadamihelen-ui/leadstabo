import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <p className="label-caps text-primary">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Workspace & account</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
