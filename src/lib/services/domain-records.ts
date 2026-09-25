/** DNS records a customer must publish for a sending domain (checked live by the DNS provider). */
export function requiredRecords(domain: string, token: string) {
  return [
    { kind: "OWNERSHIP", recordType: "TXT", host: `_leadstabo.${domain}`, expectedValue: `leadstabo-verify=${token}` },
    {
      kind: "SPF",
      recordType: "TXT",
      host: domain,
      expectedValue: "v=spf1 include:_spf.google.com ~all  (Microsoft 365: include:spf.protection.outlook.com)",
    },
    {
      kind: "DKIM",
      recordType: "TXT",
      host: `google._domainkey.${domain}`,
      expectedValue: "Generate in Google Admin → Apps → Gmail → Authenticate email (Microsoft 365: enable DKIM, publish selector1/selector2 CNAMEs)",
    },
    { kind: "DMARC", recordType: "TXT", host: `_dmarc.${domain}`, expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` },
    { kind: "MX", recordType: "MX", host: domain, expectedValue: "Your mail provider’s MX records (Google: smtp.google.com, priority 1)" },
  ];
}
