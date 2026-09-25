import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Leadstabo. Build your outbound engine.</p>
      </div>
      <div className="relative hidden overflow-hidden border-l bg-surface lg:block">
        <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute -right-32 -top-32 size-[520px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-10 size-[420px] rounded-full bg-violet/10 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="label-caps text-primary">Outbound acquisition OS</p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            ICP → Leads → Verify → Send → <span className="text-primary">Convert.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Find the right leads, reach them with personalized outreach, and turn cold prospects into conversations — all
            from one platform.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              ["412M+", "B2B contacts"],
              ["98%", "Verified deliverability"],
              ["7-day", "Academy challenge"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border bg-card/70 p-4 backdrop-blur">
                <p className="text-xl font-semibold">{v}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
