import "server-only";
import type { LeadDatabaseProvider, LeadSearchFilters, ProspectRecord } from "../types";

// Apollo.io People API adapter. Search is free of credits and returns no emails;
// emails are revealed with bulk enrichment when a user adds leads to a list.
// Docs: https://docs.apollo.io/reference/people-api-search · /reference/bulk-people-enrichment
const API = "https://api.apollo.io/api/v1";

const SENIORITY: Record<string, string> = {
  Owner: "owner",
  Founder: "founder",
  "C-Suite": "c_suite",
  VP: "vp",
  Director: "director",
  Head: "head",
  Manager: "manager",
  Senior: "senior",
  Entry: "entry",
};

const REVENUE: Record<string, [number, number | null]> = {
  "<$1M": [0, 1_000_000],
  "$1M-$10M": [1_000_000, 10_000_000],
  "$10M-$50M": [10_000_000, 50_000_000],
  "$50M-$100M": [50_000_000, 100_000_000],
  "$100M-$500M": [100_000_000, 500_000_000],
  "$500M+": [500_000_000, null],
};

interface ApolloOrg {
  name?: string;
  primary_domain?: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue_printed?: string;
  technology_names?: string[];
  short_description?: string;
  founded_year?: number;
  linkedin_url?: string;
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  last_name_obfuscated?: string;
  name?: string;
  title?: string;
  seniority?: string;
  departments?: string[];
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string | null;
  email_status?: string | null;
  organization?: ApolloOrg | null;
}

function sizeBucket(n?: number) {
  if (!n) return "";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1000";
  if (n <= 5000) return "1001-5000";
  return "5000+";
}

function titleCase(s?: string) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toRecord(p: ApolloPerson): ProspectRecord {
  const org = p.organization ?? {};
  const domain = org.primary_domain ?? (org.website_url ?? "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  const email = p.email && !p.email.includes("email_not_unlocked") ? p.email : "";
  return {
    externalId: p.id,
    firstName: p.first_name ?? p.name?.split(" ")[0] ?? "",
    lastName: p.last_name ?? p.last_name_obfuscated ?? "",
    email,
    title: p.title ?? "",
    seniority: titleCase(p.seniority) || "—",
    department: titleCase(p.departments?.[0]?.replace(/^master_/, "")) || "—",
    linkedinUrl: p.linkedin_url ?? "",
    city: p.city ?? p.state ?? "",
    country: p.country ?? "",
    keywords: [],
    company: {
      name: org.name ?? "",
      domain: domain || "",
      industry: titleCase(org.industry),
      size: sizeBucket(org.estimated_num_employees),
      revenue: org.annual_revenue_printed ?? "",
      technologies: (org.technology_names ?? []).slice(0, 12),
      description: org.short_description ?? "",
      founded: org.founded_year ?? 0,
      linkedinUrl: org.linkedin_url ?? "",
    },
  };
}

export function createApollo(apiKey: string): LeadDatabaseProvider {
  async function call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Apollo ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  function params(f: LeadSearchFilters) {
    const locations = [...(f.locations ?? []), ...(f.countries ?? [])];
    const kw = [f.query, ...(f.keywords ?? []), ...(f.industries ?? [])].filter(Boolean).join(" ");
    const rev = (f.revenues ?? []).map((r) => REVENUE[r]).filter(Boolean);
    return {
      person_titles: f.titles?.length ? f.titles : undefined,
      person_seniorities: f.seniorities?.map((s) => SENIORITY[s]).filter(Boolean),
      person_locations: locations.length ? locations : undefined,
      organization_num_employees_ranges: f.sizes?.map((s) => (s === "5000+" ? "5001,1000000" : s.replace("-", ","))),
      q_keywords: kw || undefined,
      q_organization_name: f.companies?.[0],
      currently_using_any_of_technology_uids: f.technologies?.map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "_")),
      ...(rev.length ? { "revenue_range[min]": Math.min(...rev.map((r) => r[0])), ...(rev.every((r) => r[1]) ? { "revenue_range[max]": Math.max(...rev.map((r) => r[1]!)) } : {}) } : {}),
      contact_email_status: f.hasEmail ? ["verified", "likely to engage"] : undefined,
    };
  }

  return {
    name: "apollo",
    live: true,
    totalContacts: 275_000_000,
    async search(filters, page, pageSize) {
      type R = { people?: ApolloPerson[]; contacts?: ApolloPerson[]; total_entries?: number; pagination?: { total_entries?: number } };
      const body = { ...params(filters), page, per_page: pageSize };
      let r: R;
      try {
        r = await call<R>("/mixed_people/api_search", body);
      } catch (e) {
        // Older plans expose the credit-consuming search endpoint only.
        if (!/\((404|403)\)/.test(String(e))) throw e;
        r = await call<R>("/mixed_people/search", body);
      }
      const people = [...(r.people ?? []), ...(r.contacts ?? [])];
      const exclude = new Set(filters.excludeIds ?? []);
      const results = people.filter((p) => !exclude.has(p.id)).map(toRecord);
      return { total: r.pagination?.total_entries ?? r.total_entries ?? results.length, results };
    },
    async getByIds(ids) {
      // Bulk enrichment reveals work emails (consumes Apollo credits). Max 10 per request.
      const out: ProspectRecord[] = [];
      for (let i = 0; i < ids.length; i += 10) {
        const r = await call<{ matches?: (ApolloPerson | null)[] }>("/people/bulk_match", {
          details: ids.slice(i, i + 10).map((id) => ({ id })),
          reveal_personal_emails: false,
        });
        for (const m of r.matches ?? []) if (m) out.push(toRecord(m));
      }
      return out;
    },
  };
}
