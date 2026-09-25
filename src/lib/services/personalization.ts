// Variable rendering shared by the composer preview (client) and the sender (server).

export const VARIABLES = [
  { key: "first_name", label: "First name", sample: "Amara" },
  { key: "last_name", label: "Last name", sample: "Okafor" },
  { key: "company", label: "Company", sample: "Summit Health" },
  { key: "company_name", label: "Company name", sample: "Summit Health" },
  { key: "job_title", label: "Job title", sample: "Head of Growth" },
  { key: "industry", label: "Industry", sample: "Healthcare" },
  { key: "location", label: "Location", sample: "Lagos, Nigeria" },
  { key: "sender_name", label: "Sender name", sample: "Nicholas" },
] as const;

export interface RenderLead {
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  industry?: string | null;
  location?: string | null;
  company?: { name: string } | string | null;
  companyName?: string | null;
}

export function variableMap(lead: RenderLead | null, senderName = "") {
  const companyName = (typeof lead?.company === "string" ? lead.company : lead?.company?.name) ?? lead?.companyName ?? "";
  return {
    first_name: lead?.firstName ?? "",
    last_name: lead?.lastName ?? "",
    company: companyName,
    company_name: companyName,
    job_title: lead?.title ?? "",
    industry: lead?.industry ?? "",
    location: lead?.location ?? "",
    sender_name: senderName,
  } as Record<string, string>;
}

/** Replaces {{var}} and {{var|fallback}} tokens. Unknown variables are left as-is. */
export function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*(?:\|\s*([^}]*))?\}\}/gi, (m, key: string, fallback?: string) => {
    const v = vars[key.toLowerCase()];
    if (v) return v;
    if (fallback !== undefined) return fallback.trim();
    return key.toLowerCase() in vars ? "" : m;
  });
}

export function findUnknownVariables(tpl: string) {
  const known = new Set<string>(VARIABLES.map((v) => v.key));
  known.add("calendar_link");
  return Array.from(tpl.matchAll(/\{\{\s*([a-z_]+)/gi))
    .map((m) => m[1].toLowerCase())
    .filter((k) => !known.has(k));
}
