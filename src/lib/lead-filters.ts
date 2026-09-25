// Shared (client + server) mapping between URL search params and lead-search filters.
import type { LeadSearchFilters } from "@/lib/providers/types";
import { COMPANY_SIZES, DEPARTMENTS, INDUSTRIES, LOCATIONS, REVENUES, SENIORITIES, TECHNOLOGIES } from "@/lib/providers/leads/dataset";

export const FILTER_OPTIONS = {
  industries: INDUSTRIES,
  sizes: COMPANY_SIZES,
  revenues: REVENUES,
  seniorities: SENIORITIES,
  departments: DEPARTMENTS,
  technologies: TECHNOLOGIES,
  countries: Array.from(new Set(LOCATIONS.map((l) => l.country))).sort(),
};

export const PARAM_KEYS = {
  q: "query",
  ind: "industries",
  title: "titles",
  co: "companies",
  size: "sizes",
  loc: "locations",
  ctry: "countries",
  rev: "revenues",
  tech: "technologies",
  kw: "keywords",
  sen: "seniorities",
  dept: "departments",
} as const;

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);

export function filtersFromParams(p: Params): LeadSearchFilters & { page: number; netNew: boolean; deptExclude: string[] } {
  return {
    query: (Array.isArray(p.q) ? p.q[0] : p.q)?.slice(0, 100) || undefined,
    industries: list(p.ind),
    titles: list(p.title),
    companies: list(p.co),
    sizes: list(p.size),
    locations: list(p.loc),
    countries: list(p.ctry),
    revenues: list(p.rev),
    technologies: list(p.tech),
    keywords: list(p.kw),
    seniorities: list(p.sen),
    departments: list(p.dept),
    deptExclude: list(p.deptx),
    hasEmail: p.email !== "any",
    netNew: p.net === "1",
    page: Math.max(1, Math.min(500, Number(p.page) || 1)),
  };
}

export function activeFilterCount(p: Params) {
  return Object.keys(PARAM_KEYS).filter((k) => k !== "q" && list(p[k]).length).length + (list(p.deptx).length ? 1 : 0);
}

/** "AI filter": parses a natural-language description into structured filters (mock NLP). */
export function parseNaturalLanguage(text: string): Record<string, string> {
  const t = ` ${text.toLowerCase()} `;
  const out: Record<string, string[]> = {};
  const add = (k: string, v: string) => (out[k] ??= []).includes(v) || out[k].push(v);
  for (const i of INDUSTRIES) if (t.includes(i.toLowerCase().split(" ")[0].replace("&", ""))) add("ind", i);
  const syn: Record<string, string> = { saas: "Software", tech: "Software", agencies: "Marketing & Advertising", agency: "Marketing & Advertising", schools: "Education Management", school: "Education Management", clinics: "Healthcare", dentists: "Healthcare", fintech: "Financial Services", ecommerce: "E-commerce", "e-commerce": "E-commerce", recruiters: "Recruiting & Staffing", lawyers: "Legal Services", "law firms": "Legal Services" };
  for (const [k, v] of Object.entries(syn)) if (t.includes(` ${k}`)) add("ind", v);
  for (const l of LOCATIONS) {
    if (t.includes(l.country.toLowerCase())) add("ctry", l.country);
    if (t.includes(l.city.toLowerCase())) add("loc", l.city);
  }
  const ctry: Record<string, string> = { " us ": "United States", " usa ": "United States", "america": "United States", " uk ": "United Kingdom", britain: "United Kingdom", uae: "United Arab Emirates" };
  for (const [k, v] of Object.entries(ctry)) if (t.includes(k)) add("ctry", v);
  const sen: Record<string, string> = { founder: "Founder", owner: "Owner", ceo: "C-Suite", cto: "C-Suite", cmo: "C-Suite", "c-suite": "C-Suite", " vp": "VP", "vice president": "VP", director: "Director", head: "Head", manager: "Manager" };
  for (const [k, v] of Object.entries(sen)) if (t.includes(k)) add("sen", v);
  const dept: Record<string, string> = { sales: "Sales", marketing: "Marketing", engineering: "Engineering", " hr": "Human Resources", finance: "Finance", operations: "Operations", product: "Product" };
  for (const [k, v] of Object.entries(dept)) if (t.includes(k)) add("dept", v);
  const small = /small|startup|early/.test(t);
  const mid = /mid-?size|growing|scale-?up/.test(t);
  const large = /enterprise|large/.test(t);
  if (small) ["1-10", "11-50"].forEach((s) => add("size", s));
  if (mid) ["51-200", "201-500"].forEach((s) => add("size", s));
  if (large) ["1001-5000", "5000+"].forEach((s) => add("size", s));
  for (const tech of TECHNOLOGIES) if (t.includes(tech.toLowerCase())) add("tech", tech);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join(",")]));
}
