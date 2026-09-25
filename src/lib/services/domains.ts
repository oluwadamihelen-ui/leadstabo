import "server-only";
import { db } from "@/lib/db";
import { dnsProvider } from "@/lib/providers";
import { notify } from "./notifications";

export { requiredRecords } from "./domain-records";

export async function checkDomain(domainId: string, workspaceId: string) {
  const d = await db.sendingDomain.findFirstOrThrow({ where: { id: domainId, workspaceId }, include: { records: true } });
  const result = await dnsProvider().check(d.domain, d.records);
  const now = new Date();
  for (const r of d.records) {
    await db.domainVerification.update({ where: { id: r.id }, data: { status: result[r.kind] ?? "PENDING", lastCheckedAt: now } });
  }
  const s = (k: string) => result[k] ?? "PENDING";
  const all = ["OWNERSHIP", "SPF", "DKIM", "DMARC", "MX"].map(s);
  const invalid = all.includes("INVALID");
  const valid = all.every((x) => x === "VALID");
  const inboxes = await db.inbox.count({ where: { domainId } });
  const updated = await db.sendingDomain.update({
    where: { id: domainId },
    data: {
      spfStatus: s("SPF"),
      dkimStatus: s("DKIM"),
      dmarcStatus: s("DMARC"),
      mxStatus: s("MX"),
      status: valid ? "ACTIVE" : invalid ? "ISSUE" : "VERIFYING",
      healthScore: valid ? 96 : invalid ? 58 : 0,
      reputation: valid ? "Good" : invalid ? "At risk" : "Unknown",
      dailyCapacity: valid ? Math.max(1, inboxes) * 40 : 0,
      lastCheckedAt: now,
    },
  });
  if (invalid && d.status !== "ISSUE") {
    await notify(workspaceId, {
      type: "DOMAIN_ISSUE",
      title: `DNS issue on ${d.domain}`,
      body: "One or more records failed validation. Review the DNS configuration.",
      href: `/settings/infrastructure/domains/${d.id}`,
    });
  }
  return updated;
}
