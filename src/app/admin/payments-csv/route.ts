import { commissionOf, earnsCommission, loadAgreements, repName } from "@/lib/adminData";
import { refCode } from "@/lib/format";

import { receiptNumber } from "@/lib/receipt";
import { currentStaff } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";

// Every paid hire as a spreadsheet, for the accountant.
export async function GET() {
  const me = await currentStaff();
  if (me?.role !== "admin") return new Response("Not allowed", { status: 403 });
  const [{ rows, people }, pct] = await Promise.all([loadAgreements(), commissionPercent()]);
  // Text starting with = + - @ could run as a formula in Excel; prefix it so it stays text.
  const cell = (v: string | number | null | undefined) => {
    let s = String(v ?? "");
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    ["Receipt", "Paid date", "Status", "Fee ($)", "Candidate", "Candidate ref", "Company", "Owner", "Owner email", "Rep", "Commission ($)", "Commission paid out", "Commission note"],
  ];
  for (const a of rows)
    for (const h of a.hires.filter((x) => x.paid_at)) {
      const rep = people.get(h.rep_id ?? a.candidates.added_by ?? "");
      const earns = earnsCommission(h, rep);
      lines.push([
        receiptNumber(h.id),
        (h.paid_at ?? "").slice(0, 10),
        h.status,
        (h.amount_cents / 100).toFixed(2),
        a.candidates.full_name,
        refCode(a.candidate_id),
        a.owners.company ?? "",
        a.owners.full_name ?? "",
        a.owners.email,
        repName(rep) ?? "",
        earns ? (commissionOf(h, pct, rep) / 100).toFixed(2) : "",
        h.commission_paid_at ? h.commission_paid_at.slice(0, 10) : "",
        h.commission_note ?? "",
      ]);
    }
  const csv = lines.map((l) => l.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
