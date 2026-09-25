// Deterministic synthetic prospect database used by the mock lead provider.
// Generated from a seeded PRNG so results are stable across restarts.
import type { ProspectRecord } from "../types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INDUSTRIES = [
  "Software",
  "Marketing & Advertising",
  "Financial Services",
  "Healthcare",
  "Education Management",
  "E-commerce",
  "Real Estate",
  "Logistics",
  "Recruiting & Staffing",
  "Consulting",
  "Manufacturing",
  "Legal Services",
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
export const REVENUES = ["<$1M", "$1M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M+"];
export const SENIORITIES = ["Owner", "Founder", "C-Suite", "VP", "Director", "Head", "Manager", "Senior", "Entry"];
export const DEPARTMENTS = ["Executive", "Sales", "Marketing", "Engineering", "Operations", "Finance", "Human Resources", "IT", "Product", "Customer Success"];
export const TECHNOLOGIES = ["HubSpot", "Salesforce", "Shopify", "Stripe", "Google Workspace", "Microsoft 365", "Intercom", "Zendesk", "AWS", "Webflow", "WordPress", "Slack", "Notion", "Pipedrive", "Segment"];

export const LOCATIONS: { city: string; country: string }[] = [
  { city: "San Francisco", country: "United States" },
  { city: "New York", country: "United States" },
  { city: "Austin", country: "United States" },
  { city: "Los Angeles", country: "United States" },
  { city: "Chicago", country: "United States" },
  { city: "London", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "Toronto", country: "Canada" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Nairobi", country: "Kenya" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Berlin", country: "Germany" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Dublin", country: "Ireland" },
  { city: "Sydney", country: "Australia" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "Singapore", country: "Singapore" },
  { city: "Manila", country: "Philippines" },
];

const FIRST = ["James", "Olivia", "Liam", "Amara", "Noah", "Sophia", "Ethan", "Chioma", "Lucas", "Mia", "Daniel", "Zara", "Henry", "Aisha", "Samuel", "Grace", "Tunde", "Emily", "David", "Nadia", "Michael", "Priya", "Oliver", "Hannah", "Kwame", "Isabella", "Jack", "Fatima", "Leo", "Chloe", "Ryan", "Ngozi", "Adam", "Lily", "Marcus", "Elena", "Victor", "Sarah", "Tobi", "Jessica", "Arjun", "Laura", "Ben", "Yemi", "Nora", "Felix", "Ruth", "Kofi", "Ava", "Omar"];
const LAST = ["Carter", "Okafor", "Bennett", "Adeyemi", "Walsh", "Nguyen", "Hughes", "Mensah", "Patel", "Brooks", "Reyes", "Hoffmann", "Sullivan", "Eze", "Kim", "Foster", "Balogun", "Murphy", "Schneider", "Lawson", "Ibrahim", "Clarke", "Fischer", "Cole", "Mwangi", "Park", "Dubois", "Russo", "Van Dijk", "Ogunleye", "Hayes", "Silva", "Kowalski", "Anderson", "Chen", "Obi", "Moreau", "Price", "Santos", "Njoroge"];

const PREFIX = ["North", "Blue", "Bright", "Summit", "Pioneer", "Clear", "Vertex", "Atlas", "Nova", "Harbor", "Crest", "Maple", "Iron", "Silver", "Keystone", "Lumen", "Orbit", "Prime", "Beacon", "Evergreen", "Cobalt", "Granite", "Horizon", "Ember", "Signal"];
const SUFFIX_BY_INDUSTRY: Record<string, string[]> = {
  Software: ["Labs", "Cloud", "AI", "Stack", "Systems"],
  "Marketing & Advertising": ["Media", "Growth Co", "Creative", "Digital", "Agency"],
  "Financial Services": ["Capital", "Finance", "Pay", "Wealth", "Partners"],
  Healthcare: ["Health", "Clinics", "Care", "Medical", "Dental"],
  "Education Management": ["Academy", "Schools", "Learning", "College", "International School"],
  "E-commerce": ["Goods", "Supply", "Store", "Commerce", "Market"],
  "Real Estate": ["Properties", "Realty", "Homes", "Estates", "Living"],
  Logistics: ["Freight", "Logistics", "Transit", "Express", "Cargo"],
  "Recruiting & Staffing": ["Talent", "Recruiting", "Staffing", "People", "Search"],
  Consulting: ["Advisory", "Consulting", "Strategy", "Group", "Partners"],
  Manufacturing: ["Industries", "Works", "Manufacturing", "Materials", "Fabrication"],
  "Legal Services": ["Legal", "Law", "Chambers", "LLP", "Counsel"],
};

const TITLES_BY_DEPT: Record<string, string[]> = {
  Executive: ["CEO", "Founder", "Co-Founder", "Managing Director", "Owner", "President", "COO"],
  Sales: ["VP of Sales", "Head of Sales", "Sales Director", "Account Executive", "Business Development Manager"],
  Marketing: ["CMO", "VP Marketing", "Marketing Director", "Head of Growth", "Demand Generation Manager"],
  Engineering: ["CTO", "VP Engineering", "Engineering Manager", "Head of Engineering", "Tech Lead"],
  Operations: ["Head of Operations", "Operations Director", "Operations Manager", "Chief of Staff"],
  Finance: ["CFO", "Finance Director", "Head of Finance", "Controller"],
  "Human Resources": ["Head of People", "HR Director", "Talent Acquisition Lead", "People Operations Manager"],
  IT: ["IT Director", "Head of IT", "IT Manager", "Systems Administrator"],
  Product: ["VP Product", "Head of Product", "Product Director", "Senior Product Manager"],
  "Customer Success": ["VP Customer Success", "Head of Customer Success", "Customer Success Manager"],
};

function seniorityFor(title: string) {
  if (/Owner/.test(title)) return "Owner";
  if (/Founder/.test(title)) return "Founder";
  if (/^C[A-Z]O$|CEO|President|Managing Director/.test(title)) return "C-Suite";
  if (/^VP/.test(title)) return "VP";
  if (/Director/.test(title)) return "Director";
  if (/Head/.test(title)) return "Head";
  if (/Manager|Lead|Chief of Staff|Controller/.test(title)) return "Manager";
  if (/Senior/.test(title)) return "Senior";
  return "Entry";
}

const KEYWORDS_BY_INDUSTRY: Record<string, string[]> = {
  Software: ["saas", "b2b software", "developer tools", "automation"],
  "Marketing & Advertising": ["performance marketing", "seo", "paid social", "branding"],
  "Financial Services": ["fintech", "payments", "lending", "wealth management"],
  Healthcare: ["telehealth", "clinics", "patient experience", "dental"],
  "Education Management": ["k12", "international education", "edtech", "private school"],
  "E-commerce": ["dtc", "shopify", "retail", "marketplace"],
  "Real Estate": ["property management", "brokerage", "commercial real estate"],
  Logistics: ["freight", "last mile", "supply chain", "3pl"],
  "Recruiting & Staffing": ["executive search", "tech recruiting", "staffing"],
  Consulting: ["management consulting", "digital transformation", "strategy"],
  Manufacturing: ["industrial", "fabrication", "b2b manufacturing"],
  "Legal Services": ["corporate law", "litigation", "ip law"],
};

function pick<T>(r: () => number, arr: T[]) {
  return arr[Math.floor(r() * arr.length)];
}

function build(): ProspectRecord[] {
  const r = mulberry32(20260925);
  const companies = Array.from({ length: 140 }, (_, i) => {
    const industry = INDUSTRIES[i % INDUSTRIES.length];
    const name = `${pick(r, PREFIX)} ${pick(r, SUFFIX_BY_INDUSTRY[industry])}`;
    const domain = `${name.toLowerCase().replace(/[^a-z]/g, "")}${i % 3 === 0 ? ".io" : i % 3 === 1 ? ".com" : ".co"}`;
    const loc = pick(r, LOCATIONS);
    const sizeIdx = Math.floor(r() * COMPANY_SIZES.length);
    const techs = Array.from(new Set(Array.from({ length: 3 + Math.floor(r() * 3) }, () => pick(r, TECHNOLOGIES))));
    return {
      name,
      domain,
      industry,
      size: COMPANY_SIZES[sizeIdx],
      revenue: REVENUES[Math.min(REVENUES.length - 1, Math.max(0, sizeIdx - 1 + Math.floor(r() * 2)))],
      technologies: techs,
      loc,
      founded: 1995 + Math.floor(r() * 30),
      description: `${name} is a ${COMPANY_SIZES[sizeIdx]} person ${industry.toLowerCase()} company headquartered in ${loc.city}, ${loc.country}.`,
      linkedinUrl: `https://www.linkedin.com/company/${domain.split(".")[0]}`,
      keywords: KEYWORDS_BY_INDUSTRY[industry],
    };
  });

  const people: ProspectRecord[] = [];
  const usedEmails = new Set<string>();
  let id = 0;
  for (const c of companies) {
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const dept = k === 0 ? "Executive" : pick(r, DEPARTMENTS);
      const title = pick(r, TITLES_BY_DEPT[dept]);
      const first = pick(r, FIRST);
      const last = pick(r, LAST);
      let local = r() < 0.6 ? first.toLowerCase() : `${first[0].toLowerCase()}${last.toLowerCase().replace(/\s/g, "")}`;
      if (usedEmails.has(`${local}@${c.domain}`)) local = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s/g, "")}`;
      if (usedEmails.has(`${local}@${c.domain}`)) continue;
      usedEmails.add(`${local}@${c.domain}`);
      id++;
      people.push({
        externalId: `lp_${id.toString().padStart(5, "0")}`,
        firstName: first,
        lastName: last,
        email: `${local}@${c.domain}`,
        title,
        seniority: seniorityFor(title),
        department: dept,
        linkedinUrl: `https://www.linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase().replace(/\s/g, "")}-${id}`,
        city: r() < 0.8 ? c.loc.city : pick(r, LOCATIONS).city,
        country: c.loc.country,
        keywords: c.keywords.slice(0, 2 + Math.floor(r() * 2)),
        company: {
          name: c.name,
          domain: c.domain,
          industry: c.industry,
          size: c.size,
          revenue: c.revenue,
          technologies: c.technologies,
          description: c.description,
          founded: c.founded,
          linkedinUrl: c.linkedinUrl,
        },
      });
    }
  }
  return people;
}

let cached: ProspectRecord[] | null = null;
export function prospects() {
  if (!cached) cached = build();
  return cached;
}
