// Product and legal entity names, used in footers, metadata, checkout and certificates.
export const BRAND = {
  name: "Leadabo",
  tagline: "Build your outbound engine.",
  company: "Numi Innovations LTD",
} as const;

export const productOf = `${BRAND.name} is a product of ${BRAND.company}.`;
