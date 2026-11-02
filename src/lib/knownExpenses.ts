import { db, logActivity } from "./db";

// Every company cost Heshy has told us about, logged in Finance → Expenses
// automatically. Monthly ones are added once for every month from the start
// date; one-time ones once on their date. To log a new cost, add a line here.
type Known =
  | { what: string; category: string; dollars: number; monthlyFrom: string; until?: string; note?: string }
  | { what: string; category: string; dollars: number; on: string; note?: string };

export const KNOWN_EXPENSES: Known[] = [
  { what: "Resend Pro (email)", category: "Software", dollars: 20, monthlyFrom: "2026-11-02", note: "50,000 emails a month, no daily limit" },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function dates(k: Known): string[] {
  if ("on" in k) return [k.on];
  const out: string[] = [];
  const [y, m, day] = k.monthlyFrom.split("-").map(Number);
  const end = k.until ? new Date(k.until) : new Date();
  for (let i = 0; ; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, Math.min(day, 28)));
    if (d > end) break;
    out.push(ymd(i === 0 ? new Date(Date.UTC(y, m - 1, day)) : d));
  }
  return out;
}

// Adds whatever is missing. Safe to run any number of times.
export async function logKnownExpenses() {
  try {
    const { data } = await db().from("expenses").select("what, spent_on");
    const have = new Set((data ?? []).map((r: { what: string; spent_on: string }) => `${r.what}|${r.spent_on}`));
    const rows = KNOWN_EXPENSES.flatMap((k) =>
      dates(k)
        .filter((d) => !have.has(`${k.what}|${d}`))
        .map((d) => ({ what: k.what, category: k.category, amount_cents: Math.round(k.dollars * 100), spent_on: d, note: k.note ?? null })),
    );
    if (rows.length) {
      await db().from("expenses").insert(rows);
      await logActivity("system", "expenses_logged", { count: rows.length });
    }
    return rows.length;
  } catch {
    return 0;
  }
}
