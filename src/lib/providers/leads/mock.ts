import type { LeadDatabaseProvider, LeadSearchFilters, ProspectRecord } from "../types";
import { prospects } from "./dataset";

const norm = (s: string) => s.toLowerCase();
const anyMatch = (list: string[] | undefined, value: string) =>
  !list?.length || list.some((f) => norm(value).includes(norm(f)));

function matches(p: ProspectRecord, f: LeadSearchFilters) {
  if (f.query) {
    const q = norm(f.query);
    const hay = norm(
      [p.firstName, p.lastName, p.title, p.company.name, p.company.industry, p.city, p.country, ...p.keywords].join(" "),
    );
    if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
  }
  return (
    anyMatch(f.industries, p.company.industry) &&
    anyMatch(f.titles, p.title) &&
    anyMatch(f.companies, p.company.name) &&
    (!f.sizes?.length || f.sizes.includes(p.company.size)) &&
    (!f.revenues?.length || f.revenues.includes(p.company.revenue)) &&
    anyMatch(f.locations, `${p.city} ${p.country}`) &&
    (!f.countries?.length || f.countries.includes(p.country)) &&
    (!f.technologies?.length || f.technologies.some((t) => p.company.technologies.includes(t))) &&
    (!f.keywords?.length || f.keywords.some((k) => p.keywords.some((pk) => pk.includes(norm(k))))) &&
    (!f.seniorities?.length || f.seniorities.includes(p.seniority)) &&
    (!f.departments?.length || f.departments.includes(p.department)) &&
    !f.excludeDepartments?.includes(p.department)
  );
}

export const mockLeadDatabase: LeadDatabaseProvider = {
  name: "mock",
  totalContacts: 412_000_000,
  async search(filters, page, pageSize) {
    const exclude = new Set(filters.excludeIds ?? []);
    const all = prospects().filter((p) => !exclude.has(p.externalId) && matches(p, filters));
    const start = (page - 1) * pageSize;
    return { total: all.length, results: all.slice(start, start + pageSize) };
  },
  async getByIds(ids) {
    const set = new Set(ids);
    return prospects().filter((p) => set.has(p.externalId));
  },
};
