/** DNS records a customer must publish for a sending domain. */
export function requiredRecords(domain: string, token: string) {
  return [
    { kind: "OWNERSHIP", recordType: "TXT", host: `_leadstabo.${domain}`, expectedValue: `leadstabo-verify=${token}` },
    { kind: "SPF", recordType: "TXT", host: domain, expectedValue: "v=spf1 include:_spf.google.com include:spf.leadstabo.com ~all" },
    { kind: "DKIM", recordType: "CNAME", host: `ls1._domainkey.${domain}`, expectedValue: "ls1.dkim.leadstabo.com" },
    { kind: "DMARC", recordType: "TXT", host: `_dmarc.${domain}`, expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` },
    { kind: "MX", recordType: "MX", host: domain, expectedValue: "1 smtp.google.com" },
  ];
}
