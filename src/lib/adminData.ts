import { db, Hire } from "./db";
import { isOwnerEmail } from "./session";

export type StaffLite = {
  id: string;
  email: string;
  full_name: string | null;
  commission_type?: "percent" | "flat" | null;
  commission_value?: number | null;
};

export type HireRow = Hire & {
  rep_id: string | null;
  commission_cents: number | null;
  commission_paid_at: string | null;
  commission_note: string | null;
};

export type AgreementRow = {
  id: string;
  candidate_id: string;
  signed_at: string;
  signed_name: string;
  fee_cents: number | null;
  card_label: string | null;
  confirmed_at: string | null;
  passed_at?: string | null;
  pass_reason?: string | null;
  candidates: { full_name: string; added_by: string | null; role_category: string | null; industry: string | null; status: string };
  owners: { email: string; full_name: string | null; company: string | null; phone: string | null };
  hires: HireRow[];
};

export async function loadAgreements() {
  const [{ data, error }, { data: staff }] = await Promise.all([
    db()
      .from("unlocks")
      .select(
        "*, candidates(full_name, added_by, role_category, industry, status), owners(email, full_name, company, phone), hires(*)",
      )
      .order("signed_at", { ascending: false }),
    db().from("staff").select("*"),
  ]);
  const people = new Map<string, StaffLite>(((staff ?? []) as StaffLite[]).map((s) => [s.id, s]));
  return { rows: (data ?? []) as unknown as AgreementRow[], error, people };
}

export function latest(hires: HireRow[]) {
  return [...hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

// Where an agreement stands, in one word.
export function stageOf(a: AgreementRow): "no_card" | "considering" | "checkout" | "paid" | "hired" | "refunded" | "taken" | "passed" {
  if (!a.confirmed_at) return "no_card";
  const h = latest(a.hires);
  if (h && h.status !== "pending") return h.status;
  if (a.passed_at) return "passed"; // the client said not a fit
  if (a.candidates.status === "hired") return "taken"; // someone else hired them
  return h ? "checkout" : "considering";
}

export const STAGE_LABEL: Record<ReturnType<typeof stageOf>, string> = {
  no_card: "Card not added",
  considering: "Considering",
  checkout: "At checkout",
  paid: "Paid",
  hired: "Hired",
  refunded: "Refunded",
  taken: "Hired elsewhere",
  passed: "Passed",
};

export function repName(p: StaffLite | undefined) {
  if (!p) return null;
  return isOwnerEmail(p.email) ? "You" : p.full_name || p.email;
}

// Commission for a hire: a fixed override, or the default % of the fee.
// A hire's commission: a hand-set amount if there is one, otherwise the rep's
// own terms (percent or flat per hire), otherwise the default percent.
export function commissionOf(h: HireRow, percent: number, rep?: StaffLite) {
  if (h.commission_cents != null) return h.commission_cents;
  const v = rep?.commission_value != null ? Number(rep.commission_value) : null;
  if (rep?.commission_type === "flat" && v != null) return Math.round(v * 100);
  if (rep?.commission_type === "percent" && v != null) return Math.round((h.amount_cents * v) / 100);
  return Math.round((h.amount_cents * percent) / 100);
}

// In words, e.g. "15% of each fee" or "$750 per hire".
export function commissionTerms(rep: Pick<StaffLite, "commission_type" | "commission_value"> | null | undefined, percent: number) {
  const v = rep?.commission_value != null ? Number(rep.commission_value) : null;
  if (rep?.commission_type === "flat" && v != null) return `$${v.toLocaleString("en-US")} per hire`;
  if (rep?.commission_type === "percent" && v != null) return `${v}% of each fee`;
  return `${percent}% of each fee`;
}

// Does this hire earn a rep commission at all?
export function earnsCommission(h: HireRow, rep: StaffLite | undefined) {
  return !!rep && !isOwnerEmail(rep.email) && (h.status === "paid" || h.status === "hired");
}
