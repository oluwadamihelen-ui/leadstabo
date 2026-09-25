import "server-only";
import { promises as dns } from "dns";

// Resolver with a DNS-over-HTTPS fallback: large TXT answers need DNS-over-TCP,
// which some hosts block — DoH (Cloudflare, then Google) still gets an answer.
const DOH = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];
const TYPE = { TXT: 16, MX: 15, A: 1 } as const;

async function doh(name: string, type: keyof typeof TYPE): Promise<string[] | null> {
  for (const base of DOH) {
    try {
      const res = await fetch(`${base}?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { Status?: number; Answer?: { type: number; data: string }[] };
      if (j.Status === 3) return []; // NXDOMAIN
      return (j.Answer ?? [])
        .filter((a) => a.type === TYPE[type])
        .map((a) => (type === "TXT" ? a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, "") : a.data));
    } catch {
      /* try next resolver */
    }
  }
  return null;
}

const retryable = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  return code !== "ENOTFOUND" && code !== "ENODATA";
};

export async function lookupTxt(name: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(name)).map((parts) => parts.join(""));
  } catch (e) {
    if (!retryable(e)) return [];
    return (await doh(name, "TXT")) ?? [];
  }
}

export async function lookupMx(name: string): Promise<string[]> {
  try {
    return (await dns.resolveMx(name)).map((m) => m.exchange);
  } catch (e) {
    if (!retryable(e)) return [];
    return (await doh(name, "MX")) ?? [];
  }
}

export async function lookupA(name: string): Promise<string[]> {
  try {
    return await dns.resolve4(name);
  } catch (e) {
    if (!retryable(e)) return [];
    return (await doh(name, "A")) ?? [];
  }
}
