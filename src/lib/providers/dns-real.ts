import "server-only";
import { lookupMx, lookupTxt } from "./dns-lookup";
import type { DnsProvider } from "./types";

const DKIM_SELECTORS = ["google", "selector1", "selector2", "default", "k1", "s1", "s2", "dkim", "mail", "zoho", "ls1"];

const txt = lookupTxt;

/** Live DNS lookups for sending-domain authentication. */
export const realDns: DnsProvider = {
  name: "dns",
  live: true,
  async check(domain, records) {
    const out: Record<string, "VALID" | "INVALID" | "PENDING"> = {};
    for (const r of records) {
      switch (r.kind) {
        case "OWNERSHIP": {
          out[r.kind] = (await txt(r.host)).some((v) => v.trim() === r.expectedValue.trim()) ? "VALID" : "PENDING";
          break;
        }
        case "SPF": {
          const spf = (await txt(domain)).filter((v) => v.toLowerCase().startsWith("v=spf1"));
          // Exactly one SPF record is required; two or more is a permanent error.
          out[r.kind] = spf.length === 1 ? "VALID" : spf.length > 1 ? "INVALID" : "PENDING";
          break;
        }
        case "DKIM": {
          let found = false;
          for (const sel of DKIM_SELECTORS) {
            const v = await txt(`${sel}._domainkey.${domain}`);
            if (v.some((x) => /(^|;)\s*p=[A-Za-z0-9+/=]{20,}/.test(x) || x.includes("v=DKIM1"))) {
              found = true;
              break;
            }
          }
          out[r.kind] = found ? "VALID" : "PENDING";
          break;
        }
        case "DMARC": {
          const v = await txt(`_dmarc.${domain}`);
          out[r.kind] = v.some((x) => x.toUpperCase().startsWith("V=DMARC1")) ? "VALID" : "PENDING";
          break;
        }
        case "MX": {
          out[r.kind] = (await lookupMx(domain)).length ? "VALID" : "PENDING";
          break;
        }
        default:
          out[r.kind] = "PENDING";
      }
    }
    return out;
  },
};
