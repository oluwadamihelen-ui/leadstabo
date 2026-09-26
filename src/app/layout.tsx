import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Leadabo — Build your outbound engine", template: "%s · Leadabo" },
  description:
    "Find the right leads, reach them with personalized outreach, and turn cold prospects into conversations — all from one platform.",
  applicationName: BRAND.name,
  authors: [{ name: BRAND.company }],
  creator: BRAND.company,
  publisher: BRAND.company,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#09090b" };

// Resolves "system" before paint to avoid a theme flash.
const themeScript = `(function(){try{var t=document.cookie.match(/(?:^|; )lb_theme=([^;]+)/);t=t?t[1]:'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("lb_theme")?.value ?? "light";
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${theme === "light" ? "" : "dark"}`}
      style={{ ["--font-sans" as string]: "var(--font-geist-sans)", ["--font-mono" as string]: "var(--font-geist-mono)" }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!bg-popover !text-popover-foreground !border-border !rounded-lg !text-[13px]",
              description: "!text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
