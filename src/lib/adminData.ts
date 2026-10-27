import { db, Hire } from "./db";
import { isOwnerEmail } from "./session";

export type StaffLite = { id: string; email: string; full_name: string | null };

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
  candidates: { full_name: string; added_by: string | null; role_category: string | null; industry: string | null };
  owners: { email: string; full_name: string | null; company: string | null; phone: string | null };
  hires: HireRow[];
};

export async function loadAgreements() {
  const [{ data, error }, { data: staff }] = await Promise.all([
    db()
      .from("unlocks")
      .select(
        "id, candidate_id, signed_at, signed_name, fee_cents, card_label, confirmed_at, candidates(full_name, added_by, role_category, industry), owners(email, full_name, company, phone), hires(*)",
      )
      .order("signed_at", { ascending: false }),
    db().from("staff").select("id, email, full_name"),
  ]);
  const people = new Map<string, StaffLite>(((staff ?? []) as StaffLite[]).map((s) => [s.id, s]));
  return { rows: (data ?? []) as unknown as AgreementRow[], error, people };
}

export function latest(hires: HireRow[]) {
  return [...hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

// Where an agreement stands, in one word.
export function stageOf(a: AgreementRow): "no_card" | "considering" | "checkout" | "paid" | "hired" | "refunded" {
  if (!a.confirmed_at) return "no_card";
  const h = latest(a.hires);
  if (!h) return "considering";
  if (h.status === "pending") return "checkout";
  return h.status;
}

export const STAGE_LABEL: Record<ReturnType<typeof stageOf>, string> = {
  no_card: "Card not added",
  considering: "Considering",
  checkout: "At checkout",
  paid: "Paid",
  hired: "Hired",
  refunded: "Refunded",
};

export function repName(p: StaffLite | undefined) {
  if (!p) return null;
  return isOwnerEmail(p.email) ? "You" : p.full_name || p.email;
}

// Commission for a hire: a fixed override, or the default % of the fee.
export function commissionOf(h: HireRow, percent: number) {
  return h.commission_cents ?? Math.round((h.amount_cents * percent) / 100);
}

// Does this hire earn a rep commission at all?
export function earnsCommission(h: HireRow, rep: StaffLite | undefined) {
  return !!rep && !isOwnerEmail(rep.email) && (h.status === "paid" || h.status === "hired");
}
