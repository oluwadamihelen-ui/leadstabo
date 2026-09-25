// Provider contracts. Each capability has a mock implementation that works offline;
// real adapters implement the same interface and are selected via env vars.
import type { EmailStatus } from "@prisma/client";

export interface OutboundMessage {
  from: { email: string; name: string };
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  inReplyTo?: string;
}

export interface SendResult {
  messageId: string;
  accepted: boolean;
  bounced?: boolean;
  error?: string;
}

export interface InboxCredentials {
  provider: "GOOGLE" | "MICROSOFT" | "SMTP" | "OTHER";
  email: string;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  oauthToken?: string;
}

export interface EmailProvider {
  name: string;
  testConnection(creds: InboxCredentials): Promise<{ ok: boolean; error?: string }>;
  send(creds: InboxCredentials | null, msg: OutboundMessage): Promise<SendResult>;
}

export interface VerificationResult {
  email: string;
  status: Exclude<EmailStatus, "UNVERIFIED">;
  score: number;
  reason: string;
}

export interface VerificationProvider {
  name: string;
  verify(email: string): Promise<VerificationResult>;
}

export interface LeadSearchFilters {
  query?: string;
  industries?: string[];
  titles?: string[];
  companies?: string[];
  sizes?: string[];
  locations?: string[];
  countries?: string[];
  revenues?: string[];
  technologies?: string[];
  keywords?: string[];
  seniorities?: string[];
  departments?: string[];
  hasEmail?: boolean;
}

export interface ProspectRecord {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  seniority: string;
  department: string;
  linkedinUrl: string;
  city: string;
  country: string;
  keywords: string[];
  company: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    revenue: string;
    technologies: string[];
    description: string;
    founded: number;
    linkedinUrl: string;
  };
}

export interface LeadDatabaseProvider {
  name: string;
  totalContacts: number;
  search(filters: LeadSearchFilters, page: number, pageSize: number): Promise<{ total: number; results: ProspectRecord[] }>;
  getByIds(ids: string[]): Promise<ProspectRecord[]>;
}

export interface DnsRecordCheck {
  kind: string;
  recordType: string;
  host: string;
  expectedValue: string;
}

export interface DnsProvider {
  name: string;
  check(domain: string, records: DnsRecordCheck[]): Promise<Record<string, "VALID" | "INVALID" | "PENDING">>;
}

export interface PaymentsProvider {
  name: string;
  changePlan(input: { workspaceId: string; planKey: string; interval: "MONTHLY" | "ANNUAL" }): Promise<{ ok: boolean; providerRef: string }>;
  chargeCredits(input: { workspaceId: string; credits: number; amountMinor: number }): Promise<{ ok: boolean; providerRef: string }>;
}

export type AiTask =
  | "generate_email"
  | "improve"
  | "shorten"
  | "personalize"
  | "subject_lines"
  | "rewrite_cta"
  | "follow_up"
  | "classify_reply"
  | "suggest_response";

export interface AiContext {
  lead?: { firstName: string; lastName?: string; title?: string | null; company?: string | null; industry?: string | null; location?: string | null };
  offer?: { name: string; valueProp: string; cta: string; proof?: string | null } | null;
  icp?: { name: string; pains: string[] } | null;
  sender?: { name: string; company?: string | null };
  subject?: string;
  body?: string;
  reply?: string;
  stepNumber?: number;
}

export interface AiResult {
  subject?: string;
  body?: string;
  subjects?: string[];
  category?: string;
  confidence?: number;
  text?: string;
}

export interface AiProvider {
  name: string;
  run(task: AiTask, ctx: AiContext): Promise<AiResult>;
}
